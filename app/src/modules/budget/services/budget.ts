import { supabase } from '../../../lib/supabase';
import type {
  CategoryWithTemplates,
  HouseholdSubCategory,
  BudgetAllocation,
  MonthlyPlan,
  Period,
} from '../types';
import {
  ALL_CATEGORIES,
  calculateMonthlyAmount,
} from '../data/defaultCategories';
import { getActualIncomeForMonth, type ActualIncomeItem } from './transactions';

// ============================================
// Result Types
// ============================================

export interface ServiceResult {
  success: boolean;
  error?: string;
}

export interface CategoriesResult {
  success: boolean;
  error?: string;
  categories?: CategoryWithTemplates[];
}

export interface SubCategoriesResult {
  success: boolean;
  error?: string;
  subCategories?: HouseholdSubCategory[];
}

export interface MonthlyPlanResult {
  success: boolean;
  error?: string;
  plan?: MonthlyPlan;
}

// ============================================
// Category & Template Functions
// ============================================

/**
 * Get all categories with their templates
 * Falls back to local data if DB is empty
 */
export async function getCategories(): Promise<CategoriesResult> {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        type,
        display_order,
        icon,
        sub_category_templates (
          id,
          name,
          icon,
          is_default_selected,
          display_order
        )
      `)
      .order('display_order');

    if (error) {
      console.error('getCategories error:', error);
      // Fall back to local data
      return { success: true, categories: ALL_CATEGORIES };
    }

    if (!categories || categories.length === 0) {
      // Fall back to local data
      return { success: true, categories: ALL_CATEGORIES };
    }

    return {
      success: true,
      categories: categories as CategoryWithTemplates[],
    };
  } catch (e) {
    console.error('getCategories error:', e);
    return { success: true, categories: ALL_CATEGORIES };
  }
}

// ============================================
// Household Sub-Category Functions
// ============================================

/**
 * Save household sub-categories (income or expense selections)
 */
export async function saveSubCategories(
  householdId: string,
  selections: {
    categoryId: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
    displayOrder: number;
  }[]
): Promise<ServiceResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Insert all sub-categories
    const { error } = await supabase
      .from('household_sub_categories')
      .insert(
        selections.map((s, index) => ({
          household_id: householdId,
          category_id: s.categoryId,
          name: s.name,
          icon: s.icon,
          is_custom: s.isCustom,
          display_order: s.displayOrder ?? index,
        }))
      );

    if (error) {
      console.error('saveSubCategories error:', error);
      return { success: false, error: 'Failed to save selections' };
    }

    return { success: true };
  } catch (e) {
    console.error('saveSubCategories error:', e);
    return { success: false, error: 'Failed to save selections' };
  }
}

/**
 * Get household sub-categories
 */
export async function getHouseholdSubCategories(
  householdId: string
): Promise<SubCategoriesResult> {
  try {
    // First, get all sub-categories
    const { data: subCats, error } = await supabase
      .from('household_sub_categories')
      .select('id, household_id, category_id, name, icon, is_custom, display_order')
      .eq('household_id', householdId)
      .order('display_order');

    if (error) {
      console.error('getHouseholdSubCategories error:', error);
      return { success: false, error: 'Failed to load sub-categories' };
    }

    if (!subCats || subCats.length === 0) {
      return { success: true, subCategories: [] };
    }

    // Get all unique category IDs
    const categoryIds = [...new Set(subCats.map(sc => sc.category_id))];

    // Fetch system categories and custom categories in parallel
    const [{ data: systemCategories }, { data: customCategories }] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, type, icon')
        .in('id', categoryIds),
      supabase
        .from('household_categories')
        .select('id, name, type, icon')
        .in('id', categoryIds)
        .eq('household_id', householdId),
    ]);

    // Create a map of all categories
    const categoryMap = new Map();
    (systemCategories || []).forEach(cat => categoryMap.set(cat.id, cat));
    (customCategories || []).forEach(cat => categoryMap.set(cat.id, cat));

    // Merge category info into sub-categories
    const subCategories: HouseholdSubCategory[] = subCats.map(sc => ({
      ...sc,
      categories: categoryMap.get(sc.category_id) || null,
    }));

    return {
      success: true,
      subCategories,
    };
  } catch (e) {
    console.error('getHouseholdSubCategories error:', error);
    return { success: false, error: 'Failed to load sub-categories' };
  }
}

// ============================================
// Budget Allocation Functions
// ============================================

/**
 * Save budget allocations for a month
 */
export async function saveAllocations(
  householdId: string,
  planMonth: string, // e.g., '2025-02-01'
  allocations: {
    subCategoryId: string;
    amount: number;
    period: Period;
  }[]
): Promise<ServiceResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert allocations (update if exists, insert if not)
    const { error } = await supabase
      .from('budget_allocations')
      .upsert(
        allocations.map(a => ({
          household_id: householdId,
          sub_category_id: a.subCategoryId,
          amount: a.amount,
          period: a.period,
          monthly_amount: calculateMonthlyAmount(a.amount, a.period),
          plan_month: planMonth,
        })),
        {
          onConflict: 'sub_category_id,plan_month',
        }
      );

    if (error) {
      console.error('saveAllocations error:', error);
      return { success: false, error: 'Failed to save allocations' };
    }

    return { success: true };
  } catch (e) {
    console.error('saveAllocations error:', e);
    return { success: false, error: 'Failed to save allocations' };
  }
}

/**
 * Get budget allocations for a month
 */
export async function getAllocations(
  householdId: string,
  planMonth: string
): Promise<{ success: boolean; error?: string; allocations?: BudgetAllocation[] }> {
  try {
    const { data, error } = await supabase
      .from('budget_allocations')
      .select(`
        id,
        household_id,
        sub_category_id,
        amount,
        period,
        monthly_amount,
        plan_month,
        household_sub_categories (
          id,
          name,
          icon,
          category_id,
          categories (
            id,
            name,
            type,
            icon
          )
        )
      `)
      .eq('household_id', householdId)
      .eq('plan_month', planMonth);

    if (error) {
      console.error('getAllocations error:', error);
      return { success: false, error: 'Failed to load allocations' };
    }

    return {
      success: true,
      allocations: data as BudgetAllocation[],
    };
  } catch (e) {
    console.error('getAllocations error:', e);
    return { success: false, error: 'Failed to load allocations' };
  }
}

// ============================================
// Monthly Plan Functions
// ============================================

/**
 * Create or update monthly plan
 * Preserves existing status if plan already exists
 */
export async function upsertMonthlyPlan(
  householdId: string,
  planMonth: string,
  totalIncome: number,
  totalAllocated: number
): Promise<MonthlyPlanResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // First check if plan exists and get its current status
    const { data: existingPlan } = await supabase
      .from('monthly_plans')
      .select('status')
      .eq('household_id', householdId)
      .eq('plan_month', planMonth)
      .single();

    // If plan exists and is frozen, keep it frozen
    // If plan is new or draft, set to draft
    const status = existingPlan?.status === 'frozen' ? 'frozen' : 'draft';

    const { data, error } = await supabase
      .from('monthly_plans')
      .upsert(
        {
          household_id: householdId,
          plan_month: planMonth,
          total_income: totalIncome,
          total_allocated: totalAllocated,
          status: status,
        },
        {
          onConflict: 'household_id,plan_month',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('upsertMonthlyPlan error:', error);
      return { success: false, error: 'Failed to save plan' };
    }

    return {
      success: true,
      plan: data as MonthlyPlan,
    };
  } catch (e) {
    console.error('upsertMonthlyPlan error:', e);
    return { success: false, error: 'Failed to save plan' };
  }
}

/**
 * Get monthly plan
 */
export async function getMonthlyPlan(
  householdId: string,
  planMonth: string
): Promise<MonthlyPlanResult> {
  try {
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('household_id', householdId)
      .eq('plan_month', planMonth)
      .single();

    if (error) {
      // Not found is OK - plan doesn't exist yet
      if (error.code === 'PGRST116') {
        return { success: true, plan: undefined };
      }
      console.error('getMonthlyPlan error:', error);
      return { success: false, error: 'Failed to load plan' };
    }

    return {
      success: true,
      plan: data as MonthlyPlan,
    };
  } catch (e) {
    console.error('getMonthlyPlan error:', e);
    return { success: false, error: 'Failed to load plan' };
  }
}

/**
 * Freeze monthly plan (lock for tracking)
 */
export async function freezePlan(planId: string): Promise<ServiceResult> {
  try {
    const { error } = await supabase
      .from('monthly_plans')
      .update({
        status: 'frozen',
        frozen_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (error) {
      console.error('freezePlan error:', error);
      return { success: false, error: 'Failed to freeze plan' };
    }

    return { success: true };
  } catch (e) {
    console.error('freezePlan error:', e);
    return { success: false, error: 'Failed to freeze plan' };
  }
}

// ============================================
// Sub-Category Management
// ============================================

/**
 * Rename a sub-category
 */
export async function renameSubCategory(
  subCategoryId: string,
  newName: string
): Promise<ServiceResult> {
  try {
    const { error } = await supabase
      .from('household_sub_categories')
      .update({ name: newName })
      .eq('id', subCategoryId);

    if (error) {
      console.error('renameSubCategory error:', error);
      return { success: false, error: 'Failed to rename item' };
    }

    return { success: true };
  } catch (e) {
    console.error('renameSubCategory error:', e);
    return { success: false, error: 'Failed to rename item' };
  }
}

/**
 * Update display order for multiple sub-categories
 */
export async function updateSubCategoryOrder(
  updates: { id: string; displayOrder: number }[]
): Promise<ServiceResult> {
  try {
    // Update each item's display_order
    for (const update of updates) {
      const { error } = await supabase
        .from('household_sub_categories')
        .update({ display_order: update.displayOrder })
        .eq('id', update.id);

      if (error) {
        console.error('updateSubCategoryOrder error:', error);
        return { success: false, error: 'Failed to reorder items' };
      }
    }

    return { success: true };
  } catch (e) {
    console.error('updateSubCategoryOrder error:', e);
    return { success: false, error: 'Failed to reorder items' };
  }
}

/**
 * Create a new sub-category
 * Prevents duplicates by checking for existing name (case-insensitive)
 */
export async function createSubCategory(
  householdId: string,
  categoryId: string,
  name: string,
  icon: string
): Promise<{ success: boolean; error?: string; subCategory?: HouseholdSubCategory }> {
  try {
    // Check for duplicate name (case-insensitive)
    const { data: duplicate } = await supabase
      .from('household_sub_categories')
      .select('id, name')
      .eq('household_id', householdId)
      .ilike('name', name)
      .limit(1);

    if (duplicate && duplicate.length > 0) {
      console.warn('[createSubCategory] Duplicate detected:', name);
      return { success: false, error: `"${name}" already exists` };
    }

    // Get max display_order for this household
    const { data: existing } = await supabase
      .from('household_sub_categories')
      .select('display_order')
      .eq('household_id', householdId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? (existing[0].display_order || 0) + 1 : 0;

    const { data, error } = await supabase
      .from('household_sub_categories')
      .insert({
        household_id: householdId,
        category_id: categoryId,
        name,
        icon,
        is_custom: true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('createSubCategory error:', error);
      // Check if it's a unique constraint violation
      if (error.code === '23505') {
        return { success: false, error: `"${name}" already exists` };
      }
      return { success: false, error: 'Failed to create item' };
    }

    // Fetch category info separately (could be from categories or household_categories)
    let categoryInfo = null;

    // Try system categories first
    const { data: systemCategory } = await supabase
      .from('categories')
      .select('id, name, type, icon')
      .eq('id', categoryId)
      .single();

    if (systemCategory) {
      categoryInfo = systemCategory;
    } else {
      // Try custom categories
      const { data: customCategory } = await supabase
        .from('household_categories')
        .select('id, name, type, icon')
        .eq('id', categoryId)
        .single();

      if (customCategory) {
        categoryInfo = customCategory;
      }
    }

    // Construct the sub-category object with category info
    const subCategory: HouseholdSubCategory = {
      ...data,
      categories: categoryInfo,
    };

    return { success: true, subCategory };
  } catch (e) {
    console.error('createSubCategory error:', e);
    return { success: false, error: 'Failed to create item' };
  }
}

/**
 * Get all categories (for creating new items)
 * Includes both system categories and household custom categories
 */
export async function getCategoryList(householdId?: string): Promise<{ success: boolean; error?: string; categories?: { id: string; name: string; type: string; icon: string; isCustom?: boolean }[] }> {
  try {
    // Run system + custom category queries in parallel when householdId is provided
    const systemQuery = supabase
      .from('categories')
      .select('id, name, type, icon')
      .order('display_order');

    if (householdId) {
      const customQuery = supabase
        .from('household_categories')
        .select('id, name, type, icon')
        .eq('household_id', householdId)
        .order('display_order');

      const [{ data: systemCategories, error: systemError }, { data: customCategories, error: customError }] = await Promise.all([
        systemQuery,
        customQuery,
      ]);

      if (systemError) {
        console.error('getCategoryList error:', systemError);
        return { success: false, error: 'Failed to load categories' };
      }

      const categories: { id: string; name: string; type: string; icon: string; isCustom?: boolean }[] =
        (systemCategories || []).map(c => ({ ...c, isCustom: false }));

      if (!customError && customCategories) {
        categories.push(...customCategories.map(c => ({ ...c, isCustom: true })));
      }

      return { success: true, categories };
    } else {
      const { data: systemCategories, error: systemError } = await systemQuery;

      if (systemError) {
        console.error('getCategoryList error:', systemError);
        return { success: false, error: 'Failed to load categories' };
      }

      const categories: { id: string; name: string; type: string; icon: string; isCustom?: boolean }[] =
        (systemCategories || []).map(c => ({ ...c, isCustom: false }));

      return { success: true, categories };
    }
  } catch (e) {
    console.error('getCategoryList error:', e);
    return { success: false, error: 'Failed to load categories' };
  }
}

/**
 * Create a custom category for a household
 */
export async function createCustomCategory(
  householdId: string,
  name: string,
  icon: string
): Promise<{ success: boolean; error?: string; category?: { id: string; name: string; type: string; icon: string } }> {
  try {
    console.log('[createCustomCategory] Starting - householdId:', householdId, 'name:', name, 'icon:', icon);

    // Check for duplicate name (case-insensitive) in both system and custom categories
    const { data: systemDuplicate } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', name)
      .limit(1);

    console.log('[createCustomCategory] System duplicate check:', systemDuplicate);

    if (systemDuplicate && systemDuplicate.length > 0) {
      console.log('[createCustomCategory] Found system duplicate:', systemDuplicate[0].name);
      return { success: false, error: `"${name}" already exists as a system category` };
    }

    const { data: customDuplicate } = await supabase
      .from('household_categories')
      .select('id, name')
      .eq('household_id', householdId)
      .ilike('name', name)
      .limit(1);

    console.log('[createCustomCategory] Custom duplicate check:', customDuplicate);

    if (customDuplicate && customDuplicate.length > 0) {
      console.log('[createCustomCategory] Found custom duplicate:', customDuplicate[0].name);
      return { success: false, error: `"${name}" already exists` };
    }

    // Get max display_order for custom categories
    const { data: existing } = await supabase
      .from('household_categories')
      .select('display_order')
      .eq('household_id', householdId)
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = existing && existing.length > 0 ? existing[0].display_order : 99;

    // Create custom category (always expense type for now)
    const { data, error } = await supabase
      .from('household_categories')
      .insert({
        household_id: householdId,
        name,
        type: 'expense',
        icon,
        display_order: maxOrder + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('createCustomCategory error:', error);
      if (error.code === '23505') {
        return { success: false, error: `"${name}" already exists` };
      }
      return { success: false, error: 'Failed to create category' };
    }

    return { success: true, category: data as { id: string; name: string; type: string; icon: string } };
  } catch (e) {
    console.error('createCustomCategory error:', e);
    return { success: false, error: 'Failed to create category' };
  }
}

/**
 * Delete a custom category
 * Only custom categories can be deleted, not system ones
 */
export async function deleteCustomCategory(
  householdId: string,
  categoryId: string
): Promise<ServiceResult> {
  try {
    // First check if there are any sub-categories under this category
    const { data: subCategories } = await supabase
      .from('household_sub_categories')
      .select('id')
      .eq('household_id', householdId)
      .eq('category_id', categoryId)
      .limit(1);

    if (subCategories && subCategories.length > 0) {
      return { success: false, error: 'Cannot delete category with items. Delete all items first.' };
    }

    // Delete the custom category
    const { error } = await supabase
      .from('household_categories')
      .delete()
      .eq('id', categoryId)
      .eq('household_id', householdId);

    if (error) {
      console.error('deleteCustomCategory error:', error);
      return { success: false, error: 'Failed to delete category' };
    }

    return { success: true };
  } catch (e) {
    console.error('deleteCustomCategory error:', e);
    return { success: false, error: 'Failed to delete category' };
  }
}

/**
 * Delete a sub-category and its allocations
 */
export async function deleteSubCategory(subCategoryId: string): Promise<ServiceResult> {
  try {
    // First delete any allocations for this sub-category
    await supabase
      .from('budget_allocations')
      .delete()
      .eq('sub_category_id', subCategoryId);

    // Then delete the sub-category
    const { error } = await supabase
      .from('household_sub_categories')
      .delete()
      .eq('id', subCategoryId);

    if (error) {
      console.error('deleteSubCategory error:', error);
      return { success: false, error: 'Failed to delete item' };
    }

    return { success: true };
  } catch (e) {
    console.error('deleteSubCategory error:', e);
    return { success: false, error: 'Failed to delete item' };
  }
}

// ============================================
// Default Template Creation (for first dashboard visit)
// ============================================

/**
 * Default items template - categoryName will be matched to DB category
 */
const DEFAULT_TEMPLATE = [
  // Income
  { name: 'Salary', icon: '💼', categoryName: 'Income', displayOrder: 1 },
  // Fixed expenses
  { name: 'Rent', icon: '🏠', categoryName: 'Fixed', displayOrder: 10 },
  { name: 'Electricity', icon: '⚡', categoryName: 'Fixed', displayOrder: 11 },
  { name: 'Internet', icon: '📶', categoryName: 'Fixed', displayOrder: 12 },
  { name: 'Phone Bill', icon: '📱', categoryName: 'Fixed', displayOrder: 13 },
  // Variable expenses
  { name: 'Groceries', icon: '🛒', categoryName: 'Variable', displayOrder: 20 },
  { name: 'Food Ordering', icon: '🍕', categoryName: 'Variable', displayOrder: 21 },
  { name: 'Miscellaneous', icon: '📦', categoryName: 'Variable', displayOrder: 22 },
];

/**
 * Create default budget template for first-time users
 * Looks up actual category UUIDs from database, then creates items
 */
export async function createDefaultExpenseTemplate(householdId: string): Promise<ServiceResult> {
  try {
    console.log('[createDefaultTemplate] Starting for household:', householdId);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[createDefaultTemplate] Not authenticated');
      return { success: false, error: 'Not authenticated' };
    }

    // Check if items already exist (prevent duplicates from React StrictMode)
    const { data: existing } = await supabase
      .from('household_sub_categories')
      .select('id')
      .eq('household_id', householdId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[createDefaultTemplate] Items already exist, skipping');
      return { success: true };
    }

    // First, fetch all categories to get their UUIDs
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name');

    console.log('[createDefaultTemplate] Categories from DB:', categories, 'Error:', catError);

    if (catError || !categories) {
      console.error('[createDefaultTemplate] Failed to fetch categories:', catError);
      return { success: false, error: 'Failed to fetch categories' };
    }

    // Create a map of category name -> UUID
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });
    console.log('[createDefaultTemplate] Category map:', Object.fromEntries(categoryMap));

    // Build items with actual category UUIDs
    const itemsToInsert = DEFAULT_TEMPLATE
      .map(item => {
        const categoryId = categoryMap.get(item.categoryName.toLowerCase());
        if (!categoryId) {
          console.warn(`[createDefaultTemplate] Category not found: ${item.categoryName}`);
          return null;
        }
        return {
          household_id: householdId,
          category_id: categoryId,
          name: item.name,
          icon: item.icon,
          is_custom: false,
          display_order: item.displayOrder,
        };
      })
      .filter(Boolean);

    console.log('[createDefaultTemplate] Items to insert:', itemsToInsert);

    if (itemsToInsert.length === 0) {
      console.error('[createDefaultTemplate] No items to insert - categories not found');
      return { success: false, error: 'Categories not found in database' };
    }

    // Insert all items
    const { error } = await supabase
      .from('household_sub_categories')
      .insert(itemsToInsert);

    if (error) {
      console.error('[createDefaultTemplate] Insert error:', error);
      return { success: false, error: 'Failed to create default template' };
    }

    console.log('[createDefaultTemplate] Success!');
    return { success: true };
  } catch (e) {
    console.error('[createDefaultTemplate] Exception:', e);
    return { success: false, error: 'Failed to create default template' };
  }
}

// ============================================
// Budget View Mode Functions
// ============================================

/**
 * Get all available budget months for a household
 * Returns months that have a monthly_plan (draft or frozen)
 */
export async function getAvailableBudgetMonths(
  householdId: string
): Promise<{ success: boolean; error?: string; months?: string[] }> {
  try {
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('plan_month')
      .eq('household_id', householdId)
      .order('plan_month', { ascending: false });

    if (error) {
      console.error('getAvailableBudgetMonths error:', error);
      return { success: false, error: 'Failed to load budget months' };
    }

    const months = data?.map(d => d.plan_month.substring(0, 7)) || []; // Convert YYYY-MM-DD to YYYY-MM
    return { success: true, months };
  } catch (e) {
    console.error('getAvailableBudgetMonths error:', e);
    return { success: false, error: 'Failed to load budget months' };
  }
}

/**
 * Get actuals (transaction totals) by sub-category for a month
 */
export async function getActualsBySubCategory(
  householdId: string,
  month: string // Format: YYYY-MM
): Promise<{ success: boolean; error?: string; actuals?: Map<string, number>; rawTransactions?: { sub_category_id: string; amount: number; logged_by: string }[] }> {
  try {
    const startDate = `${month}-01`;
    const endDate = getLastDayOfMonth(month);

    const { data, error } = await supabase
      .from('transactions')
      .select('sub_category_id, amount, logged_by')
      .eq('household_id', householdId)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (error) {
      console.error('getActualsBySubCategory error:', error);
      return { success: false, error: 'Failed to load actuals' };
    }

    // Group and sum by sub_category_id
    const actuals = new Map<string, number>();
    data?.forEach(t => {
      const current = actuals.get(t.sub_category_id) || 0;
      actuals.set(t.sub_category_id, current + t.amount);
    });

    return { success: true, actuals, rawTransactions: data || [] };
  } catch (e) {
    console.error('getActualsBySubCategory error:', e);
    return { success: false, error: 'Failed to load actuals' };
  }
}

/**
 * Get budget data for view mode (allocations + actuals)
 * Income comes from actual transactions, expenses from allocations
 */
export async function getBudgetViewData(
  householdId: string,
  month: string, // Format: YYYY-MM
  providedUserMap?: Map<string, string>
): Promise<{
  success: boolean;
  error?: string;
  plan?: MonthlyPlan;
  items?: {
    id: string;
    name: string;
    icon: string | null;
    categoryId: string;
    categoryName: string;
    categoryType: 'income' | 'expense';
    categoryIcon: string | null;
    planned: number;
    actual: number;
    period: Period;
  }[];
  incomeData?: {
    totalIncome: number;
    incomeItems: ActualIncomeItem[];
  };
  expenseTransactions?: { sub_category_id: string; amount: number; logged_by: string }[];
}> {
  try {
    const planMonth = `${month}-01`;

    // Run plan, allocations, actuals, and income queries in parallel
    const [planResult, allocResult, actualsResult, incomeResult] = await Promise.all([
      supabase
        .from('monthly_plans')
        .select('*')
        .eq('household_id', householdId)
        .eq('plan_month', planMonth)
        .single(),
      supabase
        .from('budget_allocations')
        .select(`
          id,
          sub_category_id,
          amount,
          period,
          monthly_amount,
          household_sub_categories (
            id,
            name,
            icon,
            display_order,
            category_id,
            categories (
              id,
              name,
              type,
              icon,
              display_order
            )
          )
        `)
        .eq('household_id', householdId)
        .eq('plan_month', planMonth),
      getActualsBySubCategory(householdId, month),
      getActualIncomeForMonth(householdId, month, providedUserMap),
    ]);

    const { data: plan, error: planError } = planResult;
    if (planError && planError.code !== 'PGRST116') {
      console.error('getBudgetViewData plan error:', planError);
      return { success: false, error: 'Failed to load budget' };
    }

    const { data: allocations, error: allocError } = allocResult;
    if (allocError) {
      console.error('getBudgetViewData allocations error:', allocError);
      return { success: false, error: 'Failed to load budget items' };
    }

    const actuals = actualsResult.actuals || new Map();

    // Transform data — ONLY expense items (income comes from transactions now)
    const items = (allocations || [])
      .filter(a => a.household_sub_categories)
      .map(a => {
        const subCat = a.household_sub_categories as any;
        const cat = subCat.categories as any;
        return {
          id: a.sub_category_id,
          name: subCat.name,
          icon: subCat.icon,
          categoryId: subCat.category_id,
          categoryName: cat?.name || 'Other',
          categoryType: (cat?.type || 'expense') as 'income' | 'expense',
          categoryIcon: cat?.icon,
          planned: a.monthly_amount,
          actual: actuals.get(a.sub_category_id) || 0,
          period: a.period as Period,
          displayOrder: subCat.display_order || 0,
          categoryDisplayOrder: cat?.display_order || 0,
        };
      })
      .filter(item => item.categoryType === 'expense') // Only expenses
      .sort((a, b) => {
        if (a.categoryDisplayOrder !== b.categoryDisplayOrder) {
          return a.categoryDisplayOrder - b.categoryDisplayOrder;
        }
        return a.displayOrder - b.displayOrder;
      });

    return {
      success: true,
      plan: plan as MonthlyPlan | undefined,
      items,
      incomeData: {
        totalIncome: incomeResult.totalIncome,
        incomeItems: incomeResult.incomeItems,
      },
      expenseTransactions: actualsResult.rawTransactions || [],
    };
  } catch (e) {
    console.error('getBudgetViewData error:', e);
    return { success: false, error: 'Failed to load budget data' };
  }
}

/**
 * Get last day of a month
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Clone budget allocations from one month to another.
 * Copies all expense allocations (amounts + periods) AND income transactions
 * from sourceMonth to targetMonth. Creates a draft monthly_plan for the target month.
 */
export async function cloneBudgetAllocations(
  householdId: string,
  sourceMonth: string, // Format: YYYY-MM
  targetMonth: string  // Format: YYYY-MM
): Promise<ServiceResult> {
  try {
    const sourcePlanMonth = `${sourceMonth}-01`;
    const targetPlanMonth = `${targetMonth}-01`;

    // Get source allocations and income in parallel
    const [allocResult, incomeResult] = await Promise.all([
      supabase
        .from('budget_allocations')
        .select('sub_category_id, amount, period, monthly_amount')
        .eq('household_id', householdId)
        .eq('plan_month', sourcePlanMonth),
      getActualIncomeForMonth(householdId, sourceMonth),
    ]);

    const { data: sourceAllocations, error: fetchError } = allocResult;

    if (fetchError) {
      console.error('cloneBudgetAllocations fetch error:', fetchError);
      return { success: false, error: 'Failed to fetch source allocations' };
    }

    if (!sourceAllocations || sourceAllocations.length === 0) {
      return { success: false, error: 'No allocations found in source month' };
    }

    // Insert cloned allocations for target month
    const { error: insertError } = await supabase
      .from('budget_allocations')
      .upsert(
        sourceAllocations.map(a => ({
          household_id: householdId,
          sub_category_id: a.sub_category_id,
          amount: a.amount,
          period: a.period,
          monthly_amount: a.monthly_amount,
          plan_month: targetPlanMonth,
        })),
        { onConflict: 'sub_category_id,plan_month' }
      );

    if (insertError) {
      console.error('cloneBudgetAllocations insert error:', insertError);
      return { success: false, error: 'Failed to clone allocations' };
    }

    // Clone income transactions into target month
    // First delete any existing income transactions for this target month to prevent duplicates
    let totalIncome = 0;
    if (incomeResult.success && incomeResult.incomeItems.length > 0) {
      // Calculate first day of NEXT month as upper bound (avoids invalid dates like Apr-31)
      const [yr, mo] = targetMonth.split('-').map(Number);
      const nextMonthFirst = `${mo === 12 ? yr + 1 : yr}-${String(mo === 12 ? 1 : mo + 1).padStart(2, '0')}-01`;
      await supabase
        .from('transactions')
        .delete()
        .eq('household_id', householdId)
        .eq('transaction_type', 'income')
        .gte('transaction_date', targetPlanMonth)
        .lt('transaction_date', nextMonthFirst);

      const incomeInserts = incomeResult.incomeItems.map(item => ({
        household_id: householdId,
        sub_category_id: item.subCategoryId,
        amount: item.amount,
        transaction_type: 'income' as const,
        transaction_date: targetPlanMonth, // 1st of target month
        payment_method: 'other' as const,
        logged_by: item.loggedBy,
        remarks: null,
        source: 'manual' as const,
      }));

      const { error: incomeInsertError } = await supabase
        .from('transactions')
        .insert(incomeInserts);

      if (incomeInsertError) {
        console.error('cloneBudgetAllocations income insert error:', incomeInsertError);
        // Don't fail the whole clone — expenses were already cloned
      } else {
        totalIncome = incomeResult.incomeItems.reduce((sum, item) => sum + item.amount, 0);
      }
    }

    // Create draft plan for target month
    const totalAllocated = sourceAllocations.reduce((sum, a) => sum + (a.monthly_amount || 0), 0);
    await upsertMonthlyPlan(householdId, targetPlanMonth, totalIncome, totalAllocated);

    return { success: true };
  } catch (e) {
    console.error('cloneBudgetAllocations error:', e);
    return { success: false, error: 'Failed to clone budget' };
  }
}

/**
 * Get all months that have a frozen plan (for clone source dropdown).
 * Returns in descending order (newest first).
 */
export async function getPlannedMonths(
  householdId: string
): Promise<{ success: boolean; error?: string; months?: { value: string; label: string }[] }> {
  try {
    const { data, error } = await supabase
      .from('monthly_plans')
      .select('plan_month, status')
      .eq('household_id', householdId)
      .eq('status', 'frozen')
      .order('plan_month', { ascending: false });

    if (error) {
      console.error('getPlannedMonths error:', error);
      return { success: false, error: 'Failed to load planned months' };
    }

    const months = (data || []).map(d => {
      const monthStr = d.plan_month.substring(0, 7); // YYYY-MM
      const date = new Date(d.plan_month);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { value: monthStr, label };
    });

    return { success: true, months };
  } catch (e) {
    console.error('getPlannedMonths error:', e);
    return { success: false, error: 'Failed to load planned months' };
  }
}

/**
 * Get first day of current month as ISO string
 */
export function getCurrentPlanMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

