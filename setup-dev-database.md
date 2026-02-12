# DEV Database Setup Instructions

## What We're Doing
Setting up the My2Cents-dev Supabase database with the same schema as production.

## Step 1: Run All Migrations

Go to: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/sql/new

Copy and paste ALL the SQL from your migration files in order. I've already read them - you have 4 migration files.

## Step 2: Configure Phone Auth

1. Go to: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/auth/providers
2. Enable **Phone** provider
3. Check **"Enable phone test OTP"**
4. Add test phone numbers:
   ```
   918130944414=000000
   918056031046=000000
   919999999999=000000
   918888888888=000000
   ```
5. Save

## Step 3: Whitelist localhost

1. Go to: https://supabase.com/dashboard/project/vcbmazhfcmchbswdcwqr/auth/url-configuration
2. Site URL: `http://localhost:5173`
3. Redirect URLs:
   ```
   http://localhost:5173/**
   ```
4. Save

## Step 4: Test Local Development

```bash
cd app
npm run dev
```

Should now connect to DEV database!

## Current Status

✅ Local `.env.local` updated to use DEV database
⏳ Need to run migrations on DEV
⏳ Need to configure phone auth on DEV
⏳ Need to test local dev

## Environment Summary

- **Local Dev:** My2Cents-dev (vcbmazhfcmchbswdcwqr)
- **Vercel Prod:** My2Cents-prod (qybzttjbjxmqdhcstuif)
