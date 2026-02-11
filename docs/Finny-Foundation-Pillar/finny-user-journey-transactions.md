# My2cents — User Journey: Transaction Recording (7.4)

## About This Document

This document describes the user journeys for recording, viewing, editing, and filtering transactions in the Foundation pillar.

For the feature definitions and priorities, refer to **Finny Solution - Foundation.md**.

---

## 1. App Navigation Structure

### 1.1 Three-Tab Architecture

The app uses a 3-tab navigation system:

```
┌─────────────────────────────────────────────────────┐
│  Tabs: Dashboard | Budget | Transactions            │
└─────────────────────────────────────────────────────┘
```

### 1.2 Mobile Navigation (Bottom Nav)

```
┌─────────────────────────────────────────┐
│  [Content Area]                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│                   ⊕                     │  ← Elevated FAB
│  🏠        💰    ┃ ┃    📋        👤    │
│ Home     Budget  ┗━┛   Trxns    Profile │
└─────────────────────────────────────────┘
```

**Components:**
- **Home (🏠)** - Dashboard tab
- **Budget (💰)** - Budget planning tab
- **Center FAB (⊕)** - Quick add transaction (elevated, purple, always visible)
- **Transactions (📋)** - Transaction list tab
- **Profile (👤)** - Opens settings/profile panel

### 1.3 Desktop Navigation (Sidebar)

```
┌────────────┬────────────────────────────┐
│            │                            │
│  Logo      │   [Content Area]           │
│            │                            │
│  ─────     │                            │
│  🏠 Dash   │                            │
│  💰 Budget │                            │
│  📋 Trxs   │                            │
│            │                            │
│  ─────     │                    ⊕       │  ← FAB bottom-right
│  Profile   │                            │
│            │                            │
└────────────┴────────────────────────────┘
```

**Desktop has:**
- Collapsible sidebar (icons-only when collapsed)
- FAB in bottom-right corner with tooltip on hover

---

## 2. Transactions Tab Overview

### 2.1 What the User Sees

```
┌─────────────────────────────────────────┐
│  Transactions              [🔍 Filter]  │  ← Header with filter button
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │    ↑ Actual Income    ↓ Actual Exp  ││  ← Summary card
│  │    ₹45,000           ₹32,500        ││
│  └─────────────────────────────────────┘│
│                                         │
│  Showing 12 of 15 transactions  [Clear] │  ← Filter indicator
│                                         │
│  TODAY                                  │  ← Date group header
│  ┌─────────────────────────────────────┐│
│  │ 🛒 Groceries           -₹850    🗑  ││
│  │ 10 Feb • Varshine                   ││
│  ├─────────────────────────────────────┤│
│  │ 🍕 Food Ordering       -₹420    🗑  ││
│  │ 10 Feb • Partner                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  YESTERDAY                              │
│  ┌─────────────────────────────────────┐│
│  │ ⚡ Electricity        -₹1,800   🗑  ││
│  │ 9 Feb • Varshine                    ││
│  └─────────────────────────────────────┘│
│                                         │
│  8 FEB                                  │
│  ┌─────────────────────────────────────┐│
│  │ 💰 Salary            +₹80,000   🗑  ││
│  │ 8 Feb • Varshine                    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 2.2 Transaction Card Design

Each transaction card shows:
- **Category icon** in colored circle (green background for income, red for expense)
- **Sub-category name** (e.g., "Groceries", "Salary")
- **Amount** with sign (+/- and color: green for income, red for expense)
- **Date** formatted as "10 Feb"
- **Recorder name** (who logged it)
- **Delete button** (🗑 icon, appears on right)

**Tap behavior:** Opens edit modal with transaction details pre-filled.

---

## 3. Adding a Transaction

### 3.1 Entry Points

Users can add transactions from multiple places:

| Location | Trigger | Action |
|----------|---------|--------|
| Mobile bottom nav | Tap center FAB (⊕) | Opens QuickAddTransaction modal |
| Desktop FAB | Tap floating button | Opens QuickAddTransaction modal |
| Transactions tab (empty state) | Tap "Add First Transaction" | Opens QuickAddTransaction modal |

### 3.2 QuickAddTransaction Modal

**What the user sees:**

```
┌─────────────────────────────────────────┐
│  💳 Add Transaction              ✕      │
├─────────────────────────────────────────┤
│                                         │
│              ₹ 850                      │  ← Large amount input
│                                         │
│  📁 Category                            │
│  ┌─────────────────────────────────────┐│
│  │ 🛒 Groceries               ↓ Expense││  ← Category with type indicator
│  └─────────────────────────────────────┘│
│                                         │
│  📅 Date of Payment                     │
│  ┌─────────────────────────────────────┐│
│  │ 2026-02-10                          ││
│  └─────────────────────────────────────┘│
│                                         │
│  📝 Notes                               │
│  ┌─────────────────────────────────────┐│
│  │ Optional                            ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │         Add Expense                 ││  ← Button text changes based on type
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 3.3 Field Details

**Amount Input:**
- Large, centered display (₹ prefix)
- Numeric keypad input
- Indian number formatting (e.g., ₹1,00,000)
- Auto-width based on amount length

**Category Selector:**
- Search/filter input with dropdown
- Shows both **expense** and **income** categories
- Grouped: Expense categories first, then Income
- When selected, shows type indicator pill:
  - Green "↑ Income" for income categories
  - Red "↓ Expense" for expense categories
- Keyboard navigation (arrow keys, Enter to select)

**Date of Payment:**
- Date picker, defaults to today
- Cannot select future dates
- Format: YYYY-MM-DD (input) → "10 Feb 2026" (display)

**Notes:**
- Optional text field
- Placeholder: "Optional"

**Submit Button:**
- Text changes based on selected category type:
  - "Add Expense" (default, if expense category selected)
  - "Add Income" (if income category selected)
- Disabled until amount and category are filled

### 3.4 Interactions

| Action | Behavior |
|--------|----------|
| Enter amount | Numeric input with Indian formatting |
| Focus category | Opens dropdown with all categories |
| Type in category | Filters dropdown results |
| Select category | Shows type indicator, enables submit |
| Change date | Updates transaction date |
| Add notes | Optional remarks saved with transaction |
| Tap "Add" | Creates transaction, closes modal, refreshes list |
| Tap ✕ or backdrop | Closes modal without saving |

---

## 4. Editing a Transaction

### 4.1 Entry Point

Tap any transaction card in the list to open edit mode.

### 4.2 Edit Modal

Same as Add modal, but:
- Title: "Edit Transaction" (instead of "Add Transaction")
- All fields pre-filled with existing values
- Button text: "Update Transaction"

```
┌─────────────────────────────────────────┐
│  💳 Edit Transaction             ✕      │
├─────────────────────────────────────────┤
│                                         │
│              ₹ 850                      │  ← Pre-filled amount
│                                         │
│  📁 Category                            │
│  ┌─────────────────────────────────────┐│
│  │ 🛒 Groceries               ↓ Expense││  ← Pre-filled category
│  └─────────────────────────────────────┘│
│                                         │
│  📅 Date of Payment                     │
│  ┌─────────────────────────────────────┐│
│  │ 2026-02-08                          ││  ← Pre-filled date
│  └─────────────────────────────────────┘│
│                                         │
│  📝 Notes                               │
│  ┌─────────────────────────────────────┐│
│  │ Weekly groceries                    ││  ← Pre-filled notes
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─────────────────────────────────────┐│
│  │       Update Transaction            ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 4.3 Edit Behavior

- Category dropdown works the same (can change category/type)
- Changing category from expense to income (or vice versa) is allowed
- All changes are saved on "Update Transaction"
- List refreshes after successful update

---

## 5. Deleting a Transaction

### 5.1 Entry Point

Tap the delete icon (🗑) on any transaction card.

### 5.2 Confirmation

Browser `confirm()` dialog:
```
Delete this transaction?
[Cancel] [OK]
```

### 5.3 Behavior

- On confirm: Transaction deleted, list refreshes
- On cancel: Nothing happens

---

## 6. Transaction Filters

### 6.1 Filter Button Location

| Platform | Location | Appearance |
|----------|----------|------------|
| Mobile | Header top-right | Solid purple square button with filter icon |
| Desktop | Header top-right | Purple button with "Filters" text + icon |

**Badge:** Shows count of active filter types (1-3)

### 6.2 Filter Dropdown

Opens when filter button is tapped:

```
┌─────────────────────────────────────────┐
│  Filters                           ✕    │
├─────────────────────────────────────────┤
│  DATE RANGE                             │
│  ┌─────────────┐  ┌─────────────┐       │
│  │ 2026-02-01  │  │ 2026-02-10  │       │
│  └─────────────┘  └─────────────┘       │
│  From              To                   │
│                                         │
│  RECORDED BY                            │
│  ┌─────────┐  ┌─────────┐               │
│  │ Varshine│  │ Partner │               │  ← Multiselect pills
│  └─────────┘  └─────────┘               │
│                                         │
│  TYPE                                   │
│  ┌─────┐  ┌───────┐  ┌─────────┐        │
│  │ All │  │ Income│  │ Expense │        │  ← Single select
│  └─────┘  └───────┘  └─────────┘        │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │        Clear All Filters            ││  ← Only if filters active
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 6.3 Filter Types

**Date Range:**
- Two date pickers: From and To
- Filters transactions where `date >= from AND date <= to`
- Either can be empty (acts as open-ended range)

**Recorded By:**
- Multiselect using pill buttons
- Shows all household members who have recorded transactions
- No "All" option - if none selected, shows all
- Multiple members can be selected simultaneously
- Styled as toggle pills (purple when active)

**Type:**
- Single select: All | Income | Expense
- "All" is default (shows both types)
- Income/Expense buttons have colored active states (green/red)

### 6.4 Filter Behavior

- Filters apply immediately as selections change
- Summary card (Actual Income/Expenses) updates to show filtered totals
- Transaction list shows only matching transactions
- "Showing X of Y transactions" indicator appears when filtered
- "Clear filters" link available in both filter dropdown and indicator

### 6.5 Click Outside

Clicking outside the filter dropdown closes it.

---

## 7. Summary Card

### 7.1 Design

```
┌─────────────────────────────────────────┐
│     ↑                    ↓              │
│  Actual Income      Actual Expenses     │
│  ₹45,000            ₹32,500             │
└─────────────────────────────────────────┘
```

### 7.2 Behavior

- Shows totals for **currently filtered** transactions
- Updates in real-time as filters change
- Income: Sum of all income transactions (green)
- Expenses: Sum of all expense transactions (red)

---

## 8. Empty States

### 8.1 No Transactions (No Filters)

```
┌─────────────────────────────────────────┐
│                  📝                     │
│                                         │
│     No transactions this month          │
│                                         │
│     [Add First Transaction]             │
└─────────────────────────────────────────┘
```

### 8.2 No Transactions Match Filters

```
┌─────────────────────────────────────────┐
│                  🔍                     │
│                                         │
│   No transactions match your filters    │
│                                         │
│         [Clear Filters]                 │
└─────────────────────────────────────────┘
```

---

## 9. Data Model

### 9.1 Transaction Record

```typescript
interface Transaction {
  id: string;
  household_id: string;
  sub_category_id: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  transaction_date: string; // ISO date: "2026-02-10"
  payment_method: string;   // default: "upi"
  remarks: string | null;
  logged_by: string;        // user_id
  created_at: string;
  updated_at: string;
}
```

### 9.2 Transaction with Display Info

```typescript
interface TransactionWithDetails extends Transaction {
  sub_category_name: string;
  sub_category_icon: string | null;
  category_name: string;
  category_icon: string | null;
  logged_by_name: string;   // User's display name
}
```

---

## 10. API Operations

### 10.1 Create Transaction

```typescript
createTransaction({
  householdId: string;
  subCategoryId: string;
  amount: number;
  transactionType: 'income' | 'expense';
  transactionDate: string;
  paymentMethod: string;
  remarks?: string;
})
```

### 10.2 Update Transaction

```typescript
updateTransaction(transactionId: string, {
  amount: number;
  subCategoryId: string;
  transactionDate: string;
  remarks: string;
})
```

### 10.3 Delete Transaction

```typescript
deleteTransaction(transactionId: string)
```

### 10.4 Get Transactions

```typescript
getCurrentMonthTransactions(householdId: string)
// Returns: TransactionWithDetails[] including logged_by_name
```

---

## 11. Edge Cases

| Scenario | Handling |
|----------|----------|
| User tries to add transaction without frozen plan | Dashboard prompts to set up budget first |
| Transaction amount is 0 | Validation error: "Enter amount" |
| No category selected | Validation error: "Select category" |
| User changes category from expense to income | Allowed - transaction type updates automatically |
| User deletes last transaction | Empty state shown with "Add First Transaction" button |
| Filters return no results | Empty state with "Clear Filters" button |
| User is only household member | "Recorded By" filter shows only their name |
| Multiple members record transactions | All unique recorders shown in filter |

---

## 12. File Locations

| Component | Path |
|-----------|------|
| TransactionsTab | `app/src/modules/transactions/components/TransactionsTab.tsx` |
| QuickAddTransaction | `app/src/modules/dashboard/components/QuickAddTransaction.tsx` |
| BottomNav | `app/src/modules/navigation/components/BottomNav.tsx` |
| SideNav | `app/src/modules/navigation/components/SideNav.tsx` |
| Transaction Types | `app/src/modules/budget/types.ts` |
| Transaction Services | `app/src/modules/budget/services/transactions.ts` |

---

## 13. Known Issues (To Fix)

- [x] ~~Some filter issues to be debugged (reported by user)~~ - FIXED
- [x] ~~Filter dropdown ref sharing between mobile/desktop headers~~ - FIXED (separate refs now)

---

## 14. Future Enhancements (Not in Current Scope)

- Batch transaction entry
- Recurring transactions
- Transaction attachments (receipts)
- Search within transactions
- Export transactions to CSV
- Voice input for quick add
