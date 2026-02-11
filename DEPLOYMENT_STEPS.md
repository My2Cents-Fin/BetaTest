# Quick Deployment Steps

Your code is ready! Follow these steps to deploy:

## ✅ Step 1: Git Initialized (DONE)
- Git repository initialized
- All files committed
- Ready to push to GitHub

## 📝 Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `finny` (or `my2cents`)
3. **IMPORTANT**: Keep it **Private**
4. Do NOT initialize with README, .gitignore, or license
5. Click "Create repository"

## 🚀 Step 3: Push Your Code

Copy and run these commands in your terminal:

```bash
cd "C:\Users\varshine.kolla\Documents\Personal\Finny"

# Add your GitHub repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/finny.git

# Push your code
git branch -M main
git push -u origin main
```

## 🗄️ Step 4: Set Up Supabase Projects

### Create Production Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `finny-prod`
4. Database Password: Choose a strong password and save it
5. Region: Singapore (closest to India)
6. Click "Create new project"
7. Wait ~2 minutes for setup

### Run Migrations
Once project is ready:
1. Go to SQL Editor
2. Create a new query
3. Copy and paste these migrations IN ORDER:

**Migration 1:** Copy contents from: `docs/migrations/001_budget_tables.sql`
- Click "Run"

**Migration 2:** Copy contents from: `docs/migrations/002_transactions_table.sql`
- Click "Run"

**Migration 3:** Copy contents from: `supabase/migrations/003_add_fund_transfer_support.sql`
- Click "Run"

**Migration 4:** Copy contents from: `supabase/migrations/004_add_household_members_user_fk.sql`
- Click "Run"

**Migration 5:** Copy contents from: `supabase/migrations/005_enforce_single_household_per_user.sql`
- Click "Run"

### Get API Keys
1. Go to Project Settings → API
2. Copy and save:
   - Project URL (e.g., `https://abc123xyz.supabase.co`)
   - anon/public key (long JWT token)

## 🌐 Step 5: Deploy to Vercel

### Initial Setup
1. Go to https://vercel.com
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository (`finny`)
5. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `app`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Add Environment Variables
Click "Environment Variables" and add:

**Variable 1:**
- Name: `VITE_SUPABASE_URL`
- Value: Your Supabase Project URL
- Environment: Production, Preview, Development (all)

**Variable 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: Your Supabase anon key
- Environment: Production, Preview, Development (all)

### Deploy!
1. Click "Deploy"
2. Wait 2-3 minutes
3. Your app will be live at: `https://finny-xxx.vercel.app`

## 📱 Step 6: Configure Phone Authentication

1. In Supabase Dashboard → Authentication → Providers
2. Enable "Phone" provider
3. Choose SMS Provider (Twilio recommended):
   - Sign up at https://www.twilio.com
   - Get phone number and API credentials
   - Add to Supabase settings
4. Test with your phone number

## ✨ Step 7: Test Your App!

1. Visit your Vercel URL
2. Sign up with your phone number
3. Create household
4. Create budget
5. Add transactions
6. Invite another user

## 🎉 You're Live!

Your app is now deployed and ready for real users!

**Your URLs:**
- Production: `https://your-app.vercel.app`
- Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

## 📊 Next Steps (Optional)

- Set up custom domain
- Add Google Analytics
- Set up error monitoring (Sentry)
- Create app icons (see `app/public/ICONS_README.md`)
- Invite beta users

## 🆘 Need Help?

- **Vercel Issues**: https://vercel.com/docs
- **Supabase Issues**: https://supabase.com/docs
- **Build Errors**: Check Vercel deployment logs

---

**Ready to deploy?** Start with Step 2 (Create GitHub Repository) above! 🚀
