import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for webpack module resolution issues
  webpack: (config, { isServer }) => {
    // Disable webpack cache to prevent corruption
    config.cache = false;
    
    // Fix for module resolution issues
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    };

    // Ensure proper chunk splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }

    return config;
  },

  // Fix for workspace root detection
  outputFileTracingRoot: "/home/chipdev/HackRadar",

  // Externalize server packages to prevent bundling issues
  serverExternalPackages: ['mongodb', '@anthropic-ai/sdk'],

  // Increase timeout for API routes
  serverRuntimeConfig: {
    apiTimeout: 60000
  },

  // Disable type checking during build (we handle it separately)
  typescript: {
    ignoreBuildErrors: false
  },

  // Disable ESLint during build (we handle it separately)
  eslint: {
    ignoreDuringBuilds: true
  },

  // Experimental features to improve stability
  experimental: {
    // Disable optimizeCss as it can cause issues
    optimizeCss: false
  }
};

export default nextConfig;
