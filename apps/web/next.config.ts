import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static SPA export (out/) for S3 + CloudFront. No Next.js server at runtime:
  // dynamic routes are pre-rendered once and resolved client-side -- see
  // src/lib/use-route-param.ts and infra/functions/viewer-request.js.
  // Export only on `next build`: in dev, Next rejects params missing from
  // generateStaticParams, which would break /recipes/42 locally.
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  // Workspace packages ship TypeScript source; Next compiles them in place.
  transpilePackages: ['@tastepilot/ui', '@tastepilot/api-client', '@tastepilot/shared'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
