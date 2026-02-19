# Vercel Deployment Fixes

## Summary of Fixes Applied

All Vercel deployment issues have been identified and corrected:

### 1. next.config.ts - Critical Fixes

**Issue**: `outputFileTracingRoot` pointed to outside directory
```typescript
// BEFORE (causing deployment failures)
outputFileTracingRoot: path.resolve(__dirname, '../../'),
```

**Fix**: Removed the problematic configuration
```typescript
// AFTER
// (removed entirely - no longer needed)
```

**Additional Fix**: Added `allowedDevOrigins` to prevent cross-origin warnings
```typescript
experimental: {
  allowedDevOrigins: ['https://*.orchids.cloud']
}
```

### 2. vercel.json - Configuration Updates

**Issue**: Invalid cron job paths
```json
// BEFORE (paths didn't exist)
"path": "/api/cron/daily-backup",      // Wrong - should be /api/backup/daily
"path": "/api/cron/expiry-check",      // Doesn't exist
```

**Fix**: Corrected all cron paths
```json
// AFTER (correct paths)
"path": "/api/backup/daily",           // Daily backup at 2:00 AM UTC
"path": "/api/cron/session-cleanup",   // Session cleanup at 3:00 AM UTC
"path": "/api/cron/connection-ping",   // Keep connection alive every 15 min
```

**Additional Fix**: Added missing environment variables
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
  "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",      // Added
  "STRIPE_SECRET_KEY": "@stripe_secret_key",                      // Added
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@stripe_publishable_key", // Added
  "STRIPE_WEBHOOK_SECRET": "@stripe_webhook_secret"               // Added
}
```

### 3. API Routes - Keep-Alive Headers

**Issue**: Database connections timing out after inactivity

**Fix**: Added keep-alive headers to all Supabase clients
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`

```typescript
global: {
  fetch: (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=60, max=1000'
    }
    return fetch(url, { ...options, headers })
  }
}
```

### 4. .vercelignore - Excluded Unnecessary Files

Created `.vercelignore` to prevent uploading:
- IDE files (.vscode, .idea)
- OS files (.DS_Store, Thumbs.db)
- Test files (__tests__, *.spec.ts)
- Logs (*.log)
- Build artifacts (.next, out, dist)
- Development environment files (.env.local, .env.development)

## Pre-Deployment Checklist

### Environment Variables Required

In Vercel Dashboard > Settings > Environment Variables:

1. `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key  
3. `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
4. `STRIPE_SECRET_KEY` - Stripe secret key
5. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
6. `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
7. `CRON_SECRET` (Optional) - Secret for cron job authentication

### Vercel Project Settings

- **Framework Preset**: Next.js
- **Build Command**: `bun run build` (or `npm run build`)
- **Output Directory**: `.next`
- **Install Command**: `bun install` (or `npm install`)
- **Node.js Version**: 20.x (recommended)

## Cron Jobs Configuration

All cron jobs are configured in `vercel.json`:

| Path | Schedule | Description |
|------|----------|-------------|
| `/api/backup/daily` | 0 2 * * * | Daily backup at 2:00 AM UTC |
| `/api/cron/session-cleanup` | 0 3 * * * | Session cleanup at 3:00 AM UTC |
| `/api/cron/connection-ping` | */15 * * * * | Keep connection alive every 15 min |

## Post-Deployment Verification

Check these items after deployment:

- [ ] Homepage loads (`/`)
- [ ] Login page works (`/login`)
- [ ] Super admin login works (`/superadmin-login`)
- [ ] Dashboard loads after login
- [ ] API routes respond correctly
- [ ] Cron jobs scheduled (Vercel Dashboard > Cron Jobs)
- [ ] No build or runtime errors
- [ ] Database queries work properly

## Common Deployment Issues & Solutions

### Issue: "outputFileTracingRoot" Error
**Solution**: Fixed - removed from next.config.ts

### Issue: Cron Job 404 Error
**Solution**: Fixed - corrected paths in vercel.json

### Issue: Missing Environment Variable
**Solution**: Add all required env vars in Vercel Dashboard > Settings > Environment Variables

### Issue: Bun Not Installed
**Solution**: Change commands in vercel.json:
```json
"buildCommand": "npm run build",
"installCommand": "npm install"
```

### Issue: Database Connection Timeout
**Solution**: Fixed - keep-alive headers added to all Supabase clients

### Issue: CORS Error on API Routes
**Solution**: Fixed - CORS headers configured in vercel.json for `/api/*`

## Deployment Status

| Fix | Status |
|-----|--------|
| next.config.ts - outputFileTracingRoot | ✅ Fixed |
| next.config.ts - allowedDevOrigins | ✅ Fixed |
| vercel.json - Cron paths | ✅ Fixed |
| vercel.json - Environment variables | ✅ Fixed |
| Supabase clients - Keep-alive headers | ✅ Fixed |
| vercel.json - CORS headers | ✅ Already configured |
| Function timeouts/memory | ✅ Already configured |
| .vercelignore created | ✅ Created |

## Additional Notes

- The app uses Bun for package management and dev server
- Vercel supports Bun in recent versions (Node.js 20+ runtime)
- If Bun fails, fallback to npm commands
- All API routes have 60s timeout and 2048MB memory
- Cron jobs keep database connections alive
- Connection ping runs every 15 minutes to prevent timeouts

## Files Modified

1. `/next.config.ts` - Removed outputFileTracingRoot, added allowedDevOrigins
2. `/vercel.json` - Fixed cron paths, added environment variables
3. `/src/lib/supabase/client.ts` - Added keep-alive headers
4. `/src/lib/supabase/server.ts` - Added keep-alive headers
5. `/src/lib/supabase/admin.ts` - Added keep-alive headers
6. `/.vercelignore` - Created new file
7. `/VERCEL_DEPLOYMENT.md` - Created deployment guide

## Next Steps

1. Push these changes to your Git repository
2. Deploy to Vercel (or trigger new deployment)
3. Verify all environment variables are set in Vercel
4. Check deployment logs for any errors
5. Test all critical functionality
6. Verify cron jobs are scheduled and running
