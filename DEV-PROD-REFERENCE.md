# Dev/Prod Environment Reference

## Quick Environment Check

**How to know which environment you're in:**
- Check the phone number you're using!

---

## 🟢 PRODUCTION Environment

**URL:** https://beta-test-five.vercel.app

**Database:** My2Cents-prod (`qybzttjbjxmqdhcstuif`)

**Test Phone Numbers:**
- `918130944414` → OTP: `000000`
- `918056031046` → OTP: `000000`

**Use for:**
- Real user testing
- Final verification before release
- Demos to stakeholders

**⚠️ CAUTION:** Real data, be careful!

---

## 🔵 DEVELOPMENT Environment

**URL:** http://localhost:5173

**Database:** My2Cents-dev (`vcbmazhfcmchbswdcwqr`)

**Test Phone Numbers:**
- `918888888888` → OTP: `000000`
- `919999999999` → OTP: `000000`

**Use for:**
- Feature development
- Testing new changes
- Experimenting safely

**✅ SAFE:** Break things freely!

---

## Environment Variables

### Local Development (`.env.local`)
```
VITE_SUPABASE_URL=https://vcbmazhfcmchbswdcwqr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ Points to **DEV** database

### Vercel Production (Dashboard)
```
VITE_SUPABASE_URL=https://qybzttjbjxmqdhcstuif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
→ Points to **PROD** database

---

## Typical Workflow

1. **Develop locally** (DEV database)
   ```bash
   cd app
   npm run dev
   # Use phone: 918888888888
   ```

2. **Test thoroughly on localhost**
   - Create budgets, transactions
   - Test all features
   - Break things if needed!

3. **When ready, push to git**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push
   ```

4. **Vercel auto-deploys to production**
   - Uses PROD database
   - Real users see changes

5. **Test on production URL**
   - Use phone: `918130944414`
   - Verify everything works

---

## Emergency: Reset DEV Database

If DEV database gets messy, you can reset it:

```sql
-- Run in Supabase SQL Editor (DEV only!)
TRUNCATE TABLE transactions CASCADE;
TRUNCATE TABLE budget_allocations CASCADE;
TRUNCATE TABLE household_sub_categories CASCADE;
TRUNCATE TABLE monthly_plans CASCADE;
TRUNCATE TABLE household_members CASCADE;
TRUNCATE TABLE households CASCADE;
TRUNCATE TABLE users CASCADE;
```

**⚠️ NEVER run this on PROD!**

---

## Quick Links

### DEV Database
- Dashboard: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr
- SQL Editor: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/sql/new
- Auth Settings: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/auth/providers

### PROD Database
- Dashboard: https://supabase.com/dashboard/project/qybzttjbjxmqdhcstuif
- SQL Editor: https://supabase.com/dashboard/project/qybzttjbjxmqdhcstuif/sql/new
- Auth Settings: https://supabase.com/dashboard/project/qybzttjbjxmqdhcstuif/auth/providers

### Vercel
- Project: https://vercel.com/varshine-kollas-projects/beta-test
- Environment Variables: https://vercel.com/varshine-kollas-projects/beta-test/settings/environment-variables
- Deployments: https://vercel.com/varshine-kollas-projects/beta-test/deployments
