# Progress — My2cents (formerly Finny)

> **This file is the source of truth for project progress.** Read it at the start of every session. Update it at the end of every session and at regular intervals during long sessions. This is non-negotiable.

## Last Updated
2026-02-12

## Last Session Summary
**Deployment to Vercel.** Successfully deployed My2cents app to Vercel at https://finny-phi.vercel.app/. Configured environment variables for Supabase connection. App is now live and accessible from any device with internet connection. All features working in production: onboarding flow, budget planning, transaction recording, dashboard with real-time updates.

---

## Completed

### Documentation
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
- Starter template: Income, EMIs (3), Insurance (2), Savings (3), Fixed (4), Variable (5), One-time (empty)
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

### Supabase Setup
- [x] Created Supabase project → `qybzttjbjxmqdhcstuif.supabase.co`
- [x] Configured phone auth with test mode (no Twilio needed)
- [x] Test phone numbers: `918130944414=000000`, `918056031046=000000`
- [x] Environment variables → `app/.env.local`
- [x] Database tables created:
  - `users` (id, display_name, phone, onboarding_complete)
  - `households` (id, name, invite_code, created_by)
  - `household_members` (id, household_id, user_id, role)
  - `categories` (id, name, type, icon)
  - `household_sub_categories` (id, household_id, category_id, name, icon)
  - `monthly_plans` (id, household_id, month, status, planned_income, planned_expense)
  - `budget_allocations` (id, plan_id, sub_category_id, monthly_amount)
  - `transactions` (id, household_id, sub_category_id, amount, type, date, logged_by, remarks)
- [x] RLS policies for all tables

### Onboarding App (Frontend)
- [x] Vite + React 18 + TypeScript project → `app/`
- [x] Tailwind CSS v4 with standard colors (purple-800, stone-50, gray-*) → `app/tailwind.config.js`
- [x] Google Fonts (Poppins) → `app/index.html`
- [x] Supabase client (real auth, no demo mode) → `app/src/lib/supabase.ts`
- [x] Shared components → `app/src/shared/components/`
  - Button (purple-800 primary, loading, disabled states, ghost/secondary variants)
  - Input (purple focus ring, gray borders, error states)
  - Card (default and hero variants)
  - ErrorAlert (red color scheme)
  - Logo (My2cents wordmark)
- [x] Validation utilities → `app/src/shared/utils/validation.ts`
- [x] Auth module → `app/src/modules/auth/`
- [x] Onboarding module → `app/src/modules/onboarding/`
- [x] AuthProvider with real Supabase session
- [x] Router with auth guards
- [x] **Responsive split-screen layout** (purple branding panel + cream form panel)
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
  - Income: Gray (normal) → Green (exceeds planned, no underline)
- [x] Edit mode for modifying allocations
- [x] Category sections (Income, EMIs, Insurance, Savings, Fixed, Variable, One-time)
- [x] Inline editing of amounts
- [x] Add/remove sub-categories
- [x] Freeze/unfreeze plan functionality
- [x] Month selector for viewing different months
- [x] Fixed column alignment (removed warning icon, using dotted underline instead)

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
  - Type filter (All/Income/Expense)
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

---

## In Progress
- Nothing currently in progress

---

## Next Up (in order)

### 1. UI Polish & Fixes
- [ ] Review and fix any UI inconsistencies across screens
- [ ] Ensure mobile responsiveness is perfect on all screens
- [ ] Add proper loading states where missing
- [ ] Error handling improvements

### 3. Supporting Auth Flows
- [ ] **Existing user flow** - returning user goes directly to dashboard (not onboarding)
- [ ] **Sign out flow** - logout button, clear session, redirect to login
- [ ] **Join household flow** - `/join/:inviteCode` route for partner joining via invite link

### 4. User Journeys (remaining) → `docs/Finny-Foundation-Pillar/`
Each journey becomes its own file: `finny-user-journey-{feature-area}.md`
- [ ] 7.2 Income & Account Management (thin — mostly absorbed into template)
- [ ] 7.3 Financial Planning (smart copy, plan freeze/versioning, annual view, waterfall, amortization)
- [x] 7.4 Transaction Recording - DONE (quick entry, edit, delete, classification)
- [ ] 7.5 Budget Tracking & Reconciliation (budget vs actual, daily budget, overspend, reconciliation)
- [ ] 7.6 Savings Buckets (bucket registry, transfer checklist, balance tracking)
- [ ] 7.7 Dashboard & Analytics (month overview, category bars, balance card, trends)
- [ ] 7.8 Notifications & Reminders (transaction alerts, recording reminders, overspend)

### 5. Frontend - Remaining Scaffolding
- [ ] PWA manifest + service worker
- [ ] Feature toggle hook

### 6. Build P0 Features (remaining)
- [x] Category template selection screen - DONE
- [x] Plan creation/editing - DONE
- [x] Transaction recording - DONE
- [x] Dashboard - DONE
- [ ] Notifications (transaction alerts, reminders, overspend)

### 7. Data Migration
- [ ] Export Google Sheets to CSV
- [ ] Write migration script
- [ ] Test on staging
- [ ] Run on production

---

## Blocked / Waiting
- Nothing currently blocked

---

## Known Issues
- [x] ~~Transaction filters have some issues (to be debugged)~~ - FIXED
- [x] ~~Pre-existing TypeScript errors in BudgetTab.tsx, BudgetViewMode.tsx, DashboardScreen.tsx (icon type mismatches)~~ - FIXED
- [x] ~~Existing users go through onboarding again (need to check onboarding_complete flag)~~ - FIXED (now checks database instead of auth metadata)
- [ ] PWA manifest/service worker not yet added

---

## Session Log

| Date | What was done |
|------|---------------|
| 2026-02-12 | **Session 12 (production deployment):** Deployed My2cents app to Vercel at https://finny-phi.vercel.app/. Configured production environment variables for Supabase. App now live and accessible from any device. All features working in production. |
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
