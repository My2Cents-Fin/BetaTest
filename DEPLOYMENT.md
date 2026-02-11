# Deployment Guide - Finny 2.0

This guide will help you deploy Finny to production and set up a test environment.

## Prerequisites

- GitHub account (for code hosting)
- Vercel account (free tier is fine - sign up at vercel.com)
- Two Supabase projects (one for test, one for production)

## Step 1: Create Supabase Projects

### Test/Staging Environment

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name it: `finny-test` (or `my2cents-staging`)
4. Set a strong database password (save it securely)
5. Choose a region close to your users (e.g., Mumbai for India)
6. Click "Create new project"
7. Wait for project to be ready (~2 minutes)

### Production Environment

1. Repeat the above steps
2. Name it: `finny-prod` (or `my2cents-production`)
3. Use a **different** database password
4. Same region as test

### Get Your API Keys

For **each** project:

1. Go to Project Settings (gear icon) → API
2. Copy these values:
   - **Project URL** (e.g., `https://abc123xyz.supabase.co`)
   - **anon/public key** (the long JWT token)

## Step 2: Run Database Migrations

For **each** Supabase project (test and prod), run these SQL scripts in order:

1. Open Supabase Dashboard → SQL Editor
2. Click "New query"
3. Run each migration file in order:

### Migration Files (in order)

Copy the contents of each file and run in SQL Editor:

1. `supabase/migrations/001_budget_tables.sql`
2. `supabase/migrations/003_add_fund_transfer_support.sql`
3. `supabase/migrations/004_add_household_members_user_fk.sql`
4. `supabase/migrations/005_enforce_single_household_per_user.sql`

**Important:** Run ALL migrations on BOTH projects (test and prod).

### Verify Migrations

After running migrations, check Table Editor. You should see these tables:
- `categories`
- `sub_category_templates`
- `household_sub_categories`
- `budget_allocations`
- `monthly_plans`
- `households`
- `household_members`
- `users`
- `transactions`

## Step 3: Set Up GitHub Repository

1. Initialize git in your project (if not already done):
   ```bash
   cd C:\Users\varshine.kolla\Documents\Personal\Finny
   git init
   git add .
   git commit -m "Initial commit - Finny 2.0"
   ```

2. Create a new repository on GitHub:
   - Go to github.com
   - Click "New repository"
   - Name: `finny` (or `my2cents`)
   - Keep it **Private** (important for security)
   - Don't initialize with README (we already have code)

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/finny.git
   git branch -M main
   git push -u origin main
   ```

## Step 4: Deploy to Vercel

### Initial Deployment (Test Environment)

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `app`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

6. **Environment Variables** (Add these):
   ```
   VITE_SUPABASE_URL = <your-test-project-url>
   VITE_SUPABASE_ANON_KEY = <your-test-anon-key>
   ```

7. Click "Deploy"
8. Wait ~2 minutes for deployment
9. Your test app will be live at: `https://finny-xxx.vercel.app`

### Set Up Production Environment

1. In Vercel, go to your project → Settings → Environment Variables
2. Edit each variable:
   - Change them to "Preview" and "Development" only (remove Production)
3. Add new Production variables:
   - Click "Add Another"
   - Name: `VITE_SUPABASE_URL`
   - Value: Your **production** Supabase URL
   - Environment: Select **Production** only
   - Save

   - Click "Add Another"
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Your **production** Supabase anon key
   - Environment: Select **Production** only
   - Save

4. Redeploy:
   - Go to Deployments tab
   - Find latest deployment
   - Click "..." → "Redeploy"
   - Production will now use prod Supabase

### Result

Now you have:
- **Preview/Development:** Uses test Supabase (for testing)
- **Production:** Uses production Supabase (for real users)
- **Auto-deploy:** Every git push triggers a preview deployment
- **Manual promotion:** You manually promote previews to production

## Step 5: Configure PWA (Progressive Web App)

Your app needs a manifest.json for mobile "Add to Home Screen" functionality.

1. Create `app/public/manifest.json` (see repo for example)
2. Create app icons (512x512 and 192x192 PNG files)
3. Update `app/index.html` to reference manifest

These files are in the repo template.

## Step 6: Set Up Phone Authentication in Supabase

For **each** Supabase project:

1. Go to Authentication → Providers
2. Enable "Phone" provider
3. Configure SMS provider (choose one):
   - **Twilio** (recommended for India)
   - **MessageBird**
   - **Vonage**

4. Get SMS provider credentials and add to Supabase settings

## Step 7: Test Your Deployment

### Test Environment

1. Visit your Vercel preview URL
2. Try to sign up with your phone number
3. Create a household
4. Add a budget
5. Record some transactions
6. Verify everything works

### Production Environment

1. Visit your production URL (or vercel.app domain)
2. Do NOT use your personal number (save for real use)
3. Test with a test phone number
4. Verify it's using production Supabase (check database)

## Environment URLs

After deployment, you'll have:

| Environment | URL | Supabase Project |
|------------|-----|------------------|
| Test/Preview | `https://finny-xxx-test.vercel.app` | finny-test |
| Production | `https://finny-xxx.vercel.app` | finny-prod |

## Continuous Deployment Workflow

1. **Make changes** in your local code
2. **Test locally** with `npm run dev`
3. **Commit and push** to GitHub
   ```bash
   git add .
   git commit -m "Add new feature"
   git push
   ```
4. **Vercel auto-deploys** to preview environment
5. **Test** the preview deployment
6. **Promote to production** manually in Vercel dashboard

## Troubleshooting

### Build Fails

- Check build logs in Vercel
- Ensure `package.json` is in `app/` directory
- Verify all dependencies are listed in `package.json`

### Environment Variables Not Working

- Ensure variable names start with `VITE_`
- Redeploy after adding variables
- Check they're set for correct environment (Production vs Preview)

### Database Connection Issues

- Verify Supabase URL and anon key are correct
- Check RLS policies are enabled (they should be from migrations)
- Ensure migrations ran successfully

### Phone Auth Not Working

- Check SMS provider is configured in Supabase
- Verify SMS credits/balance
- Check rate limits haven't been hit

## Security Checklist

Before going live with real users:

- [ ] Production Supabase project has strong password
- [ ] GitHub repository is private
- [ ] `.env.local` is in `.gitignore` (it is by default)
- [ ] Different Supabase projects for test vs prod
- [ ] RLS policies are enabled on all tables
- [ ] SMS provider has rate limiting configured
- [ ] You've tested all critical flows in production

## Next Steps

1. Set up custom domain (optional)
2. Configure analytics (Google Analytics, Mixpanel, etc.)
3. Set up error monitoring (Sentry)
4. Plan beta user rollout
5. Create user feedback channel

---

**Need help?** Check Vercel docs or Supabase docs, or reach out to your dev team.
