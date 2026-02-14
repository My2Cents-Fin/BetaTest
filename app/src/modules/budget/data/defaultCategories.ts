/**
 * Default Categories and Sub-Category Templates
 *
 * This data mirrors what's seeded in the database.
 * Used as client-side fallback and for offline support.
 */

import type { CategoryWithTemplates, Period } from '../types';

/**
 * Period multipliers for converting to monthly amounts
 */
export const PERIOD_DIVISORS: Record<Period, number> = {
  'monthly': 1,
  'quarterly': 3,
  'yearly': 12,
  'one-time': 1, // Applied only to current month
};

/**
 * Period display labels
 */
export const PERIOD_LABELS: Record<Period, string> = {
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'yearly': 'Yearly',
  'one-time': 'One-time',
};

/**
 * Calculate monthly amount from entered amount and period
 */
export function calculateMonthlyAmount(amount: number, period: Period): number {
  return amount / PERIOD_DIVISORS[period];
}

/**
 * Default income category and templates
 */
export const INCOME_CATEGORY: CategoryWithTemplates = {
  id: 'income',
  name: 'Income',
  type: 'income',
  display_order: 1,
  icon: '💰',
  sub_category_templates: [
    { id: 'salary', category_id: 'income', name: 'Salary', icon: '💼', is_default_selected: true, display_order: 1 },
    { id: 'business', category_id: 'income', name: 'Business Income', icon: '🏪', is_default_selected: false, display_order: 2 },
    { id: 'rental', category_id: 'income', name: 'Rental Income', icon: '🏠', is_default_selected: false, display_order: 3 },
    { id: 'freelance', category_id: 'income', name: 'Freelance', icon: '💻', is_default_selected: false, display_order: 4 },
    { id: 'investments', category_id: 'income', name: 'Investments', icon: '📈', is_default_selected: false, display_order: 5 },
    { id: 'other-income', category_id: 'income', name: 'Other Income', icon: '➕', is_default_selected: false, display_order: 6 },
  ],
};

/**
 * Default expense categories and templates
 */
export const EXPENSE_CATEGORIES: CategoryWithTemplates[] = [
  {
    id: 'emi',
    name: 'EMI',
    type: 'expense',
    display_order: 2,
    icon: '🏦',
    sub_category_templates: [
      { id: 'home-loan', category_id: 'emi', name: 'Home Loan EMI', icon: '🏠', is_default_selected: false, display_order: 1 },
      { id: 'car-loan', category_id: 'emi', name: 'Car Loan EMI', icon: '🚗', is_default_selected: false, display_order: 2 },
      { id: 'edu-loan', category_id: 'emi', name: 'Education Loan', icon: '🎓', is_default_selected: false, display_order: 3 },
      { id: 'personal-loan', category_id: 'emi', name: 'Personal Loan', icon: '💳', is_default_selected: false, display_order: 4 },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    type: 'expense',
    display_order: 3,
    icon: '🛡️',
    sub_category_templates: [
      { id: 'health-insurance', category_id: 'insurance', name: 'Health Insurance', icon: '🏥', is_default_selected: false, display_order: 1 },
      { id: 'life-insurance', category_id: 'insurance', name: 'Life Insurance', icon: '❤️', is_default_selected: false, display_order: 2 },
      { id: 'vehicle-insurance', category_id: 'insurance', name: 'Vehicle Insurance', icon: '🚙', is_default_selected: false, display_order: 3 },
    ],
  },
  {
    id: 'savings',
    name: 'Savings',
    type: 'expense',
    display_order: 4,
    icon: '🐷',
    sub_category_templates: [
      { id: 'general-savings', category_id: 'savings', name: 'General Savings', icon: '💰', is_default_selected: true, display_order: 1 },
      { id: 'emergency-fund', category_id: 'savings', name: 'Emergency Fund', icon: '🆘', is_default_selected: false, display_order: 2 },
      { id: 'investment-sip', category_id: 'savings', name: 'Investment/SIP', icon: '📊', is_default_selected: false, display_order: 3 },
      { id: 'vacation-fund', category_id: 'savings', name: 'Vacation Fund', icon: '✈️', is_default_selected: false, display_order: 4 },
    ],
  },
  {
    id: 'fixed',
    name: 'Fixed',
    type: 'expense',
    display_order: 5,
    icon: '📌',
    sub_category_templates: [
      { id: 'rent', category_id: 'fixed', name: 'Rent', icon: '🏠', is_default_selected: true, display_order: 1 },
      { id: 'internet', category_id: 'fixed', name: 'Internet', icon: '📶', is_default_selected: true, display_order: 2 },
      { id: 'phone-bill', category_id: 'fixed', name: 'Phone Bill', icon: '📱', is_default_selected: true, display_order: 3 },
      { id: 'maid-help', category_id: 'fixed', name: 'Maid/Help', icon: '🧹', is_default_selected: false, display_order: 4 },
      { id: 'society-maintenance', category_id: 'fixed', name: 'Society Maintenance', icon: '🏢', is_default_selected: false, display_order: 5 },
      { id: 'subscriptions', category_id: 'fixed', name: 'Subscriptions', icon: '📺', is_default_selected: false, display_order: 6 },
    ],
  },
  {
    id: 'variable',
    name: 'Variable',
    type: 'expense',
    display_order: 6,
    icon: '🔄',
    sub_category_templates: [
      { id: 'groceries', category_id: 'variable', name: 'Groceries', icon: '🛒', is_default_selected: true, display_order: 1 },
      { id: 'electricity', category_id: 'variable', name: 'Electricity', icon: '💡', is_default_selected: false, display_order: 2 },
      { id: 'water', category_id: 'variable', name: 'Water', icon: '💧', is_default_selected: false, display_order: 3 },
      { id: 'fuel', category_id: 'variable', name: 'Fuel', icon: '⛽', is_default_selected: false, display_order: 4 },
      { id: 'food-ordering', category_id: 'variable', name: 'Food Ordering', icon: '🍕', is_default_selected: true, display_order: 5 },
      { id: 'dining-out', category_id: 'variable', name: 'Dining Out', icon: '🍽️', is_default_selected: false, display_order: 6 },
      { id: 'shopping', category_id: 'variable', name: 'Shopping', icon: '🛍️', is_default_selected: false, display_order: 7 },
      { id: 'entertainment', category_id: 'variable', name: 'Entertainment', icon: '🎬', is_default_selected: false, display_order: 8 },
      { id: 'personal-care', category_id: 'variable', name: 'Personal Care', icon: '💅', is_default_selected: false, display_order: 9 },
      { id: 'medical', category_id: 'variable', name: 'Medical', icon: '💊', is_default_selected: false, display_order: 10 },
      { id: 'transport', category_id: 'variable', name: 'Transport', icon: '🚌', is_default_selected: false, display_order: 11 },
      { id: 'miscellaneous', category_id: 'variable', name: 'Miscellaneous', icon: '📦', is_default_selected: true, display_order: 12 },
    ],
  },
  {
    id: 'family',
    name: 'Family',
    type: 'expense',
    display_order: 7,
    icon: '👨‍👩‍👧‍👦',
    sub_category_templates: [],
  },
  {
    id: 'investment',
    name: 'Investment',
    type: 'expense',
    display_order: 8,
    icon: '📈',
    sub_category_templates: [],
  },
  {
    id: 'one-time',
    name: 'One-time',
    type: 'expense',
    display_order: 9,
    icon: '📅',
    sub_category_templates: [],
  },
];

/**
 * All categories combined
 */
export const ALL_CATEGORIES: CategoryWithTemplates[] = [
  INCOME_CATEGORY,
  ...EXPENSE_CATEGORIES,
];

/**
 * Get category by ID
 */
export function getCategoryById(id: string): CategoryWithTemplates | undefined {
  return ALL_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Get all expense templates grouped by category
 */
export function getExpenseTemplatesByCategory() {
  return EXPENSE_CATEGORIES.map(cat => ({
    category: {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
    },
    templates: cat.sub_category_templates,
  }));
}

/**
 * Get default selected expense templates
 */
export function getDefaultExpenseSelections() {
  return EXPENSE_CATEGORIES.flatMap(cat =>
    cat.sub_category_templates.filter(t => t.is_default_selected)
  );
}
