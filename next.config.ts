import type { NextConfig } from 'next';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
    ]
  },
  transpilePackages: ['geist']
};

let configWithPlugins = baseConfig;

// Conditionally enable Sentry configuration

const nextConfig = configWithPlugins;
export default nextConfig;
