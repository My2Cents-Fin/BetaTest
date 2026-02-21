/**
 * Statement Import Service
 *
 * Orchestrates the full import flow:
 * 1. Parse the file (PDF, CSV, or Excel)
 * 2. Apply merchant matching
 * 3. Detect duplicates
 * 4. Bulk insert into transactions table
 */

import { supabase } from '../../../lib/supabase';
import { parsePDF } from './pdfParser';
import { parseCSV } from './csvParser';
import { parseExcel } from './excelParser';
import { matchMerchant } from './merchantMatcher';
import type {
  ParsedStatementTransaction,
  StatementParseResult,
  ImportCandidate,
  HouseholdSubCategory,
  TransactionType,
} from '../../budget/types';

// ============================================
// Step 1: Parse File
// ============================================

/**
 * Parse a statement file (PDF, CSV, or Excel).
 * Auto-detects format from file extension.
 */
export async function parseStatementFile(
  file: File,
  password?: string
): Promise<StatementParseResult> {
  const extension = file.name.toLowerCase().split('.').pop();

  if (extension === 'pdf') {
    return parsePDF(file, password);
  } else if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    return {
      success: false,
      error: `Unsupported file type: .${extension}. Please upload a PDF, CSV, or Excel file.`,
    };
  }
}

// ============================================
// Step 2: Prepare Import Candidates
// ============================================

/**
 * Apply merchant matching and duplicate detection to parsed transactions.
 */
export async function prepareImportCandidates(
  parsedTransactions: ParsedStatementTransaction[],
  householdId: string,
  householdSubCategories: HouseholdSubCategory[],
  categoryMap: Map<string, { name: string; type: string }>
): Promise<ImportCandidate[]> {
  // Fetch existing transactions for the date range to detect duplicates
  const dates = parsedTransactions.map(t => t.date).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const { data: existingTxns } = await supabase
    .from('transactions')
    .select('transaction_date, amount, original_narration')
    .eq('household_id', householdId)
    .gte('transaction_date', minDate)
    .lte('transaction_date', maxDate);

  // Build a Set for fast duplicate lookup
  const existingSet = new Set(
    (existingTxns || []).map(t =>
      `${t.transaction_date}|${t.amount}|${(t.original_narration || '').toLowerCase().trim()}`
    )
  );

  return parsedTransactions.map((pt, index) => {
    // Apply merchant matching
    const match = matchMerchant(pt.narration, householdSubCategories, categoryMap);

    // Check for duplicates (same date + amount + narration)
    const dupeKey = `${pt.date}|${pt.amount}|${pt.narration.toLowerCase().trim()}`;
    const isDuplicate = existingSet.has(dupeKey);

    return {
      ...pt,
      index,
      suggestedSubCategoryId: match.subCategoryId,
      suggestedSubCategoryName: match.subCategoryName,
      suggestedCategoryName: match.categoryName,
      matchConfidence: match.confidence,
      transactionType: match.subCategoryId ? match.transactionType : pt.transactionType,
      isDuplicate,
      selected: !isDuplicate, // Duplicates deselected by default
      userOverrideSubCategoryId: null,
      userOverrideTransactionType: (match.subCategoryId ? match.transactionType : pt.transactionType) as TransactionType,
    };
  });
}

// ============================================
// Step 3: Commit Import
// ============================================

/**
 * Bulk insert selected import candidates as transactions.
 */
export async function commitImport(
  candidates: ImportCandidate[],
  householdId: string,
  loggedBy: string
): Promise<{ success: boolean; error?: string; importedCount: number }> {
  const selected = candidates.filter(c => c.selected);

  if (selected.length === 0) {
    return { success: false, error: 'No transactions selected for import.', importedCount: 0 };
  }

  // Build insert rows
  const rows = selected.map(c => ({
    household_id: householdId,
    sub_category_id: c.userOverrideSubCategoryId || c.suggestedSubCategoryId || null,
    amount: c.amount,
    transaction_type: c.userOverrideTransactionType || c.transactionType,
    transaction_date: c.date,
    payment_method: 'other' as const, // Bank statement — unknown payment method
    remarks: null,
    logged_by: loggedBy,
    source: 'csv_import' as const,
    original_narration: c.narration,
  }));

  // Insert in batches of 50 to avoid Supabase payload limits
  const BATCH_SIZE = 50;
  let totalImported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('transactions')
      .insert(batch);

    if (error) {
      console.error('[commitImport] Batch insert error:', error);
      return {
        success: false,
        error: `Import failed at row ${i + 1}: ${error.message}`,
        importedCount: totalImported,
      };
    }

    totalImported += batch.length;
  }

  return { success: true, importedCount: totalImported };
}
