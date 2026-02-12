import { supabase } from '../../../lib/supabase';
import type {
  Transaction,
  TransactionWithDetails,
  CreateTransactionInput,
  PaymentMethod,
  TransactionType,
} from '../types';

// ============================================
// Result Types
// ============================================

export interface TransactionResult {
  success: boolean;
  error?: string;
  transaction?: Transaction;
}

export interface TransactionsListResult {
  success: boolean;
  error?: string;
  transactions?: TransactionWithDetails[];
}

// ============================================
// Transaction CRUD Functions
// ============================================

/**
 * Create a new transaction
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<TransactionResult> {
  try {
    console.log('[createTransaction] Starting with input:', input);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[createTransaction] No authenticated user');
      return { success: false, error: 'Not authenticated' };
    }

    console.log('[createTransaction] User authenticated:', user.id);

    const insertData: any = {
      household_id: input.householdId,
      sub_category_id: input.subCategoryId || null,
      amount: input.amount,
      transaction_type: input.transactionType,
      transaction_date: input.transactionDate,
      payment_method: input.paymentMethod,
      remarks: input.remarks || null,
      logged_by: input.loggedBy || user.id, // Use provided loggedBy or default to current user
    };

    // Add transfer_to for fund transfers
    if (input.transferTo) {
      insertData.transfer_to = input.transferTo;
    }

    console.log('[createTransaction] Inserting data:', insertData);

    const { data, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[createTransaction] Database error:', error);
      console.error('[createTransaction] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, error: `Failed to save: ${error.message}` };
    }

    console.log('[createTransaction] Transaction created successfully:', data);
    return { success: true, transaction: data as Transaction };
  } catch (e) {
    console.error('[createTransaction] Unexpected error:', e);
    return { success: false, error: 'Failed to save transaction' };
  }
}

/**
 * Get transactions for a household within a date range
 */
export async function getTransactions(
  householdId: string,
  startDate?: string,
  endDate?: string
): Promise<TransactionsListResult> {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        household_sub_categories (
          id,
          name,
          icon,
          category_id,
          categories (
            id,
            name,
            icon
          )
        )
      `)
      .eq('household_id', householdId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getTransactions error:', error);
      return { success: false, error: 'Failed to load transactions' };
    }

    // Get unique user IDs who logged transactions or are transfer recipients
    const loggedByIds = (data || []).map((t: any) => t.logged_by).filter(Boolean);
    const transferToIds = (data || []).map((t: any) => t.transfer_to).filter(Boolean);
    const userIds = [...new Set([...loggedByIds, ...transferToIds])];

    // Fetch user display names
    const { data: usersData } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', userIds);

    // Create a map of user ID to display name
    const userMap = new Map<string, string>();
    (usersData || []).forEach((u: any) => {
      userMap.set(u.id, u.display_name || 'Unknown');
    });

    // Transform to TransactionWithDetails
    const transactions: TransactionWithDetails[] = (data || []).map((t: any) => ({
      id: t.id,
      household_id: t.household_id,
      sub_category_id: t.sub_category_id,
      amount: t.amount,
      transaction_type: t.transaction_type as TransactionType,
      transaction_date: t.transaction_date,
      payment_method: t.payment_method as PaymentMethod,
      remarks: t.remarks,
      logged_by: t.logged_by,
      transfer_to: t.transfer_to || null,
      created_at: t.created_at,
      updated_at: t.updated_at,
      sub_category_name: t.household_sub_categories?.name || (t.transaction_type === 'transfer' ? 'Fund Transfer' : 'Unknown'),
      sub_category_icon: t.household_sub_categories?.icon || (t.transaction_type === 'transfer' ? '💸' : '📦'),
      category_name: t.household_sub_categories?.categories?.name || (t.transaction_type === 'transfer' ? 'Transfer' : 'Unknown'),
      category_icon: t.household_sub_categories?.categories?.icon || (t.transaction_type === 'transfer' ? '💸' : '📁'),
      logged_by_name: userMap.get(t.logged_by) || 'Unknown',
      transfer_to_name: t.transfer_to ? userMap.get(t.transfer_to) : undefined,
    }));

    return { success: true, transactions };
  } catch (e) {
    console.error('getTransactions error:', e);
    return { success: false, error: 'Failed to load transactions' };
  }
}

/**
 * Get transactions for a specific date
 */
export async function getTransactionsByDate(
  householdId: string,
  date: string
): Promise<TransactionsListResult> {
  return getTransactions(householdId, date, date);
}

/**
 * Get transactions for current month
 */
export async function getCurrentMonthTransactions(
  householdId: string
): Promise<TransactionsListResult> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  return getTransactions(householdId, startOfMonth, endOfMonth);
}

/**
 * Update a transaction
 */
export async function updateTransaction(
  transactionId: string,
  updates: Partial<{
    amount: number;
    subCategoryId: string;
    transactionDate: string;
    paymentMethod: PaymentMethod;
    remarks: string;
  }>
): Promise<TransactionResult> {
  try {
    const updateData: any = {};
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.subCategoryId) updateData.sub_category_id = updates.subCategoryId;
    if (updates.transactionDate) updateData.transaction_date = updates.transactionDate;
    if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;
    if (updates.remarks !== undefined) updateData.remarks = updates.remarks;

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      console.error('updateTransaction error:', error);
      return { success: false, error: 'Failed to update transaction' };
    }

    return { success: true, transaction: data as Transaction };
  } catch (e) {
    console.error('updateTransaction error:', e);
    return { success: false, error: 'Failed to update transaction' };
  }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('deleteTransaction error:', error);
      return { success: false, error: 'Failed to delete transaction' };
    }

    return { success: true };
  } catch (e) {
    console.error('deleteTransaction error:', e);
    return { success: false, error: 'Failed to delete transaction' };
  }
}

// ============================================
// Household Users
// ============================================

/**
 * Get household members (users) for transaction assignment
 */
export async function getHouseholdUsers(
  householdId: string
): Promise<{ success: boolean; error?: string; users?: { id: string; displayName: string }[] }> {
  try {
    // Get current user to get their display name from auth metadata
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Get all household members
    const { data: members, error } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId);

    if (error) {
      console.error('getHouseholdUsers error:', error);
      return { success: false, error: 'Failed to load household members' };
    }

    if (!members || members.length === 0) {
      return { success: true, users: [] };
    }

    const userIds = members.map(m => m.user_id);

    // Get user display names from users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, display_name')
      .in('id', userIds);

    if (usersError) {
      console.error('getHouseholdUsers users error:', usersError);
      return { success: false, error: 'Failed to load user details' };
    }

    // Build user list, prioritizing current user's name from auth metadata
    const userList = (users || []).map(u => {
      let displayName = u.display_name;
      // If this is the current user, use their name from auth metadata
      if (currentUser && u.id === currentUser.id) {
        displayName = currentUser.user_metadata?.display_name || u.display_name;
      }
      return {
        id: u.id,
        displayName,
      };
    });

    return { success: true, users: userList };
  } catch (e) {
    console.error('getHouseholdUsers error:', e);
    return { success: false, error: 'Failed to load household users' };
  }
}

// ============================================
// Aggregation Functions
// ============================================

/**
 * Get spending by category for a date range
 */
export async function getSpendingByCategory(
  householdId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  error?: string;
  spending?: { categoryName: string; categoryIcon: string; total: number }[];
}> {
  try {
    const result = await getTransactions(householdId, startDate, endDate);
    if (!result.success || !result.transactions) {
      return { success: false, error: result.error };
    }

    // Group by category
    const categoryTotals = new Map<string, { icon: string; total: number }>();

    result.transactions
      .filter(t => t.transaction_type === 'expense')
      .forEach(t => {
        const key = t.category_name;
        const existing = categoryTotals.get(key) || { icon: t.category_icon || '📁', total: 0 };
        existing.total += t.amount;
        categoryTotals.set(key, existing);
      });

    const spending = Array.from(categoryTotals.entries()).map(([name, data]) => ({
      categoryName: name,
      categoryIcon: data.icon,
      total: data.total,
    }));

    return { success: true, spending };
  } catch (e) {
    console.error('getSpendingByCategory error:', e);
    return { success: false, error: 'Failed to calculate spending' };
  }
}

/**
 * Get recent sub-categories (for quick add UI)
 * Returns sub-categories sorted by recent usage
 */
export async function getRecentSubCategories(
  householdId: string,
  limit: number = 5
): Promise<{
  success: boolean;
  error?: string;
  recentIds?: string[];
}> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('sub_category_id')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getRecentSubCategories error:', error);
      return { success: false, error: 'Failed to get recent categories' };
    }

    // Get unique sub-category IDs in order of recency
    const seen = new Set<string>();
    const recentIds: string[] = [];

    for (const row of data || []) {
      if (!seen.has(row.sub_category_id)) {
        seen.add(row.sub_category_id);
        recentIds.push(row.sub_category_id);
        if (recentIds.length >= limit) break;
      }
    }

    return { success: true, recentIds };
  } catch (e) {
    console.error('getRecentSubCategories error:', e);
    return { success: false, error: 'Failed to get recent categories' };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get today's date in ISO format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Payment method display labels
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  other: 'Other',
};

/**
 * Payment method icons
 */
export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: '💵',
  upi: '📱',
  card: '💳',
  netbanking: '🏦',
  other: '📝',
};
