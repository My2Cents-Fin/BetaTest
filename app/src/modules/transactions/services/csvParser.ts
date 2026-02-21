/**
 * CSV Statement Parser
 *
 * Uses papaparse for CSV parsing with auto-detection of Indian bank formats.
 * Supports:
 * - Bank-specific (tested): ICICI, Axis
 * - Generic fallback (column keyword detection): all other banks
 * - Commented out (untested): HDFC, SBI, Kotak — uncomment after real statement validation
 */

import Papa from 'papaparse';
import type { ParsedStatementTransaction, StatementParseResult } from '../../budget/types';

// ============================================
// Types
// ============================================

interface BankCSVFormat {
  name: string;
  detect: (headers: string[]) => boolean;
  parseRow: (row: Record<string, string>) => ParsedStatementTransaction | null;
}

// ============================================
// Date Parsing
// ============================================

function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;
  const clean = dateStr.trim();

  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  };

  // DD/MM/YY or DD/MM/YYYY or DD-MM-YYYY
  let match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY or DD/MMM/YYYY or DD MMM YYYY (e.g., 15-Jan-2025, 05 Feb 2026)
  match = clean.match(/^(\d{1,2})[\/\- ](\w{3,9})[\/\-, ]+(\d{2,4})$/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = months[match[2].toLowerCase()] || months[match[2].toLowerCase().substring(0, 3)];
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    if (monthStr) return `${year}-${monthStr}-${day}`;
  }

  // YYYY-MM-DD (ISO format)
  match = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // MMM DD, YYYY or MMM DD YYYY (e.g., Feb 05, 2026)
  match = clean.match(/^(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (match) {
    const monthStr = months[match[1].toLowerCase()] || months[match[1].toLowerCase().substring(0, 3)];
    const day = match[2].padStart(2, '0');
    const year = match[3];
    if (monthStr) return `${year}-${monthStr}-${day}`;
  }

  // DD/MM/YYYY with time (e.g., 05/02/2026 12:30:00) — strip time part
  match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+\d{1,2}:\d{2}/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseAmount(amountStr: string): number {
  if (!amountStr || !amountStr.trim()) return 0;
  const clean = amountStr.replace(/[,\s₹INR"]/g, '').replace(/\(|\)/g, '').replace(/(Cr|Dr)\.?$/i, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

/**
 * Find a column value by checking multiple possible header names (case-insensitive)
 */
function findColumn(row: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().trim().includes(name.toLowerCase())) {
        return row[key] || '';
      }
    }
  }
  return '';
}

// ============================================
// Bank Format Definitions
// ============================================

// ── HDFC Bank CSV parser — COMMENTED OUT (untested with real statements) ──
// Uncomment after testing with a real HDFC bank CSV export.
// const HDFC_CSV: BankCSVFormat = {
//   name: 'HDFC Bank',
//   detect: (headers) => {
//     const joined = headers.join(' ').toLowerCase();
//     return (joined.includes('narration') || joined.includes('transaction remarks')) &&
//            (joined.includes('withdrawal') || joined.includes('debit'));
//   },
//   parseRow: (row) => {
//     const dateStr = findColumn(row, ['date']);
//     const date = parseDate(dateStr);
//     if (!date) return null;
//     const narration = findColumn(row, ['narration', 'transaction remarks', 'description']);
//     const withdrawal = parseAmount(findColumn(row, ['withdrawal', 'debit amount', 'debit']));
//     const deposit = parseAmount(findColumn(row, ['deposit', 'credit amount', 'credit']));
//     const balance = parseAmount(findColumn(row, ['closing balance', 'balance']));
//     if (withdrawal === 0 && deposit === 0) return null;
//     return {
//       date,
//       narration: narration.trim() || 'Transaction',
//       amount: withdrawal > 0 ? withdrawal : deposit,
//       transactionType: withdrawal > 0 ? 'expense' : 'income',
//       balance: balance || undefined,
//     };
//   },
// };

const ICICI_CSV: BankCSVFormat = {
  name: 'ICICI Bank',
  detect: (headers) => {
    const joined = headers.join(' ').toLowerCase();
    return (joined.includes('transaction remarks') || joined.includes('remarks')) &&
           (joined.includes('withdrawal amount') || joined.includes('withdrawal'));
  },
  parseRow: (row) => {
    const dateStr = findColumn(row, ['transaction date', 'value date', 'date']);
    const date = parseDate(dateStr);
    if (!date) return null;

    const narration = findColumn(row, ['transaction remarks', 'remarks', 'description']);
    const withdrawal = parseAmount(findColumn(row, ['withdrawal amount', 'withdrawal', 'debit']));
    const deposit = parseAmount(findColumn(row, ['deposit amount', 'deposit', 'credit']));
    const balance = parseAmount(findColumn(row, ['balance']));

    if (withdrawal === 0 && deposit === 0) return null;

    return {
      date,
      narration: narration.trim() || 'Transaction',
      amount: withdrawal > 0 ? withdrawal : deposit,
      transactionType: withdrawal > 0 ? 'expense' : 'income',
      balance: balance || undefined,
    };
  },
};

// ── SBI CSV parser — COMMENTED OUT (untested with real statements) ──
// Uncomment after testing with a real SBI bank CSV export.
// const SBI_CSV: BankCSVFormat = {
//   name: 'SBI',
//   detect: (headers) => {
//     const joined = headers.join(' ').toLowerCase();
//     return (joined.includes('txn date') || joined.includes('transaction date')) &&
//            (joined.includes('description') || joined.includes('particulars'));
//   },
//   parseRow: (row) => {
//     const dateStr = findColumn(row, ['txn date', 'transaction date', 'date']);
//     const date = parseDate(dateStr);
//     if (!date) return null;
//     const narration = findColumn(row, ['description', 'particulars', 'narration']);
//     const debit = parseAmount(findColumn(row, ['debit', 'withdrawal']));
//     const credit = parseAmount(findColumn(row, ['credit', 'deposit']));
//     const balance = parseAmount(findColumn(row, ['balance']));
//     if (debit === 0 && credit === 0) return null;
//     return {
//       date,
//       narration: narration.trim() || 'Transaction',
//       amount: debit > 0 ? debit : credit,
//       transactionType: debit > 0 ? 'expense' : 'income',
//       balance: balance || undefined,
//     };
//   },
// };

// ── Kotak CSV parser — COMMENTED OUT (untested with real statements) ──
// Uncomment after testing with a real Kotak Mahindra bank CSV export.
// const KOTAK_CSV: BankCSVFormat = {
//   name: 'Kotak Mahindra Bank',
//   detect: (headers) => {
//     const joined = headers.join(' ').toLowerCase();
//     return joined.includes('sl. no') || joined.includes('kotak') ||
//            (joined.includes('description') && joined.includes('dr') && joined.includes('cr'));
//   },
//   parseRow: (row) => {
//     const dateStr = findColumn(row, ['date', 'transaction date', 'txn date']);
//     const date = parseDate(dateStr);
//     if (!date) return null;
//     const narration = findColumn(row, ['description', 'narration', 'particulars']);
//     const debit = parseAmount(findColumn(row, ['dr', 'debit', 'withdrawal']));
//     const credit = parseAmount(findColumn(row, ['cr', 'credit', 'deposit']));
//     const balance = parseAmount(findColumn(row, ['balance', 'closing']));
//     if (debit === 0 && credit === 0) return null;
//     return {
//       date,
//       narration: narration.trim() || 'Transaction',
//       amount: debit > 0 ? debit : credit,
//       transactionType: debit > 0 ? 'expense' : 'income',
//       balance: balance || undefined,
//     };
//   },
// };

const AXIS_CSV: BankCSVFormat = {
  name: 'Axis Bank',
  detect: (headers) => {
    const joined = headers.join(' ').toLowerCase();
    return joined.includes('tran date') ||
           (joined.includes('particulars') && joined.includes('debit') && joined.includes('credit'));
  },
  parseRow: (row) => {
    const dateStr = findColumn(row, ['tran date', 'transaction date', 'date']);
    const date = parseDate(dateStr);
    if (!date) return null;

    const narration = findColumn(row, ['particulars', 'description', 'narration']);
    const debit = parseAmount(findColumn(row, ['debit', 'withdrawal']));
    const credit = parseAmount(findColumn(row, ['credit', 'deposit']));
    const balance = parseAmount(findColumn(row, ['balance', 'init.']));

    if (debit === 0 && credit === 0) return null;

    return {
      date,
      narration: narration.trim() || 'Transaction',
      amount: debit > 0 ? debit : credit,
      transactionType: debit > 0 ? 'expense' : 'income',
      balance: balance || undefined,
    };
  },
};

// Generic fallback: try to match any CSV with date + amount columns
const GENERIC_CSV: BankCSVFormat = {
  name: 'Unknown Bank',
  detect: () => true,
  parseRow: (row) => {
    const keys = Object.keys(row);
    let date = '';
    let narration = '';

    // Find date column
    for (const key of keys) {
      const parsed = parseDate(row[key]);
      if (parsed) {
        date = parsed;
        break;
      }
    }
    if (!date) return null;

    // Find narration (longest non-date, non-number value)
    for (const key of keys) {
      const val = row[key]?.trim();
      if (val && val.length > narration.length && !parseDate(val) && parseAmount(val) === 0) {
        narration = val;
      }
    }

    // Try to detect debit/credit from header names
    let debit = 0;
    let credit = 0;
    const debitKeywords = ['debit', 'withdrawal', 'dr', 'paid', 'expense'];
    const creditKeywords = ['credit', 'deposit', 'cr', 'received', 'income'];

    for (const key of keys) {
      const keyLower = key.toLowerCase().trim();
      const amt = parseAmount(row[key]);
      if (amt > 0) {
        if (debitKeywords.some(kw => keyLower.includes(kw))) {
          debit = amt;
        } else if (creditKeywords.some(kw => keyLower.includes(kw))) {
          credit = amt;
        }
      }
    }

    // If header-based detection didn't find amounts, collect all non-zero amounts by position
    if (debit === 0 && credit === 0) {
      const amountEntries: { key: string; amt: number }[] = [];
      for (const key of keys) {
        const amt = parseAmount(row[key]);
        if (amt > 0) amountEntries.push({ key, amt });
      }

      if (amountEntries.length === 1) {
        // Single amount column — can't distinguish, default to expense
        debit = amountEntries[0].amt;
      } else if (amountEntries.length >= 2) {
        // Two amount columns — convention: first is debit, second is credit
        // (most banks: withdrawal before deposit). Only one will be non-zero per row.
        debit = amountEntries[0].amt;
        credit = amountEntries[1].amt;
      }
    }

    if ((debit === 0 && credit === 0) || !narration) return null;

    return {
      date,
      narration,
      amount: debit > 0 ? debit : credit,
      transactionType: debit > 0 ? 'expense' : 'income',
    };
  },
};

// Only include bank-specific parsers that have been tested with real statements.
// Untested parsers (HDFC, SBI, Kotak) are commented out above — enable after real validation.
// All other CSV formats fall through to GENERIC_CSV which matches by column keyword detection.
const BANK_CSV_FORMATS: BankCSVFormat[] = [
  ICICI_CSV, AXIS_CSV, GENERIC_CSV,
];

// ============================================
// Main Parse Function
// ============================================

/**
 * Parse a CSV bank statement file.
 * Auto-detects bank format from headers.
 */
export async function parseCSV(file: File): Promise<StatementParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          resolve({ success: false, error: 'CSV file is empty or could not be parsed.' });
          return;
        }

        const headers = results.meta.fields || [];
        const format = BANK_CSV_FORMATS.find(f => f.detect(headers));

        if (!format) {
          resolve({
            success: false,
            error: 'Could not recognize the CSV format. The generic parser should handle most bank CSV exports.',
          });
          return;
        }

        const transactions: ParsedStatementTransaction[] = [];
        const debugInfo = { totalRows: 0, noDate: 0, noAmount: 0, noNarration: 0, sampleDates: [] as string[] };
        for (const row of results.data as Record<string, string>[]) {
          debugInfo.totalRows++;
          const parsed = format.parseRow(row);
          if (parsed) {
            transactions.push(parsed);
          } else if (debugInfo.totalRows <= 5) {
            // Capture debug info from first 5 failed rows
            const vals = Object.entries(row);
            for (const [key, val] of vals) {
              if (val && parseDate(val)) break;
              if (val && debugInfo.sampleDates.length < 3) {
                // Collect values that look like they could be dates (non-empty, short)
                if (val.trim().length > 0 && val.trim().length <= 20 && /\d/.test(val)) {
                  debugInfo.sampleDates.push(`${key}: "${val.trim()}"`);
                }
              }
            }
          }
        }

        if (transactions.length === 0) {
          // Build a helpful error with diagnostic info
          const sample = debugInfo.sampleDates.length > 0
            ? ` Sample values from first rows: ${debugInfo.sampleDates.join(', ')}.`
            : '';
          const headerList = headers.slice(0, 8).join(', ');
          console.warn(`[CSV Parser] Failed to parse. Bank: ${format.name}, Headers: [${headerList}], Rows: ${debugInfo.totalRows}.${sample}`);
          resolve({
            success: false,
            error: `Recognized as ${format.name} CSV but could not parse any transactions. Headers found: ${headerList}. The date format or column layout may not be supported yet.`,
          });
          return;
        }

        resolve({
          success: true,
          transactions,
          bankName: format.name,
        });
      },
      error: (error) => {
        resolve({ success: false, error: `Failed to parse CSV: ${error.message}` });
      },
    });
  });
}
