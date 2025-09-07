import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal webpack configuration for compatibility
  webpack: (config, { isServer }) => {
    // Only add fallbacks for browser builds
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
          net: false,
          tls: false,
        },
      };
    }

    return config;
  },

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
