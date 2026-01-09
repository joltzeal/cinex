import type { NextConfig } from 'next';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'clerk.com',
        port: ''
      }
    ]
  },
  transpilePackages: ['geist']
};

let configWithPlugins = baseConfig;

// Conditionally enable Sentry configuration

const nextConfig = configWithPlugins;
export default nextConfig;
