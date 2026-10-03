# Deploying to AWS

The web app ships as a static SPA: private **S3** bucket → **CloudFront** → your browser. Everything is defined in [infra/](infra/) with AWS CDK (TypeScript).

> **Stub backend in the deployed build:** while `NEXT_PUBLIC_API_MOCKING=enabled` (set in `apps/web/.env.local`), the deployed site runs the stub backend in each visitor's browser. Every visitor gets their own seeded demo data in their own `localStorage`, and nothing is shared between them. Set it to `disabled` and point `NEXT_PUBLIC_API_BASE_URL` at a real API before using real data.

## How costs are protected

| Layer | What it does |
| --- | --- |
| **IP allowlist (WAF)** | Every request from an IP not in `infra/config.json` is blocked at the CloudFront edge with a 403. Only you and your team can load the site. |
| **CloudFront flat-rate Free plan** | $0/month, with 1M requests and 100 GB per month included and **no overage charges**. Requests blocked by WAF or DDoS protection don't count toward the allowance. If usage far exceeds it, AWS may slow delivery, but it won't bill more. **You subscribe to this manually after the first deploy (step 6).** |
| **Private bucket** | S3 is not publicly reachable. Only this distribution can read it, via Origin Access Control. Direct requests to the bucket are denied, and AWS doesn't bill the bucket owner for denied unauthenticated requests. |
| **Budget alerts** | An account-wide AWS Budget emails you at 50% and 100% of actual spend, and when spend is forecast to exceed the limit. |

**Important:** between the first deploy and step 6, the distribution runs on pay-as-you-go pricing. The WAF web ACL costs about $5/month plus $1 per rule on that pricing, prorated, and blocked requests still incur small request fees. Do step 6 right after deploying.

The CDK tests in `infra/lib/web-stack.test.ts` fail if a change makes the stack incompatible with the flat-rate plan, for example by adding Lambda@Edge, legacy origin access identity (OAI), real-time logs, or more than 5 WAF rules.

## One-time setup

### 1. AWS CLI and sign-in

The AWS CLI is installed at `~/.local/bin/aws` (open a new terminal, or run `source ~/.zshrc`). Sign in with your AWS console account. This opens a browser, and the credentials are short-lived and refreshed automatically:

```sh
aws login --region us-east-1
aws sts get-caller-identity   # should print your account id
```

If CDK reports that it can't find credentials, export them for the current shell:

```sh
eval "$(aws configure export-credentials --format env)"
```

### 2. Configure the allowlist and budget

```sh
cp infra/config.example.json infra/config.json
curl -s https://checkip.amazonaws.com   # your current public IP
```

Edit `infra/config.json`. It is gitignored.

```json
{
  "allowedIps": ["<your-ip>/32"],
  "budgetEmail": "you@example.com",
  "monthlyBudgetUsd": 5
}
```

- `allowedIps`: CIDRs. Use `/32` for a single IPv4 address. IPv6 is supported too (for example `/64`). Add each teammate's IP. If your home IP changes, update this file and redeploy.
- The deploy refuses to run with an empty or invalid allowlist, so it can't accidentally deploy an open site.

### 3. Bootstrap CDK (once per account and region)

```sh
cd infra && npx cdk bootstrap aws://<account-id>/us-east-1 && cd ..
```

This creates a small staging bucket and IAM roles that CDK uses to deploy.

## Deploy

### 4. Preview the changes (optional)

```sh
npm run deploy:diff
```

### 5. Deploy

```sh
npm run deploy
```

This builds the static export (`apps/web/out`), creates or updates the stack, uploads the site, and invalidates the CloudFront cache. CDK asks you to confirm IAM and security-group changes on the first deploy. The outputs include:

- `SiteUrl`: `https://dxxxxxxxx.cloudfront.net`
- `DistributionId` / `DistributionArn`

Everything is created in `us-east-1`.

### 6. Subscribe the distribution to the Free plan (once)

1. Open the [CloudFront console](https://console.aws.amazon.com/cloudfront/v4/home) → **Distributions** → the `TastePilot web` distribution.
2. Choose its **pricing plan** and pick **Free**. It should be accepted without changes. If the console lists an unsupported feature, stop and fix it in CDK rather than in the console.
3. Confirm the distribution now shows the **Free** plan under **Manage plan**.

The plan can also be managed with the AWS CLI or the PricingPlanManager API. See the [flat-rate plan docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html). You can have up to 3 Free plans per account.

### 7. Verify

- Open `SiteUrl` from an allowlisted IP. The landing page loads, and `/recipes/42` shows "Recipe 42".
- From any other network (for example your phone with Wi-Fi off), the site returns **403**.

## Redeploying

Run `npm run deploy` again. Only changed files are uploaded, files removed from the build are pruned, and the cache is invalidated with a single `/*` path (the first 1,000 invalidation paths per month are free).

## Tearing it down

A distribution on a pricing plan can't be deleted until its plan is cancelled. Free plans cancel immediately.

1. CloudFront console → the distribution → **Manage plan** → cancel the plan.
2. `npm run deploy:destroy`

This removes the bucket and its contents, the distribution, the WAF resources, and the budget. The CDK bootstrap stack (`CDKToolkit`) stays. Delete it from the CloudFormation console if you no longer use CDK in this account.

## How SPA routing works on S3

There is no server, so `next build` writes a static export (`output: 'export'`). Dynamic routes such as `/recipes/[id]` are pre-rendered once under a `_` placeholder (`/recipes/_/index.html`). The CloudFront Function in [infra/functions/viewer-request.js](infra/functions/viewer-request.js) maps every real URL onto those files, and pages read the real id from the address bar with `useRouteParam` ([apps/web/src/lib/use-route-param.ts](apps/web/src/lib/use-route-param.ts)). Use that hook, not `useParams()`, in dynamic routes, because `useParams()` returns `_` in the deployed build.

When adding a new dynamic route:

1. Export `generateStaticParams = () => staticParams('<param>')` from its `page.tsx`.
2. Read the value with `useRouteParam('<prefix>')` in a client component.
3. Add the prefix to `DYNAMIC_PREFIXES` in the CloudFront Function, and add a case to `infra/functions/viewer-request.test.ts`.

To run the deployed build locally, with the same CloudFront Function applied, use `npm run preview` and open http://localhost:3001. The e2e suite runs against this build.
