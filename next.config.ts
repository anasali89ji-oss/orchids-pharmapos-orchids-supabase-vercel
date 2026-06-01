import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

// Orchids visual-editor loader — only loaded in non-prod (turbopack dev mode)
const LOADER = path.resolve(__dirname, "src/visual-edits/component-tagger-loader.js");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase storage — tightened from wildcard "**"
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // CDN / avatar providers commonly used
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
    ],
  },

  // Re-enabled so real errors surface in Vercel build logs
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: false },

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
