# CLAUDE.md — My2cents

## What is My2cents

My2cents is a household financial management PWA for Indian families. Users plan monthly budgets (savings-first, top-down allocation), record daily transactions, and track budget vs actuals. Built for one household (2 users), architected for multi-household scale. Live at https://beta-test-five.vercel.app.

## ⚠️ NON-NEGOTIABLE: Production Safety

**This repo is connected to PRODUCTION via Vercel auto-deploy. There are active users. Every push goes live.**

1. **NEVER write code, edit files, or make commits unless the user explicitly asks you to.** If the session starts with a handoff summary or feature discussion, that is context — NOT permission to code.
2. **Always start in plan/discussion mode.** Research, read files, ask questions, propose an approach. Wait for explicit "go ahead" / "implement it" / "code it" before touching any file.
3. **Dev environment is the user's local laptop, not this cloud agent.** Until a separate dev deployment is set up, treat every file change here as a production change.
4. **Before any commit or push, confirm with the user.** Never auto-push. Never assume a push is wanted.
5. **If in doubt, ask.** The cost of asking is zero. The cost of a bad deploy is real users seeing broken features.

## ⚠️ NON-NEGOTIABLE: Progress Tracking

1. **Start of every session:** Read `progress.md` FIRST. It tells you where work was left off.
2. **End of every session:** Update `progress.md` with what was done, move items between sections, update the session log.
3. **During long sessions:** Update `progress.md` at regular intervals (every 30-45 minutes of work or after completing a significant milestone). Context can end without warning — if progress.md isn't current, work continuity is lost.
4. **Never assume progress.** If it's not checked off in `progress.md`, it's not done.

## Tech Stack

- **Database:** Supabase (PostgreSQL + RLS + Realtime)
- **Auth:** Supabase Auth (phone + OTP)
- **Frontend:** React + TypeScript (PWA)
- **Notifications:** PWA push via service worker
- **Dev tooling:** Claude Code + Supabase MCP

## Repo Structure

```
/my2cents
├── CLAUDE.md                 ← You are here. Read every session.
├── progress.md               ← READ FIRST. Current state of work. Update every session.
├── .claude/                  ← Persona skill files. Read based on task.
│   ├── skills-pm.md          ← Product thinking, prioritization, habit design
│   ├── skills-design.md      ← UX/UI, interaction design, mobile patterns
│   ├── skills-architect.md   ← System design, DB, multi-tenancy, scalability
│   └── skills-developer.md   ← Coding standards, React/TS patterns, Supabase usage
├── docs/                     ← Product documentation. Organized by pillar.
│   ├── Finny As-Is context/
│   │   ├── finny-foundations.md      ← Current system context, data model, pain points
│   │   └── (supporting PDFs)
│   ├── Finny To-Be context/
│   │   └── finny-roadmap.md          ← Product vision, pillars, future directions
│   └── Finny-Foundation-Pillar/      ← Foundation pillar docs
│       ├── finny-solution-doc-foundation-pillar.md   ← Features, priorities, accounting model
│       ├── finny-user-journey-onboarding.md          ← 7.1 Onboarding
│       ├── finny-user-journey-transactions.md        ← 7.4 Transactions
│       └── ...                                        ← More user journeys as created
├── app/                      ← Application source code (Vite + React + TypeScript)
├── supabase/                 ← Migrations, seed data, RLS policies
└── public/                   ← PWA manifest, icons, service worker
```

### File Naming Convention

Docs are organized per pillar. Each pillar folder contains:
- **One solution doc:** `finny-solution-doc-{pillar-name}.md`
- **Multiple user journey docs:** `finny-user-journey-{feature-area}.md`

When a new pillar starts (e.g., Productivity), create:
```
docs/Finny-Productivity-Pillar/
├── finny-solution-doc-productivity-pillar.md
├── finny-user-journey-autocapture.md
└── ...
```

Don't look for a hardcoded list of files. **List the pillar folder** to see what docs exist.

## When to Read What

| Task | Read these |
|------|-----------|
| Starting a session | `progress.md` (always first) |
| Solutioning a new feature | `.claude/skills-pm.md` + solution doc from the relevant pillar folder |
| Designing screens, user flows | `.claude/skills-design.md` + relevant user journey doc from the pillar folder |
| Database schema, API design | `.claude/skills-architect.md` + solution doc from the relevant pillar folder |
| Writing code, building components | `.claude/skills-developer.md` |
| Understanding current system | `docs/Finny As-Is context/finny-foundations.md` |
| Understanding product vision | `docs/Finny To-Be context/finny-roadmap.md` |
| Finding all docs for current pillar | List `docs/Finny-Foundation-Pillar/` (or whichever pillar is active) |
| Adding a configurable parameter | `docs/settings-registry.md` + `.claude/skills-architect.md` |

## Transaction Accounting (Quick Reference)

| Type | Budget Effect | Bank Balance Effect |
|------|--------------|-------------------|
| **Income** | Increases total income | Increases balance |
| **Expense (bank)** | Decreases sub-category remaining | Decreases balance |
| **Expense (CC)** | Decreases sub-category remaining | No change (CC balance increases) |
| **Fund Transfer** | No effect | Depends on direction |

CC purchases = expenses. CC payments = fund transfers. Never mix them.

## Feature Toggle Pattern

> **Note:** The `household_settings` table does NOT exist yet. Currently, app-wide settings are hardcoded in `app/src/config/app.config.ts`. The plan is for each household to have a settings table, with features checking settings before rendering. New features get a new key with a default value. No feature flag service — just a settings table + conditional rendering.

## Category Hierarchy

```
Income → sub-categories (salaries, opening balance, bonuses)
EMIs → Insurance → Savings → Fixed → Variable → Family → Investment → One-time
  └ each sub-category has: name, amount, period, start/end dates
```

**System Categories (9):**
- Income (💰)
- EMI (🏦)
- Insurance (🛡️)
- Savings (🐷)
- Fixed (📌)
- Variable (🔄)
- Family (👨‍👩‍👧‍👦) - *No default suggestions*
- Investment (📈) - *No default suggestions*
- One-time (📅) - *No default suggestions*

**Custom Categories:**
- Stored in `household_categories` table (per household)
- Feature currently disabled (commented out in code)
- Pending better UX design for inline category creation

## Starter Template (New Users)

Suggestion tiles shown during onboarding. Items marked with * are pre-selected by default (`is_default_selected: true`).

```
Income:      Salary*, Business Income, Rental Income, Freelance, Investments, Other Income
EMIs:        Home Loan EMI, Car Loan EMI, Education Loan, Personal Loan
Insurance:   Health Insurance, Life Insurance, Vehicle Insurance
Savings:     General Savings*, Emergency Fund, Investment/SIP, Vacation Fund
Fixed:       Rent*, Internet*, Phone Bill*, Maid/Help, Society Maintenance, Subscriptions
Variable:    Groceries*, Electricity, Water, Fuel, Food Ordering*, Dining Out, Shopping, Entertainment, Personal Care, Medical, Transport, Miscellaneous*
Family:      (empty - user adds custom items)
Investment:  (empty - user adds custom items)
One-time:    (empty - user adds custom items)
```

> Source: `app/src/modules/budget/data/defaultCategories.ts`

## Key Decisions

- Auth: Phone + 6-digit MPIN via Supabase email/password (email = `{phone}@my2cents.app`, password = PIN). No SMS costs.
- Partner invite: QR code → phone camera scan → My2cents link → auth.
- Income: A category in the plan template, not a separate setup step.
- Opening balance: Sub-category under Income, defaults to ₹0.
- Savings preference: Deferred to when user first needs bucket features.
- Accounts/bank registration: Deferred to P1 (reconciliation).
- Over-allocation: Blocked. Cannot freeze if allocated > income.
- Plan required: Cannot record transactions without a frozen plan.
- Feature toggles: household_settings table from day one.
- Configurability: Flexible `household_settings` table (key-value with JSONB). Add parameters as features need them. Central registry at `docs/settings-registry.md`.
- Simplicity: Every screen and flow must be understandable by a layman without instructions. If it needs explanation, simplify it.

## Current Progress

→ **See `progress.md`** for detailed progress, next steps, session log, and blockers. That file is the source of truth, not this section.
