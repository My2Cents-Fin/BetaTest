# Finny 2.0 — Product Roadmap

## 1. Why Finny Exists

Most Indian households operate without a structured financial system. Money comes in, money goes out, and the gap between intent and reality grows silently. Savings targets are missed not because of insufficient income but because spending is untracked and uncontrolled. When a large expense hits — a wedding, a medical emergency, a car repair — it derails months of progress because there was no buffer, no forecast, no plan.

The households that do try to manage their finances face a different problem: the tools are either too simple (a notebook, a WhatsApp message to yourself) or too complex (spreadsheets that require an hour of setup every month). The result is the same — the system breaks down because the effort to maintain it exceeds the perceived benefit.

Finny exists to close this gap. It is a household financial management system built for Indian families who want to spend wisely, save intentionally, and make financial decisions with full visibility into their money. The core belief is simple: **if you can see where every rupee goes, you will naturally make better decisions about where it should go.**

---

## 2. How Finny Is Different

There is no shortage of expense tracking apps — Walnut, Money Manager, YNAB, Splitwise, even bank apps with built-in spending summaries. They all do some version of the same thing: categorize past transactions and show pie charts of where money went. The problem is, knowing that 30% of your income went to food last month does not help you spend better this month. These tools are retrospective and generic — they tell you what happened but not what should happen.

Finny is different because it starts with a plan, not a report. Before the month begins, the household decides how every rupee will be allocated — and the system holds them accountable to that decision throughout the month. The categories, the budgets, the allocation priorities are all defined by the household based on how they actually manage their money. There is no pre-built template that forces a family paying four EMIs, supporting two sets of parents, and saving for a trip into the same structure as a single person tracking coffee expenses.

The core gap Finny fills is between intent and action. Most households have a rough sense of what they want to spend — but no mechanism to enforce it in real time. Finny provides that mechanism: assign budgets to specific activities, track the delta between planned and actual as it happens, and surface behavioral patterns the household did not know existed (chronic overspending in "miscellaneous," seasonal spikes they didn't anticipate, savings goals quietly falling behind). The insight isn't "you spent ₹15K on food" — it's "you've been overspending on food by ₹3K every month for six months, and that's exactly the gap in your savings target."

---

## 3. Who Finny Is For

Finny is for Indian households — primarily dual-income couples and young families — who:

- Earn enough to save but struggle to actually save consistently
- Have multiple financial obligations running simultaneously (EMIs, insurance, family support, rent, savings goals)
- Want to plan their finances monthly but find the overhead of doing so unsustainable
- Use multiple bank accounts, credit cards, and savings instruments and lose track of money across them
- Want a shared system where both partners have equal visibility and control

Finny is not for people looking for investment advice platforms, stock trading tools, or enterprise accounting software. It is a household operations tool — closer to a family budget than a balance sheet.

---

## 4. What Finny Does

At its core, Finny does three things:

1. **Plans money** — Before a month begins, the household decides how every rupee of income will be allocated: which EMIs to pay, how much to save, what to set aside for groceries, fuel, and leisure. This plan follows a savings-first philosophy — mandatory commitments and savings are allocated before discretionary spending.

2. **Tracks money** — Every transaction is recorded as it happens. The system knows how much has been spent in each category, how much remains, and whether the household is on track or drifting. Both partners see the same data in real time.

3. **Reveals money** — Dashboards, alerts, and reconciliation tools surface the truth about where money went, where it's going, and where the gaps are. Over time, the system builds a financial history that enables smarter planning, earlier warnings, and better decisions.

As Finny matures, it will expand into a fourth capability: **advising on money** — using AI and accumulated data to recommend budgets, optimize debt repayment, forecast cash flow, and help households reach their financial goals faster.

---

## 5. Core Principles

1. **Money visibility over money management.** The system tracks, surfaces, and advises — it does not move money or make decisions on behalf of users. All actions remain with the user.
2. **Accuracy over speed.** Every rupee must be accounted for. The system should make it hard to create discrepancies and easy to find them when they occur.
3. **Minimal friction for daily use.** Transaction recording happens multiple times a day. It must take under 10 seconds per entry.
4. **Separation of concerns.** Fund movements (bucket transfers, CC payments) and actual expenses are fundamentally different and must be modeled differently.
5. **Progressive complexity.** A new user should be able to start with basic income/expense tracking and gradually adopt budgeting, savings buckets, and AI advisory features.

---

## 6. Product Pillars

Finny's evolution is organized into six pillars. Each pillar represents a strategic direction for the product. The Foundation pillar is built first and in detail. The remaining five pillars are future expansions — defined at the vision level, to be detailed and prioritized when the Foundation is stable.

---

### Pillar 0: Foundation

**Build the core system that replaces the current manual financial tracking process.**

The Foundation pillar covers everything needed for a household to plan their month, record daily transactions, track budget vs actuals, reconcile bank balances, manage savings buckets, and stay in sync through notifications. It is the minimum viable product — not in the sense of being incomplete, but in the sense of being the essential system that all future pillars build upon. Without a reliable Foundation, none of the advanced capabilities (AI, automation, forecasting) have a data layer to operate on.

The Foundation pillar is detailed in a separate document: **Finny Solution - Foundation.md**

---

### Pillar 1: Productivity

**Eliminate manual effort from the financial tracking workflow.**

Today, every transaction is hand-entered, every month's plan requires manual review, and reconciliation is a tedious comparison exercise. The Productivity pillar targets each of these friction points — starting with auto-capturing transactions from bank and CC notifications, progressing to automated reconciliation against bank statements. The end state is a system where the user's role shifts from data operator to financial decision-maker. The less time users spend entering data, the more time they spend making decisions with it.

**Visions:**

- **Chat assistant for budget addition**: Be able to add budget through a conversational LLM inbuilt in the app so that the user can just instruct and budget gets created.

- **Transaction Auto-Capture:** Automatically detect and draft transactions from bank SMS, email notifications, and CC alerts. The system parses the amount, merchant, date, and payment method from the notification and creates a draft transaction. The user's only job is to confirm the category and optionally add remarks. This eliminates the biggest daily friction point — manual amount and date entry — and addresses the problem of forgotten transactions, since every bank notification becomes a prompt.

- **Bank Statement Import & Auto-Reconciliation:** Enable users to upload bank statements (CSV or PDF) or connect via account aggregator APIs to bulk-import transactions. The system auto-matches imported transactions against manually logged ones, surfacing gaps (transactions in the bank but not in the system), duplicates (logged twice), and phantom entries (logged but not in the bank). Over time, AI-assisted category mapping learns from historical patterns to auto-categorize imported transactions by merchant name, reducing manual tagging to near zero.

---

### Pillar 2: Intelligence

**Turn historical spending data into forward-looking financial intelligence.**

Months of transaction history reveal patterns that humans miss — seasonal spending spikes around festivals, chronic overspending in catch-all categories like "Miscellaneous," suboptimal debt repayment sequencing that costs thousands in avoidable interest. The Intelligence pillar layers AI and analytics on top of the transaction data to generate actionable recommendations: what to budget next month, which loan to prepay first, whether savings goals are on track, and what the household's overall financial health looks like. The goal is to make every financial decision data-informed without requiring the user to be a financial analyst.

**Visions:**

- **Deep Analytics and insights**: display deeper analytics and spending behaviour of the households - aim is to show them patterns they did not even know and build delight/loyalty to the app.

- **AI-Assisted Monthly Planning:** Generate a recommended monthly plan based on spending history, seasonal patterns, upcoming known expenses, and defined financial goals. The system learns that December typically has higher leisure spending, that insurance renewals cluster in certain months, and that variable categories like groceries trend upward over time. The generated plan is a starting point — the user adjusts and freezes, but the heavy lifting of number-crunching is done by the system.

- **Financial Health Scoring:** A composite monthly score reflecting savings rate, debt-to-income ratio, budget adherence, emergency fund coverage, and net worth trajectory. The score gives users a single number to track their overall financial progress over time. More importantly, it decomposes into actionable sub-scores so users know exactly which lever to pull — "your score dropped because savings rate fell below 15% this month."

- **Goal-Driven Optimization:** Given a set of financial goals (debt payoff dates, savings targets, investment milestones), recommend the optimal allocation of surplus income across competing priorities. The system factors in interest rates on debts (pay off the 9.1% car loan before the 6.7% student loan), opportunity cost of savings vs debt repayment, and realistic spending estimates based on historical patterns — not aspirational budgets that are never met.

---

### Pillar 3: Optimization

**Move beyond tracking into active financial strategy.**

While Intelligence tells users what's happening and what might happen, Optimization helps them decide what to do about it. This pillar provides modeling tools for debt payoff strategies, cash flow forecasting, tax planning, and scenario analysis. Users can simulate the impact of financial decisions before making them — "what if we prepay the car loan with this bonus?", "what if income drops 20% for three months?", "which tax regime saves us more this year?" The aim is to compress the gap between financial intent and financial outcome by making the consequences of decisions visible before they're made.

**Visions:**

- **Debt Payoff Strategy Modeling:** Compare avalanche (highest interest first), snowball (smallest balance first), and hybrid debt repayment strategies side by side. For each strategy, show total interest paid, months to debt-free, and the optimal redirection path when one EMI ends. Visualize the payoff timeline so users can see the finish line and track progress toward it. This builds on a **loan registry** — where users register all active loans with principal, interest rate, EMI amount, tenure, and start/end dates — and a **loan payoff tracker** that shows total paid, principal reduced, interest paid, remaining balance, and projected payoff date at current EMI.

- **Cash Flow Forecasting:** Project bank and bucket balances 3-6 months forward based on the annual plan and historical spending patterns. Highlight months where cash flow is tight — when multiple annual expenses coincide (insurance renewals, festival spending) or when income is expected to be lower. Give users enough lead time to adjust plans or build buffers.

- **Scenario Modeling:** A simulation engine for financial "what-if" questions. Model the impact of increasing savings by ₹5K/month, prepaying a loan, taking on a new EMI, a salary change, or a large unplanned expense. Show how each scenario affects balances, goal timelines, and monthly cash flow over a 6-12 month horizon.

- **Tax Planning:** Tag tax-deductible expenses and savings throughout the year as they're logged (80C, 80D, HRA, etc.). Generate a tax-ready report at year-end grouped by section, with supporting transaction details. Estimate tax liability under both old and new regimes and recommend the more favorable one. Eliminate the year-end scramble of collecting receipts and calculating deductions.

---

### Pillar 4: Lifestyle

**Extend the system to handle the financial complexity of real life beyond routine monthly budgets.**

Monthly budgets handle the routine. But life isn't routine — trips, weddings, group dinners, international travel, and work reimbursements all create financial events that don't fit neatly into monthly category buckets. When these events happen, budget discipline breaks down because there's no structure to contain them. The Lifestyle pillar provides standalone event budgets, group expense splitting, multi-currency logging, and reimbursement tracking — so that life events are financially planned with the same rigor as monthly expenses, without cluttering the core budget.

**Visions:**

- **Event-Based Planning:** Create standalone mini-budgets for specific events — a trip, a wedding, a party, a home renovation. Each event has its own categories (travel, accommodation, food, gifts, shopping), its own budget, and its own real-time tracking. Transactions during the event are tagged to both the event budget and the main monthly budget, so nothing falls through the cracks. After the event, the budget is closed and the actuals roll into the monthly view.

- **Bill Splitting:** For shared expenses with people outside the household (group trips, dinners, bachelor parties), track who paid what, calculate who owes whom, and monitor settlements. Integrate with the main system so that the user's share is properly categorized as an expense, amounts owed to them are tracked as receivables, and settlements are logged as income when received.

- **Multi-Currency Support:** Log expenses in foreign currencies during international trips or for overseas purchases. Convert to the base currency (INR) at actual or fetched exchange rates. Maintain both the original amount and the converted amount for accurate record-keeping. Support setting a base currency per household for eventual expansion beyond India.

---

### Pillar 5: Platform

**Scale Finny from a single-household tool to a multi-household product.**

The Foundation pillar proves the model with one household. The Platform pillar makes it available to many. This involves tenant isolation (every household's data is completely separate), onboarding flows that get a new household from signup to first transaction in under 10 minutes, configurable templates that give users a starting point without forcing a one-size-fits-all structure, and a monetization model that sustains the product. The assumption is that the core financial model — savings-first, top-down allocation, daily tracking — resonates with a broad segment of Indian households, but each household needs the flexibility to define their own categories, income structures, and tracking preferences.

**Visions:**

- [x] **Multi-Household Tenancy:** Each household operates as a completely isolated tenant with its own data, categories, plans, members, and settings. No cross-household data access under any circumstance. The data model and authorization layer support this from day one (row-level security in Supabase), but the onboarding and admin flows are built when the product is ready to scale.

- **Guided Onboarding:** A setup wizard that walks new users through: creating a household, inviting members, adding income sources, registering accounts, selecting a category template, and creating their first monthly plan. Designed to minimize time-to-value — the goal is for a household to record their first transaction within 10 minutes of signing up.

- **Household Templates:** Pre-built category and budget structures for common Indian household types — single earner, dual income no kids, dual income with kids, joint family. Templates provide sensible defaults for categories, typical expense ranges, and suggested allocation priorities. Users select a template and customize it rather than starting from a blank slate.

- **Monetization:** A freemium model where the free tier covers basic tracking, manual transaction entry, and budget vs actual views. The paid tier unlocks AI features (smart planning, anomaly detection, goal optimization), automation (transaction auto-capture, bank statement import), advanced analytics (trends, forecasting, net worth tracking), and unlimited transaction history. Pricing is designed for Indian household budgets — accessible enough to drive adoption, valuable enough to sustain development.

- **Data Portability:** Users can export all their data — transactions, plans, budgets, reports — to CSV or Excel at any time. There is no lock-in. If a household wants to leave Finny, they take their complete financial history with them. This is both a user-trust principle and a regulatory consideration for eventual scale.

- **Build you own budget:** Budgeting is a personal preference, not everyone follows the same template, same type of budgeting, this should become a tool for users to create their custom budget processes so that they are not stuck to the process dictated by the app.

---

## 7. Pillar Sequencing

| Order | Pillar | Prerequisite | Rationale |
|-------|--------|-------------|-----------|
| 1 | **Foundation** | None | Everything else depends on having a working core system with reliable data |
| 2 | **Productivity** | Foundation stable, 3+ months of transaction data | Auto-capture and reconciliation need a baseline of manual data to calibrate against |
| 3 | **Lifestyle** | Foundation stable | Event planning, bill splitting, and multi-currency are independent of data volume but need the core transaction and budgeting system |
| 4 | **Platform** | Foundation + Productivity validated | Multi-household scaling should happen after the product is proven with the founding household and has enough automation to reduce onboarding friction for new users |
| 5 | **Intelligence** | Foundation stable, 6+ months of transaction data | AI recommendations need sufficient history to identify patterns and generate meaningful insights |
| 6 | **Optimization** | Intelligence (partially) | Debt strategy and forecasting build on the analytical foundation laid by Intelligence |

---

## 8. What Finny Is Not

- **Finny is not an investment platform.** It does not execute trades, manage portfolios, or provide regulated financial advice. It may advise on allocation strategy in later pillars, but all actions are taken by the user outside the system.
- **Finny is not a banking app.** It does not hold money, initiate transfers, or connect to bank accounts for transactions. All money movement happens in the user's banking apps.
- **Finny is not an accounting tool.** It does not generate P&L statements, balance sheets, or comply with any accounting standards. It is a household budgeting and tracking tool.
- **Finny is not for businesses.** It is designed for household finances. Business expense tracking, invoicing, payroll, and GST compliance are out of scope.
