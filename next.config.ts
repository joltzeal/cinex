import type { NextConfig } from 'next';

// Define the base Next.js configuration
const baseConfig: NextConfig = {
  output: 'standalone', // 启用 standalone 输出以支持 Docker
  serverExternalPackages: ["pino", "pino-pretty"],
  experimental: {
    // serverComponentsExternalPackages: ["pino", "pino-pretty"],

  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'www.javbus.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'whatslink.info',
        port: ''
      },
    ]
  },
  eslint:{
    ignoreDuringBuilds: true,
  },
  transpilePackages: ['geist'],
  webpack: (config, { isServer }) => {
    // if (isServer) {
    //   config.externals.push('canvas');
    // }
    
    // 忽略各种构建警告
    config.ignoreWarnings = [
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/
      },
      {
        module: /@prisma\/client/,
        message: /A Node\.js API is used .* which is not supported in the Edge Runtime/
      },
      {
        module: /bcryptjs/,
        message: /A Node\.js (API|module) is (used|loaded) .* which is not supported in the Edge Runtime/
      }
    ];
    
    return config;
  }
};

let configWithPlugins = baseConfig;


const nextConfig = configWithPlugins;
export default nextConfig;
