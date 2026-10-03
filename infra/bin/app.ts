import { App } from 'aws-cdk-lib';
import { loadConfig } from '../lib/config';
import { WebStack } from '../lib/web-stack';

const app = new App();

// Everything lives in us-east-1: a CloudFront-scoped WAF web ACL must be
// created there, and keeping one region keeps the stack simple.
new WebStack(app, 'TastePilotWeb', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  config: loadConfig(),
  description: 'TastePilot web SPA: private S3 + CloudFront + IP-allowlist WAF + cost budget',
});
