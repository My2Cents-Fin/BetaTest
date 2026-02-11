# Deployment Checklist

Use this checklist to deploy Finny to production.

## Pre-Deployment

- [ ] Code is tested and working locally
- [ ] All migrations are ready in `supabase/migrations/`
- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] No sensitive data hardcoded in source code
- [ ] App icons created (192x192 and 512x512 PNG)

## Supabase Setup

### Test Environment
- [ ] Created Supabase test project
- [ ] Saved project URL and anon key
- [ ] Ran all migrations (001, 003, 004, 005)
- [ ] Verified all tables exist in Table Editor
- [ ] Enabled phone authentication
- [ ] Configured SMS provider (Twilio/MessageBird)

### Production Environment
- [ ] Created Supabase production project
- [ ] Saved project URL and anon key (different from test)
- [ ] Ran all migrations (001, 003, 004, 005)
- [ ] Verified all tables exist in Table Editor
- [ ] Enabled phone authentication
- [ ] Configured SMS provider (Twilio/MessageBird)
- [ ] SMS credits topped up for production use

## GitHub Setup

- [ ] Created private GitHub repository
- [ ] Pushed code to GitHub
- [ ] Verified code is in `main` branch

## Vercel Deployment

### Initial Setup
- [ ] Connected GitHub account to Vercel
- [ ] Imported repository
- [ ] Set Root Directory to `app`
- [ ] Set Build Command to `npm run build`
- [ ] Set Output Directory to `dist`
- [ ] Added test environment variables
- [ ] First deployment successful

### Production Configuration
- [ ] Edited environment variables to separate test/prod
- [ ] Added production VITE_SUPABASE_URL
- [ ] Added production VITE_SUPABASE_ANON_KEY
- [ ] Redeployed to production
- [ ] Verified production uses correct Supabase project

## PWA Configuration

- [ ] Created `/app/public/manifest.json`
- [ ] Created app icon: `/app/public/icon-192.png`
- [ ] Created app icon: `/app/public/icon-512.png`
- [ ] Updated `index.html` with manifest link
- [ ] Tested "Add to Home Screen" on mobile

## Testing

### Test Environment
- [ ] Can access test URL
- [ ] Phone signup works
- [ ] OTP is received
- [ ] Can create household
- [ ] Can freeze budget
- [ ] Can add transactions
- [ ] Can add fund transfers (if multiple members)
- [ ] Dashboard shows correct balances
- [ ] Transactions list displays correctly

### Production Environment
- [ ] Can access production URL
- [ ] Phone signup works
- [ ] OTP is received
- [ ] Created test household (not your real data)
- [ ] All critical flows work
- [ ] Using production Supabase (check database)

## Security Checklist

- [ ] GitHub repo is private
- [ ] Production database has strong password
- [ ] `.env.local` never committed to git
- [ ] Different Supabase credentials for test vs prod
- [ ] RLS policies enabled on all tables
- [ ] SMS rate limiting configured
- [ ] No API keys exposed in client code

## Go-Live

- [ ] Decided on app name (Finny or My2cents)
- [ ] Optional: Configured custom domain
- [ ] Optional: Set up analytics
- [ ] Optional: Set up error monitoring (Sentry)
- [ ] Created user onboarding guide (if needed)
- [ ] Planned beta user rollout
- [ ] Set up user feedback channel
- [ ] Communicated production URL to beta users

## Post-Deployment

- [ ] Monitored first few user signups
- [ ] Verified SMS delivery working
- [ ] Checked for any errors in Vercel logs
- [ ] Verified database activity in Supabase
- [ ] Collected initial user feedback

---

## Environment URLs

| Environment | Purpose | URL | Supabase |
|------------|---------|-----|----------|
| Test | Development & testing | `https://finny-xxx-test.vercel.app` | finny-test |
| Production | Real users | `https://finny-xxx.vercel.app` | finny-prod |

## Quick Commands

```bash
# Test locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy (push to GitHub, Vercel auto-deploys)
git add .
git commit -m "Your message"
git push
```

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev
