import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

// Orchids visual-editor loader — only loaded in non-prod (turbopack dev mode)
const LOADER = path.resolve(__dirname, "src/visual-edits/component-tagger-loader.js");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" },
    ],
  },

  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  compress:        true,
  poweredByHeader: false,
  reactStrictMode: true,

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-label",
      "@radix-ui/react-toast",
      "framer-motion",
      "recharts",
      "lucide-react",
    ],
  },

  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{member}}",
    },
  },

  // Turbopack rules — dev only, skipped on Vercel production builds
  ...(isProd
    ? {}
    : {
        turbopack: {
          rules: {
            "*.{jsx,tsx}": {
              loaders: [LOADER],
            },
          },
        },
      }),
};

export default nextConfig;
