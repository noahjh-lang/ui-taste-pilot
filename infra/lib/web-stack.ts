import path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import type { Construct } from 'constructs';
import type { DeployConfig } from './config';

const SITE_DIR = path.join(__dirname, '../../apps/web/out');

export interface WebStackProps extends StackProps {
  config: DeployConfig;
  /** Built static site to upload. Defaults to the web app's `out/` export. */
  siteDir?: string;
}

/**
 * Static SPA hosting with cost protection:
 *
 * - The bucket is private; only this distribution can read it (OAC). Direct
 *   requests to S3 are denied, and AWS doesn't bill denied unauthenticated
 *   requests to the bucket owner.
 * - A WAF web ACL blocks every IP not on the allowlist at the edge.
 * - The distribution avoids features the CloudFront flat-rate Free plan
 *   rejects (legacy ForwardedValues, OAI, Lambda@Edge, real-time logs, shared
 *   functions/ACLs, WAF rule groups), so it can be subscribed after deploy.
 * - An account-wide AWS Budget emails when spend is forecast or actual.
 */
export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { config } = props;

    const bucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Contents are rebuilt from the repo on every deploy.
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const webAcl = this.createAllowlistWebAcl(config.allowedIps);

    const viewerRequest = new cloudfront.Function(this, 'ViewerRequest', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(__dirname, '../functions/viewer-request.js'),
      }),
      comment: 'Map SPA routes onto static export files',
    });

    const notFound = {
      responseHttpStatus: 404,
      responsePagePath: '/404.html',
      ttl: Duration.minutes(5),
    };

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'TastePilot web',
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        compress: true,
        functionAssociations: [
          { function: viewerRequest, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      // S3 returns 403 for missing keys when the caller can't list the bucket.
      errorResponses: [
        { httpStatus: 403, ...notFound },
        { httpStatus: 404, ...notFound },
      ],
      webAclId: webAcl.attrArn,
      // Only affects pay-as-you-go pricing (before the flat-rate plan is on).
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
    });

    new s3deploy.BucketDeployment(this, 'DeploySite', {
      sources: [s3deploy.Source.asset(props.siteDir ?? SITE_DIR)],
      destinationBucket: bucket,
      prune: true,
      distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });

    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'tastepilot-monthly',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: config.monthlyBudgetUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: [
        { type: 'ACTUAL', threshold: 50 },
        { type: 'ACTUAL', threshold: 100 },
        { type: 'FORECASTED', threshold: 100 },
      ].map(({ type, threshold }) => ({
        notification: {
          notificationType: type,
          comparisonOperator: 'GREATER_THAN',
          threshold,
          thresholdType: 'PERCENTAGE',
        },
        subscribers: [{ subscriptionType: 'EMAIL', address: config.budgetEmail }],
      })),
    });

    new CfnOutput(this, 'SiteUrl', { value: `https://${distribution.distributionDomainName}` });
    new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new CfnOutput(this, 'DistributionArn', {
      value: this.formatArn({
        service: 'cloudfront',
        region: '',
        resource: 'distribution',
        resourceName: distribution.distributionId,
      }),
    });
    new CfnOutput(this, 'BucketName', { value: bucket.bucketName });
  }

  /** Default-block web ACL that only lets the configured CIDRs through. */
  private createAllowlistWebAcl(allowedIps: string[]) {
    const byVersion = {
      IPV4: allowedIps.filter((ip) => !ip.includes(':')),
      IPV6: allowedIps.filter((ip) => ip.includes(':')),
    };

    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    for (const [version, addresses] of Object.entries(byVersion)) {
      if (addresses.length === 0) continue;
      const ipSet = new wafv2.CfnIPSet(this, `AllowedIps${version}`, {
        scope: 'CLOUDFRONT',
        ipAddressVersion: version,
        addresses,
      });
      rules.push({
        name: `allow-${version.toLowerCase()}`,
        priority: rules.length,
        action: { allow: {} },
        statement: { ipSetReferenceStatement: { arn: ipSet.attrArn } },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: `allow-${version.toLowerCase()}`,
          sampledRequestsEnabled: true,
        },
      });
    }

    return new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { block: {} },
      rules,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'tastepilot-web',
        sampledRequestsEnabled: true,
      },
    });
  }
}
