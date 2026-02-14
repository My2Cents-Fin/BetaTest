# My2cents — Solution Document: Pillar 0 (Foundation)

> **Implementation Status (Feb 2026):** The Foundation pillar is partially built and deployed to production (https://beta-test-five.vercel.app). See `progress.md` for detailed status. Key items BUILT: onboarding, budget planning, transaction recording, dashboard, 3-tab navigation. Key items NOT YET BUILT: savings buckets, CC accounting, bank account registration, notifications, reconciliation, batch mode. Features marked with status annotations below.

## 1. Purpose of This Document

This document details the Foundation pillar of My2cents — the core system that replaces the current manual financial tracking process. It covers what will be built, how transactions are treated in the ledger, internal prioritization, assumptions, constraints, and non-functional requirements.

For the overall product vision, philosophy, and future pillars, refer to **My2cents Roadmap.md**. For the as-is state of the current system, refer to **My2cents Foundations.md**.

---

## 2. Foundation Pillar Philosophy

The Foundation pillar has one job: build a system reliable enough that both users trust it more than their spreadsheet.

This means three things must be true before Foundation is considered complete:

1. **Every rupee is accounted for.** The system must know where money came from, where it went, and where it is right now. When the system says the bank balance should be ₹47,312 — the user should be able to verify that against their actual balance and either confirm it or find exactly where the gap is.

2. **Monthly setup takes minutes, not hours.** The current process of updating the master Excel, copy-pasting into the expense dump, and manually syncing AppSheets takes roughly an hour. The Foundation must reduce this to under 15 minutes — most of which is the user making allocation decisions, not entering data.

3. **Daily recording is effortless enough to sustain.** The system lives or dies on transaction recording discipline. If it takes more than 10 seconds to log an expense, users will stop doing it. Every design decision in transaction recording optimizes for speed and low friction.

---

## 3. Glossary

| Term | Definition |
|------|-----------|
| Household | A financial unit — typically a family or couple — that shares income, expenses, and financial plans. The top-level tenant in the system. |
| Member | An individual user within a household. Each member has their own login and can record transactions. |
| Category | A top-level grouping of expenses by type. **9 system categories:** Income (💰), EMI (🏦), Insurance (🛡️), Savings (🐷), Fixed (📌), Variable (🔄), Family (👨‍👩‍👧‍👦), Investment (📈), One-time (📅). |
| Sub-category | A specific expense line item within a category. E.g., "Groceries" under "Variable," "Donda Car Loan" under "EMI." |
| Plan | The monthly budget — a set of sub-categories with allocated amounts for a given month. |
| Plan Freeze | The act of finalizing a month's plan. After freezing, changes are tracked as revisions. |
| Transaction | A single financial event: an expense, a fund transfer, or an income entry. |
| Expense | A transaction where money is spent on goods or services. Reduces available budget. |
| Fund Transfer | A transaction where money moves between accounts or household members. Not an expense — does not reduce budget. **Current implementation:** fund transfers between household members (not bank accounts, which are deferred to P1). |
| Income | Money received into the system — salaries, bonuses, refunds, reimbursements. |
| Savings Bucket | A ring-fenced pool of money earmarked for a specific future expense or goal. Can be mapped to any external instrument (bank pot, separate account, FD, cash envelope). Optional feature. |
| Reconciliation | The process of comparing the system's calculated bank balance against the actual bank balance to identify discrepancies. |
| Adjustment | A reconciliation entry that accounts for an unexplained difference, logged with a note for future investigation. |
| Amortization | Spreading a non-monthly expense (annual, quarterly) into equal monthly savings amounts. |
| Allocation Waterfall | The top-down priority order in which income is distributed across categories. |
| Opening Balance | The actual bank balance at the start of a month, entered manually. Serves as the anchor for all balance calculations that month. |
| Spendable Balance | The portion of the bank balance that is available for spending — actual bank balance minus any earmarked amounts that have not been physically moved to a separate account. |

---

## 4. Transaction Accounting Model

Different transaction types are treated differently in the ledger. How they affect the budget, the bank balance, and the spendable balance depends on both the transaction type and the user's savings management preference.

### 4.1 Transaction Types

There are three transaction types in the system:

**Income**
Money entering the system. Recorded once or multiple times in a month. When new income arrives mid-month (e.g., a ₹10K refund on the 15th), it adds to total income for the month. It does not automatically change any existing expense allocations — the user can choose to revise the plan or leave the surplus as unallocated buffer.

**Expense**
Money spent on goods or services. Each expense is tagged to a sub-category and a payment method (bank account or credit card).

- If paid from a **bank account**: the bank balance decreases immediately. The sub-category's remaining budget decreases.
- If paid from a **credit card**: the bank balance is NOT affected yet — money hasn't left the bank. The CC's running balance increases. The sub-category's remaining budget still decreases (the spend happened, even if the cash outflow is deferred).
- If paid from a **credit card with a linked savings bucket** (e.g., a "Bills" bucket mapped to that CC): in addition to the above, the system auto-generates a pending fund transfer for the same amount into the linked bucket. These pending transfers accumulate and appear as a running total the user can act on at their preferred frequency (daily, weekly, or monthly). The user moves the money to the bucket whenever convenient and marks it done. This eliminates the need to manually log a separate fund transfer for every CC purchase.

**Fund Transfer**
Money moving between the user's own accounts. This is not an expense — no budget is affected. Fund transfers cover:

- Bank account → CC payment (settling a CC bill; CC running balance decreases, bank balance decreases)
- Bank account → savings bucket (moving earmarked money; bank balance decreases, bucket balance increases)
- Bank account → bank account (moving money between own accounts)
- Bulk CC bucket transfer (moving accumulated CC spend equivalent into the linked bucket; bank balance decreases, bucket balance increases — triggered manually by user based on auto-generated pending transfers)

### 4.2 Savings Management Preference

During onboarding, the household indicates how they manage earmarked money. This preference determines how the system calculates spendable balance.

**Option A: "I move earmarked money to a separate account/pot"**
The savings bucket module is enabled. When the user allocates savings, they physically move money out of the operating account and log it as a fund transfer. The bank balance and spendable balance are always equal — what's in the operating account is what's available to spend.

**Option B: "I keep earmarked money in my main account and track it mentally"**
The savings bucket module tracks earmarks but no physical movement happens. The bank balance will be higher than the spendable balance. The system maintains both:
- **Actual bank balance** = opening balance + income - expenses paid from bank - fund transfers out
- **Spendable balance** = actual bank balance - all earmarked-but-not-moved amounts

The dashboard shows both numbers. The spendable balance is what matters for day-to-day spending decisions.

**Option C: "I don't earmark — I just budget and spend"**
The savings bucket module is disabled entirely. Budget allocations exist in the plan but there is no separate tracking of earmarked funds. Bank balance = spendable balance. This is the simplest mode.

### 4.3 Credit Card Accounting

Credit cards are modeled as separate accounts with their own running balance.

1. **Purchase on CC:** Expense is recorded (budget decreases). CC running balance increases. Bank balance unchanged.
2. **CC bill payment:** Fund transfer from bank to CC. Bank balance decreases. CC running balance decreases. No budget impact — the expenses were already counted at step 1.

For users who link a savings bucket to a CC (e.g., a "Bills" bucket mapped to Axis CC):

1. **Purchase on CC:** Same as above, plus a pending fund transfer is auto-generated for the same amount into the linked bucket.
2. **Bulk bucket transfer:** At any frequency the user prefers, they move the accumulated pending amount from their bank to the linked bucket and mark it done. Bank balance decreases, bucket balance increases.
3. **CC bill payment:** When the CC bill is due, the user withdraws from the bucket and pays the CC. Bucket balance decreases, CC running balance decreases. Bank balance is unaffected (money was already moved out at step 2).

This eliminates the current workaround of logging CC payments as both income and expense to avoid double-counting. Users who don't use buckets for CC management skip steps 2 and 3 — they simply pay the CC directly from their bank when the bill is due.

### 4.4 Savings Allocation in the Plan

Savings categories (Savings, International Trip, etc.) are treated as budget line items in the allocation waterfall — they consume income just like expenses do. The difference is in what happens after allocation:

- If the user physically moves the money (Option A): a fund transfer is logged, bank balance decreases
- If the user doesn't move the money (Option B): no transaction is logged, but the system deducts the amount from spendable balance
- If the user doesn't earmark at all (Option C): the allocation exists in the plan but has no balance-level effect; it's purely a budgeting exercise

---

## 5. Assumptions

1. Both users in the founding household have smartphones with reliable internet access for daily use.
2. Users are comfortable with a web-based PWA interface on mobile — a native app is not required for adoption.
3. All financial accounts (bank accounts, credit cards) are held by the household members themselves — no third-party accounts are managed.
4. Income is primarily salary-based with occasional one-time additions. Income frequency is monthly.
5. The system does not move money. All bank transfers, bucket allocations, and payments are executed by the user outside the system.
6. Users are willing to enter an opening bank balance at the start of each month for reconciliation to work.
7. The founding household's existing financial model (savings-first, top-down allocation, category hierarchy) is representative of how other Indian households would want to manage finances, with variations in categories and amounts.
8. Savings bucket instruments (Jupiter pots, separate bank accounts, etc.) have no APIs. All bucket interactions are manual.
9. Both users always use separate devices. Shared device support is not required.
10. Historical data from the current Google Sheets system will be migrated via a one-time script. The migration is a data operation, not a product feature.
11. The financial year runs April to March, aligned with the Indian fiscal year.

---

## 6. Constraints

1. **No bank/UPI integrations.** No account aggregator APIs, no UPI transaction feeds, no direct bank connectivity. All data entry is manual in the Foundation pillar.
2. **Supabase free tier limits.** 500MB database storage, 50K monthly active users, 2 projects. Sufficient for Foundation but must be monitored.
3. **PWA push notification limitations on iOS.** iOS Safari supports push notifications only from iOS 16.4+ and requires the PWA to be added to the home screen. Notification delivery is not guaranteed.
4. **No automated money movement.** The system will never initiate bank transfers, UPI payments, or any financial transaction on behalf of the user.
5. **INR only.** All amounts are in Indian Rupees within the Foundation pillar.
6. **Two-member household scope.** The data model supports multi-member households from day one, but the UI and flows are optimized for two members.
7. **No real-time bank balance sync.** Bank balances are manually entered snapshots, not live feeds.

---

## 7. Capability Areas and Features

Features are prioritized within the Foundation pillar:

- **P0** = Must have to launch. The system cannot function without these.
- **P1** = Needed soon after launch. Addresses pain points that are currently affecting users but the system can technically function without them for a few weeks.
- **P2** = Enhancements within Foundation. Makes the system better but can wait.

---

### 7.1 Household Setup & Onboarding — BUILT (partial)

The entry point for any user — new or migrating.

> **Status:** Core flow BUILT (phone OTP → name → household → budget). Account registration (7.1.4) and savings preference (7.1.5) are DEFERRED.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.1.1 | Household creation | P0 | Create a household, set household name, invite a partner/member via email. The creator becomes the first member. |
| 7.1.2 | Member invitation and auth | P0 | Invited member receives a link, creates an account (Supabase Auth), and joins the household. Each member has their own login credentials. |
| 7.1.3 | Income source setup | P0 | Register income sources: name (e.g., "Varshi Salary"), type (recurring/one-time), expected amount, frequency (monthly), which bank account it lands in. |
| 7.1.4 | Bank account and CC registration | P0 | Register all bank accounts and credit cards: name, type (savings/current/credit card), last 4 digits (for identification), issuer. Metadata only — no credentials or API access. |
| 7.1.5 | Savings management preference | P0 | During onboarding, the household selects how they manage earmarked money: physically move to separate accounts (Option A), keep in main account and track mentally (Option B), or don't earmark at all (Option C). This drives ledger calculations and bucket module visibility. |
| 7.1.6 | Category setup | P0 | Define expense categories and sub-categories. For new users: provide a default template of common Indian household categories (rent, groceries, fuel, EMIs, etc.) that can be customized. For migrating users: import from historical data. |
| 7.1.7 | First month plan creation | P0 | For new users with no historical data: guided flow to allocate income across categories manually. System shows the allocation waterfall in real time as amounts are entered, displaying remaining unallocated income at each step. |

---

### 7.2 Income & Account Management — NOT YET BUILT

> **Status:** Income is handled as a category in the budget plan. Account registration, multi-account tracking, opening balance per account, and CC lifecycle are all DEFERRED to P1. Opening balance is a sub-category under Income.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.2.1 | Income registration | P0 | Record salary credits and other income sources per month. Support recurring income (salaries) and one-time income (bonuses, refunds). |
| 7.2.2 | Multi-account tracking | P0 | Track which account income lands in and which account expenses are paid from. Each transaction is tagged to a payment method (account or CC). |
| 7.2.3 | Opening balance capture | P0 | Record the actual bank balance at the start of each month for each account. This is the anchor for reconciliation. |
| 7.2.4 | Credit card lifecycle | P0 | Model the full CC flow as described in Section 4.3. CC has its own running balance. Purchases increase the balance, payments decrease it. No more income/expense netting workaround. |

---

### 7.3 Financial Planning — BUILT (partial)

> **Status:** Category/sub-category management BUILT. Monthly plan with edit/freeze BUILT. Period-based allocations (monthly/quarterly/yearly/one-time) BUILT. Smart copy, annual view, waterfall visualization, and amortization engine NOT YET BUILT.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.3.1 | Category and sub-category management | P0 | Define, add, edit, archive expense categories. Categories have a type (EMI, Insurance, Family, Savings, Investment, Fixed, Variable, One-time). Sub-categories sit under categories. Users can create custom categories. When creating a sub-category, the user defines a **target**: amount (e.g., ₹24,000), period (monthly, quarterly, annual, or custom number of months), start date, and optional end date (for EMIs with fixed tenure). The system auto-calculates the monthly allocation (e.g., ₹24,000 over 12 months = ₹2,000/month) and populates it into each month's plan. For monthly expenses, the target amount is the monthly amount itself. |
| 7.3.2 | Monthly plan creation (smart copy) | P0 | For months after the first: auto-generate a plan by copying the previous month's allocations. Auto-remove sub-categories with ended date ranges (e.g., finished EMIs). Flag sub-categories where actuals deviated significantly from plan in the previous month. User reviews and edits before freezing. For the first month: use the guided allocation flow from 7.1.7. |
| 7.3.3 | Plan freezing and versioning | P0 | Once the user finalizes the month's plan, it is frozen. Any subsequent changes create a revision with a changelog. This prevents silent edits that cause confusion later. |
| 7.3.4 | Annual plan view | P0 | A 12-month view showing planned allocations across all months, with the ability to set annual targets and distribute them across months (e.g., ₹24,000 car insurance → ₹2,000/month). |
| 7.3.5 | Allocation waterfall | P0 | Visual representation of how income is allocated top-down: Income → EMIs → Insurance → Family → Savings → Fixed → Variable → One-time → Remainder. Shows how much is left at each level. |
| 7.3.6 | Non-monthly expense amortization engine | P0 | Driven by sub-category target definitions (7.3.1). When a sub-category has a non-monthly period (annual, quarterly, custom), the system auto-calculates the monthly savings amount and includes it in every applicable month's plan. Tracks accumulated amount vs required amount — e.g., "Car Insurance: ₹14,000 saved of ₹24,000 needed by Feb 2027." |
| 7.3.7 | Reallocation assistant | P2 | When an EMI ends or an expense changes, suggest where the freed-up amount could go based on historical underfunding, overspend patterns, or savings goals. |

---

### 7.4 Transaction Recording — BUILT

> **Status:** Quick entry BUILT (add/edit/delete). Classification (expense/income/transfer) BUILT. Transaction filters (date, member, type) BUILT. Fund transfers between members BUILT. Batch mode, recurring templates, and CC-bucket auto-linking NOT YET BUILT.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.4.1 | Quick transaction entry | P0 | Record a transaction: date, amount, sub-category, remarks, payment method (which account/CC), who logged it. Optimized for speed — recent categories at top, smart defaults for date (today), numeric keypad for amount. |
| 7.4.2 | Transaction classification | P0 | Every transaction is classified as one of: **Expense**, **Fund Transfer**, or **Income** — as defined in Section 4.1. |
| 7.4.3 | Batch recording mode | P0 | Enter multiple transactions in quick succession without returning to the home screen after each one. For catching up on missed days. |
| 7.4.4 | Recurring transaction templates | P1 | For expenses that repeat monthly at the same amount (rent, cook, maid, EMIs), create templates that auto-generate transactions at month start. User confirms or edits. |
| 7.4.5 | Reimbursable expense tagging | P1 | Tag transactions as "to be reimbursed" (e.g., work travel expenses). Track reimbursement status. When reimbursed, auto-log as income. |
| 7.4.6 | Split transactions | P2 | Split a single payment across multiple categories. E.g., a Blinkit order of ₹500 that is ₹300 groceries + ₹200 household essentials. |
| 7.4.7 | Receipt/screenshot attachment | P2 | Attach a photo of a receipt or payment screenshot to a transaction for audit purposes. |

---

### 7.5 Budget Tracking & Reconciliation — BUILT (partial)

> **Status:** Budget vs actual (live) BUILT in Budget view mode with smart color coding. Category rollup BUILT. Daily spending guidance BUILT in Dashboard. Reconciliation engine, discrepancy journal, and month-end close NOT YET BUILT.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.5.1 | Budget vs actual (live) | P0 | For each sub-category in the current month, show: budgeted amount, spent so far, remaining. Updated in real-time as transactions are recorded. |
| 7.5.2 | Category-level rollup | P0 | Aggregate sub-categories into their parent category (e.g., all Variable expenses summed) for a higher-level view. |
| 7.5.3 | Balance reconciliation engine | P1 | At any point, the user can trigger a reconciliation: enter actual bank balances across all accounts, and the system compares against its calculated balance (opening balance + income - outflows). Differences are surfaced with possible explanations (unlogged transactions, timing gaps, auto-debits). |
| 7.5.4 | Discrepancy journal | P1 | When a reconciliation reveals a gap, the user can log it as an "adjustment" with a note. This keeps the books balanced without hiding the issue. Over time, patterns in adjustments may reveal the root cause. |
| 7.5.5 | Remaining daily budget | P0 | For variable expense categories, calculate: (budget remaining) ÷ (days remaining in month) = how much can be spent per day. Gives a practical daily spending guide. |
| 7.5.6 | Overspend alerts | P0 | When a category reaches 80% of its budget, notify both users. When it exceeds 100%, send a warning. |
| 7.5.7 | Month-end close and rollover | P1 | A guided flow: verify all transactions are logged, review unresolved reconciliation gaps, carry forward any adjustments, generate the next month's plan (smart copy), create the bucket transfer checklist, and prompt the user to review — all in one flow. |

---

### 7.6 Savings Buckets — NOT YET BUILT

> **Status:** Entire savings bucket module is DEFERRED. No `savings_buckets` table, no bucket UI. Savings preference question during onboarding is also deferred.

An optional module — enabled or disabled based on savings management preference (7.1.5). Users who selected Option C during onboarding will not see any bucket-related features.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.6.1 | Bucket registry | P0 | Register savings buckets with: logical name (purpose), external instrument name (e.g., Jupiter pot name, bank account name), instrument type (neo-bank pot, savings account, FD, cash envelope), purpose/classification. |
| 7.6.2 | Monthly bucket transfer checklist | P0 | At month start (after plan freeze), generate a checklist of all bucket transfers required: which bucket, how much, for what purpose. User marks each as done after manually transferring outside the system. |
| 7.6.3 | Bucket balance tracking | P0 | Record bucket balances at any time (manual entry). Track balance over time. Compare expected bucket balance (cumulative planned transfers) vs actual bucket balance (manually entered). |
| 7.6.4 | Bucket-to-expense mapping | P0 | Map each bucket to the expense sub-categories it funds. When a mapped expense is due (e.g., annual car insurance payment), the system tells the user which bucket to withdraw from and how much should be available. |
| 7.6.5 | Bucket utilization alerts | P2 | Alert when a bucket's balance is insufficient for an upcoming mapped expense. Alert when a bucket has excess funds that could be redeployed. |

---

### 7.7 Dashboard & Analytics — BUILT (partial)

> **Status:** Month overview BUILT (Budget Health, Daily Spending, Expected Cash Balance cards). Category-wise remaining BUILT (Variable at-risk, overspent categories). Progressive disclosure pattern BUILT. Spending by person, trends, anomaly detection, data export NOT YET BUILT.

The dashboard evolves over time — starting with essential operational metrics and progressively adding deeper analytical views.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.7.1 | Month overview | P0 | Single-screen summary: total income, total allocated, total spent, expected bank balance, spendable balance, budget utilization percentage, categories approaching overspend. |
| 7.7.2 | Category-wise remaining budget | P0 | For every active category, show: budget, spent, remaining, percentage utilized. Color-coded: green (<70%), amber (70-100%), red (>100%). |
| 7.7.3 | Expected bank balance | P0 | Calculate what the bank balance should be right now based on: opening balance + income received - all logged outflows (expenses from bank + fund transfers). Display alongside spendable balance. Compare against last known actual balance. |
| 7.7.4 | Spending by person | P1 | Breakdown of spending by who logged the transaction. Useful for understanding individual vs joint spending patterns. |
| 7.7.5 | Category trends | P1 | For any category, show a month-over-month trend line of planned vs actual. Identify categories with chronic overspend or consistent underspend. |
| 7.7.6 | Expense anomaly detection | P1 | Flag transactions or monthly category totals that are statistical outliers compared to historical patterns. E.g., Misc/Essentials at ₹56K when the 6-month average is ₹18K. |
| 7.7.7 | Shared vs individual spending view | P1 | Classify categories as shared (rent, groceries) or individual (fitness, personal care). Show spending from both lenses. |
| 7.7.8 | Data export | P1 | Export all data (transactions, plans, reports) to CSV/Excel at any time. Users own their data. |

---

### 7.8 Notifications & Reminders — NOT YET BUILT

> **Status:** No notifications implemented. PWA manifest and service worker not yet added. All notification features are DEFERRED.

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 7.8.1 | Transaction notification | P0 | When one user records a transaction, the other receives a push notification (PWA) with: amount, category, remarks. |
| 7.8.2 | Recording reminder | P0 | Configurable daily reminder (e.g., 9 PM) prompting both users to log any unrecorded transactions for the day. |
| 7.8.3 | Overspend warning | P0 | Push notification when a category crosses 80% and 100% of budget. |
| 7.8.4 | Monthly setup reminder | P0 | At the start of each month (1st), remind users to review and freeze the new month's plan. |
| 7.8.5 | Bucket transfer reminder | P0 | After plan is frozen, remind users to complete all bucket transfers per the generated checklist. |
| 7.8.6 | Daily spending summary | P1 | End-of-day summary: total spent today, by whom, top categories, remaining variable budget for the month. |
| 7.8.7 | Weekly financial digest | P1 | Weekly summary: total spent this week, budget utilization by category, projected month-end position. |
| 7.8.8 | Bill due date reminders | P1 | For credit cards and other periodic bills, remind users ahead of due dates with the amount to be paid and which bucket to withdraw from. |

---

---

> **Note:** Debt & Loan Management (loan registry, payoff tracking, strategy modeling) is scoped under the Optimization pillar in the product roadmap. It is not part of the Foundation pillar.

---

## 8. Priority Summary

### P0 — Must Have to Launch

| Area | Features |
|------|----------|
| Onboarding | Household creation, member auth, income setup, account registration, savings preference, category setup, first month plan |
| Income & Accounts | Income registration, multi-account tracking, opening balance, CC lifecycle |
| Planning | Category management with target definitions, monthly plan (smart copy + first month guided), plan freeze/versioning, annual view, waterfall, amortization engine |
| Transactions | Quick entry, classification (expense/transfer/income), batch mode, CC-bucket auto-linking for pending transfers |
| Budget Tracking | Budget vs actual (live), category rollup, remaining daily budget, overspend alerts |
| Savings Buckets | Bucket registry, transfer checklist, balance tracking, expense mapping |
| Dashboard | Month overview, category-wise remaining, expected bank balance |
| Notifications | Transaction alerts, recording reminders, overspend warnings, setup reminders, bucket transfer reminders |

### P1 — Needed Soon After Launch

| Area | Features |
|------|----------|
| Transactions | Recurring templates, reimbursable expense tagging |
| Budget Tracking | Reconciliation engine, discrepancy journal, month-end close and rollover |
| Dashboard | Spending by person, category trends, anomaly detection, shared vs individual view, data export |
| Notifications | Daily spending summary, weekly digest, bill due date reminders |

### P2 — Foundation Enhancements

| Area | Features |
|------|----------|
| Planning | Reallocation assistant |
| Transactions | Split transactions, receipt attachment |
| Savings Buckets | Bucket utilization alerts |

---

## 9. Resolved Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | Migrate historical data? | Yes — one-time migration script | Users want continuity. Script imports transactions and plans from Google Sheets. Not a product feature. |
| 2 | CC billing cycle vs budget month? | Transactions belong to the budget month they occur in, not the CC billing cycle. CC bill payment is logged as a fund transfer in the month it is paid. | Aligns with how users think about spending. |
| 3 | Shared device usage? | Assume separate devices always. | Simplifies auth and session handling. |
| 4 | Offline support? | Basic offline queueing for transaction entry if low effort. Full offline deferred. | Users primarily have connectivity. |
| 5 | Currency? | INR only in Foundation. Multi-currency in later pillars. | Covers 99% of transactions. |
| 6 | New user flow vs existing user only? | Build new user flow from day one. Founding household uses the same onboarding + migration script. | Avoids a retrofit later. |
| 7 | Savings buckets — specific or generic? | Generic. Optional module driven by savings management preference. | Not all households use pots. The concept of earmarking is universal; the instrument is not. |
| 8 | Transaction types? | Three types: Income, Expense, Fund Transfer. Savings allocation is a planning concern, not a transaction type. Physical money movement is a fund transfer. | Keeps the ledger clean and avoids the current problem of mixing expenses with fund movements. |
| 9 | CC payment treatment? | Fund transfer (bank → CC). Not an expense. Not logged as income. | Eliminates double-counting workaround. |
| 10 | Earmarked but not moved money? | System tracks spendable balance (bank balance minus earmarks) for users who don't physically move money. | Prevents false sense of available funds. |

---

## 10. Non-Functional Requirements

### 10.1 Performance

| Requirement | Target |
|-------------|--------|
| Transaction entry to confirmation | <2 seconds |
| Dashboard load time | <3 seconds |
| Plan generation (smart copy) | <5 seconds |
| Reconciliation calculation | <5 seconds |
| Notification delivery (PWA push) | <30 seconds from trigger event |

### 10.2 Availability

- Target uptime: 99.5% (allows ~3.6 hours downtime/month).
- Supabase handles infrastructure availability. Application layer should handle Supabase outages gracefully (show cached data, queue transactions).

### 10.3 Security

| Requirement | Detail |
|-------------|--------|
| Authentication | Supabase Auth with phone + OTP. No email, no passwords. |
| Authorization | Row-level security (RLS) in Supabase. Users can only access data belonging to their household. |
| Data isolation | Household data is completely isolated. No cross-household data access under any circumstance. |
| Data encryption | Supabase provides encryption at rest and in transit (TLS). No additional application-level encryption needed. |
| Session management | JWT-based sessions via Supabase. Auto-expire after inactivity. |

### 10.4 Data Retention & Backup

- All data retained indefinitely within Supabase storage limits.
- On the free tier, users should periodically export data (7.7.8) as a manual backup.
- No data deletion by the system. Users can delete their own transactions. Household deletion requires explicit confirmation and is irreversible.

### 10.5 Scalability

- Foundation: Designed for 1 household, 2 users, ~200-400 transactions/month.
- Data model and API design must support N households, M users per household, without architectural changes.
- Database indexing strategy must account for multi-tenant query patterns from day one.

### 10.6 Accessibility

- PWA must be responsive: usable on mobile (360px width) through desktop (1440px+).
- Touch-friendly tap targets (minimum 44x44px) for mobile transaction entry.
- Standard web accessibility (semantic HTML, keyboard navigation, sufficient color contrast).

---

## 11. Data Migration Plan (Founding Household)

### 11.1 Scope

Migrate all historical data from the current Google Sheets system into the new Supabase database.

### 11.2 Data to Migrate

| Source | Data | Destination |
|--------|------|-------------|
| Master Excel (FY Plan) | Monthly plan allocations (category, sub-category, month, planned amount, actual amount) for all months with data | Monthly plans and budget records |
| Expense Dump - Sheet1 | All transaction records (ID, date, amount, bucket, remarks, month, email, timestamp) | Transactions table |
| Expense Dump - Budget v/s Actual | Category definitions and monthly budgets | Categories and monthly plan records |
| Jupiter Pots sheet | Pot registry (logical name, actual name, classification) and balance snapshots | Savings buckets and balance history |

### 11.3 Migration Approach

1. Export all Google Sheets as CSV.
2. Write a one-time migration script that: validates and cleans data, maps old category names to new category/sub-category structure, maps email addresses to user accounts, inserts into Supabase tables via the API.
3. Run migration in a staging environment first. Validate record counts, totals, and spot-check individual months.
4. Run migration in production. Verify with users.

### 11.4 Migration Risks

| Risk | Mitigation |
|------|------------|
| Category names in old data don't match new structure | Build a mapping table. Review with users before running. |
| Duplicate transactions | Deduplicate on (date, amount, bucket, email). Flag potential duplicates for user review. |
| Missing data (empty fields, partial months) | Import what exists. Flag incomplete records. |
| Fund transfers logged as expenses in old data | Import as-is with a note that historical data predates the expense/transfer separation. |

---

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Transaction recording fatigue | Users stop logging, data becomes unreliable | Fast entry UX, daily reminders, batch mode. Productivity pillar (auto-capture) addresses this long-term. |
| Savings bucket instruments have no APIs | Bucket management stays manual | Checklist with clear amounts; track bucket balances to verify transfers happened |
| CC payment flow complexity | Users confused by new CC model vs old approach | Clear onboarding explanation of how CC transactions work. CC running balance visible at all times. |
| Supabase free tier limits | May hit storage limits as data grows | 500MB is sufficient for years of household data; monitor usage. |
| PWA push notification reliability | Notifications not delivered on all devices, especially iOS | Use service workers with fallback. Evaluate alternative channels in Productivity pillar. |
| Scope creep within Foundation | Delays launch | Strict P0 boundary. P1 and P2 features are explicitly deferred. |
| Historical data migration quality | Bad data imported into new system | Staging migration first; user validation before production. |
| Offline transaction queueing | Sync conflicts when back online | Simple queue with last-write-wins. Conflict resolution UI deferred. |
| Spendable balance confusion | Users don't understand the difference between bank balance and spendable balance | Clear labeling in dashboard. Onboarding explanation. Tooltip on hover/tap. |

---

## 13. Success Metrics

### P0 Success

| Metric | Target |
|--------|--------|
| Monthly setup time | <15 minutes (down from ~1 hour) |
| Transaction recording time | <10 seconds per entry |
| Data entry coverage | >95% of actual transactions captured |
| Both users active daily | >25 days/month with at least one entry each |
| System trust | Users stop maintaining the parallel Google Sheets system within 1 month of launch |

### P1 Success

| Metric | Target |
|--------|--------|
| Reconciliation discrepancy | Identifiable root cause in >80% of cases |
| Budget adherence | Variable categories within ±15% of plan for >70% of categories |
| Month-end close time | <10 minutes with guided flow |
| Notification engagement | >50% of notifications acknowledged within 1 hour |

### P2 Success

| Metric | Target |
|--------|--------|
| Trend visibility | Users can identify top 3 overspend categories without manual analysis |
| Reallocation adoption | Users accept system-suggested reallocations >50% of the time |

---

## 14. Dependencies

| Dependency | Status | Impact |
|------------|--------|--------|
| Supabase account and project | To be set up | Blocks all backend work |
| Domain and hosting (for PWA) | To be decided | Blocks deployment |
| PWA push notification setup | Requires HTTPS and service worker | Blocks notifications |
| Claude Code + Supabase MCP | Available | Development tooling |
| Historical data migration | Requires CSV exports from current Google Sheets | Blocks launch if users want continuity |
| Service worker for offline queueing | To be implemented | Blocks offline transaction entry |
