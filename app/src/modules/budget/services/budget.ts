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

    // Fetch system categories
    const { data: systemCategories } = await supabase
      .from('categories')
      .select('id, name, type, icon')
      .in('id', categoryIds);

    // Fetch custom categories
    const { data: customCategories } = await supabase
      .from('household_categories')
      .select('id, name, type, icon')
      .in('id', categoryIds)
      .eq('household_id', householdId);

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
    // Get system categories
    const { data: systemCategories, error: systemError } = await supabase
      .from('categories')
      .select('id, name, type, icon')
      .order('display_order');

    if (systemError) {
      console.error('getCategoryList error:', systemError);
      return { success: false, error: 'Failed to load categories' };
    }

    const categories: { id: string; name: string; type: string; icon: string; isCustom?: boolean }[] =
      (systemCategories || []).map(c => ({ ...c, isCustom: false }));

    // If householdId provided, also get custom categories
    if (householdId) {
      const { data: customCategories, error: customError } = await supabase
        .from('household_categories')
        .select('id, name, type, icon')
        .eq('household_id', householdId)
        .order('display_order');

      if (!customError && customCategories) {
        categories.push(...customCategories.map(c => ({ ...c, isCustom: true })));
      }
    }

    return { success: true, categories };
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
// Incremental Progress Save/Load (for sign-out resume)
// ============================================

/**
 * Save income progress (selections + allocations)
 * Called when user navigates away or signs out
 */
export async function saveIncomeProgress(
  householdId: string,
  incomeItems: {
    id: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
    amount: number;
    period: Period;
  }[]
): Promise<ServiceResult> {
  const planMonth = getCurrentPlanMonth();

  try {
    // First, delete existing sub-categories for this household
    // During onboarding we only have income items
    await supabase
      .from('household_sub_categories')
      .delete()
      .eq('household_id', householdId);

    if (incomeItems.length === 0) {
      return { success: true };
    }

    // Insert sub-categories (category_id is nullable for now during onboarding)
    const { data: savedSubCats, error: insertError } = await supabase
      .from('household_sub_categories')
      .insert(
        incomeItems.map((item, index) => ({
          household_id: householdId,
          name: item.name,
          icon: item.icon,
          is_custom: item.isCustom,
          display_order: index,
        }))
      )
      .select('id, name');

    if (insertError || !savedSubCats) {
      console.error('Insert sub-categories error:', insertError);
      // Table might not exist - just return success to not block the user
      return { success: true };
    }

    // Delete existing allocations for these sub-categories
    const subCatIds = savedSubCats.map(sc => sc.id);
    if (subCatIds.length > 0) {
      await supabase
        .from('budget_allocations')
        .delete()
        .in('sub_category_id', subCatIds);
    }

    // Insert allocations for items with amounts
    const allocationsToSave = incomeItems
      .filter(item => item.amount > 0)
      .map(item => {
        const savedSubCat = savedSubCats.find(sc => sc.name === item.name);
        if (!savedSubCat) return null;
        return {
          household_id: householdId,
          sub_category_id: savedSubCat.id,
          amount: item.amount,
          period: item.period,
          monthly_amount: calculateMonthlyAmount(item.amount, item.period),
          plan_month: planMonth,
        };
      })
      .filter(Boolean);

    if (allocationsToSave.length > 0) {
      const { error: allocError } = await supabase
        .from('budget_allocations')
        .insert(allocationsToSave);

      if (allocError) {
        console.error('Save allocations error:', allocError);
        // Don't fail - sub-categories are saved
      }
    }

    return { success: true };
  } catch (e) {
    console.error('saveIncomeProgress error:', e);
    return { success: false, error: 'Failed to save progress' };
  }
}

/**
 * Load saved income progress
 */
export async function loadIncomeProgress(
  householdId: string
): Promise<{
  success: boolean;
  error?: string;
  incomeItems?: {
    id: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
    amount: number;
    period: Period;
  }[];
}> {
  const planMonth = getCurrentPlanMonth();

  try {
    // Get income sub-categories with allocations
    // Note: During onboarding, we only have income items, so we get all sub-categories
    // In the future, we should join with categories table to filter by type='income'
    const { data: subCats, error: subCatError } = await supabase
      .from('household_sub_categories')
      .select(`
        id,
        name,
        icon,
        is_custom,
        display_order
      `)
      .eq('household_id', householdId)
      .order('display_order');

    if (subCatError) {
      console.error('Load sub-categories error:', subCatError);
      // Table might not exist - return empty success
      return { success: true, incomeItems: [] };
    }

    if (!subCats || subCats.length === 0) {
      return { success: true, incomeItems: [] };
    }

    // Get allocations for these sub-categories
    const subCatIds = subCats.map(sc => sc.id);
    const { data: allocations, error: allocError } = await supabase
      .from('budget_allocations')
      .select('sub_category_id, amount, period')
      .in('sub_category_id', subCatIds)
      .eq('plan_month', planMonth);

    if (allocError) {
      console.error('Load allocations error:', allocError);
      // Don't fail - return sub-cats without amounts
    }

    // Build income items
    const incomeItems = subCats.map(sc => {
      const allocation = allocations?.find(a => a.sub_category_id === sc.id);
      return {
        id: sc.is_custom ? `custom-${sc.id}` : sc.id,
        name: sc.name,
        icon: sc.icon,
        isCustom: sc.is_custom,
        amount: allocation?.amount || 0,
        period: (allocation?.period as Period) || 'monthly',
      };
    });

    return { success: true, incomeItems };
  } catch (e) {
    console.error('loadIncomeProgress error:', e);
    return { success: false, error: 'Failed to load progress' };
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
): Promise<{ success: boolean; error?: string; actuals?: Map<string, number> }> {
  try {
    const startDate = `${month}-01`;
    const endDate = getLastDayOfMonth(month);

    const { data, error } = await supabase
      .from('transactions')
      .select('sub_category_id, amount')
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

    return { success: true, actuals };
  } catch (e) {
    console.error('getActualsBySubCategory error:', e);
    return { success: false, error: 'Failed to load actuals' };
  }
}

/**
 * Get budget data for view mode (allocations + actuals)
 */
export async function getBudgetViewData(
  householdId: string,
  month: string // Format: YYYY-MM
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
}> {
  try {
    const planMonth = `${month}-01`;

    // Get monthly plan
    const { data: plan, error: planError } = await supabase
      .from('monthly_plans')
      .select('*')
      .eq('household_id', householdId)
      .eq('plan_month', planMonth)
      .single();

    if (planError && planError.code !== 'PGRST116') {
      console.error('getBudgetViewData plan error:', planError);
      return { success: false, error: 'Failed to load budget' };
    }

    // Get allocations with sub-category and category info
    const { data: allocations, error: allocError } = await supabase
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
      .eq('plan_month', planMonth);

    if (allocError) {
      console.error('getBudgetViewData allocations error:', allocError);
      return { success: false, error: 'Failed to load budget items' };
    }

    // Get actuals
    const actualsResult = await getActualsBySubCategory(householdId, month);
    const actuals = actualsResult.actuals || new Map();

    // Transform data
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
      .sort((a, b) => {
        // Sort by category display order, then by item display order
        if (a.categoryDisplayOrder !== b.categoryDisplayOrder) {
          return a.categoryDisplayOrder - b.categoryDisplayOrder;
        }
        return a.displayOrder - b.displayOrder;
      });

    return {
      success: true,
      plan: plan as MonthlyPlan | undefined,
      items,
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
 * Get first day of current month as ISO string
 */
export function getCurrentPlanMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

/**
 * Complete budget setup (called after review screen)
 * Saves all data and marks onboarding complete
 */
export async function completeBudgetSetup(
  householdId: string,
  incomeSelections: {
    categoryId: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
    displayOrder: number;
  }[],
  expenseSelections: {
    categoryId: string;
    name: string;
    icon: string | null;
    isCustom: boolean;
    displayOrder: number;
  }[],
  incomeAllocations: Map<string, { amount: number; period: Period }>,
  expenseAllocations: Map<string, { amount: number; period: Period }>
): Promise<ServiceResult> {
  const planMonth = getCurrentPlanMonth();

  try {
    // 1. Save income sub-categories
    const allSelections = [...incomeSelections, ...expenseSelections];

    const { error: subCatError } = await supabase
      .from('household_sub_categories')
      .insert(
        allSelections.map((s, index) => ({
          household_id: householdId,
          category_id: s.categoryId,
          name: s.name,
          icon: s.icon,
          is_custom: s.isCustom,
          display_order: s.displayOrder ?? index,
        }))
      )
      .select();

    if (subCatError) {
      console.error('Save sub-categories error:', subCatError);
      return { success: false, error: 'Failed to save categories' };
    }

    // 2. Get the saved sub-categories to get their IDs
    const { data: savedSubCats, error: fetchError } = await supabase
      .from('household_sub_categories')
      .select('id, name, category_id')
      .eq('household_id', householdId);

    if (fetchError || !savedSubCats) {
      console.error('Fetch sub-categories error:', fetchError);
      return { success: false, error: 'Failed to save allocations' };
    }

    // 3. Map template names to saved IDs and save allocations
    const allAllocations: {
      household_id: string;
      sub_category_id: string;
      amount: number;
      period: Period;
      monthly_amount: number;
      plan_month: string;
    }[] = [];

    // Match by name to find the saved sub-category ID
    const findSubCatId = (name: string): string | undefined => {
      return savedSubCats.find(sc => sc.name === name)?.id;
    };

    // Process income allocations
    for (const selection of incomeSelections) {
      const allocation = incomeAllocations.get(selection.name);
      if (allocation && allocation.amount > 0) {
        const subCatId = findSubCatId(selection.name);
        if (subCatId) {
          allAllocations.push({
            household_id: householdId,
            sub_category_id: subCatId,
            amount: allocation.amount,
            period: allocation.period,
            monthly_amount: calculateMonthlyAmount(allocation.amount, allocation.period),
            plan_month: planMonth,
          });
        }
      }
    }

    // Process expense allocations
    for (const selection of expenseSelections) {
      const allocation = expenseAllocations.get(selection.name);
      if (allocation && allocation.amount > 0) {
        const subCatId = findSubCatId(selection.name);
        if (subCatId) {
          allAllocations.push({
            household_id: householdId,
            sub_category_id: subCatId,
            amount: allocation.amount,
            period: allocation.period,
            monthly_amount: calculateMonthlyAmount(allocation.amount, allocation.period),
            plan_month: planMonth,
          });
        }
      }
    }

    // 4. Save allocations
    if (allAllocations.length > 0) {
      const { error: allocError } = await supabase
        .from('budget_allocations')
        .insert(allAllocations);

      if (allocError) {
        console.error('Save allocations error:', allocError);
        return { success: false, error: 'Failed to save amounts' };
      }
    }

    // 5. Calculate totals and create monthly plan
    const totalIncome = allAllocations
      .filter(a => {
        const subCat = savedSubCats.find(sc => sc.id === a.sub_category_id);
        return subCat && incomeSelections.some(s => s.name === subCat.name);
      })
      .reduce((sum, a) => sum + a.monthly_amount, 0);

    const totalExpenses = allAllocations
      .filter(a => {
        const subCat = savedSubCats.find(sc => sc.id === a.sub_category_id);
        return subCat && expenseSelections.some(s => s.name === subCat.name);
      })
      .reduce((sum, a) => sum + a.monthly_amount, 0);

    const { error: planError } = await supabase
      .from('monthly_plans')
      .insert({
        household_id: householdId,
        plan_month: planMonth,
        total_income: totalIncome,
        total_allocated: totalExpenses,
        status: 'draft',
      });

    if (planError) {
      console.error('Create plan error:', planError);
      // Don't fail - plan can be created later
    }

    // 6. Mark onboarding complete
    const { error: authError } = await supabase.auth.updateUser({
      data: { onboarding_complete: true },
    });

    if (authError) {
      console.error('Update auth error:', authError);
      // Don't fail - budget is saved
    }

    return { success: true };
  } catch (e) {
    console.error('completeBudgetSetup error:', e);
    return { success: false, error: 'Failed to save budget' };
  }
}
