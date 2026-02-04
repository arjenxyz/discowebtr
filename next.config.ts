import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  // Tell Next to treat these packages as server externals (avoid bundling into ESM chunks)
  serverExternalPackages: [
    'discord.js',
    '@discordjs/ws',
    'zlib-sync',
  ],
  // Configure Turbopack root to this package to avoid workspace-root detection warnings
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'discord.js': 'commonjs discord.js',
        '@discordjs/ws': 'commonjs @discordjs/ws',
        'zlib-sync': 'commonjs zlib-sync',
      });
    }
    return config;
  },
};

export default nextConfig;
