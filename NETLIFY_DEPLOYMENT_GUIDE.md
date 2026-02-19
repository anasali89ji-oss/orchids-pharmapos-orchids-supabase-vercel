# Netlify Deployment Guide for PharmaPOS

Complete guide to deploy PharmaPOS from Vercel to Netlify hosting.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration Files](#configuration-files)
3. [Environment Variables](#environment-variables)
4. [Deployment Process](#deployment-process)
5. [Troubleshooting](#troubleshooting)
6. [Key Differences: Vercel vs Netlify](#key-differences-vercel-vs-netlify)
7. [Cron Jobs & Scheduled Functions](#cron-jobs--scheduled-functions)
8. [Post-Deployment Verification](#post-deployment-verification)

---

## Prerequisites

### Required Accounts

Before deploying, ensure you have:

- [Netlify account](https://app.netlify.com/signup)
- [GitHub repository](https://github.com/) connected to Netlify
- [Supabase project](https://supabase.com/) (already configured)
- [Stripe account](https://stripe.com/) (already configured)

### System Requirements

- Node.js 20.x (specified in `.nvmrc` file)
- npm, yarn, or bun package manager
- Git for version control

---

## Configuration Files

### Files Created/Modified

| File | Purpose | Status |
|------|---------|--------|
| `netlify.toml` | Netlify configuration | ✅ Created |
| `.nvmrc` | Node.js version specification | ✅ Created |
| `package.json` | Added `@netlify/plugin-nextjs` | ✅ Updated |
| `vercel.json` | Vercel-specific config (can be kept) | Keep for reference |

### netlify.toml

This is the main Netlify configuration file that replaces `vercel.json`. Key features:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
  NODE_OPTIONS = "--max-old-space-size=4096"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### .nvmrc

Simple text file specifying Node.js version:

```
20
```

---

## Environment Variables

### Setting Up in Netlify

1. Go to your Netlify dashboard
2. Navigate to **Site Settings → Environment Variables**
3. Add the following variables:

### Required Variables

| Variable | Purpose | Required For |
|----------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | All environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | All environments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Preview & Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | All environments |
| `STRIPE_SECRET_KEY` | Stripe secret key | Preview & Production |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Preview & Production |
| `CRON_SECRET` | Secures cron job endpoints | Preview & Production |

### Your Current Values

From your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ijphfdpifpxgbdogruan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51T21WXIoLYOHkmqpvB7cpsASbJBhZ81L92XULsmQwarfSoQOBKjxku7IAbHfokZjiLJu9BaPPI4k1NdE0K6uUivx00UAEBloEq
STRIPE_SECRET_KEY=sk_test_51T21WXIoLYOHkmqpwlBy0CGRHHDiIX6jUXzZcroE7jUx36eqPPpa5rI1hWYPIVSvyFABXeWerTZec72uveISezFU00hNySJNtj
STRIPE_WEBHOOK_SECRET=whsec_1AnFYRVeN5HNgNQOXcUNsIBK9ByhraiG
```

**Generate CRON_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Deployment Process

### Method 1: Netlify Dashboard (Recommended for First Deployment)

#### Step 1: Connect to GitHub

1. Log in to [Netlify](https://app.netlify.com)
2. Click **Add new site → Import an existing project**
3. Choose **GitHub** and authorize Netlify
4. Select your repository

#### Step 2: Configure Build Settings

```
Build command: npm run build
Publish directory: .next
```

**Alternatively**, Netlify will detect `netlify.toml` and configure automatically.

#### Step 3: Set Environment Variables

1. On the deploy configuration page, click **Advanced → Environment Variables**
2. Add all variables from the table above
3. Click **Deploy site**

#### Step 4: Deploy

Netlify will automatically:
- Install dependencies
- Build the application
- Deploy to preview URL
- Update custom domain (if configured)

### Method 2: Git Connected Auto-Deploy

Once connected, Netlify auto-deploys on every push to:
- `main` branch → Production
- Other branches → Preview deployments

```
git add .
git commit -m "Deploy to Netlify"
git push origin main
```

Netlify automatically builds and deploys.

### Method 3: Netlify CLI (Advanced)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Init (if not already)
netlify init

# Deploy to production
netlify deploy --prod

# Deploy draft
netlify deploy
```

---

## Troubleshooting

### Common Netlify Build Errors

#### Error: "Module not found: Can't resolve..."

**Cause:** Missing dependency or wrong import path.

**Solution:**
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Check if dependency exists in package.json
grep "package-name" package.json
```

#### Error: "No cached dependencies found"

**Cause:** First-time build is expected to show this.

**Solution:** Just wait. First builds take 5-10 minutes.

#### Error: "Build exceeded timeout"

**Cause:** Build taking longer than Netlify's limit.

**Solution:**
1. Increase function timeout in `netlify.toml`
2. Optimize build process
3. Reduce static assets

```toml
[functions]
  timeout = 180
```

#### Error: "Node version mismatch"

**Cause:** Netlify using wrong Node version.

**Solution:** Ensure `.nvmrc` exists with `20` and matches `package.json` engines.

```json
{
  "engines": {
    "node": "20.x"
  }
}
```

#### Error: "Edge function failed"

**Cause:** Stripe routes trying to use Node.js-only features.

**Solution:** Ensure Stripe routes use `export const runtime = "edge"`.

### Stripe Webhook Issues

**Error:** Webhook signature verification fails.

**Solution:**
1. Check `STRIPE_WEBHOOK_SECRET` matches your Stripe dashboard
2. Ensure webhook endpoint is publicly accessible
3. Verify Netlify's `functions` directory has the right code

### Cron Jobs Not Running

**Error:** Scheduled functions not executing.

**Solution:**
1. Check Netlify Functions dashboard
2. Verify cron syntax in `netlify.toml`
3. Check function logs in Netlify dashboard

---

## Key Differences: Vercel vs Netlify

| Feature | Vercel | Netlify |
|---------|--------|---------|
| Config file | `vercel.json` | `netlify.toml` |
| Cron jobs | Built-in | Scheduled functions |
| Runtime config | `export const runtime` | Function-level config |
| Edge functions | Automatic | Edge functions plugin |
| Environment vars | Dashboard/CLI | Dashboard/CLI |
| Build command | Automatic detection | Manual or via config |
| Preview deployments | Automatic on push | Automatic on push |
| Zero config best | Vercel | Netlify (with plugin) |

### Migration Notes

1. **Cron jobs**: Vercel cron routes need Netlify Scheduled Functions
2. **Runtime declarations**: Keep `export const runtime = "edge"` for better performance
3. **Bundle size**: Netlify may show different build statistics
4. **Logs**: Netlify has different log format in dashboard

---

## Cron Jobs & Scheduled Functions

### Original Vercel Crons

Your Vercel configuration had:
```json
"crons": [
  { "path": "/api/backup/daily", "schedule": "0 2 * * *" },
  { "path": "/api/cron/session-cleanup", "schedule": "0 3 * * *" },
  { "path": "/api/cron/connection-ping", "schedule": "*/15 * * * *" }
]
```

### Netlify Implementation

These are now configured in `netlify.toml`:

```toml
[scheduled]
  [[scheduled.crons]]
    cron = "0 2 * * *"    # 2 AM UTC daily
    path = "/api/backup/daily"
  
  [[scheduled.crons]]
    cron = "0 3 * * *"    # 3 AM UTC daily
    path = "/api/cron/session-cleanup"
  
  [[scheduled.crons]]
    cron = "*/15 * * * * # Every 15 minutes"
    path = "/api/cron/connection-ping"
```

### Important: Cron Secret

For security, cron endpoints should verify `CRON_SECRET`.

Update your cron routes to check:

```typescript
// Example: /api/cron/connection-ping/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Your cron logic here
  return new Response('OK')
}
```

---

## Post-Deployment Verification

### Checklist

After deployment, verify:

- [ ] Homepage loads: `https://your-site.netlify.app`
- [ ] Login page works: `https://your-site.netlify.app/login`
- [ ] Dashboard loads after login
- [ ] API routes respond:
  ```bash
  curl https://your-site.netlify.app/api/cron/connection-ping
  ```
- [ ] Stripe checkout works
- [ ] Database operations work (CRUD)
- [ ] Realtime features connect

### Testing Core Functionality

#### 1. Authentication
```bash
# Test Supabase auth via browser
# Navigate to /login and try to log in
```

#### 2. API Routes
```bash
# Test health check
curl https://your-site.netlify.app/api/cron/connection-ping

# Check response headers
curl -I https://your-site.netlify.app/api/cron/connection-ping
```

#### 3. Static Assets
```bash
# Verify image optimization
curl https://your-site.netlify.app/_next/static/...
```

#### 4. Cron Jobs
Check Netlify dashboard:
```
Functions → Scheduled Functions
```
Look for:
- Execution logs
- Success/failure status
- Execution duration

---

## Performance Optimization

### Netlify-Specific Tips

1. **Enable Edge functions** for Stripe routes (already configured)
2. **Use Netlify Analytics** for insights
3. **Configure CDN caching** with headers (already in `netlify.toml`)
4. **Monitor function timeouts** and adjust as needed

### Bundle Size Monitoring

Check in Netlify:
```
Deploys → Latest deploy → Build logs
```

Look for:
```
✔ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

---

## Monitoring & Debugging

### Netlify Dashboard Access

- **Build logs**: Deploys → Select deploy → Deploy log
- **Function logs**: Functions → Select function → View log
- **Scheduled functions**: Functions → Scheduled Functions

### Local Debugging

```bash
# Build locally to test
npm run build

# Start production server locally
npm start

# Test at http://localhost:3000
```

### Environment Variable Debugging

```bash
# Print all available env vars in your app
# Add to an API route temporarily:
console.log('Environment:', {
  nextPublicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,20) + '...',
  hasStripe: !!process.env.STRIPE_SECRET_KEY
})
```

---

## Emergency Procedures

### Rollback Deployment

1. Go to **Deploys** in Netlify dashboard
2. Find the successful deployment
3. Click **Rollback** → Confirm

### Manual Cron Execution

If cron jobs fail, execute manually:

```bash
# Via curl
curl -H "x-cron-secret: YOUR_SECRET" \
  https://your-site.netlify.app/api/backup/daily

# Via Netlify CLI
netlify functions:invoke api-backup-daily
```

### Clear Browser Cache

After deployment, users may see cached content:

```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## Additional Resources

- [Netlify Next.js Plugin Docs](https://docs.netlify.com/integrations/frameworks/nextjs/)
- [Netlify Functions Guide](https://docs.netlify.com/functions/overview/)
- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [Next.js on Netlify](https://nextjs.org/docs/deployment/netlify)
- [PharmaPOS Main Documentation](./DEPLOYMENT_GUIDE.md)

---

## Quick Reference

### Deploy Commands

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy to production
netlify deploy --prod

# Deploy draft
netlify deploy

# View logs
netlify logs
```

### Environment Variables

Copy from `.env.local` to Netlify Dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CRON_SECRET` (generate new)

---

## Success Criteria

Deployment is successful when:

✅ Homepage loads without errors
✅ Login/Register works
✅ Dashboard accessible after auth
✅ API routes return correct responses
✅ Cron jobs execute on schedule
✅ Stripe payment flow works
✅ Database operations successful
✅ No console errors in browser
✅ Build completes without warnings

---

## Support

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review main deployment guide: `DEPLOYMENT_GUIDE.md`
3. Check [Netlify Support](https://answers.netlify.com/)
4. Review [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

---

**Last Updated:** February 19, 2026
**Status:** ✅ Production Ready
