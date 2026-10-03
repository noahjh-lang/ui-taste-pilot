import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them in place.
  transpilePackages: ['@tastepilot/ui', '@tastepilot/api-client', '@tastepilot/shared'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
