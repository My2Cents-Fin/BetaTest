# My2Cents Database Schema

**Database:** Supabase (PostgreSQL)
**Last Updated:** February 2026

---

## Overview

My2Cents uses Supabase as its backend, which provides:
- PostgreSQL database with Row-Level Security (RLS)
- Built-in authentication (phone OTP)
- Real-time subscriptions
- Auto-generated REST API

---

## Entity Relationship Diagram

### Core Tables (Auth & Household)

```
┌─────────────────────┐
│   auth.users        │  (Supabase Auth - built-in)
│   ───────────────   │
│   id (UUID) PK      │
│   phone             │
│   user_metadata     │◄─────────────────────────────────┐
└─────────┬───────────┘                                  │
          │                                              │
          │ 1:1                                          │
          ▼                                              │
┌─────────────────────┐                                  │
│   users             │                                  │
│   ───────────────   │                                  │
│   id (UUID) PK/FK   │──────────────────────┐           │
│   display_name      │                      │           │
│   phone (UNIQUE)    │                      │           │
│   updated_at        │                      │           │
└─────────────────────┘                      │           │
                                             │           │
          ┌──────────────────────────────────┘           │
          │                                              │
          │ creates                                      │
          ▼                                              │
┌─────────────────────┐         ┌────────────────────────┴──┐
│   households        │         │   household_members       │
│   ───────────────   │         │   ─────────────────────   │
│   id (UUID) PK      │◄────────│   id (UUID) PK            │
│   name              │   1:N   │   household_id (FK)       │
│   created_by (FK)   │         │   user_id (FK)            │───► users.id
│   invite_code (UQ)  │         │   role                    │
│   created_at        │         │   joined_at               │
│   updated_at        │         │   UNIQUE(household, user) │
└─────────────────────┘         └───────────────────────────┘
```

### Budget Tables

```
┌─────────────────────────┐
│   categories            │  (System-defined)
│   ───────────────────   │
│   id (UUID) PK          │
│   name                  │  Income, EMI, Insurance,
│   type                  │  Savings, Fixed, Variable,
│   display_order         │  One-time
│   icon                  │
└───────────┬─────────────┘
            │
            │ 1:N
            ▼
┌─────────────────────────┐         ┌───────────────────────────────┐
│ sub_category_templates  │         │   household_sub_categories    │
│ ─────────────────────   │         │   ─────────────────────────   │
│ id (UUID) PK            │         │   id (UUID) PK                │
│ category_id (FK)        │         │   household_id (FK)           │───► households.id
│ name                    │         │   category_id (FK)            │───► categories.id
│ icon                    │         │   name                        │
│ is_default_selected     │         │   icon                        │
│ display_order           │         │   is_custom                   │
└─────────────────────────┘         │   display_order               │
   (System suggestions)             └───────────────┬───────────────┘
                                                    │
                                                    │ 1:N
                                                    ▼
┌─────────────────────────┐         ┌───────────────────────────────┐
│   monthly_plans         │         │   budget_allocations          │
│   ───────────────────   │         │   ─────────────────────────   │
│   id (UUID) PK          │         │   id (UUID) PK                │
│   household_id (FK)     │◄────────│   household_id (FK)           │
│   plan_month            │         │   sub_category_id (FK)        │───► household_sub_categories.id
│   status                │         │   amount                      │
│   total_income          │         │   period                      │  monthly/quarterly/yearly/one-time
│   total_allocated       │         │   monthly_amount              │
│   frozen_at             │         │   plan_month                  │
│   UNIQUE(hh, month)     │         │   UNIQUE(sub_cat, month)      │
└─────────────────────────┘         └───────────────────────────────┘
```

---

## Tables

### 1. auth.users (Supabase Built-in)

Managed by Supabase Auth. We extend it with `user_metadata`.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, auto-generated |
| phone | TEXT | User's phone number (with country code) |
| phone_confirmed_at | TIMESTAMPTZ | When phone was verified |
| user_metadata | JSONB | Custom metadata (see below) |
| created_at | TIMESTAMPTZ | Account creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**user_metadata fields:**

| Field | Type | Description |
|-------|------|-------------|
| display_name | TEXT | User's display name |
| onboarding_complete | BOOLEAN | Whether user completed onboarding |

---

### 2. users

Application-level user profile data.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY, REFERENCES auth.users(id) | — | Supabase auth user ID |
| display_name | TEXT | | NULL | User's display name |
| phone | TEXT | UNIQUE | — | Phone number with country code |
| updated_at | TIMESTAMPTZ | | now() | Last profile update |

**SQL Definition:**

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 3. households

Represents a financial unit (family, couple, roommates) that manages shared finances.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Household ID |
| name | TEXT | NOT NULL | — | Household name (e.g., "Sharma Family") |
| created_by | UUID | REFERENCES users(id) | — | User who created the household |
| invite_code | TEXT | UNIQUE | encode(gen_random_bytes(6), 'hex') | 12-char hex code for joining |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | | now() | Last update timestamp |

**SQL Definition:**

```sql
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id),
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Notes:**
- `invite_code` is auto-generated as 12-character lowercase hexadecimal
- Lookups should use case-insensitive matching (`.ilike()`)

---

### 4. household_members

Junction table linking users to households with role information.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Membership ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | — | Member reference |
| role | TEXT | CHECK (role IN ('owner', 'member')) | 'member' | User's role in household |
| joined_at | TIMESTAMPTZ | | now() | When user joined |

**Unique Constraint:** `UNIQUE(household_id, user_id)` — prevents duplicate memberships

**SQL Definition:**

```sql
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);
```

**Role Values:**
- `owner` — Created the household, can manage settings
- `member` — Joined via invite code, can record transactions

---

### 5. categories

System-defined budget category types. Read-only for users.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Category ID |
| name | TEXT | NOT NULL | — | Category name |
| type | TEXT | NOT NULL, CHECK | — | 'income' or 'expense' |
| display_order | INT | NOT NULL | — | Display order in UI |
| icon | TEXT | | NULL | Emoji icon |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |

**SQL Definition:**

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  display_order INT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Pre-defined Categories (9 total):**

| Name | Type | Icon | Display Order |
|------|------|------|---------------|
| Income | income | 💰 | 1 |
| EMI | expense | 🏦 | 2 |
| Insurance | expense | 🛡️ | 3 |
| Savings | expense | 🐷 | 4 |
| Fixed | expense | 📌 | 5 |
| Variable | expense | 🔄 | 6 |
| Family | expense | 👨‍👩‍👧‍👦 | 7 |
| Investment | expense | 📈 | 8 |
| One-time | expense | 📅 | 9 |

---

### 6. sub_category_templates

System-defined sub-category suggestions that users can select from during budget setup.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Template ID |
| category_id | UUID | REFERENCES categories(id) | — | Parent category |
| name | TEXT | NOT NULL | — | Sub-category name |
| icon | TEXT | | NULL | Emoji icon |
| is_default_selected | BOOLEAN | | false | Pre-selected by default |
| display_order | INT | NOT NULL | — | Display order in UI |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |

**SQL Definition:**

```sql
CREATE TABLE public.sub_category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_default_selected BOOLEAN DEFAULT false,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Pre-defined Templates:**

| Category | Name | Icon | Default |
|----------|------|------|---------|
| Income | Salary | 💼 | ✓ |
| Income | Business Income | 🏪 | |
| Income | Rental Income | 🏠 | |
| Income | Freelance | 💻 | |
| Income | Investments | 📈 | |
| Income | Other Income | ➕ | |
| EMI | Home Loan EMI | 🏠 | |
| EMI | Car Loan EMI | 🚗 | |
| EMI | Education Loan | 🎓 | |
| EMI | Personal Loan | 💳 | |
| Insurance | Health Insurance | 🏥 | |
| Insurance | Life Insurance | ❤️ | |
| Insurance | Vehicle Insurance | 🚙 | |
| Savings | General Savings | 💰 | ✓ |
| Savings | Emergency Fund | 🆘 | |
| Savings | Investment/SIP | 📊 | |
| Savings | Vacation Fund | ✈️ | |
| Fixed | Rent | 🏠 | ✓ |
| Fixed | Electricity | ⚡ | ✓ |
| Fixed | Water | 💧 | |
| Fixed | Gas | 🔥 | |
| Fixed | Internet | 📶 | ✓ |
| Fixed | Phone Bill | 📱 | ✓ |
| Fixed | Maid/Help | 🧹 | |
| Fixed | Society Maintenance | 🏢 | |
| Fixed | Subscriptions | 📺 | |
| Variable | Groceries | 🛒 | ✓ |
| Variable | Fuel | ⛽ | |
| Variable | Food Ordering | 🍕 | ✓ |
| Variable | Dining Out | 🍽️ | |
| Variable | Shopping | 🛍️ | |
| Variable | Entertainment | 🎬 | |
| Variable | Personal Care | 💅 | |
| Variable | Medical | 💊 | |
| Variable | Transport | 🚌 | |
| Variable | Miscellaneous | 📦 | ✓ |

---

### 7. household_sub_categories

User's selected sub-categories for their household budget.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Sub-category ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| category_id | UUID | REFERENCES categories(id) | — | Parent category |
| name | TEXT | NOT NULL | — | Sub-category name |
| icon | TEXT | | NULL | Emoji icon |
| is_custom | BOOLEAN | | false | User-created (not from template) |
| display_order | INT | | NULL | Display order |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | | now() | Last update |

**SQL Definition:**

```sql
CREATE TABLE public.household_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  icon TEXT,
  is_custom BOOLEAN DEFAULT false,
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 8. budget_allocations

Amount allocated per sub-category per month.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Allocation ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| sub_category_id | UUID | REFERENCES household_sub_categories(id) ON DELETE CASCADE | — | Sub-category reference |
| amount | DECIMAL(12,2) | NOT NULL | — | Amount entered by user |
| period | TEXT | NOT NULL, CHECK | — | 'monthly', 'quarterly', 'yearly', 'one-time' |
| monthly_amount | DECIMAL(12,2) | NOT NULL | — | Calculated monthly equivalent |
| plan_month | DATE | NOT NULL | — | First of month (e.g., 2025-02-01) |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | | now() | Last update |

**Unique Constraint:** `UNIQUE(sub_category_id, plan_month)` — one allocation per sub-category per month

**SQL Definition:**

```sql
CREATE TABLE public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.household_sub_categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly', 'one-time')),
  monthly_amount DECIMAL(12,2) NOT NULL,
  plan_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sub_category_id, plan_month)
);
```

**Period Calculations:**
- `monthly` → monthly_amount = amount
- `quarterly` → monthly_amount = amount / 3
- `yearly` → monthly_amount = amount / 12
- `one-time` → monthly_amount = amount (applies to current month only)

---

### 9. monthly_plans

Monthly budget plan status and totals per household.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Plan ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| plan_month | DATE | NOT NULL | — | First of month |
| status | TEXT | CHECK | 'draft' | 'draft' or 'frozen' |
| total_income | DECIMAL(12,2) | | 0 | Sum of income allocations |
| total_allocated | DECIMAL(12,2) | | 0 | Sum of expense allocations |
| frozen_at | TIMESTAMPTZ | | NULL | When plan was frozen |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | | now() | Last update |

**Unique Constraint:** `UNIQUE(household_id, plan_month)` — one plan per household per month

**SQL Definition:**

```sql
CREATE TABLE public.monthly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  plan_month DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'frozen')),
  total_income DECIMAL(12,2) DEFAULT 0,
  total_allocated DECIMAL(12,2) DEFAULT 0,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, plan_month)
);
```

**Status Values:**
- `draft` — Plan can be edited
- `frozen` — Plan is locked, month has started

---

## Row-Level Security (RLS) Policies

All tables have RLS enabled. Policies control data access.

### users Table

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### households Table

```sql
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Members can view their household
CREATE POLICY "Members can view household" ON public.households
  FOR SELECT USING (
    id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Anyone can lookup household by invite code (needed for joining)
CREATE POLICY "Anyone can view household by invite code" ON public.households
  FOR SELECT USING (true);

-- Authenticated users can create households
CREATE POLICY "Authenticated users can create households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only creator can update household
CREATE POLICY "Owner can update household" ON public.households
  FOR UPDATE USING (auth.uid() = created_by);
```

### household_members Table

```sql
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their household
CREATE POLICY "Members can view members" ON public.household_members
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Users can join a household (insert their own membership)
CREATE POLICY "Can join household" ON public.household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### categories Table

```sql
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories (system data)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);
```

### sub_category_templates Table

```sql
ALTER TABLE public.sub_category_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read templates (system data)
CREATE POLICY "Anyone can view sub-category templates" ON public.sub_category_templates
  FOR SELECT USING (true);
```

### household_sub_categories Table

```sql
ALTER TABLE public.household_sub_categories ENABLE ROW LEVEL SECURITY;

-- Household members can view their sub-categories
CREATE POLICY "Members can view household sub-categories" ON public.household_sub_categories
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can insert sub-categories
CREATE POLICY "Members can insert household sub-categories" ON public.household_sub_categories
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can update sub-categories
CREATE POLICY "Members can update household sub-categories" ON public.household_sub_categories
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can delete sub-categories
CREATE POLICY "Members can delete household sub-categories" ON public.household_sub_categories
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
```

### budget_allocations Table

```sql
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;

-- Household members can view their allocations
CREATE POLICY "Members can view budget allocations" ON public.budget_allocations
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can insert allocations
CREATE POLICY "Members can insert budget allocations" ON public.budget_allocations
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can update allocations
CREATE POLICY "Members can update budget allocations" ON public.budget_allocations
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can delete allocations
CREATE POLICY "Members can delete budget allocations" ON public.budget_allocations
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
```

### monthly_plans Table

```sql
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

-- Household members can view their plans
CREATE POLICY "Members can view monthly plans" ON public.monthly_plans
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can insert plans
CREATE POLICY "Members can insert monthly plans" ON public.monthly_plans
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );

-- Household members can update plans
CREATE POLICY "Members can update monthly plans" ON public.monthly_plans
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.household_members WHERE user_id = auth.uid())
  );
```

---

## Indexes

Recommended indexes for query performance:

```sql
-- === Core Tables ===

-- Fast lookup of user's households
CREATE INDEX idx_household_members_user_id
  ON public.household_members(user_id);

-- Fast lookup of household members
CREATE INDEX idx_household_members_household_id
  ON public.household_members(household_id);

-- Fast invite code lookup
CREATE INDEX idx_households_invite_code
  ON public.households(invite_code);

-- === Budget Tables ===

-- Fast lookup of household sub-categories
CREATE INDEX idx_household_sub_categories_household_id
  ON public.household_sub_categories(household_id);

-- Fast lookup by category
CREATE INDEX idx_household_sub_categories_category_id
  ON public.household_sub_categories(category_id);

-- Fast lookup of allocations by household
CREATE INDEX idx_budget_allocations_household_id
  ON public.budget_allocations(household_id);

-- Fast lookup of allocations by sub-category
CREATE INDEX idx_budget_allocations_sub_category_id
  ON public.budget_allocations(sub_category_id);

-- Fast lookup of allocations by month
CREATE INDEX idx_budget_allocations_plan_month
  ON public.budget_allocations(plan_month);

-- Fast lookup of monthly plans
CREATE INDEX idx_monthly_plans_household_month
  ON public.monthly_plans(household_id, plan_month);
```

---

## Common Queries

### Get user's household

```typescript
const { data } = await supabase
  .from('household_members')
  .select(`
    household_id,
    role,
    households (
      id,
      name,
      invite_code
    )
  `)
  .eq('user_id', userId)
  .single();
```

### Get household members

```typescript
const { data } = await supabase
  .from('household_members')
  .select(`
    id,
    role,
    joined_at,
    users (
      id,
      display_name
    )
  `)
  .eq('household_id', householdId);
```

### Join household by invite code

```typescript
// Step 1: Find household (case-insensitive)
const { data: household } = await supabase
  .from('households')
  .select('id')
  .ilike('invite_code', inviteCode)
  .single();

// Step 2: Create membership
await supabase.from('household_members').insert({
  household_id: household.id,
  user_id: userId,
  role: 'member'
});
```

### Get all categories with templates

```typescript
const { data } = await supabase
  .from('categories')
  .select(`
    id,
    name,
    type,
    icon,
    display_order,
    sub_category_templates (
      id,
      name,
      icon,
      is_default_selected,
      display_order
    )
  `)
  .order('display_order');
```

### Get household budget for a month

```typescript
const { data } = await supabase
  .from('household_sub_categories')
  .select(`
    id,
    name,
    icon,
    is_custom,
    categories (
      id,
      name,
      type,
      icon
    ),
    budget_allocations!inner (
      id,
      amount,
      period,
      monthly_amount
    )
  `)
  .eq('household_id', householdId)
  .eq('budget_allocations.plan_month', planMonth);
```

### Save budget allocation

```typescript
const { data } = await supabase
  .from('budget_allocations')
  .upsert({
    household_id: householdId,
    sub_category_id: subCategoryId,
    amount: amount,
    period: 'monthly',
    monthly_amount: amount,
    plan_month: '2025-02-01'
  }, {
    onConflict: 'sub_category_id,plan_month'
  });
```

### Get monthly plan summary

```typescript
const { data } = await supabase
  .from('monthly_plans')
  .select('*')
  .eq('household_id', householdId)
  .eq('plan_month', planMonth)
  .single();
```

---

---

### 10. transactions (BUILT)

Records income, expenses, and fund transfers.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Transaction ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| sub_category_id | UUID | REFERENCES household_sub_categories(id) | — | Tagged sub-category |
| amount | DECIMAL(12,2) | NOT NULL | — | Transaction amount |
| transaction_type | TEXT | NOT NULL, CHECK | — | 'expense', 'income', or 'transfer' |
| transaction_date | DATE | NOT NULL | — | When the transaction occurred |
| payment_method | TEXT | DEFAULT 'cash' | 'cash' | 'cash', 'upi', 'card', 'netbanking', 'other' |
| remarks | TEXT | | NULL | Optional notes |
| logged_by | UUID | REFERENCES auth.users(id) | — | User who recorded this |
| transfer_to | UUID | REFERENCES auth.users(id) | NULL | Recipient for fund transfers |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | | now() | Last update |

**RLS Policies:** Same household-scoped pattern as other tables (members can view/insert/update/delete their household's transactions).

---

### 11. household_categories (BUILT)

Custom user-created categories (per household). Currently disabled in UI pending better UX design.

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PRIMARY KEY | gen_random_uuid() | Category ID |
| household_id | UUID | REFERENCES households(id) ON DELETE CASCADE | — | Household reference |
| name | TEXT | NOT NULL | — | Custom category name |
| type | TEXT | NOT NULL, CHECK | — | 'income' or 'expense' |
| icon | TEXT | | NULL | Emoji icon |
| display_order | INT | | NULL | Display order |
| created_at | TIMESTAMPTZ | | now() | Creation timestamp |

---

## Future Tables (Planned — Not Yet Built)

These tables are intentionally deferred and will be added when their features are built:

| Table | Purpose | Phase | Status |
|-------|---------|-------|--------|
| `accounts` | Bank account information | Deferred (was P0, moved to P1) | Not started — opening balance is handled as a sub-category under Income for now |
| `credit_cards` | Credit card accounts with running balance | Deferred (was P0, moved to P1) | Not started — CC purchases use the `payment_method` field on transactions |
| `savings_buckets` | Goal-based savings tracking | P1 | Not started |
| `recurring_templates` | Auto-generated transaction templates | P1 | Not started |
| `household_settings` | Per-household configurable settings (key-value) | P0 | Not started — settings are currently hardcoded in `app/src/config/app.config.ts` |

---

## Notes

1. **Supabase Dashboard**: Schema can be managed via Supabase Dashboard SQL Editor
2. **Migrations**: SQL files are in `supabase/migrations/`. Run in Supabase SQL Editor:
   - `001_budget_tables.sql` — Base schema with 9 categories (including Family & Investment)
   - `002_transactions_table.sql` — Transactions table
   - `ADD_CUSTOM_CATEGORIES.sql` — household_categories table for user-created categories
   - `ADD_FAMILY_INVESTMENT_CATEGORIES.sql` — Adds Family & Investment to existing databases
3. **Backups**: Supabase provides automatic daily backups on paid plans
4. **RLS Testing**: Use Supabase Dashboard "SQL Editor" with different user contexts to test policies
