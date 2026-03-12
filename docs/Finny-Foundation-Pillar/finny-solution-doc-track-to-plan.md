# My2cents — Track to Plan: Solution Document

## About This Document

This document defines the "Track to Plan" product pivot — removing the budget-as-gate requirement so users can record transactions immediately, with budget planning available as an opt-in feature. This is a Foundation pillar change that modifies onboarding, navigation, dashboard, and the relationship between transactions and budgets.

**Status:** Draft — awaiting review.

---

## 1. Problem Statement

### 1.1 The Cold Start Barrier

The current app requires users to create and freeze a full monthly budget before recording a single transaction. This creates a cold start problem:

- **New users don't know their spending.** They've never budgeted before. Asking them to allocate amounts across 7+ categories is guesswork.
- **Budget planning takes time and patience.** Even experienced budgeters need 15-30 minutes. For newcomers, this is a wall.
- **The "aha moment" is delayed.** Users must complete a tedious planning process before experiencing any value from the app.
- **Real user feedback confirms this:** *"I started to setup my budget but felt like it would be good if there was a quick popup explaining the onboarding experience — which I didn't realise that I had to start with planning..."*

### 1.2 What Users Actually Want First

Mapping to JTBD:
- "Help me know where my money is going" — **tracking** (no budget needed)
- "Help me and my partner stay on the same page about money" — **shared visibility** (no budget needed)
- "Help me stop overspending" — **awareness first, then planning**

Users need to *see* their spending before they can *plan* it. The current flow inverts this.

### 1.3 Why Not Just Be Another Tracker

Pure expense tracking is a commodity — thousands of apps do it. My2cents's USP is the savings-first budget with the waterfall allocation model. The pivot doesn't abandon this — it makes it more powerful:

- **Budget from real data > budget from guesses.** A budget created after 2-4 weeks of tracking is informed and accurate.
- **The value deepens over time:** Tracking (week 1) → Pattern awareness (week 2-3) → Data-informed budget (month 2) → Savings discipline (month 3+).
- **The funnel widens.** "Track your household expenses together" attracts more users than "Plan a savings-first budget."

---

## 2. Solution Overview

### 2.1 Core Change

**Budget becomes optional, not a gate.**

The app operates in two modes based on whether the user has a frozen budget for the current month:

| | Tracking Mode | Planning Mode |
|---|---|---|
| **Who** | Default for new users, anyone without a frozen plan | Users who create and freeze a budget |
| **Can record transactions** | Yes | Yes |
| **Can import bank statements** | Yes | Yes |
| **Dashboard shows** | Spending summary, category breakdown | Full budget-vs-actual, waterfall, daily budget |
| **Budget tab** | Shows "Create Budget" CTA | Shows budget with edit/freeze |
| **Navigation locked** | No | No |
| **Subcategories available** | Default template (auto-loaded) | Selected during budget creation |

### 2.2 Key Principles

1. **No gates, only nudges.** Every feature is accessible. Budget planning is encouraged, never forced.
2. **Same data, different views.** Transactions are identical in both modes. The dashboard adapts its presentation.
3. **Existing users are unaffected.** Users with frozen budgets see exactly what they see today.
4. **Budget planning is MORE valuable post-tracking.** Data-informed budgets beat guesswork.

---

## 3. Onboarding Flow Changes

### 3.1 Current Flow

```
Phone → MPIN → Name → Household → [redirects to Budget tab]
→ Category selection → Amount entry → Freeze → Dashboard
```

All steps mandatory. No escape until budget is frozen. Dashboard and Transactions tabs locked.

### 3.2 New Flow

```
Phone → MPIN → Name → Household → Explainer Screen → Budget Planning (with Skip)
```

#### Step 1-4: Unchanged
Phone entry, MPIN creation, name entry, household creation/join — all remain the same.

#### Step 5: Explainer Screen (NEW)

A single interstitial screen before budget planning. Addresses the user feedback about not understanding what they're about to do.

```
┌─────────────────────────────────────────┐
│                                         │
│            Welcome to My2cents!         │
│                                         │
│   Here's how it works:                  │
│                                         │
│   1. Plan your monthly budget           │
│      Set spending limits for each       │
│      category — we'll track how         │
│      you're doing against them.         │
│                                         │
│   2. Record daily expenses              │
│      Add transactions as you spend.     │
│      Takes 10 seconds each.             │
│                                         │
│   3. Stay on track together             │
│      Both you and your partner see      │
│      the same picture. No surprises.    │
│                                         │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        Let's Plan My Budget         ││  ← Primary CTA
│  └─────────────────────────────────────┘│
│                                         │
│     Skip, I'll start by tracking →      │  ← Text link
│                                         │
└─────────────────────────────────────────┘
```

**Design notes:**
- Glass card with frosted background, consistent with existing auth screens
- Primary CTA is "Let's Plan My Budget" (gradient button) — we WANT users to plan if they're willing
- Secondary option is a text link: "Skip, I'll start by tracking" — no friction, but clearly secondary
- No back button needed — forward-only
- Copy is short, scannable, uses numbered steps (not paragraphs)

#### Path A: User taps "Let's Plan My Budget"
→ Existing budget creation flow (category selection → amounts → freeze)
→ Lands on Planning Mode dashboard
→ **No code changes needed for this path**

#### Path B: User taps "Skip, I'll start by tracking"
→ Default template subcategories auto-loaded into `household_sub_categories`
→ Onboarding marked complete
→ Lands on Tracking Mode dashboard
→ Prompted to record first transaction or import bank statement

### 3.3 Default Subcategories (Auto-Loaded on Skip)

When user skips budget planning, the following `is_default_selected: true` subcategories are created in `household_sub_categories`:

| Category | Subcategory |
|----------|-------------|
| Income | Salary |
| Savings | General Savings |
| Fixed | Rent, Internet, Phone Bill |
| Variable | Groceries, Food Ordering, Miscellaneous |

**Total: 8 subcategories** — enough to classify common transactions without overwhelming the user.

Users can add more subcategories later through:
- The QuickAddTransaction modal (when they need a category that doesn't exist)
- The Budget tab (if/when they create a budget)

---

## 4. Tracking Mode Dashboard

### 4.1 What Users See (No Frozen Budget)

When a user has no frozen budget for the current month, the dashboard shows a spending summary view instead of budget-vs-actual metrics.

```
┌─────────────────────────────────────────┐
│  Dashboard              Mar 2026    ←→  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  This Month                        ││
│  │                                    ││
│  │  Total Spent          Total Income ││
│  │  ₹32,500              ₹45,000     ││
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ││
│  │  12 transactions                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  Spending by Category                   │
│  ┌─────────────────────────────────────┐│
│  │ 🛒 Groceries              ₹8,500  ││
│  │ ━━━━━━━━━━━━━━━ (26%)             ││
│  │ 🍕 Food Ordering          ₹4,200  ││
│  │ ━━━━━━━━━━━ (13%)                 ││
│  │ 📌 Rent                   ₹15,000 ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━ (46%)    ││
│  │ 📱 Phone Bill             ₹499    ││
│  │ ━━ (2%)                           ││
│  │ 📦 Miscellaneous          ₹4,301  ││
│  │ ━━━━━━━━━━ (13%)                  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  📋 Import Bank Statement          ││  ← Prominent CTA
│  └─────────────────────────────────────┘│
│                                         │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
│  │ Ready to plan your budget?         ││  ← Nudge card
│  │ You've tracked ₹32,500 in          ││     (after sufficient data)
│  │ spending. Create a budget to set   ││
│  │ limits and save more.              ││
│  │            [Create Budget]         ││
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
│                                         │
└─────────────────────────────────────────┘
```

### 4.2 Dashboard Components (Tracking Mode)

#### A. Monthly Summary Card
- **Total Spent** — Sum of all expense transactions this month
- **Total Income** — Sum of all income transactions this month
- **Transaction count** — "12 transactions"
- No budget comparison (no budget exists)

#### B. Spending by Category
- Lists all categories with transactions this month
- Sorted by amount (highest first)
- Each row shows: icon, subcategory name, amount, percentage of total spending
- Progress bar shows relative proportion (not budget utilization)
- Tappable → drills down to Transactions tab filtered by that subcategory (existing feature)

#### C. Import Bank Statement CTA
- Prominent card/button to surface the existing bank import feature
- Only shown if user has < 5 transactions this month (reduces clutter once they're active)
- Links to `StatementImportModal` (already built)

#### D. Nudge-to-Plan Card (Conditional)
- Shown after user has accumulated enough data (see Section 6)
- Gentle, data-informed prompt
- "Create Budget" CTA → navigates to Budget tab

### 4.3 What's NOT Shown (Tracking Mode)

These Planning Mode dashboard components are hidden when no frozen budget:
- Budget Health / Left to Spend card
- Daily Spending guidance (requires planned budget)
- Expected Cash Balance (requires planned income allocation)
- Variable At-Risk categories (requires planned amounts)
- Overspent Categories (requires planned amounts)

These components remain available once the user creates and freezes a budget.

---

## 5. Navigation & Gate Removal

### 5.1 Current Gates (To Remove)

| Gate | Location | Current Behavior | New Behavior |
|------|----------|------------------|--------------|
| Dashboard tab lock | `SideNav.tsx`, `BottomNav.tsx` | Locked (greyed + lock icon) when no frozen budget | **Always accessible** |
| Transactions tab lock | `SideNav.tsx`, `BottomNav.tsx` | Locked when no frozen budget | **Always accessible** |
| FAB disabled | `BottomNav.tsx`, `DashboardScreen.tsx` | Disabled when no frozen budget | **Always enabled** |
| Dashboard empty state | `DashboardTab.tsx` | Shows "No budget yet, Plan Now" | **Shows Tracking Mode dashboard** |
| Transaction recording | `QuickAddTransaction.tsx` | Only renders if `planStatus === 'frozen'` | **Always available** |

### 5.2 BudgetProvider Changes

The `BudgetProvider` context currently sets `hasFrozenBudget` which gates navigation. This needs to change:

- `hasFrozenBudget` remains as a **display flag** (used to decide which dashboard view to show)
- It no longer gates navigation or transaction recording
- Rename consumer usage from "is locked" to "which view to show"

### 5.3 Post-Onboarding Redirect

| Current | New |
|---------|-----|
| `HouseholdScreen.tsx` always redirects to `/dashboard?tab=budget` | Path A (plan): redirects to `/dashboard?tab=budget` (same) |
| | Path B (skip): redirects to `/dashboard` (home tab) |

---

## 6. Nudge-to-Plan Flow

### 6.1 When to Nudge

The system nudges users toward budget creation after they have enough data to make it meaningful. Conditions:

| Trigger | Threshold | Rationale |
|---------|-----------|-----------|
| Transaction count | >= 15 transactions in current month | Enough data to show spending patterns |
| Spending amount | >= ₹5,000 total spending | Meaningful amount to budget against |
| Time | >= 14 days since signup | User has established a tracking habit |
| Income recorded | At least 1 income transaction | Budget needs income to make sense |

**Logic:** Show nudge card on dashboard when ANY TWO of these conditions are met. This avoids nudging too early (before patterns emerge) or too late (after the habit is set without planning).

### 6.2 Nudge Presentation

The nudge is a card on the Tracking Mode dashboard (see Section 4.1, Component D). It is:

- **Data-informed:** "You spent ₹12,400 on Groceries and ₹8,200 on Food Ordering last month."
- **Actionable:** "Create a budget to set limits and start saving."
- **Dismissable:** User can dismiss the card (don't show again for 7 days)
- **Not blocking:** Appears below spending data, never as a modal or interstitial

### 6.3 Budget Pre-Fill from Transaction Data

When a tracking-mode user taps "Create Budget":

1. System fetches their transaction data for the current (or previous) month
2. Pre-fills budget allocation amounts from actual spending per subcategory
3. User adjusts amounts, adds income, and follows normal freeze flow
4. This creates a dramatically better budget than cold-start guesswork

### 6.4 Notification Integration

The existing Budget Creation Reminders (Phase 2, deployed) continue to work. For tracking-mode users:

- Track A messages shift from "create your first budget" to "ready to plan? You've been tracking for X days"
- Clone modifier is replaced with "pre-fill from your spending data" messaging
- Phase 3 Expense Logging Reminders become relevant for tracking-mode users (encourage daily logging habit)

---

## 7. Existing User Experience

### 7.1 Users With Frozen Budgets

**No change.** Their experience is identical to today:
- Dashboard shows full budget-vs-actual metrics
- Budget tab shows frozen plan with edit capability
- All current features work as-is

### 7.2 Users With Draft Budgets

**Minor change.** Currently they see a locked dashboard. New behavior:
- Dashboard shows Tracking Mode view (spending summary)
- Budget tab shows their draft with a "Finish and freeze" prompt
- They can record transactions while their draft is in progress

### 7.3 Month Rollover (Existing Planning Mode User)

When a new month starts and the user hasn't cloned/created a budget yet:
- Dashboard shows Tracking Mode for that month
- User can record transactions immediately (no waiting for budget)
- Budget tab shows clone/fresh options (same as today)
- Once they freeze a plan, dashboard switches to Planning Mode

This is a significant improvement — currently, users are blocked from recording transactions at the start of each month until they deal with the budget.

---

## 8. Subcategory Management in Tracking Mode

### 8.1 Available Subcategories

Tracking-mode users get the 8 default-selected subcategories (Section 3.3). These appear in:
- QuickAddTransaction category dropdown
- Transaction filters
- Spending by Category on dashboard

### 8.2 Adding New Subcategories

Users need to add subcategories as their tracking needs grow. Options:

**Option A: Inline in QuickAddTransaction (Recommended)**
When recording a transaction, if the category they need doesn't exist:
- Type a name in the category search
- "Create [name]" option appears at bottom of dropdown
- Tap → select parent category (Variable, Fixed, etc.)
- Subcategory created, transaction recorded

This is the lowest-friction path — creation happens at the moment of need.

**Option B: Via Budget Tab**
Navigate to Budget tab → start creating a budget → category selection screen lets them add subcategories. This is the existing path but requires entering the budget flow.

### 8.3 Future: Smart Category Suggestions

When importing bank statements, the merchant matcher already suggests categories. In tracking mode, if a suggested subcategory doesn't exist in the user's household, the system could auto-create it. This is a fast-follow, not required for MVP.

---

## 9. Code Changes Required

### 9.1 Priority Order

| # | Change | Files | Effort |
|---|--------|-------|--------|
| 1 | **Explainer screen** | New: `ExplainerScreen.tsx`. Modified: `Router.tsx`, `HouseholdScreen.tsx` | Small |
| 2 | **Skip budget flow** | Modified: `HouseholdScreen.tsx` or new skip handler. Auto-load default subcats into DB. | Small |
| 3 | **Remove navigation gates** | Modified: `SideNav.tsx`, `BottomNav.tsx`, `BudgetProvider.tsx` | Small |
| 4 | **Remove FAB/transaction gates** | Modified: `DashboardScreen.tsx`, `DashboardTab.tsx` | Small |
| 5 | **Tracking Mode dashboard** | Modified: `DashboardTab.tsx` (new conditional view) | Medium |
| 6 | **Surface bank import** | Modified: `DashboardTab.tsx` (add import CTA) | Small |
| 7 | **Nudge-to-plan card** | Modified: `DashboardTab.tsx` (conditional card) | Small |
| 8 | **Budget pre-fill from transactions** | Modified: `budget.ts`, `BudgetTab.tsx` | Medium |

### 9.2 Database Changes

**No schema changes required.** The existing tables support both modes:
- `monthly_plans` — absence of a frozen plan = tracking mode
- `transactions` — work independently of plans
- `household_sub_categories` — populated from defaults on skip
- `budget_allocations` — only created when user makes a budget

### 9.3 Files to Modify

**New files:**
- `app/src/modules/onboarding/components/ExplainerScreen.tsx` — Onboarding explainer with plan/skip CTAs

**Modified files (gate removal):**
- `app/src/modules/navigation/components/SideNav.tsx` — Remove `isDashboardLocked`, `isTransactionsLocked`
- `app/src/modules/navigation/components/BottomNav.tsx` — Remove `isFabDisabled`, locked states
- `app/src/app/providers/BudgetProvider.tsx` — Keep `hasFrozenBudget` as display flag, not gate
- `app/src/modules/dashboard/components/DashboardScreen.tsx` — Always show FAB

**Modified files (dashboard):**
- `app/src/modules/dashboard/components/DashboardTab.tsx` — Add Tracking Mode view (spending summary, category breakdown, import CTA, nudge card) when `planStatus !== 'frozen'`

**Modified files (onboarding):**
- `app/src/modules/onboarding/components/HouseholdScreen.tsx` — Redirect to explainer instead of budget tab
- `app/src/app/Router.tsx` — Add explainer route

**Modified files (budget pre-fill):**
- `app/src/modules/budget/services/budget.ts` — Add function to generate budget allocations from transaction history
- `app/src/modules/budget/components/BudgetTab.tsx` — Pre-fill amounts when creating budget from tracking data

---

## 10. Configurable Parameters

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tracking_mode.nudge_min_transactions` | number | 15 | Minimum transactions before showing nudge-to-plan |
| `tracking_mode.nudge_min_spending` | number | 5000 | Minimum total spending (₹) before showing nudge |
| `tracking_mode.nudge_min_days` | number | 14 | Minimum days since signup before showing nudge |
| `tracking_mode.nudge_dismiss_days` | number | 7 | Days to hide nudge after dismissal |
| `tracking_mode.import_cta_max_transactions` | number | 5 | Hide import CTA after this many transactions |

### Hardcoded Values

| Value | Rationale |
|-------|-----------|
| 8 default subcategories | Covers 80% of initial transactions. Adding more increases clutter without value. |
| Nudge requires 2-of-4 conditions | Single condition could trigger too early. All 4 would be too conservative. |
| Explainer screen has exactly 3 steps | More = users don't read. Fewer = insufficient context. |

---

## 11. What This Changes in Product Principles

### Updated Principle #6

**Before:** "Plan before you track. No transaction recording without a frozen plan."

**After:** "Track freely, plan when ready. Transaction recording is always available. Budget planning enhances tracking with targets and limits — it's the next step, not a prerequisite."

### All Other Principles Unchanged

- Savings-first waterfall (still applies in Planning Mode)
- Income is a category (unchanged)
- Three transaction types only (unchanged)
- No over-allocation (still enforced when freezing a budget)
- Feature toggles for everything (unchanged)

---

## 12. Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Onboarding completion rate | Unknown (suspected low) | > 80% reach dashboard | Track skip vs plan in explainer screen |
| Time to first transaction | 30+ minutes (budget first) | < 2 minutes | Timestamp diff: signup → first transaction |
| Day 7 retention | Unknown | > 40% | Users with transactions in week 2 |
| Budget creation rate (month 2) | N/A | > 30% of tracking-mode users | Track conversion from tracking → planning |
| Transactions per active user per week | ~5 | > 10 | More tracking = more value |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users never create a budget | Medium — app becomes commodity tracker | Nudge-to-plan flow, data-informed budget generation, notification reminders |
| Too many default subcategories | Low — clutter in transaction form | Only 8 defaults, all high-frequency categories |
| Existing users confused by changes | Low — their flow doesn't change | Planning Mode dashboard identical to current, no forced migration |
| Budget pre-fill amounts are wrong | Low — user adjusts before freezing | Pre-fill is a starting point, not auto-freeze. User reviews every amount. |

---

## 14. Implementation Phases

### Phase 1: Gate Removal + Explainer (MVP)
- Build explainer screen with plan/skip CTAs
- Auto-load default subcategories on skip
- Remove all navigation/FAB/transaction gates
- Tracking Mode dashboard (spending summary + category breakdown)
- Surface bank import CTA on dashboard

**Result:** New users can track immediately. Existing users unaffected.

### Phase 2: Nudge-to-Plan
- Nudge card on Tracking Mode dashboard (conditional)
- Budget pre-fill from transaction history
- Update notification messages for tracking-mode users

**Result:** Tracking-mode users are encouraged to graduate to planning.

### Phase 3: Polish
- Inline subcategory creation in QuickAddTransaction
- Smart category suggestions from bank import
- Analytics on tracking → planning conversion

**Result:** Complete self-serve experience from tracking to planning.
