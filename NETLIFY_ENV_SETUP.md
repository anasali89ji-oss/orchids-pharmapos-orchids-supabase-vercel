# Netlify Environment Variables Setup Guide

Quick reference for setting up environment variables in Netlify for PharmaPOS.

---

## Environment Variables Configuration

### Navigate to Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. **Site Settings** → **Build & Deploy** → **Environment Variables**

---

## Required Variables

### 1. Supabase Configuration

#### NEXT_PUBLIC_SUPABASE_URL

**Required:** All environments (Production, Preview, Branch Deployments)

**Format:** `https://your-project-id.supabase.co`

**Example:**
```
NEXT_PUBLIC_SUPABASE_URL=https://ijphfdpifpxgbdogruan.supabase.co
```

**How to get it:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy "Project URL"

---

#### NEXT_PUBLIC_SUPABASE_ANON_KEY

**Required:** All environments

**Format:** JWT public key (starts with `eyJhbGci...`)

**Example:**
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcGhmZHBpZnB4Z2Jkb2dydWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzksImV4cCI6MjA4NDc2MDc3OX0.lR9hkkQl84rgrN20lPw_CtrXORNcd5eAajKvpGXVwQA
```

**How to get it:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy "anon public" key

---

#### SUPABASE_SERVICE_ROLE_KEY

**Required:** Preview & Production only (NOT Development)

**Format:** JWT service role key (starts with `eyJhbGci...`)

**Example:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcGhmZHBpZnB4Z2Jkb2dydWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4NDc3OSwiZXhwIjoyMDg0NzYwNzc5fQ.ftNNUhLhYlPLwC34bqt1UyGs5AMFuiKkE7k0ip9wWl4
```

**How to get it:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Settings → API
- Copy "service_role" key (NOT the public one)

**⚠️ SECURITY WARNING:** Never store this in browser-exposed code. Use only on server-side.

---

### 2. Stripe Configuration

#### NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

**Required:** All environments

**Format:** `pk_test_...` or `pk_live_...`

**Example:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51T21WXIoLYOHkmqpvB7cpsASbJBhZ81L92XULsmQwarfSoQOBKjxku7IAbHfokZjiLJu9BaPPI4k1NdE0K6uUivx00UAEBloEq
```

**How to get it:**
- Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- Copy "Publishable key"

---

#### STRIPE_SECRET_KEY

**Required:** Preview & Production only

**Format:** `sk_test_...` or `sk_live_...`

**Example:**
```
STRIPE_SECRET_KEY=sk_test_51T21WXIoLYOHkmqpwlBy0CGRHHDiIX6jUXzZcroE7jUx36eqPPpa5rI1hWYPIVSvyFABXeWerTZec72uveISezFU00hNySJNtj
```

**How to get it:**
- Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- Copy "Secret key"

**⚠️ SECURITY WARNING:** Never expose this in client-side code.

---

#### STRIPE_WEBHOOK_SECRET

**Required:** Preview & Production only

**Format:** `whsec_...`

**Example:**
```
STRIPE_WEBHOOK_SECRET=whsec_1AnFYRVeN5HNgNQOXcUNsIBK9ByhraiG
```

**How to set it up:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Add endpoint: `https://your-site.netlify.app/api/stripe/webhook`
3. For "Events to send", select relevant events:
   - `charge.succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Save endpoint
5. Copy "Signing secret" (click on the endpoint to reveal)

---

### 3. Cron Security

#### CRON_SECRET

**Required:** Preview & Production only

**Format:** Random 64-character hexadecimal string

**Example:**
```
CRON_SECRET=a1b2c3d4e5f67890...
```

**How to generate:**

#### Option 1: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Option 2: Using Python
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### Option 3: Using OpenSSL
```bash
openssl rand -hex 32
```

**Why needed:** Secures cron job endpoints from unauthorized access. Must match configuration in `netlify.toml` and API routes.

---

## Your Current Production Values

Copy these directly into Netlify Dashboard:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ijphfdpifpxgbdogruan.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcGhmZHBpZnB4Z2Jkb2dydWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzksImV4cCI6MjA4NDc2MDc3OX0.lR9hkkQl84rgrN20lPw_CtrXORNcd5eAajKvpGXVwQA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcGhmZHBpZnB4Z2Jkb2dydWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE4NDc3OSwiZXhwIjoyMDg0NzYwNzc5fQ.ftNNUhLhYlPLwC34bqt1UyGs5AMFuiKkE7k0ip9wWl4

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51T21WXIoLYOHkmqpvB7cpsASbJBhZ81L92XULsmQwarfSoQOBKjxku7IAbHfokZjiLJu9BaPPI4k1NdE0K6uUivx00UAEBloEq
STRIPE_SECRET_KEY=sk_test_51T21WXIoLYOHkmqpwlBy0CGRHHDiIX6jUXzZcroE7jUx36eqPPpa5rI1hWYPIVSvyFABXeWerTZec72uveISezFU00hNySJNtj
STRIPE_WEBHOOK_SECRET=whsec_1AnFYRVeN5HNgNQOXcUNsIBK9ByhraiG

# Cron Security
CRON_SECRET=[GENERATE_A_NEW_ONE_HERE]
```

---

## Adding Variables in Netlify

### Step-by-Step

1. **Navigate to Settings**
   - Open your site in Netlify
   - Click **Site Settings**
   - Scroll to **Build & Deploy**
   - Click **Environment Variables**

2. **Add Each Variable**
   - Click **Add variable**
   - Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the **Value** (paste from above)
   - Click **Save**
   - Repeat for all variables

3. **Environment Scopes**
   - For most variables, leave scope as "All environments"
   - For secrets like `STRIPE_SECRET_KEY`, you can limit to:
     - Production only
     - Preview and Production (exclude Development)

4. **Save & Deploy**
   - After adding all variables, click **Save**
   - Netlify will trigger a new build
   - Wait for deployment to complete

---

## Using Environment Variables in Code

### Client Components (NEXT_PUBLIC_)

```typescript
// Access in React components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
```

### Server Components & API Routes

```typescript
// Access in server-side code
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
```

### Cron Endpoint Security

```typescript
// /api/cron/connection-ping/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Your cron logic here
  await performScheduledTask()
  
  return new Response('OK', { status: 200 })
}
```

---

## Testing Environment Variables

### Locally

1. Copy variables to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ijphfdpifpxgbdogruan.supabase.co
# ... rest of your variables
```

2. Restart dev server:
```bash
npm run dev
```

3. Test in browser console:
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### On Netlify

1. Deploy after setting variables
2. Check build logs for missing variables
3. Test API routes:
```bash
curl https://your-site.netlify.app/api/cron/connection-ping
```

---

## Troubleshooting

### Variable Not Found Error

**Symptom:** Build or runtime error with `process.env.VARIABLE_NAME is undefined`

**Solutions:**
1. Verify variable name matches exactly (case-sensitive)
2. Check variable is set in correct environment scope
3. Redeploy after adding new variables
4. Check for typos in variable name

### Stripe Webhook Verification Fails

**Symptom:** Webhook endpoint returns error

**Solutions:**
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard exactly
2. Check webhook endpoint URL is correct in Stripe
3. Verify webhook is sending events
4. Check Stripe webhook signing method

### Cron Jobs Not Executing

**Symptom:** Scheduled functions not running

**Solutions:**
1. Verify `CRON_SECRET` is set in Netlify
2. Check cron syntax in `netlify.toml`
3. Verify API routes check for `x-cron-secret` header
4. Check Netlify Functions logs for errors

---

## Best Practices

1. **Never commit secrets to Git**
   - Use `.gitignore` to exclude `.env.local`
   - Only document public keys in code

2. **Use different keys for Production**
   - Don't use test keys in production
   - Generate separate production keys

3. **Rotate secrets regularly**
   - Change sensitive keys periodically
   - Update webhook secrets when changed

4. **Use environment-specific keys**
   - Test keys for preview deployments
   - Live keys for production only

5. **Minimize secret exposure**
   - Only use `NEXT_PUBLIC_` when necessary
   - Keep server secrets off client side

---

## Quick Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (Production only)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set
- [ ] `STRIPE_SECRET_KEY` set (Production only)
- [ ] `STRIPE_WEBHOOK_SECRET` set (Production only)
- [ ] `CRON_SECRET` generated and set (Production only)
- [ ] Webhook endpoint added to Stripe dashboard
- [ ] Test deployment after variables set
- [ ] Verify API routes work in production

---

## Additional Documentation

- [Full Netlify Deployment Guide](./NETLIFY_DEPLOYMENT_GUIDE.md)
- [Main Deployment Documentation](./DEPLOYMENT_GUIDE.md)
- [System Architecture](./ARCHITECTURE.md)

---

**Last Updated:** February 19, 2026
