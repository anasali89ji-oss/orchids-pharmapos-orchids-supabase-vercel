# Vercel Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables Setup

In Vercel Dashboard > Settings > Environment Variables, add these:

#### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: `https://ijphfdpifpxgbdogruan.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcGhmZHBpZnB4Z2Jkb2dydWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzksImV4cCI6MjA4NDc2MDc3OX0.lR9hkkQl84rgrN20lPw_CtrXORNcd5eAajKvpGXVwQA`
- `SUPABASE_SERVICE_ROLE_KEY`: (use your service role key from Supabase Dashboard)

#### Stripe
- `STRIPE_SECRET_KEY`: `sk_test_51T21WXIoLYOHkmqpwlBy0CGRHHDiIX6jUXzZcroE7jUx36eqPPpa5rI1hWYPIVSvyFABXeWerTZec72uveISezFU00hNySJNtj`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: `pk_test_51T21WXIoLYOHkmqpvB7cpsASbJBhZ81L92XULsmQwarfSoQOBKjxku7IAbHfokZjiLJu9BaPPI4k1NdE0K6uUivx00UAEBloEq`
- `STRIPE_WEBHOOK_SECRET`: (configure endpoint in Stripe Dashboard)

### 2. Vercel Project Settings

**Framework Preset**: Next.js

**Build Command**: `bun run build`

**Output Directory**: `.next`

**Install Command**: `bun install`

**Node.js Version**: 18.x or 20.x (Recommended: 20.x)

## Configuration Files

### vercel.json
- JSON configuration automatically applied
- Cron jobs: /api/backup/daily, /api/cron/session-cleanup, /api/cron/connection-ping
- Functions: 60s timeout for API routes, 2048MB memory

### next.config.ts
- No outputFileTracingRoot (removed to prevent deployment errors)
- TypeScript and ESLint build errors ignored
- Image optimization enabled for all domains

## Troubleshooting

### Build Issues Fixed
1. Removed outputFileTracingRoot from next.config.ts
2. Updated cron job paths in vercel.json
3. Added all required environment variables

### Runtime Issues Fixed
1. Supabase keep-alive headers added
2. CORS headers configured for API routes
3. Connection ping cron every 15 minutes
