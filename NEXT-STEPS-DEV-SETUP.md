# Next Steps: Complete DEV Database Setup

> **ARCHIVED (Feb 2026):** DEV setup is COMPLETE. Schema has been copied to DEV, phone auth configured, local dev tested. See `DEV-PROD-REFERENCE.md` for current environment details.

## Current Status ✅
- ✅ DEV Supabase project created: `vcbmazhfcmchbswdcwqr.supabase.co`
- ✅ Local `.env.local` updated to use DEV database
- ✅ Vercel production uses PROD database
- ✅ Full schema copied to DEV database
- ✅ Phone auth configured on DEV with test numbers
- ✅ Local development tested and working

## What Was Left to Do (NOW DONE) ✅

### Quick Setup (Recommended - 5 minutes)

The easiest way is to ask Claude in the **next session** to:

1. **Copy the full database schema from PROD to DEV**
   - Read the PROD database structure
   - Generate a complete SQL script
   - Run it on DEV database

2. **Configure phone auth on DEV**
   - Enable Phone provider
   - Add test phone numbers
   - Whitelist localhost

3. **Test local development**
   - Run `npm run dev`
   - Verify it connects to DEV database
   - Test auth flow

---

## If You Want to Do It Manually

### Step 1: Export PROD Schema

Go to: https://supabase.com/dashboard/project/qybzttjbjxmqdhcstuif/database/backups

- Click "Create backup" (just to be safe)
- Then use the SQL Editor to export schema

### Step 2: Import to DEV

Go to: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/sql/new

Paste the schema SQL and run it.

### Step 3: Configure Phone Auth on DEV

https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/auth/providers

1. Enable **Phone**
2. Check **"Enable phone test OTP"**
3. Add test numbers:
   ```
   918130944414=000000
   918056031046=000000
   919999999999=000000
   918888888888=000000
   ```

### Step 4: Whitelist localhost

https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/auth/url-configuration

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/**`

### Step 5: Test

```bash
cd app
npm run dev
```

---

## When It's Working

You'll have:
```
Local Dev → My2Cents-dev (safe testing)
Vercel Prod → My2Cents-prod (real users)
```

## Need Help?

Just ask Claude in the next session:
> "Help me finish setting up the DEV database - copy schema from PROD and configure auth"
