/**
 * Merchant Matcher Service
 *
 * Matches bank narrations to household sub-categories using the master rule set.
 *
 * Logic:
 * 1. Check each rule's keywords against the narration (case-insensitive).
 * 2. If a keyword matches, look up the rule's subCategoryName in the household's sub-categories.
 * 3. If the household HAS that sub-category → suggest it.
 * 4. If the household does NOT have it → return unmatched (user requirement).
 * 5. If no keyword matches → return unmatched.
 */

import { MERCHANT_RULES } from '../data/merchantRules';
import type { HouseholdSubCategory, TransactionType } from '../../budget/types';

export interface MatchResult {
  subCategoryId: string | null;
  subCategoryName: string | null;
  categoryName: string | null;
  confidence: 'high' | 'medium' | 'none';
  transactionType: TransactionType;
}

/**
 * Match a bank narration to a household sub-category.
 */
export function matchMerchant(
  narration: string,
  householdSubCategories: HouseholdSubCategory[],
  categoryMap: Map<string, { name: string; type: string }>
): MatchResult {
  const narrationLower = narration.toLowerCase();

  for (const rule of MERCHANT_RULES) {
    const matched = rule.keywords.some(kw => narrationLower.includes(kw.toLowerCase()));
    if (!matched) continue;

    // Found a keyword match. Now check if the household has this sub-category.
    const subCat = householdSubCategories.find(
      sc => sc.name.toLowerCase() === rule.subCategoryName.toLowerCase()
    );

    if (subCat) {
      // Determine transaction type from the category system
      const cat = categoryMap.get(subCat.category_id);
      const txnType: TransactionType = cat?.type === 'income' ? 'income' : 'expense';

      return {
        subCategoryId: subCat.id,
        subCategoryName: subCat.name,
        categoryName: cat?.name || null,
        confidence: rule.confidence,
        transactionType: txnType,
      };
    } else {
      // Keyword matched but sub-category doesn't exist in household → leave uncategorized
      return {
        subCategoryId: null,
        subCategoryName: null,
        categoryName: null,
        confidence: 'none',
        transactionType: rule.transactionType as TransactionType,
      };
    }
  }

  // No keyword matched at all
  return {
    subCategoryId: null,
    subCategoryName: null,
    categoryName: null,
    confidence: 'none',
    transactionType: 'expense', // Default assumption per user requirement
  };
}
