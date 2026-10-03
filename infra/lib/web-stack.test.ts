import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { beforeAll, describe, expect, it } from 'vitest';
import { WebStack } from './web-stack';

let template: Template;

beforeAll(() => {
  const siteDir = mkdtempSync(path.join(tmpdir(), 'site-'));
  writeFileSync(path.join(siteDir, 'index.html'), '<!doctype html>');
  const app = new App();
  const stack = new WebStack(app, 'Test', {
    env: { account: '123456789012', region: 'us-east-1' },
    siteDir,
    config: {
      allowedIps: ['203.0.113.10/32', '2001:db8::/64'],
      budgetEmail: 'dev@example.com',
      monthlyBudgetUsd: 5,
    },
  });
  template = Template.fromStack(stack);
});

describe('cost and access protection', () => {
  it('keeps the bucket fully private', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it('blocks everyone by default and only allows the configured IPs', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'CLOUDFRONT',
      DefaultAction: { Block: {} },
      Rules: [
        Match.objectLike({ Action: { Allow: {} } }),
        Match.objectLike({ Action: { Allow: {} } }),
      ],
    });
    template.hasResourceProperties('AWS::WAFv2::IPSet', {
      IPAddressVersion: 'IPV4',
      Addresses: ['203.0.113.10/32'],
    });
    template.hasResourceProperties('AWS::WAFv2::IPSet', {
      IPAddressVersion: 'IPV6',
      Addresses: ['2001:db8::/64'],
    });
  });

  it('attaches the web ACL to the distribution', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ WebACLId: Match.anyValue() }),
    });
  });

  it('emails budget alerts', () => {
    template.hasResourceProperties('AWS::Budgets::Budget', {
      Budget: Match.objectLike({ BudgetLimit: { Amount: 5, Unit: 'USD' } }),
      NotificationsWithSubscribers: Match.arrayWith([
        Match.objectLike({
          Subscribers: [{ SubscriptionType: 'EMAIL', Address: 'dev@example.com' }],
        }),
      ]),
    });
  });
});

// The CloudFront flat-rate plan (no overage charges) rejects distributions
// using these features. Keep the stack subscribable.
describe('flat-rate plan compatibility', () => {
  it('uses OAC, not legacy OAI', () => {
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
  });

  it('uses cache policies, not legacy ForwardedValues', () => {
    const json = JSON.stringify(template.findResources('AWS::CloudFront::Distribution'));
    expect(json).not.toContain('ForwardedValues');
    expect(json).toContain('CachePolicyId');
  });

  it('uses no Lambda@Edge, real-time logs, or WAF rule groups', () => {
    const json = JSON.stringify(template.toJSON());
    expect(json).not.toContain('LambdaFunctionAssociations');
    expect(json).not.toContain('RealtimeLogConfig');
    expect(json).not.toContain('RuleGroupReferenceStatement');
  });

  it('stays within the Free plan limit of 5 WAF rules', () => {
    const [acl] = Object.values(template.findResources('AWS::WAFv2::WebACL'));
    expect(acl?.Properties.Rules.length).toBeLessThanOrEqual(5);
  });
});
