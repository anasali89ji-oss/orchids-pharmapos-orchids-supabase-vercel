# PharmaPOS — Vercel Deployment Guide

## 1. Import repo on Vercel

1. Go to **https://vercel.com/new**
2. Click **Import Git Repository**
3. Select `orchids-pharmapos-orchids-supabase-vercel`
4. Team: **anasali89ji-oss' projects**
5. Framework auto-detects as **Next.js** ✅
6. **Set env vars first (Step 2) before clicking Deploy**

---

## 2. Environment Variables

Add these in **Vercel → Project → Settings → Environment Variables**.
Set all to **Production + Preview + Development** unless noted.

### Required — app crashes without these

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL e.g. `https://pharmapos.vercel.app` |
| `CRON_SECRET` | Run `openssl rand -hex 32` and paste the output |

### Required for billing

| Variable | Where to get it |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → signing secret |

### Auto-set by Vercel (do NOT add manually)
- `NODE_ENV` — Vercel sets to `production`
- `VERCEL_URL` — injected per deployment

---

## 3. Deploy

Click **Deploy**. Build takes ~2–3 min.
Build command: `bun run build`
Install command: `bun install`

---

## 4. After deploy — Stripe Webhook

1. Stripe → Developers → Webhooks → **Add endpoint**
2. URL: `https://your-domain.vercel.app/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
4. Copy **Signing secret** → paste as `STRIPE_WEBHOOK_SECRET` in Vercel

---

## 5. Supabase Auth Callback URL

In **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: add `https://your-domain.vercel.app/reset-password`

---

## Cron Jobs (auto-configured via vercel.json)

| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/cron/connection-ping` | Every 4 min | Prevent cold starts |
| `/api/cron/db-keepalive` | Every 4 min | Keep Supabase connection warm |
| `/api/backup/daily` | 2:00 AM UTC | Daily backup |
| `/api/cron/session-cleanup` | 3:00 AM UTC | Clean expired sessions |

All cron routes require `Authorization: Bearer <CRON_SECRET>` header.
Vercel injects this automatically from env vars.
