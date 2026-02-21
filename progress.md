# Progress — My2cents (formerly Finny)

> **This file is the source of truth for project progress.** Read it at the start of every session. Update it at the end of every session and at regular intervals during long sessions. This is non-negotiable.

## Last Updated
2026-02-21

## Last Session Summary
**Session 31: Bank Statement Import — Full Build (PDF + CSV)**

### What Was Done
- **Built the complete bank statement import feature** — both PDF and CSV support
- User pivoted from CSV-only to **PDF as primary format** (most convenient on mobile)
- Installed dependencies: `pdfjs-dist` (PDF parsing, ~260KB gzipped, lazy loaded), `papaparse` (CSV), `@types/papaparse`
- **8 new files created**, **4 existing files modified**, TypeScript + build pass clean

### New Files Created
1. **`supabase/migrations/011_csv_import_support.sql`** — Adds `source` (manual/csv_import) and `original_narration` columns to transactions table, indexes for import source and uncategorized transactions
2. **`app/src/modules/transactions/data/merchantRules.ts`** — Static merchant keyword→sub-category rules for 21 Indian merchant categories (Groceries, Food Ordering, Dining Out, Fuel, Shopping, Entertainment, Subscriptions, Phone Bill, Internet, Medical, Transport, Personal Care, Electricity, Water, Society Maintenance, Maid/Help, Insurance, EMI/Loan, Rent, Salary, General Savings)
3. **`app/src/modules/transactions/services/merchantMatcher.ts`** — Matching logic: keyword match → lookup subCategoryName in household → suggest if exists, leave uncategorized if not
4. **`app/src/modules/transactions/services/pdfParser.ts`** — Three-layer PDF architecture: text extraction with X/Y coordinates → table reconstruction via Y-coordinate grouping → bank-specific parsers (HDFC, ICICI, SBI, Generic). Handles password-protected PDFs, multi-line narrations, lazy-loads pdfjs-dist via dynamic import with CDN worker
5. **`app/src/modules/transactions/services/csvParser.ts`** — CSV parsing with papaparse, auto-detects bank format from column headers (HDFC, ICICI, SBI, Kotak, Axis, Generic), handles multiple date formats
6. **`app/src/modules/transactions/services/statementImport.ts`** — Orchestration: parseStatementFile (routes to PDF/CSV), prepareImportCandidates (merchant matching + duplicate detection), commitImport (batch insert in groups of 50)
7. **`app/src/modules/transactions/components/StatementImportModal.tsx`** — Multi-step modal (upload → preview → importing → done) with glass design. File upload (drag & drop, PDF/CSV), password prompt for protected PDFs, preview with category suggestions (AI confidence tags), inline category editing, select all/deselect duplicates, summary stats

### Existing Files Modified
1. **`app/src/modules/budget/types.ts`** — `sub_category_id: string → string | null`, added `source: TransactionSource`, `original_narration: string | null`, new types: `ParsedStatementTransaction`, `StatementParseResult`, `ImportCandidate`, `TransactionSource`
2. **`app/src/modules/budget/services/transactions.ts`** — `createTransaction()` includes source/original_narration; `getTransactions()` maps null sub_category_id non-transfers to "Uncategorised" with ❓ icon; `updateTransaction()` accepts null subCategoryId and transactionType for re-categorizing imports
3. **`app/src/modules/transactions/components/TransactionsTab.tsx`** — Import button in both mobile and desktop headers, `showImport` state, raw sub-categories + categoryMap for import modal, fixed filter logic for null sub_category_id, amber "Uncategorised" badge on transaction cards, renders StatementImportModal
4. **`app/src/modules/dashboard/components/QuickAddTransaction.tsx`** — Shows read-only "Bank Description" field for imported transactions in edit mode, allows null sub_category_id in edit mode (save without categorizing), passes transactionType in update call
5. **`app/src/modules/dashboard/components/DashboardTab.tsx`** — Uncategorized expenses added to daily spending velocity; "Uncategorised" row (amber, ❓ icon) in "Daily Expenses to Watch" section with "Imported, needs review" subtext

### Build Status
- TypeScript: ✅ Zero errors (`npx tsc --noEmit`)
- Vite build: ✅ Passes clean (PDF.js properly code-split as separate 404KB chunk, lazy loaded)

### Still Needed Before Testing
- **Run migration `011_csv_import_support.sql`** on DEV Supabase before testing
- Test with real HDFC/ICICI/SBI bank statement PDFs and CSVs
- Verify password-protected PDF handling on mobile

### Previous Session 30: CSV Import Planning
- Plan approved, saved at `.claude/plans/velvety-knitting-noodle.md`

### MPIN Auth (Session 29 - completed)
- ✅ MPIN auth fully deployed and working on DEV
- ✅ PROD migration instructions provided to user
- ✅ Fixed `email_confirmed_at` issue for migrated OTP users

**Previous Session 29: Replace OTP Login with MPIN-Based Login**

### Auth Architecture Change
Replaced Supabase phone OTP auth (SMS-based, costs per login) with 6-digit MPIN system (zero SMS cost). Phone number remains the identifier, but authentication uses `supabase.auth.signUp/signInWithPassword` with email = `{phone}@my2cents.app` and password = the MPIN.

### New Files Created
- **`supabase/migrations/010_user_pins.sql`** — `user_pins` table, `check_phone_registered` RPC (anon-callable), `reset_user_pin` RPC (SECURITY DEFINER, updates auth.users.encrypted_password + user_pins), migration block for existing OTP users (adds email/password to auth records, preserves user_id)
- **`app/src/modules/auth/components/SetPinScreen.tsx`** — Two-step PIN creation (enter + confirm). Used for both new user signup and PIN reset. Validates PIN strength (rejects all-same-digit, 123456, 654321). Split-screen layout matching existing auth screens.
- **`app/src/modules/auth/components/EnterPinScreen.tsx`** — PIN login screen for existing users. Masked phone display, auto-submit on 6 digits, "Forgot PIN?" link to reset flow.

### Modified Files
- **`auth.ts`** — Removed `sendOTP()`, `verifyOTP()`. Added `phoneToEmail()`, `checkPhoneExists()` (RPC call), `signUpWithPin()`, `signInWithPin()`, `resetPin()` (RPC call). Kept `signOut`, `getOnboardingStatus`, etc unchanged.
- **`PhoneEntryScreen.tsx`** — Now calls `checkPhoneExists()` on Continue, navigates to `/enter-pin` (existing) or `/set-pin` (new) instead of `/verify`.
- **`OTPInput.tsx`** — Added `masked?: boolean` prop with `-webkit-text-security: disc` for PIN dot masking.
- **`Router.tsx`** — Added `/set-pin` and `/enter-pin` routes (PublicRoute-guarded). Removed `/verify` route. OTPScreen import removed.
- **`app.config.ts`** — Added `phone_pin` login method, `pinLength: 6`, `emailDomain: 'my2cents.app'`.
- **`validation.ts`** — Added `validatePin()` (6-digit, rejects trivial PINs) and `maskPhone()` (xxxxx 43210).
- **`ProfilePanel.tsx`** — Phone display reads from `user_metadata.phone_number` (MPIN auth) with fallback to `user.phone` (OTP auth).
- **`onboarding.ts`** — Phone extraction in `updateDisplayName` handles MPIN auth metadata.

### Database Migration (DEV)
- ✅ Ran `010_user_pins.sql` on DEV Supabase (`vcbmazhfcmchbswdcwqr`) — `user_pins` table, `check_phone_registered` RPC, `reset_user_pin` RPC, existing OTP user migration all created successfully.
- ✅ Disabled "Confirm email" in DEV Supabase Auth → Sign In / Providers settings.
- ✅ Tested new user flow: enter phone → detected as new → navigated to "Create your PIN" screen. Working end-to-end.

### Deployment Notes (PROD)
- **Still needed for PROD**: Run `010_user_pins.sql` on PROD Supabase (`qybzttjbjxmqdhcstuif`) and disable email confirmations there.
- **Existing user migration**: Existing OTP users get email + temporary PIN `000000`. Set real PINs via `SELECT reset_user_pin('918130944414@my2cents.app', 'XXXXXX')` in SQL editor.
- **OTPScreen.tsx** is now dead code (not imported anywhere) — can be deleted in a cleanup pass.

### Build Status
- TypeScript: ✅ Zero errors (`npx tsc --noEmit` passes clean)
- Vite build: ✅ Passes clean

**Previous Session 28: CategoryMultiSelect Search-Select, Dashboard Drill-Down, UX Fixes, Demo Data**

### CategoryMultiSelect Improvements
- **Search-select pattern:** Replaced button trigger with input element that serves as both display ("Search categories") and search field. Typing opens dropdown and filters sub-categories by name/category. Size aligned with MemberMultiSelect using explicit `h-[34px]`, `leading-none`, `style={{ fontSize: '12px' }}`.
- **Quick Select shortcuts:** Changed from 2-column grid with color dots to vertical list layout.
- **Search filtering:** Filters sub-categories by name or parent category name, filters shortcuts by type name.

### Dashboard → Transactions Drill-Down
Clicking any sub-category in "Daily Expenses to Watch" or "Overspent Categories" on Dashboard navigates to Transactions tab pre-filtered for that sub-category.
- `AppLayout.tsx`: Added `drillDownSubCategoryId` state, `handleCategoryDrillDown` callback, `handleDrillDownConsumed`
- `DashboardTab.tsx`: Added `onCategoryDrillDown` prop, made rows clickable with chevron icon
- `TransactionsTab.tsx`: Added `drillDownSubCategoryId` and `onDrillDownConsumed` props, useEffect to apply filter on mount
- Filter badge shows active, user can reset filters to return to normal view

### UX Fixes
- **Phone validation:** Inline validation errors shown as user types (not just on disabled Continue click). Added `touched` state and `showInlineError` logic in `PhoneEntryScreen.tsx`.
- **Enter key support:** Name entry (`YourNameScreen.tsx`), household creation both create and join modes (`HouseholdScreen.tsx`) now submit on Enter key.

### Demo Household Seed Data
- Created `supabase/migrations/SEED_DEMO_HOUSEHOLD.sql` for prod demo
- PL/pgSQL DO block with realistic data: 2 users (Ravi & Priya Sharma), full household, 32 sub-categories, frozen budget (₹1,85,000 income / ₹1,72,500 allocated), 60+ transactions
- Dashboard designed to show at-risk categories (Food Ordering 95%, Dining Out 88%, Shopping 82%, Entertainment 77%) and overspent (Electricity 114%)
- 3 fund transfers between members, mix of payment methods
- UUIDs: Ravi=4ee05567, Priya=7466b2f9

**Previous Session 26: Filter Overlay Fix (React Portal) + Glass Design Completion**

### Filter Overlay Fix (Critical Bug)
The filter dropdowns in TransactionsTab and BudgetTab were appearing as "orphaned modals" on the left side of the screen instead of overlaying near the filter button. Root cause: CSS `backdrop-filter` on ancestor elements (`.glass-header`, `.glass-card`) creates containing blocks that trap `fixed` positioned descendants.

**Fix:** Used `ReactDOM.createPortal(dropdown, document.body)` to render filter dropdowns directly at the document root, completely escaping all ancestor containing blocks.

Changes:
- `TransactionsTab.tsx` — Added `createPortal` import; filter dropdown now renders via portal with transparent backdrop for click-outside-to-close; replaced `glass-card glass-card-elevated` with `bg-white rounded-2xl border` (no `backdrop-filter`/`overflow: hidden`)
- `BudgetTab.tsx` — Same portal pattern for budget member filter dropdown

### Glass Design Completion (from Session 25 continuation)
Completed glass design conversion for remaining components:
- `InlineAddItem.tsx` — Full glass design conversion
- `WelcomeCard.tsx` — `bg-primary-gradient`
- `ExpenseSelectionScreen.tsx` — `bg-primary-gradient`
- `InlineAddCategory.tsx` — Full glass design conversion
- `ErrorAlert.tsx` — CSS var danger colors

### Previous Session 25 fixes (preserved)
- Transactions summary card widened
- Income amounts red bleed-through fixed (opaque bg)
- Icon-header padding reduced
- Notification icon removed from Dashboard
- Overspent Categories restructured

### Previous: Sessions 22-24 — Dreamy Glass Design Language

Applied a comprehensive "dreamy glass" design language across the entire My2cents PWA.

### Design Foundation Layer
- **CSS Custom Properties** in `app/src/index.css`: `--color-primary: #7C3AED`, `--color-page-bg`, `--color-success`, `--color-danger`, `--glass-blur`, `--glass-border`, `--glass-shadow`, `--color-primary-bg`, `--color-success-bg`
- **Utility Classes**: `.glass-card`, `.glass-card-elevated`, `.glass-header`, `.glass-nav`, `.bg-primary-gradient`, `.noise-overlay`
- **NoiseOverlay component** (`app/src/shared/components/NoiseOverlay.tsx`): SVG fractal noise texture overlay on page bg
- **GlassCard component** (`app/src/shared/components/GlassCard.tsx`): Reusable frosted glass card

### Files Modified (30+ components)
**Dashboard:** DashboardScreen.tsx, WelcomeCard.tsx, BudgetSection.tsx (dashboard), BudgetItem.tsx (dashboard), InlineAddItem.tsx, QuickAddTransaction.tsx, FundTransferModal.tsx
**Budget:** BudgetTab.tsx, BudgetViewMode.tsx, InlineIncomeSection.tsx, MonthSelector.tsx, CategoryTile.tsx, AmountInput.tsx, InlineAddCategory.tsx, ExpenseSelectionScreen.tsx
**Transactions:** TransactionsTab.tsx
**Auth:** PhoneEntryScreen.tsx, OTPScreen.tsx, SuccessScreen.tsx, OTPInput.tsx, PhoneInput.tsx
**Onboarding:** YourNameScreen.tsx, HouseholdScreen.tsx, InviteScreen.tsx
**Shared:** ProfilePanel.tsx, Toast.tsx, MemberMultiSelect.tsx, ErrorAlert.tsx, Input.tsx, NavItem.tsx, ProgressDots.tsx
**App:** Router.tsx (LoadingScreen)

### Design Conversion Patterns Applied
- `bg-stone-50` → `bg-[var(--color-page-bg)]`
- `bg-white rounded-xl` → `glass-card`
- `bg-white border-b` headers → `glass-header`
- `bg-purple-600/700/800` buttons → `bg-primary-gradient` with shadow `shadow-[0_4px_16px_rgba(124,58,237,0.3)]` + hover lift
- `rounded-lg` → `rounded-xl` throughout
- `text-purple-XXX` → `text-[var(--color-primary)]`
- Modal backdrops → `bg-black/40 backdrop-blur-sm`
- Modal cards → `bg-white/90 backdrop-blur-xl rounded-t-3xl md:rounded-2xl`
- Inputs → `border-[rgba(124,58,237,0.15)] rounded-xl bg-white/75` with glass focus ring
- Dropdowns → `bg-white/90 backdrop-blur-xl` with glass shadow
- Emojis in headers → SVG line icons in `rounded-lg bg-[var(--color-primary-bg)]` containers
- Hover states → `hover:bg-white/40` or `hover:bg-white/60`
- Borders → `border-[rgba(124,58,237,0.06)]` for separators

### Build Status
- TypeScript: ✅ Zero errors (`npx tsc --noEmit` passes clean)
- Zero hardcoded `purple-` or `indigo-` class references in any `.tsx` file (only in comments)

---

## Completed

### Documentation
- [x] **Documentation audit (Feb 2026):** All docs compared against codebase and updated to reflect reality. Finny→My2cents renamed throughout. Build status annotations added. Stale deployment docs archived.
- [x] As-is context document → `docs/Finny As-Is context/finny-foundations.md`
- [x] Product roadmap with 6 pillars → `docs/Finny To-Be context/finny-roadmap.md`
- [x] Foundation solution document (features, priorities P0/P1/P2, accounting model, assumptions, constraints, NFRs) → `docs/Finny-Foundation-Pillar/finny-solution-doc-foundation-pillar.md`
- [x] User journey: 7.1 Onboarding → `docs/Finny-Foundation-Pillar/finny-user-journey-onboarding.md`
- [x] CLI master file → `CLAUDE.md`
- [x] Skill files → `.claude/skills-pm.md`, `skills-design.md`, `skills-architect.md`, `skills-developer.md`
- [x] This progress file → `progress.md`

### Key Decisions Made
- Auth: Phone + OTP via Supabase (no email, no passwords)
- Partner invite: QR code → phone camera scan → Finny link → Phone + OTP
- Onboarding: 4 screens (Phone+OTP → Name → Household → Category Template)
- Income: A category in the plan template, not a separate step
- Opening balance: Sub-category under Income, defaults to ₹0
- Savings preference: Deferred — asked when user first needs bucket features
- Bank account registration: Deferred to P1 (reconciliation)
- Over-allocation: Blocked — cannot freeze plan if allocated > income
- Plan required: Cannot record transactions without a frozen plan
- Feature toggles: household_settings table from day one
- Starter template: Income (6 suggestions, Salary pre-selected), EMIs (4), Insurance (3), Savings (4), Fixed (6), Variable (12), Family (empty), Investment (empty), One-time (empty)
- Configurability: Flexible key-value settings table, central registry at `docs/settings-registry.md`
- Simplicity: Every screen/flow must be understandable by a layman without instructions

### Configurability Framework
- [x] Settings registry created → `docs/settings-registry.md`
- [x] P0 parameters defined (13 core + notifications)
- [x] Display & formatting parameters defined
- [x] P1/P2 parameters documented for future
- [x] Skills-pm.md updated with solutioning checklist (must list configurable params)
- [x] Skills-architect.md updated with settings schema pattern
- [x] CLAUDE.md updated with configurability in key decisions

### Design System & Prototypes
- [x] Finny design system → `.claude/finny-design-system.md`
- [x] Onboarding flow HTML prototype → `design-previews/14-onboarding-flow.html`
- [x] My2cents design system → `docs/my2cents-design-system.md`
- [x] Brand identity comparison → `design-previews/my2cents-identity-comparison.html`
- [x] **Dreamy Glass design language** — Full app reskin with glass morphism (frosted glass cards, backdrop-blur, noise overlay, CSS custom properties, gradient buttons). Applied to 30+ components across all screens.

### Supabase Setup
- [x] **PRODUCTION:** Created Supabase project "My2Cents-prod" → `qybzttjbjxmqdhcstuif.supabase.co`
- [x] **DEV:** Created Supabase project "My2Cents-dev" → `vcbmazhfcmchbswdcwqr.supabase.co`
- [x] Configured phone auth with test mode on both PROD and DEV (no Twilio needed)
- [x] Test phone numbers on PROD: `918130944414=000000`, `918056031046=000000`
- [x] Test phone numbers on DEV: `918888888888=000000`, `919999999999=000000`
- [x] Local environment variables → `app/.env.local` (points to DEV database)
- [x] Vercel environment variables → Points to PROD database
- [x] Supabase URL whitelist configured for Vercel domains (beta-test-five.vercel.app)
- [x] Supabase URL whitelist configured for DEV (localhost:5173)
- [x] Complete database schema copied to DEV (all tables, indexes, RLS policies)
- [x] Database tables created:
  - `users` (id, display_name, phone, onboarding_complete)
  - `households` (id, name, invite_code, created_by)
  - `household_members` (id, household_id, user_id, role)
  - `categories` (id, name, type, icon) - **9 categories: Income, EMI, Insurance, Savings, Fixed, Variable, Family, Investment, One-time**
  - `household_categories` (id, household_id, name, type, icon) - **For custom user-created categories (disabled for now)**
  - `household_sub_categories` (id, household_id, category_id, name, icon)
  - `monthly_plans` (id, household_id, month, status, planned_income, planned_expense)
  - `budget_allocations` (id, plan_id, sub_category_id, monthly_amount)
  - `transactions` (id, household_id, sub_category_id, amount, type, date, logged_by, remarks)
- [x] RLS policies for all tables

### Onboarding App (Frontend)
- [x] Vite + React 18 + TypeScript project → `app/`
- [x] Tailwind CSS v4 with **glass design system** (CSS custom properties, glass-card/glass-header utilities, primary gradient) → `app/src/index.css`
- [x] Google Fonts (Poppins) → `app/index.html`
- [x] Supabase client (real auth, no demo mode) → `app/src/lib/supabase.ts`
- [x] Shared components → `app/src/shared/components/`
  - Button (primary gradient, loading, disabled states, ghost/secondary variants)
  - Input (glass border/focus ring, error states)
  - GlassCard, NoiseOverlay (glass design foundation)
  - ErrorAlert (CSS var danger color scheme)
  - Logo (My2cents wordmark)
- [x] Validation utilities → `app/src/shared/utils/validation.ts`
- [x] Auth module → `app/src/modules/auth/`
- [x] Onboarding module → `app/src/modules/onboarding/`
- [x] AuthProvider with real Supabase session
- [x] Router with auth guards
- [x] **Responsive split-screen layout** (gradient branding panel + glass form panel)
- [x] Build passes with no TypeScript errors
- [x] **Full auth flow working** with real Supabase

### 3-Tab Navigation Architecture (NEW)
- [x] **Navigation module** → `app/src/modules/navigation/`
  - BottomNav.tsx - Mobile bottom navigation with center FAB + lock states
  - SideNav.tsx - Desktop collapsible sidebar + lock states
  - NavItem.tsx - Supports locked state with lock icon overlay
- [x] **AppLayout.tsx** - Main layout with tab state management
- [x] **Mobile bottom nav** with:
  - Home (🏠), Budget (💰), Transactions (📋), Profile (👤)
  - Center elevated FAB for quick add transaction (disabled when no frozen budget)
  - Lock icons on Dashboard & Transactions when budget not frozen
  - Active tab highlighting with purple color
- [x] **Desktop sidebar** with:
  - Collapsible design (icons-only when collapsed)
  - Lock icons on Dashboard & Transactions when budget not frozen
  - Profile panel integration
- [x] **BudgetProvider** - Context provider to track budget freeze status

### Dashboard Tab
- [x] **DashboardTab.tsx** → `app/src/modules/dashboard/components/`
- [x] **Budget Health card** - Shows remaining budget with color coding, progress bar, expandable Spent/Budget breakdown
  - **Responsive font sizing:** 26px for 6+ digit amounts (₹1,00,000+), 30px for smaller amounts
- [x] **Daily Spending card** - Shows average daily spend with alert/on-track guidance
- [x] **Expected Cash Balance card** - User-specific income minus expenses with expandable details and other members view
- [x] **Variable At-Risk categories** - Shows Variable categories at >=75% usage
- [x] **Overspent Categories** - Shows non-Variable categories over 100%
- [x] Negative amounts shown as `(-) ₹X,XXX` in red
- [x] Progressive disclosure pattern for detailed breakdowns
- [x] Days remaining indicator
- [x] Quick add transaction via FAB
- [x] **Empty state for locked dashboard** - Clear messaging with info banner and unlock instructions

### Budget Tab
- [x] **BudgetTab.tsx** → `app/src/modules/budget/components/`
- [x] View mode showing frozen plan with Planned vs Actuals
- [x] **Smart color coding:**
  - Variable category: Yellow (75-89%) → Orange (90-99%) → Red (100%+) with dotted underline
  - Other expenses: Gray (0-99%) → Red (100%+) with dotted underline
- [x] Edit mode for modifying allocations
- [x] **Category sections:** EMI, Insurance, Savings, Fixed, Variable, **Family**, **Investment**, One-time (expense-only)
- [x] Inline editing of amounts
- [x] Add/remove sub-categories with **suggestion clicking fix** (onMouseDown + preventDefault)
- [x] Freeze/unfreeze plan functionality with **pending saves flush** (prevents stale data in view)
- [x] Month selector for viewing different months
- [x] Fixed column alignment (removed warning icon, using dotted underline instead)
- [x] **Subcategory creation supports custom categories** (dual table lookup: categories + household_categories)
- [x] **Income as transactions only** — Income recorded as actual transactions, not plan allocations
- [x] **Inline income editing** — `InlineIncomeSection.tsx` shows income items inline in edit mode. Two-step add flow (name input + suggestions → amount + by selector) matching expense UX. Click to edit existing items. Swipe-to-delete on mobile, trash icon on desktop.
- [x] **BudgetViewMode** — Income section shows actual transactions in collapsible header
- [x] **Freeze validation** — Checks expenses <= actual income from transactions; refreshes income and updates plan before validation
- [x] **Simplified edit flow** — Single edit mode with income + expenses together (replaced 3-step income→expenses→view flow)
- [x] **Edit mode headings** — "Record your income" and "Plan your expenses" (removed "Editing Mode" banner)
- [x] **Mobile-responsive headings** — Full sentence titles on mobile with compact amount (text-xs, "/mo")
- [x] **Unplanned income in view mode** — Shown as subtext under Expenses header (green if surplus, red if over-planned)

### Transactions Tab (NEW)
- [x] **TransactionsTab.tsx** → `app/src/modules/transactions/components/`
- [x] Grouped by date (Today, Yesterday, date labels)
- [x] Sleek card design with colored icon backgrounds (green=income, red=expense)
- [x] Summary card showing Actual Income / Actual Expenses
- [x] Click to edit transaction
- [x] Delete with confirmation
- [x] Shows recorder name and date on each transaction

### Transaction Management (NEW)
- [x] **QuickAddTransaction.tsx** - Supports both add and edit modes
- [x] **Amount input as standard form field** - Boxed input with label "💵 Amount (in ₹)"
- [x] **Enter key submit** - Press Enter on any field to submit (or move to next field if incomplete)
- [x] Amount input with Indian number formatting
- [x] Category search/select dropdown with keyboard navigation
- [x] Income AND expense categories in selector
- [x] Visual income/expense indicator when category selected
- [x] Date of Payment field
- [x] Notes/remarks field
- [x] Edit mode pre-fills all fields
- [x] Fixed category dropdown filtering in edit mode (handles emoji prefix)

### Transaction Filters
- [x] Filter button in header (mobile: top-right, desktop: top-right)
- [x] Solid purple filter icon
- [x] Badge showing active filter count
- [x] Filter dropdown with:
  - Date range filter (From/To with max date constraint)
  - Recorded By multiselect (pill buttons for each member)
  - ~~Type filter (All/Income/Expense)~~ → Replaced with unified CategoryMultiSelect dropdown (Session 27)
  - Clear All Filters button
- [x] "Showing X of Y transactions" indicator when filtered
- [x] Summary card updates based on filtered transactions
- [x] Separate refs for mobile/desktop dropdowns (fixed click-outside detection)
- [x] Date inputs constrained to prevent future date selection

### UI/UX Improvements (NEW)
- [x] Removed hamburger menu from Transactions tab (replaced with filter)
- [x] Removed "Add Transaction" button from desktop header (replaced with filter)
- [x] Profile icon (👤) in mobile bottom nav for settings
- [x] FAB tooltips on hover (desktop)
- [x] Improved spacing in QuickAddTransaction modal
- [x] Icons added to modal field labels (📁, 📅, 📝)
- [x] Changed "Date" to "Date of Payment"

### Production Deployment
- [x] **Deployed to Vercel** → https://beta-test-five.vercel.app
- [x] Configured Vercel environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [x] Configured Supabase URL whitelist for Vercel domains
- [x] Added test phone numbers for production testing
- [x] Verified local development works with Supabase auth

### Dev/Prod Environment Separation
- [x] **Created DEV database** with complete schema
- [x] **Separated test phone numbers** (PROD: 918130944414/918056031046, DEV: 918888888888/919999999999)
- [x] **Local development** isolated from production data
- [x] **Reference documentation** created → `DEV-PROD-REFERENCE.md`
- [x] **Migration scripts** organized → `supabase/migrations/`
  - `001_budget_tables.sql` - Base schema with 9 categories (including Family & Investment)
  - `002_transactions_table.sql` - Transactions table
  - `ADD_CUSTOM_CATEGORIES.sql` - household_categories table for user-created categories
  - `ADD_FAMILY_INVESTMENT_CATEGORIES.sql` - Adds Family & Investment to existing databases

---

## In Progress
- [x] **Bank Statement Import (Pillar 1: Productivity)** — ✅ Code complete, needs migration + testing
  - Plan at: `.claude/plans/velvety-knitting-noodle.md`
  - All 15 implementation steps complete (migration → types → services → merchant rules → PDF parser → CSV parser → import modal → TransactionsTab → QuickAddTransaction → Dashboard)
  - Dependencies: `pdfjs-dist` (PDF), `papaparse` (CSV), `@types/papaparse`
  - **Action needed:** Run migration `011_csv_import_support.sql` on DEV Supabase before testing
  - **Action needed:** Test with real bank statement PDFs (HDFC, ICICI, SBI)

---

## Next Up (in order)

### 1. Near-Term Tasks (User's List)
- [x] **Filter by member on budget tab** — Filter icon + MemberMultiSelect dropdown in view mode header. Expense actuals recomputed from raw transactions per selected members; income items filtered by loggedBy.
- [ ] **Dashboard → Transactions drill-down** — Click on a dashboard category/card to navigate to Transactions tab pre-filtered for those transactions
- [x] **Category & subcategory filters in Transactions tab** — Replaced Type filter with unified `CategoryMultiSelect` dropdown. Sub-categories grouped by parent category, "Quick Select" shortcuts for All Income/Expenses/Transfers, OR logic across categories.
- [ ] **Onboarding income and expense flow test** — End-to-end test of new user flow through income recording + expense planning + freeze
- [ ] **Voice-based budget setup** — Simplify budget setup through voice instructions (future exploration)

### 2. UI Polish & Fixes
- [ ] Review and fix any UI inconsistencies across screens
- [ ] Ensure mobile responsiveness is perfect on all screens
- [ ] Add proper loading states where missing
- [ ] Error handling improvements

### 2. Supporting Auth Flows
- [ ] **Existing user flow** - returning user goes directly to dashboard (not onboarding)
- [ ] **Sign out flow** - logout button, clear session, redirect to login
- [ ] **Join household flow** - `/join/:inviteCode` route for partner joining via invite link

### 3. User Journeys (remaining) → `docs/Finny-Foundation-Pillar/`
Each journey becomes its own file: `finny-user-journey-{feature-area}.md`
- [ ] 7.2 Income & Account Management (thin — mostly absorbed into template)
- [ ] 7.3 Financial Planning (smart copy, plan freeze/versioning, annual view, waterfall, amortization)
- [x] 7.4 Transaction Recording - DONE (quick entry, edit, delete, classification)
- [ ] 7.5 Budget Tracking & Reconciliation (budget vs actual, daily budget, overspend, reconciliation)
- [ ] 7.6 Savings Buckets (bucket registry, transfer checklist, balance tracking)
- [ ] 7.7 Dashboard & Analytics (month overview, category bars, balance card, trends)
- [ ] 7.8 Notifications & Reminders (transaction alerts, recording reminders, overspend)

### 4. Frontend - Remaining Scaffolding
- [ ] PWA manifest + service worker
- [ ] Feature toggle hook

### 5. Build P0 Features (remaining)
- [x] Category template selection screen - DONE
- [x] Plan creation/editing - DONE
- [x] Transaction recording - DONE
- [x] Dashboard - DONE
- [ ] Notifications (transaction alerts, reminders, overspend)

### 6. Data Migration
- [ ] Export Google Sheets to CSV
- [ ] Write migration script
- [ ] Test on staging
- [ ] Run on production

---

## Blocked / Waiting
- Nothing currently blocked

## Deferred Decisions (User to revisit after living with the app)
- **FAB income flow:** Currently FAB can only add income against existing sub-categories. User wants Option 2 (inline sub-category creation for income in QuickAdd) but deferred the UX decision (how to distinguish income vs expense input). Revisit after daily usage.
- **Income transaction date:** When income is recorded in budget edit mode, the date defaults to today (`new Date().toISOString().split('T')[0]`). User may want to specify a different date (e.g., salary received on a specific date). Revisit after daily usage.
- **FAB for income recording:** Evaluate whether income should be recordable through the FAB (floating action button) at all. Currently income is only recorded inline during budget edit mode. FAB could provide a quicker path for recording income outside of budget planning. Revisit after daily usage.
- **Voice-based budget setup:** Simplify budget setup through voice instructions. User mentioned as future task.

---

## Known Issues
- [x] ~~Transaction filters have some issues (to be debugged)~~ - FIXED
- [x] ~~Pre-existing TypeScript errors in BudgetTab.tsx, BudgetViewMode.tsx, DashboardScreen.tsx (icon type mismatches)~~ - FIXED
- [x] ~~Existing users go through onboarding again (need to check onboarding_complete flag)~~ - FIXED (now checks database instead of auth metadata)
- [x] ~~Vercel production deployment missing environment variables~~ - FIXED (added VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
- [x] ~~Suggestion clicks not working (EMI and other categories)~~ - FIXED (onMouseDown + preventDefault pattern)
- [x] ~~Frozen plan showing stale data without refresh~~ - FIXED (flush pending saves before freeze)
- [x] ~~Budget health card cramped with 6-digit amounts~~ - FIXED (responsive font sizing: 26px for ₹1,00,000+)
- [ ] PWA manifest/service worker not yet added
- [ ] Custom category creation disabled (commented out, needs proper UX design)

---

## Session Log

| Date | What was done |
|------|---------------|
| 2026-02-21 | **Session 31 (bank statement import build):** Built complete bank statement import feature (PDF + CSV). User pivoted to PDF-primary (mobile convenience). Installed pdfjs-dist + papaparse. Created 8 new files: DB migration (source/original_narration columns), merchant rules (21 Indian categories), merchant matcher, PDF parser (3-layer: text extraction → table reconstruction → bank-specific parsing for HDFC/ICICI/SBI/Generic), CSV parser (6 bank formats), import orchestration service, multi-step import modal (upload→preview→import→done with glass design), StatementImportModal.tsx. Modified 5 files: types.ts (nullable sub_category_id, import types), transactions.ts (uncategorized display, source tracking), TransactionsTab.tsx (import button, amber badge, modal integration), QuickAddTransaction.tsx (bank description field, null category in edit), DashboardTab.tsx (uncategorized in daily velocity, "Uncategorised" row in expenses to watch). TypeScript + build pass clean. PDF.js properly code-split (404KB lazy chunk). Migration 011 needs to run on DEV before testing. |
| 2026-02-20 | **Session 30 (CSV import planning):** Researched Indian data security laws (DPDPA 2023, IT Act, SPDI Rules) — minimal compliance at current scale. Checked Supabase data residency (DEV=Seoul, PROD=Singapore, neither in India). Evaluated SMS parsing (blocked by Google Play for PWA), CSV upload (zero cost), UPI integration (heavy compliance). Decision: start with CSV bank statement import. Designed comprehensive plan: 6 new files (migration, merchant rules, merchant matcher, CSV parser, import service, import modal) + 5 modified files (types, transactions service, TransactionsTab, DashboardTab, QuickAddTransaction). Key design: uncategorized transactions stay in normal list with amber badge, treated as expenses, shown in dashboard. Merchant matching via static keyword→sub-category-name rules for Indian merchants. Bank format auto-detection from headers (HDFC, ICICI, SBI, Kotak, Axis). Plan approved — build starts next session. |
| 2026-02-18 | **Session 29 (OTP → MPIN auth):** Replaced Supabase phone OTP auth with 6-digit MPIN system to eliminate SMS costs. Created `user_pins` table + 2 RPC functions (`check_phone_registered`, `reset_user_pin` with SECURITY DEFINER). Auth uses `signUp/signInWithPassword` with email=`{phone}@my2cents.app`, password=PIN. New screens: `SetPinScreen.tsx` (2-step PIN creation, reused for reset), `EnterPinScreen.tsx` (PIN login with "Forgot PIN?" link). Modified: `auth.ts` (removed sendOTP/verifyOTP, added PIN-based functions), `PhoneEntryScreen.tsx` (checks phone existence, routes to set-pin or enter-pin), `OTPInput.tsx` (added `masked` prop), `Router.tsx` (new routes, removed /verify), `app.config.ts` (phone_pin login method), `validation.ts` (validatePin, maskPhone), `ProfilePanel.tsx` + `onboarding.ts` (phone from user_metadata). Migration SQL includes existing OTP user migration preserving user_ids. Ran migration on DEV Supabase + disabled email confirmations. Tested new user flow end-to-end — working. TypeScript + build pass clean. |
| 2026-02-15 | **Session 27 (unified sub-category filter):** Replaced the Type filter (Income/Expense/Transfer toggle buttons) in Transactions tab with a unified sub-category multiselect dropdown (`CategoryMultiSelect.tsx`). Sub-categories grouped by parent category with "Quick Select" shortcuts at top (All Income, All Expenses, All Transfers). Indeterminate checkbox state for partial selections. Fund transfers as special entry (sub_category_id = null). OR logic across categories. State changed from `filterTypes: TransactionType[]` to `filterSubCategoryIds: Set<string>` + `filterIncludeTransfers: boolean`. TypeScript passes clean. Revert available via git commit `71d3c01`. |
| 2026-02-15 | **Session 25 (UI polish from testing):** Fixed 7 issues from real-device screenshots: (1) Transactions filter overlay — changed from `absolute` to `fixed` positioning, (2) Budget filter overlay — same fix for mobile, (3) Transactions summary card widened — more padding, larger icons, left-aligned text, (4) Budget edit income amounts red — changed semi-transparent `bg-white/40` to opaque `bg-white` so swipe-to-delete red bg doesn't bleed through, (5) Reduced icon-header padding in InlineIncomeSection + BudgetSection (`gap-1.5`→`gap-1`, icon `w-7`→`w-6`), (6) Removed notification bell icon from DashboardTab mobile header, (7) Overspent Categories moved outside card to match "Daily Expenses to Watch" pattern (heading+icon outside, items in separate card). TypeScript passes clean. |
| 2026-02-15 | **Sessions 22-24 (dreamy glass design language):** Full app reskin with glass morphism design language. Built CSS foundation (custom properties, utility classes like `.glass-card`, `.glass-header`, `.bg-primary-gradient`, NoiseOverlay/GlassCard components). Systematically converted 30+ components across all screens: Dashboard (DashboardScreen, WelcomeCard, BudgetSection, BudgetItem, InlineAddItem, QuickAddTransaction, FundTransferModal), Budget (BudgetTab, BudgetViewMode, InlineIncomeSection, MonthSelector, CategoryTile, AmountInput, InlineAddCategory, ExpenseSelectionScreen), Transactions (TransactionsTab), Auth (PhoneEntryScreen, OTPScreen, SuccessScreen, OTPInput, PhoneInput), Onboarding (YourNameScreen, HouseholdScreen, InviteScreen), Shared (ProfilePanel, Toast, MemberMultiSelect, ErrorAlert, Input, NavItem, ProgressDots), App (Router LoadingScreen). Replaced all emojis in modal headers with SVG line icons. Zero hardcoded purple/indigo references remain. TypeScript passes clean. |
| 2026-02-15 | **Session 21 (multiselect filter + deploy):** Iterated member filter UI 3x based on user feedback: pills → filter icon + pills → filter icon + multiselect dropdown. Created shared `MemberMultiSelect` component (`app/src/shared/components/MemberMultiSelect.tsx`) — select-like input with checkboxes dropdown, max-h scroll for large lists, click-outside-to-close. Applied to both BudgetTab (filter icon + dropdown panel) and TransactionsTab (renamed "Recorded By" → "Members"). Changed `filterMemberId` (single) → `filterMemberIds` (array). Fixed budget filter panel: removed `overflow-hidden` (was clipping dropdown), increased spacing (`mb-1` → `mb-4`). Deployed commit `71d3c01`. Updated deferred decisions (income date). Added new near-term tasks (dashboard drill-down, category/subcategory filters in trx tab). |
| 2026-02-15 | **Session 20 (member filter on budget tab):** Added member filter pills ("All" + member names) to budget view mode header — desktop: after edit pencil, mobile: below month selector row. Added `filterMemberId` state to BudgetTab, `rawTransactions` passthrough from `getActualsBySubCategory` → `getBudgetViewData` → BudgetViewMode. When filtered: expense actuals recomputed from raw transactions per member, income items filtered by `loggedBy`, totals recalculated. Planned amounts unchanged (household-level). Type check passes clean. |
| 2026-02-15 | **Session 19 (dashboard card renames + income date fix):** Renamed "Budget Health" → "Left to Spend" (removed redundant "Left this month" subtitle). Renamed "Combined Cash Balance" → "Total Cash in Hand" (added subtitle "Total income v/s actual expense"). Fixed "Split by Members" button alignment to top-right (`items-center` → `items-start`). Fixed income transaction date from hardcoded 1st-of-month to actual recording date (`new Date().toISOString().split('T')[0]`). Analyzed FAB income flow limitations — deferred improvement decision. All type checks pass. |
| 2026-02-15 | **Session 18 (section header styling + unplanned income wording):** Applied `bg-purple-100` to all 4 section headers (edit mode income/expense, view mode income/expense) with progressive hierarchy (section=`bg-purple-100`, category=`bg-purple-50`). Moved unplanned income indicator to left-aligned subtitle under Expenses heading ("₹X left to plan" green / "₹X over income" red). Updated column label colors to `text-purple-400`. |
| 2026-02-15 | **Session 17 (two-step add income + fixes + mobile layout):** Rewrote "Add income" flow to match expense UX: Step 1 = text input + suggestion chips (not dropdown), Step 2 = amount input + "By" selector. Custom names create sub-categories on the fly. Removed "Editing Mode" banner (wastes space). Changed headings: "Income" → "Record your income", "Expenses" → "Plan your expenses". Fixed critical freeze bug: `handleFreezePlan` was calling `upsertMonthlyPlan` with stale income from React state, causing ceiling error. Fixed mobile heading wrapping: kept full sentences, used compact amount (text-xs + "/mo"). Added unplanned income (AI-PE) as subtext under Expenses header in view mode (green=surplus, red=over-planned). All type checks pass. |
| 2026-02-15 | **Session 16 (inline income editing):** Redesigned budget edit mode based on user feedback. Previous step-based flow (separate IncomeRecordingForm → expense planner) was "very convoluted" for repeat edits. Created `InlineIncomeSection.tsx` — collapsible section mirroring BudgetSection pattern with inline amount editing, delete, "+ Add income" with source dropdown/suggestions/member selector. Simplified BudgetTab flow from 3-step (`income → expenses → view`) to 2-step (`edit \| view`). In edit mode, Income + Expenses sections appear together — both editable in the same view. Deleted dead `IncomeRecordingForm.tsx`. All type checks pass. Tested on desktop and mobile. |
| 2026-02-14 | **Session 15 (remove planned income):** Major architectural change — removed Planned Income (PI) from budget model. Income is now ONLY recorded as actual transactions, not plan allocations. 5-phase implementation: (1) Added `getActualIncomeForMonth()` to transactions.ts, modified `getBudgetViewData()` to return income from transactions + expenses only from allocations. (2) Created new `IncomeRecordingForm.tsx` component for recording income as transactions. (3) Refactored BudgetTab.tsx with step-based flow (`income → expenses → view`), removed all income allocation state/handlers, freeze validation checks actual income from transactions. (4) Updated BudgetViewMode.tsx — income section shows actual transactions in collapsible header. (5) Cleaned ~560 lines of dead code: removed `saveIncomeProgress()`, `loadIncomeProgress()`, `completeBudgetSetup()` from budget.ts; removed `getIncomeTemplates()`, `getDefaultIncomeSelections()` from defaultCategories.ts; deleted dead IncomeSelectionScreen.tsx and IncomeAmountsScreen.tsx. Also in prior portion of session: fixed fund transfer modal, pre-loaded household users, added fund transfer support to Budget tab, multi-select type filter, performance optimization (parallelized Supabase calls), deployed. All type checks pass clean. |
| 2026-02-14 | **Session 14 (documentation audit):** Compared entire codebase against all documentation and fixed every discrepancy found. Updated 13 files total: database-schema.md (added transactions/household_categories tables, updated categories 7→9), finny-user-journey-onboarding.md (OTP 4→6 digits, Finny→My2cents, Inter→Poppins, added status banner), finny-solution-doc-foundation-pillar.md (added build status to all 8 sections, fixed auth method, updated categories), finny-design-system.md (marked DEPRECATED), my2cents-design-system.md (primary purple-600→purple-800), finny-foundations.md (Finny→My2cents, noted app is live), finny-roadmap.md (Finny→My2cents, added progress annotations), settings-registry.md (noted household_settings table not built), skills-developer.md (updated code organization tree & TS conventions to match reality), skills-design.md (updated navigation description), DEPLOYMENT.md (updated migrations list, actual URLs, phone auth details), archived DEPLOYMENT_STEPS.md/DEPLOYMENT_CHECKLIST.md/NEXT-STEPS-DEV-SETUP.md. Removed stale Next Up items. Updated CLAUDE.md branding. |
| 2026-02-13 | **Session 13 (new categories & critical fixes):** Added Family & Investment expense categories (9 total categories now). Fixed critical suggestion click bug across all categories using onMouseDown + preventDefault pattern. Implemented responsive font sizing (26px for 6+ digits) in budget health card. Fixed stale data bug by flushing pending saves before plan freeze. Fixed subcategory creation for custom categories with dual table lookup (categories + household_categories tables). Updated migrations: ADD_CUSTOM_CATEGORIES.sql (household_categories table), ADD_FAMILY_INVESTMENT_CATEGORIES.sql (new categories). Deployed to production successfully (commit b1a727a). Verified with existing production users - all data preserved. Custom category creation temporarily disabled (commented out) pending better UX design. |
| 2026-02-12 | **Session 12 (dev/prod separation & deployment):** Deployed to Vercel, debugged auth errors, set up dev/prod database separation. Deployed My2cents to Vercel (beta-test project, URL: https://beta-test-five.vercel.app). Fixed "unsupported phone provider" and "invalid API key" errors (missing Vercel env vars). Created separate Supabase databases: renamed "My2Cents" → "My2Cents-prod" (production, qybzttjbjxmqdhcstuif), "My2Cents-prod" → "My2Cents-dev" (development, vcbmazhfcmchbswdcwqr). Updated local `.env.local` to use DEV database. Vercel prod uses PROD database. Created setup guide. Still need to: copy schema to DEV, configure phone auth on DEV, test local with DEV database. |
| 2026-02-11 | **Session 11 (dashboard redesign & UI polish):** Redesigned dashboard with 3 clean cards (Budget Health, Daily Spending, Expected Cash Balance) using progressive disclosure. Fixed transaction amount input - changed from inline rupee symbol to standard boxed input field like other form fields. Implemented smart color gradients in Budget view: Variable category shows yellow→orange→red gradient (75-89-100%+), other expenses only red when >100%, income green when exceeding planned. Added red dotted underline for over-budget items (not for income). Fixed column alignment by removing warning icon. Added negative amount display with (-) prefix for deficits in Dashboard. Implemented Enter key submit throughout transaction form. Renamed "Your Cash Balance" to "Your Expected Cash Balance". |
| 2026-02-10 | **Session 10 (bug fixes):** Fixed confetti not showing - changed first-freeze detection to query DB for existing frozen plans instead of relying on availableMonths state. Fixed tabs not unlocking - corrected BudgetProvider month format from YYYY-MM to YYYY-MM-01, added 500ms delay before refetch. Changed sidebar default to collapsed. Mobile access: use `npm run dev -- --host` to expose on local network. |
| 2026-02-10 | **Session 10 (continued):** Added debounced auto-save for budget drafts (1 second delay after last change). Shows "Draft saved" green badge when saved. Implemented confetti animation (50 falling pieces) + success modal on first budget freeze. Budget tab calls `refetchBudgetStatus()` after freeze to unlock Dashboard & Transactions tabs. Added Confetti component with falling animation keyframes. Complete flow now works: Onboarding → Budget (tabs locked) → Edit & save → Freeze → Confetti 🎉 → Success modal → Tabs unlock. |
| 2026-02-10 | **Session 10:** Implemented budget-first UX. Created BudgetProvider to track frozen budget status. Updated BottomNav, SideNav, and NavItem components with lock state UI (grayed out + lock icon overlay on Dashboard & Transactions when no frozen budget). FAB disabled when budget not frozen. Updated Dashboard empty state with clear unlock messaging and info banner. Changed default landing tab from Dashboard to Budget. |
| 2026-02-10 | **Session 9:** Fixed critical onboarding bug. Supabase Auth persists user metadata even after user deletion, causing returning users to skip onboarding. Changed onboarding check to be database-first: AuthProvider and getOnboardingStatus() now query `users` and `household_members` tables instead of trusting auth metadata. New users now correctly land in onboarding flow. Created single-query data reset script for testing. |
| 2026-02-10 | **Session 8:** Fixed transaction filter bugs: separate refs for mobile/desktop filter dropdowns (click-outside detection now works correctly), date inputs constrained with max date (can't filter by future dates), removed unused `onOpenMenu` prop from TransactionsTab. Cleaned up ALL pre-existing TypeScript errors across codebase: fixed icon type mismatches by adding fallback values (`icon \|\| '📦'`), removed unused imports and variables (useEffect, getRecentSubCategories, formatDateDisplay, etc.), fixed `planned_expense` → `total_allocated` property access. App now builds with zero TypeScript errors. |
| 2026-02-10 | **Session 7:** Built 3-tab navigation (Dashboard, Budget, Transactions) with mobile bottom nav + desktop sidebar. Added center FAB in mobile nav. Created TransactionsTab with grouped list, sleek card design, edit/delete functionality. Built QuickAddTransaction modal supporting add and edit modes. Added income categories to selector with visual indicator. Implemented transaction filters (date range, recorded by multiselect, type) in header dropdown. Updated types and services to include logged_by_name. Some filter issues remain. |
| 2026-02-09 | **Session 6:** Connected real Supabase auth. Created Supabase project with phone auth test mode. Removed ALL demo mode code from codebase. Changed OTP to 6 digits. Updated all screens with responsive split-screen layout (purple branding left, cream form right). Created database tables (users, households, household_members) with RLS. Fixed QR code localhost issue with prominent invite code display. Full onboarding flow now works with real auth. |
| 2026-02-09 | **Session 5:** Fixed Tailwind v4 CSS issue. Custom color tokens weren't generating utility classes. Rewrote all components (Button, Input, Card, Logo, ErrorAlert, PhoneInput, OTPInput, OTPScreen, SuccessScreen, YourNameScreen, HouseholdScreen, InviteScreen, ProgressDots, Router) to use standard Tailwind colors (purple-800, amber-400, stone-50, gray-*). Simplified tailwind.config.js. App now renders correctly. |
| 2026-02-09 | **Session 4:** Implemented My2cents design system in the React app. Updated Tailwind config with new design tokens (plum, honey, cream, sand colors). Changed font from Inter to Poppins. Updated all shared components (Button, Input, Card, Logo, ErrorAlert). Updated all auth screens (PhoneEntryScreen, OTPScreen, SuccessScreen) with responsive layout. Updated all onboarding screens (YourNameScreen, HouseholdScreen, InviteScreen) with responsive layout. Removed phone-frame mockup styling — now proper mobile-first responsive PWA. Updated branding from Finny to My2cents throughout. Build passes successfully. To test: `cd app && npm run dev`, use OTP code `1234`. |
| 2026-02-09 | **Session 3:** Complete brand identity redesign. Renamed app from "Finny" to "My2cents". Explored multiple design directions, reviewed reference designs (budget_app_brand_concepts, dugoutleague.com). Created and compared two color variants (Muted Plum vs Electric Purple). Final decision: Muted Plum (#6A4C6B) with Poppins typography. Created comprehensive design system document at `docs/my2cents-design-system.md`. |
| 2026-02-09 | **Session 2:** Built complete onboarding app in `app/`. Created Vite+React+TS project. Configured Tailwind v4 with design tokens. Built shared components (Button, Input, Card, ErrorAlert, Logo). Created auth module (PhoneInput, OTPInput, 3 screens). Created onboarding module (ProgressDots, 3 screens with QR code). Implemented AuthProvider with demo mode (sessionStorage). Added Router with auth guards. Fixed "failed to fetch" error with demo mode. Applied phone frame styling to all screens. App builds successfully. |
| 2026-02-09 | **Session 1:** Added configurability framework: created `docs/settings-registry.md` with P0 + display params. Updated skills-pm.md (simplicity principle, solutioning checklist). Updated skills-architect.md (settings schema pattern). Updated CLAUDE.md (configurability in key decisions). |
| 2026-02-08 | Created all product docs (foundations, roadmap, solution, user journey for onboarding). Created CLAUDE.md, 4 skill files, progress.md. No code yet. |
