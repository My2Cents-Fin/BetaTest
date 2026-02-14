# My2cents Foundations — Context Document

> **Note (Feb 2026):** This document describes the **legacy manual system** that My2cents (formerly Finny) was built to replace. The My2cents app is now live at https://beta-test-five.vercel.app and partially replaces the workflows described here. The Google Sheets system may still be used in parallel during the transition period.

## 1. Overview

My2cents (formerly Finny) is a household financial management system used by a married couple (Varshi and Donda) to plan, track, and control their combined finances across an entire financial year. The core philosophy is **savings first, expenses later** — all mandatory outflows and savings targets are earmarked before any discretionary spending is allowed.

The system previously ran on **Google Sheets** (as the database) with an **AppSheets** frontend (mobile app called "Finny") for daily transaction recording. It has since been replaced by the **My2cents PWA** (React + TypeScript + Supabase). This document captures the original as-is state that informed the design of the replacement system.

---

## 2. Users

| User | Email | Role |
|------|-------|------|
| Varshi | varshikolla@gmail.com | Primary planner, records transactions |
| Donda (Chaithanya) | chaithanya.donda@recykal.com | Co-planner, records transactions |

Both users have equal access. Either can record transactions, review budgets, and make allocations.

---

## 3. Financial Architecture

### 3.1 Income Sources

Combined income flows from:
- Varshi's salary
- Donda's salary
- Ad-hoc income (bonuses, returns, refunds, pot withdrawals for CC payments)

Income varies month to month. Typical combined monthly income: ₹4,00,000–₹4,50,000 (with occasional spikes due to bonuses or one-time inflows).

### 3.2 Banking Infrastructure

**Salary/Operating Accounts:**
- Varshi's ICICI account
- Donda's Axis account

**Credit Cards:**
- Axis Credit Card
- HDFC Diners Credit Card
- ICICI Coral Credit Card

**Neo-Bank (Escrow):**
- Jupiter — used as an escrow/savings layer with multiple "pots" (sub-accounts) for earmarking money

### 3.3 Jupiter Pots

Jupiter pots act as ring-fenced escrow buckets. Money moved to Jupiter is considered "out of the operating system" — it is not counted in bank balance calculations for budgeting purposes. Pots can only be touched when the earmarked expense is due.

Jupiter does not allow pot renaming, so there is a mapping layer between logical purpose and actual pot name:

| Logical Purpose | Jupiter Pot Name | Classification |
|----------------|-----------------|----------------|
| Donda's Mom (HI + Family) | Athaya | Donda's Mom HI + Family amount |
| Donda ISB Gift | Donda ISB gift | To be transferred to savings post 14K balance |
| Marriage Debt Payback | Payback | For marriage debt payback |
| Startup Fund | Startup | For startup ideas |
| Ahaana | Ahaana | For Ahaana |
| Car Insurances (Creta + Slavia) | Mom | For Creta + Slavia car insurance |
| Bills (EMIs, CC, OTT, Internet) | Bills | For EMIs of TV, Water Purifier, iPhone + Internet + OTT + Washing Machine |
| Interest Credit | Interest++ | Default pot for interest credit |
| Varshi's Dad | Dad money | For Mamayya |
| Pending CC Transactions | Monthly Invest | Pending credit card transactions |
| Varshi's Health Insurance | Insurance | For Varshi's health insurance |
| Tax Allocation | Cook | For ITR filings |
| Vacation & Travel | Pulivendula | For vacation & travel |
| Savings (RD) | Payback | Recurring deposit account to lock in savings |
| Gifts | Gifts | For gifting on occasions (weddings, etc.) |
| Chintu Marriage | Marriage | For Chintu's marriage |

**Pot balance tracking:** Pot balances are recorded at periodic snapshots (not real-time). Sample balance dates tracked: Jul 1, Aug 31, Sep 10, Nov 02, Dec 03, Jan 03.

### 3.4 Credit Card Flow

The CC payment cycle works as follows:
1. A day-to-day purchase is made on a credit card (e.g., ₹500 groceries on Axis CC)
2. That ₹500 is logged as a "Groceries" transaction in the system
3. An equivalent ₹500 is moved from the salary account to the "Bills" pot in Jupiter
4. When the CC bill is due, money is withdrawn from the Bills pot and paid to the CC company
5. The pot withdrawal is added as "income" at the top of the month's plan to avoid double-counting (counted as both income and expense, netting to zero)

This flow is convoluted and a known source of discrepancies due to timing mismatches between steps 2-5.

---

## 4. Financial Planning Model

### 4.1 Annual Planning (FY Plan)

At the start of the financial year, a master plan is created in Google Sheets. For every month, there are two columns: **Plan** and **Actual**.

The plan distributes combined salary across categories in a strict priority order (top-down allocation):

1. **EMIs** — Non-negotiable loan repayments
2. **Insurance** — Amortized insurance premiums
3. **Family Allotment** — Fixed amounts to family members
4. **Savings** — Savings targets and trip funds
5. **Investments** — RDs, small case, business investments
6. **Fixed Living Expenses** — Rent, maid, cook, internet, etc.
7. **Variable Living Expenses** — Groceries, fuel, leisure, food ordering, etc.
8. **One-time Expenses** — Trips, gifts, credit card lump payments

Whatever remains after all allocations is the "Amount left after budgeting" — ideally close to zero or slightly positive.

### 4.2 Expense Categories

Categories are hierarchical: **Category → Sub-Category**

**EMIs:**
- Donda Student Loan (min. 32,975) @ 6.7%
- Donda Car Loan (min. 30,166) @ 9.1%
- Varshi Student Loan (min. 29,000) @ 6.7%
- Varshi Car Loan (min. 22,500) @ 7.85%
- Marriage debt pay back
- Water purifier (from Jan 15 - Sep 15) — ended
- TV (from Jan 15 - Sep 15) — ended
- iPhone EMI (from Jun'25 - May'26)
- Washing Machine EMI (from Sep'25 - Nov'25) — ended

**Insurance:**
- Varshi's LIC Pension Scheme (~₹6,437/month)
- Donda's Mummy's HI (~₹6,480/month)
- Creta Car Insurance (₹25K annual, amortized ~₹1,700/month)
- Slavia Car Insurance (₹25K annual, amortized ~₹2,042/month)
- Varshi's TI (₹0 currently)
- Varshi's HI (~₹2,378/month)
- Donda's HI (₹0 currently)
- Donda's TI (₹0 currently)

**Family Allotment:**
- Donda Mom (~₹10,000/month)
- Chintu Marriage (~₹10,000/month)
- Ramulamma (₹0 currently)
- Varshi Mom (₹20,000/month)
- Varshi Dad (₹4,500/month)
- Ahaana (₹5,000/month)
- Varshi's Home Cook (₹0 currently)

**Savings:**
- Savings (~₹15,562/month to RD)
- International Trip (variable, ~₹15,000-₹43,662/month)

**Investments:**
- Recurring FDs
- Small Case
- PrettyWraps

**Fixed Living Expenses:**
- House Rent + Maintenance (~₹50,000-₹53,000/month)
- Maid (~₹3,500-₹4,600/month, trending up)
- Cook (₹6,000/month)
- Internet (~₹1,000/month)
- Post-paid Sim (variable, ~₹1,700/month)
- Car Cleaning (₹700/month)
- Furniture Rental (~₹5,500-₹8,541/month)
- OTT Subscriptions (~₹4,500/month)
- Claude Subscription (₹25,000/month — added Feb'26)
- Fitness - Varshi (~₹2,500/month)
- Fitness - Donda (variable, ₹0-₹7,000/month)

**Variable Living Expenses:**
- Prepaid (Electricity & others) (~₹3,000 budget)
- Vehicle Fuel (~₹7,500-₹12,500 budget)
- Groceries (~₹10,000 budget)
- Leisure (~₹10,000 budget)
- Food Ordering (~₹5,000 budget)
- Water cans (~₹600 budget)
- Ironing Clothes (~₹1,500 budget)
- Clothes (variable)
- Hair & Body care (~₹2,000-₹3,000 budget)
- Misc/Essentials (~₹15,000 budget — frequently overspent)

**One-time Expenses (vary by month):**
- Trips (Vietnam, Singapore, Goa, Tirupathi, etc.)
- Gifts (birthdays, weddings)
- Credit Card lump payments
- Special occasions

### 4.3 Non-Monthly Expense Amortization

Expenses that are not monthly (quarterly, annual, or one-time) are broken down into monthly savings targets:

- **Car Insurance** (₹24,000-₹25,000/year) → save ~₹2,000/month
- **Health Insurance** (annual premiums) → save proportional monthly amount
- **Trips** → save target amount over multiple months leading up to the trip
- **Gifts** → accumulate in gifts pot

The monthly savings amount is moved to the corresponding Jupiter pot each month.

### 4.4 Month-to-Month Variability

- **Mostly stable categories:** EMIs, Insurance, Family Allotment, Rent, Cook — these carry forward with minimal changes
- **Occasionally revised:** Maid, Fitness, Furniture Rental — change when service costs change or services start/end
- **Variable by nature:** All variable expenses, one-time expenses
- **Structural changes:** When an EMI ends, that freed-up amount gets reallocated to other categories (savings, debt payback, etc.)

---

## 5. Current System Architecture

### 5.1 Data Stores

**Master Excel (FY Plan):**
- Contains the full financial year plan
- One row per expense sub-category
- Columns: Line Item, Expected (annual), then for each month: Plan and Actual
- Also tracks: Opening Balance, Income, Budget Available, Amount Left After Budgeting
- Actuals are updated from the expense dump

**Expense Dump Excel:**
- **Sheet1 (Transaction Log):** Every individual transaction recorded via Finny
  - Fields: ID (UUID), Date, Amount, Bucket (maps to Sub-Category), Remarks, Month, EmailID (who logged it), Timestamp
- **Budget v/s Actual tab:** Monthly budget allocations that Finny reads to sync categories
  - Fields: Category, Sub-Category, Month, Budget, Actuals
  - This tab must be manually populated at the start of each month by copying from the Master Excel

### 5.2 AppSheets App (Finny)

- Mobile app built on AppSheets platform
- Connected to Expense Dump Excel as its database
- Primary function: Transaction recording (date, amount, category, remarks)
- Displays budget vs actual comparisons
- Both users can log transactions using their email IDs

### 5.3 Data Flow

```
Master Excel (FY Plan)
    ↓ (manual copy-paste at month start)
Expense Dump Excel → Budget v/s Actual tab
    ↑ (auto-populated by Finny)
Expense Dump Excel → Sheet1 (Transaction Log)
    ↑ (user input)
Finny App (AppSheets)
```

---

## 6. Monthly Operating Procedure

### 6.1 Start of Month

1. **Review and revise allocations:** Both users review the previous month's plan and actuals, decide on changes for the new month (reallocate freed EMI amounts, adjust variable budgets based on upcoming plans)
2. **Update Master Excel:** Enter planned amounts for the new month in the FY plan
3. **Populate Budget v/s Actual tab:** Copy the new month's categories and budget amounts from the Master Excel into the Expense Dump's Budget v/s Actual tab — this is what syncs Finny
4. **Record opening balance:** Note the actual bank balance across ICICI and Axis accounts
5. **Make Jupiter pot transfers:** Move earmarked amounts (savings, insurance, family allotments, etc.) into their respective Jupiter pots
6. **Pay fixed expenses:** Rent, maid, cook, etc.
7. **Discrepancy check:** Compare the remaining bank balance against what the system calculates should be left — there is always a discrepancy that cannot be traced

### 6.2 During the Month

1. **Record every transaction:** Both users log expenses in Finny as they happen — date, amount, category, remarks
2. **Batch recording:** Some transactions are recorded in batches (e.g., several days' worth logged in one sitting), identifiable by timestamp vs date mismatches
3. **Monitor budget vs actual:** Check Finny to see how categories are tracking against plan
4. **Mid-month adjustments:** If a category is overspent, consciously reduce spending in that category for the rest of the month

### 6.3 End of Month

1. **Ensure all transactions are logged:** Catch up on any unrecorded expenses
2. **Review actuals vs plan:** Analyze overspends and underspends
3. **Carry forward insights:** Use overspend/underspend patterns to inform next month's allocations

---

## 7. Known Pain Points

### 7.1 Monthly Setup Overhead
The manual process of updating the Master Excel, then copy-pasting into the Budget v/s Actual tab, is time-consuming and error-prone. This must happen before Finny can display the correct categories and budgets for the new month.

### 7.2 Reallocation Decisions
When EMIs end or expenses change, manually figuring out where to redirect freed-up money across categories requires mental effort and is not assisted by the system.

### 7.3 Transaction Recording Discipline
While Finny made this easier than the previous WhatsApp + manual Excel approach, transactions still get missed or batch-recorded days later. Small cash transactions (chai, snacks) are easy to forget.

### 7.4 Persistent Balance Discrepancy
Every month, after completing all pot transfers and recording all income, there is a gap between the calculated bank balance and the actual bank balance. Even line-by-line reconciliation has not identified the source. Possible causes:
- Timing differences between transaction recording and actual bank debits
- Small auto-debits not being tracked (bank fees, subscription auto-renewals)
- Rounding in amortized amounts
- Interest credits or charges not accounted for
- CC payment cycle timing (money moved to bills pot vs actual CC payment vs income re-entry)
- Transactions logged to wrong month
- Missing transactions entirely

### 7.5 Limited Notifications and Reminders
The current system has basic notifications and reminders:
- **Notifications:** When one person records a transaction, both receive a notification of what was recorded
- **Reminders:** Sent at regular intervals to remind both users to record their transactions

What's missing: overspend warnings, daily spending summaries, budget utilization alerts, end-of-month wrap-ups.

### 7.6 Limited Dashboard
The current system shows category-level budget vs actual but lacks granular metrics like:
- Spending trends over months
- Per-person spending breakdown
- Category-wise overspend frequency
- Remaining daily budget (how much can I spend per day for the rest of the month)
- Pot balance tracking over time

---

## 8. Transaction Data Schema

### 8.1 Transaction Record

| Field | Type | Description |
|-------|------|-------------|
| ID | UUID | Auto-generated unique identifier |
| Date | Date | Date the expense was incurred (may differ from recording date) |
| Amount | Number | Transaction amount in INR |
| Bucket | String | Maps to Sub-Category (e.g., "Groceries", "Vehicle Fuel") |
| Remarks | String | Free-text description of the transaction |
| Month | String | Format: "Mon - YY" (e.g., "Jan - 26") |
| EmailID | String | Email of the person who recorded it |
| Timestamp | DateTime | When the transaction was recorded in the app |

### 8.2 Budget Record

| Field | Type | Description |
|-------|------|-------------|
| Category | String | Top-level category (EMIs, Insurance, Variable, Fixed Expenses, etc.) |
| Sub-Category | String | Specific expense line item |
| Month | String | Format: "Mon-YY" (e.g., "Jul-25") |
| Budget | Number | Planned amount for this sub-category in this month |
| Actuals | Number | Sum of all transactions tagged to this sub-category in this month |

---

## 9. Behavioral Patterns Observed from Data

1. **Batch recording is common:** Transactions from multiple days are often logged in one session (visible from timestamp clustering vs spread-out dates)
2. **Misc/Essentials is a catch-all:** This category consistently overspends its budget, suggesting it absorbs unplanned expenses that don't fit elsewhere
3. **EMIs and fixed expenses are recorded on day 1-2:** Most non-variable expenses are logged at the start of the month
4. **Variable expenses vary significantly month to month:** Leisure ranges from ₹0 to ₹24,671; Misc from ₹4,713 to ₹56,201
5. **Both users actively record:** Transaction recording is not one-sided; both Varshi and Donda log regularly
6. **Remarks provide useful context:** Users write detailed remarks (store name, what was purchased, who it was paid to)
7. **Some transactions are corrections or internal movements:** "Last months excess expense sending back to gifts pot", "Sent to bills pot" — these are not expenses but fund movements logged as transactions

---

## 10. Key Design Constraints for Replacement System

1. **Preserve the financial model:** Savings-first, top-down allocation, same category hierarchy
2. **Two-user system now, multi-household later:** Must be designed for eventual multi-tenancy
3. **No Jupiter API:** Pot transfers will remain manual, but the system should generate a checklist
4. **Mobile-first transaction recording:** Must be fast and easy from a phone
5. **Phase 1 is manual entry:** Auto-capture from SMS/email is Phase 2
6. **Supabase as database:** PostgreSQL via Supabase, with MCP connectivity for Claude Code development
7. **Web application frontend:** Not another AppSheets/no-code tool

# Appendix

1. ***FY Master plan***: C:\Users\varshine.kolla\Documents\Personal\Finny\Finny foundational context\Personal Financial Model - FY26 Plan.pdf
2. ***Jupiter pots to savings map***: C:\Users\varshine.kolla\Documents\Personal\Finny\Finny foundational context\Personal Financial Model - Jupiter Pots.pdf
3. ***Expense Dump Sheet (records of all day to day expenses):*** C:\Users\varshine.kolla\Documents\Personal\Finny\Finny foundational context\Expenses Dump Personal - Sheet1.pdf
4. ***Expense Dump Sheet (budget v/s actual):*** C:\Users\varshine.kolla\Documents\Personal\Finny\Finny foundational context\Expenses Dump Personal - Budget_v_Actual.pdf
