/**
 * Budget Module Types
 *
 * These types mirror the database schema for budget-related tables.
 */

// ============================================
// Database Entity Types
// ============================================

export type CategoryType = 'income' | 'expense';

export type Period = 'monthly' | 'quarterly' | 'yearly' | 'one-time';

export type PlanStatus = 'draft' | 'frozen';

/**
 * System-defined budget category (e.g., Income, EMI, Savings)
 */
export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  display_order: number;
  icon: string | null;
  created_at?: string;
}

/**
 * System-defined sub-category template (e.g., Salary, Rent)
 */
export interface SubCategoryTemplate {
  id: string;
  category_id: string;
  name: string;
  icon: string | null;
  is_default_selected: boolean;
  display_order: number;
  created_at?: string;
}

/**
 * User's selected sub-category for their household
 */
export interface HouseholdSubCategory {
  id: string;
  household_id: string;
  category_id: string;
  name: string;
  icon: string | null;
  is_custom: boolean;
  display_order: number | null;
  created_at?: string;
  updated_at?: string;
  // Joined relations
  category?: Category;
}

/**
 * Budget allocation for a sub-category in a specific month
 */
export interface BudgetAllocation {
  id: string;
  household_id: string;
  sub_category_id: string;
  amount: number;
  period: Period;
  monthly_amount: number;
  plan_month: string; // ISO date string (e.g., '2025-02-01')
  created_at?: string;
  updated_at?: string;
  // Joined relations
  sub_category?: HouseholdSubCategory;
}

/**
 * Monthly budget plan for a household
 */
export interface MonthlyPlan {
  id: string;
  household_id: string;
  plan_month: string; // ISO date string
  status: PlanStatus;
  total_income: number;
  total_allocated: number;
  frozen_at: string | null;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// UI / Component Types
// ============================================

/**
 * Category with its templates (for selection UI)
 */
export interface CategoryWithTemplates extends Category {
  sub_category_templates: SubCategoryTemplate[];
}

/**
 * Selected sub-category during budget setup
 * (before saving to database)
 */
export interface SubCategorySelection {
  templateId: string | null; // null for custom entries
  categoryId: string;
  name: string;
  icon: string | null;
  isCustom: boolean;
}

/**
 * Allocation input during budget setup
 * (before saving to database)
 */
export interface AllocationInput {
  subCategoryId: string; // temporary ID during setup
  amount: number;
  period: Period;
}

/**
 * Budget summary for review screen
 */
export interface BudgetSummary {
  totalIncome: number;
  categories: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    total: number;
    items: {
      name: string;
      icon: string | null;
      amount: number;
      period: Period;
      monthlyAmount: number;
    }[];
  }[];
  totalAllocated: number;
  remaining: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface SaveSubCategoriesRequest {
  householdId: string;
  selections: {
    categoryId: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
  }[];
}

export interface SaveAllocationsRequest {
  householdId: string;
  planMonth: string;
  allocations: {
    subCategoryId: string;
    amount: number;
    period: Period;
  }[];
}

export interface CreateMonthlyPlanRequest {
  householdId: string;
  planMonth: string;
  totalIncome: number;
  totalAllocated: number;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionType = 'expense' | 'income' | 'transfer';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking' | 'other';

export type TransactionSource = 'manual' | 'csv_import';

/**
 * A recorded transaction (expense, income, or transfer)
 */
export interface Transaction {
  id: string;
  household_id: string;
  sub_category_id: string | null;
  amount: number;
  transaction_type: TransactionType;
  transaction_date: string; // ISO date string (e.g., '2025-02-09')
  payment_method: PaymentMethod;
  remarks: string | null;
  logged_by: string; // user_id of who logged it (sender for transfers)
  transfer_to: string | null; // user_id of recipient (only for fund transfers)
  source: TransactionSource;
  original_narration: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined relations
  sub_category?: HouseholdSubCategory;
}

/**
 * Input for creating a new transaction
 */
export interface CreateTransactionInput {
  householdId: string;
  subCategoryId: string | null;
  amount: number;
  transactionType: TransactionType;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  remarks?: string;
  transferTo?: string; // user_id of recipient (only for fund transfers)
  loggedBy?: string; // user_id of who paid (defaults to current user if not provided)
  source?: TransactionSource;
  originalNarration?: string;
}

/**
 * Transaction with display info (for UI)
 */
export interface TransactionWithDetails extends Transaction {
  sub_category_name: string;
  sub_category_icon: string | null;
  category_name: string;
  category_icon: string | null;
  logged_by_name?: string;
  transfer_to_name?: string; // recipient name (only for fund transfers)
}

// ============================================
// Statement Import Types
// ============================================

/**
 * A single transaction parsed from a bank statement (PDF or CSV)
 */
export interface ParsedStatementTransaction {
  date: string;           // ISO date YYYY-MM-DD
  narration: string;      // Raw bank description
  amount: number;         // Always positive
  transactionType: 'expense' | 'income';  // Debit=expense, Credit=income
  balance?: number;       // Running balance if available
}

/**
 * Result of parsing a bank statement file
 */
export interface StatementParseResult {
  success: boolean;
  error?: string;
  transactions?: ParsedStatementTransaction[];
  bankName?: string;
  passwordRequired?: boolean;
}

/**
 * Import candidate = parsed transaction + merchant matching + duplicate detection
 */
export interface ImportCandidate extends ParsedStatementTransaction {
  index: number;                          // Position in original list
  suggestedSubCategoryId: string | null;
  suggestedSubCategoryName: string | null;
  suggestedCategoryName: string | null;
  matchConfidence: 'high' | 'medium' | 'none';
  isDuplicate: boolean;
  selected: boolean;                      // User can deselect
  userOverrideSubCategoryId: string | null;
  userOverrideTransactionType: TransactionType;
}
