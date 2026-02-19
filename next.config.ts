import type { NextConfig } from "next";
import path from "node:path";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

  const nextConfig: NextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**',
        },
        {
          protocol: 'http',
          hostname: '**',
        },
      ],
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Bundle optimization
    experimental: {
      optimizeCss: true,
      optimizePackageImports: [
        '@radix-ui/react-dialog',
        '@radix-ui/react-toast',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-select',
        '@radix-ui/react-label',
        '@tanstack/react-query',
        'framer-motion',
        'recharts',
        'lucide-react',
      ],
    },
    // Code splitting optimization
    modularizeImports: {
      '@radix-ui/react-icons': {
        transform: '@radix-ui/react-icons/dist/{{member}}',
      },
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{member}}',
      },
      'react-icons': {
        transform: 'react-icons/{{kebabCase member}}',
      },
    },
    // Production performance
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    turbopack: {
      rules: {
        "*.{jsx,tsx}": {
          loaders: [LOADER]
        }
      }
    }
  };

export default nextConfig;
// Orchids restart: 1771477355312
