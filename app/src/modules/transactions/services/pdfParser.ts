/**
 * PDF Statement Parser
 *
 * Uses pdfjs-dist to extract text with coordinates from bank statement PDFs,
 * then reconstructs tables using Y-coordinate grouping and X-coordinate column detection.
 *
 * Supports Indian bank statement formats: HDFC, ICICI, SBI, Kotak, Axis.
 */

import type { ParsedStatementTransaction, StatementParseResult } from '../../budget/types';

// ============================================
// Types
// ============================================

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  page: number;
}

interface TableRow {
  cells: string[];
  y: number;
}

interface BankPDFFormat {
  name: string;
  detect: (allText: string) => boolean;
  parseRows: (rows: TableRow[], columnBoundaries: number[]) => ParsedStatementTransaction[];
  getColumnHeaders: () => string[];
}

// ============================================
// PDF.js Loading (Lazy)
// ============================================

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  // Dynamic import for code splitting
  pdfjsLib = await import('pdfjs-dist');

  // Set worker source — use CDN for the worker to avoid bundling issues
  const version = pdfjsLib.version || '4.9.155';
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;

  return pdfjsLib;
}

// ============================================
// Text Extraction
// ============================================

async function extractTextItems(
  fileBuffer: ArrayBuffer,
  password?: string
): Promise<{ items: TextItem[]; fullText: string }> {
  const pdfjs = await loadPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: fileBuffer,
    password: password || undefined,
  });

  const pdf = await loadingTask.promise;
  const allItems: TextItem[] = [];
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        allItems.push({
          text: item.str,
          x: Math.round(item.transform[4] * 100) / 100,
          y: Math.round(item.transform[5] * 100) / 100,
          width: item.width || 0,
          page: pageNum,
        });
        fullText += item.str + ' ';
      }
    }
  }

  return { items: allItems, fullText };
}

// ============================================
// Table Reconstruction
// ============================================

/**
 * Group text items into rows by Y-coordinate proximity
 */
function groupIntoRows(items: TextItem[], yTolerance: number = 3): TextItem[][] {
  if (items.length === 0) return [];

  // Sort by page first, then by Y descending (PDF y=0 is bottom)
  const sorted = [...items].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return b.y - a.y; // Higher Y = higher on page
  });

  const rows: TextItem[][] = [];
  let currentRow: TextItem[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prevItem = currentRow[0];

    // Same row if same page and Y is close
    if (item.page === prevItem.page && Math.abs(item.y - prevItem.y) <= yTolerance) {
      currentRow.push(item);
    } else {
      // Sort current row by X (left to right)
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = [item];
    }
  }

  // Don't forget the last row
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Detect column boundaries from row data
 * Uses the header row to establish column X-positions
 */
function detectColumnBoundaries(rows: TextItem[][], headerKeywords: string[]): number[] {
  // Find the header row by looking for rows that contain header keywords
  for (const row of rows) {
    const rowText = row.map(item => item.text.toLowerCase()).join(' ');
    const matchCount = headerKeywords.filter(kw => rowText.includes(kw.toLowerCase())).length;

    if (matchCount >= 3) {
      // This is likely the header row — use X positions as column boundaries
      return row.map(item => item.x);
    }
  }

  return [];
}

/**
 * Map text items to column cells using column boundaries
 */
function mapToColumns(row: TextItem[], columnBoundaries: number[], tolerance: number = 15): string[] {
  const cells: string[] = new Array(columnBoundaries.length).fill('');

  for (const item of row) {
    // Find the closest column boundary
    let bestCol = 0;
    let bestDist = Math.abs(item.x - columnBoundaries[0]);

    for (let c = 1; c < columnBoundaries.length; c++) {
      const dist = Math.abs(item.x - columnBoundaries[c]);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = c;
      }
    }

    // Append text to the matching column cell (some cells may have multiple text items)
    if (bestDist <= tolerance * 3) {
      cells[bestCol] = cells[bestCol] ? cells[bestCol] + ' ' + item.text : item.text;
    }
  }

  return cells;
}

/**
 * Convert grouped rows into table rows with column mapping
 */
function buildTable(rows: TextItem[][], columnBoundaries: number[]): TableRow[] {
  if (columnBoundaries.length === 0) return [];

  const tableRows: TableRow[] = [];

  for (const row of rows) {
    const cells = mapToColumns(row, columnBoundaries);
    // Only include rows that have at least some content
    if (cells.some(c => c.trim())) {
      tableRows.push({
        cells,
        y: row[0]?.y || 0,
      });
    }
  }

  return tableRows;
}

// ============================================
// Date Parsing Utilities
// ============================================

function parseDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.trim()) return null;

  const clean = dateStr.trim();

  // DD/MM/YY or DD/MM/YYYY
  let match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY (e.g., 15-Jan-2025)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  match = clean.match(/^(\d{1,2})[\/\- ](\w{3})[\/\- ](\d{2,4})$/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = months[match[2].toLowerCase().substring(0, 3)];
    let year = match[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    if (monthStr) return `${year}-${monthStr}-${day}`;
  }

  // DD MMM YYYY (e.g., 15 Jan 2025 — no separator)
  match = clean.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthStr = months[match[2].toLowerCase().substring(0, 3)];
    let year = match[3];
    if (monthStr) return `${year}-${monthStr}-${day}`;
  }

  return null;
}

function parseAmount(amountStr: string): number {
  if (!amountStr || !amountStr.trim()) return 0;
  // Remove commas, spaces, currency symbols, "Cr", "Dr" suffixes
  const clean = amountStr.replace(/[,\s₹INR]/g, '').replace(/\(|\)/g, '').replace(/(Cr|Dr)\.?$/i, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

// ============================================
// Bank-Specific PDF Parsers
// ============================================

const HDFC_PDF: BankPDFFormat = {
  name: 'HDFC Bank',
  detect: (allText: string) => {
    const lower = allText.toLowerCase();
    return (lower.includes('hdfc bank') || lower.includes('hdfcbank')) &&
           (lower.includes('narration') || lower.includes('transaction'));
  },
  getColumnHeaders: () => ['date', 'narration', 'chq', 'value', 'withdrawal', 'deposit', 'closing'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];
    let headerFound = false;
    let currentNarration = '';
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;

    for (const row of rows) {
      const cells = row.cells;
      const rowText = cells.join(' ').toLowerCase();

      // Skip header row
      if (rowText.includes('narration') && (rowText.includes('withdrawal') || rowText.includes('debit'))) {
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;

      // Skip footer/summary rows
      if (rowText.includes('statement summary') || rowText.includes('opening balance') ||
          rowText.includes('closing balance') || rowText.includes('page ') ||
          rowText.includes('***') || rowText.includes('total')) continue;

      // Try to parse as a new transaction row (starts with a date)
      const dateStr = cells[0]?.trim();
      const parsedDate = parseDate(dateStr);

      if (parsedDate) {
        // Save previous transaction if exists
        if (currentTxn && currentTxn.date && currentTxn.narration) {
          transactions.push(currentTxn as ParsedStatementTransaction);
        }

        const withdrawal = parseAmount(cells[4] || '');
        const deposit = parseAmount(cells[5] || '');
        const balance = parseAmount(cells[6] || '');
        const narration = cells[1]?.trim() || '';

        if (withdrawal > 0 || deposit > 0) {
          currentTxn = {
            date: parsedDate,
            narration: narration,
            amount: withdrawal > 0 ? withdrawal : deposit,
            transactionType: withdrawal > 0 ? 'expense' : 'income',
            balance: balance || undefined,
          };
          currentNarration = narration;
        } else {
          currentTxn = null;
        }
      } else if (currentTxn && cells[1]?.trim()) {
        // Multi-line narration continuation
        currentNarration += ' ' + cells[1].trim();
        currentTxn.narration = currentNarration;
      }
    }

    // Don't forget the last transaction
    if (currentTxn && currentTxn.date && currentTxn.narration) {
      transactions.push(currentTxn as ParsedStatementTransaction);
    }

    return transactions;
  },
};

const ICICI_PDF: BankPDFFormat = {
  name: 'ICICI Bank',
  detect: (allText: string) => {
    const lower = allText.toLowerCase();
    return (lower.includes('icici bank') || lower.includes('icicibank')) &&
           (lower.includes('transaction') || lower.includes('remarks'));
  },
  getColumnHeaders: () => ['sno', 'value', 'date', 'cheque', 'remarks', 'withdrawal', 'deposit', 'balance'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];
    let headerFound = false;
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;

    for (const row of rows) {
      const cells = row.cells;
      const rowText = cells.join(' ').toLowerCase();

      if (rowText.includes('transaction') && rowText.includes('remarks') &&
          (rowText.includes('withdrawal') || rowText.includes('deposit'))) {
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;
      if (rowText.includes('total') || rowText.includes('opening balance') || rowText.includes('page')) continue;

      // ICICI format: S No. | Value Date | Txn Date | Cheque | Remarks | Withdrawal | Deposit | Balance
      // Try multiple column positions since ICICI layout varies
      let dateStr = '';
      let narration = '';
      let withdrawal = 0;
      let deposit = 0;
      let balance = 0;

      // Try to find date in cells
      for (let i = 0; i < Math.min(cells.length, 4); i++) {
        const parsed = parseDate(cells[i]?.trim());
        if (parsed) {
          dateStr = parsed;
          break;
        }
      }

      if (dateStr) {
        if (currentTxn && currentTxn.date) {
          transactions.push(currentTxn as ParsedStatementTransaction);
        }

        // Find narration (usually the longest text cell)
        narration = cells.reduce((longest, cell) => {
          const trimmed = cell.trim();
          if (trimmed.length > longest.length && !parseDate(trimmed) && parseAmount(trimmed) === 0) {
            return trimmed;
          }
          return longest;
        }, '');

        // Find amounts (look at last 3 cells typically)
        for (let i = Math.max(0, cells.length - 4); i < cells.length; i++) {
          const amt = parseAmount(cells[i] || '');
          if (amt > 0) {
            if (withdrawal === 0) withdrawal = amt;
            else if (deposit === 0) deposit = amt;
            else balance = amt;
          }
        }

        if (withdrawal > 0 || deposit > 0) {
          currentTxn = {
            date: dateStr,
            narration: narration || 'Transaction',
            amount: withdrawal > 0 ? withdrawal : deposit,
            transactionType: withdrawal > 0 ? 'expense' : 'income',
            balance: balance || undefined,
          };
        }
      } else if (currentTxn) {
        // Multi-line narration
        const extraText = cells.filter(c => c.trim() && !parseDate(c.trim()) && parseAmount(c) === 0).join(' ').trim();
        if (extraText) {
          currentTxn.narration = (currentTxn.narration || '') + ' ' + extraText;
        }
      }
    }

    if (currentTxn && currentTxn.date) {
      transactions.push(currentTxn as ParsedStatementTransaction);
    }

    return transactions;
  },
};

const SBI_PDF: BankPDFFormat = {
  name: 'SBI',
  detect: (allText: string) => {
    const lower = allText.toLowerCase();
    return (lower.includes('state bank of india') || lower.includes('sbi ')) &&
           (lower.includes('txn date') || lower.includes('transaction') || lower.includes('description'));
  },
  getColumnHeaders: () => ['txndate', 'valuedate', 'description', 'refno', 'debit', 'credit', 'balance'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];
    let headerFound = false;
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;

    for (const row of rows) {
      const cells = row.cells;
      const rowText = cells.join(' ').toLowerCase();

      if ((rowText.includes('txn date') || rowText.includes('transaction date')) &&
          (rowText.includes('description') || rowText.includes('debit') || rowText.includes('credit'))) {
        headerFound = true;
        continue;
      }

      if (!headerFound) continue;
      if (rowText.includes('opening balance') || rowText.includes('closing balance') || rowText.includes('page')) continue;

      const dateStr = cells[0]?.trim();
      const parsedDate = parseDate(dateStr);

      if (parsedDate) {
        if (currentTxn && currentTxn.date) {
          transactions.push(currentTxn as ParsedStatementTransaction);
        }

        const narration = cells[2]?.trim() || cells[1]?.trim() || '';
        const debit = parseAmount(cells[4] || cells[3] || '');
        const credit = parseAmount(cells[5] || cells[4] || '');
        const balance = parseAmount(cells[6] || cells[5] || '');

        if (debit > 0 || credit > 0) {
          currentTxn = {
            date: parsedDate,
            narration: narration,
            amount: debit > 0 ? debit : credit,
            transactionType: debit > 0 ? 'expense' : 'income',
            balance: balance || undefined,
          };
        }
      } else if (currentTxn && cells.some(c => c.trim())) {
        const extraText = cells.filter(c => c.trim() && !parseDate(c) && parseAmount(c) === 0).join(' ').trim();
        if (extraText) {
          currentTxn.narration = (currentTxn.narration || '') + ' ' + extraText;
        }
      }
    }

    if (currentTxn && currentTxn.date) {
      transactions.push(currentTxn as ParsedStatementTransaction);
    }

    return transactions;
  },
};

// Generic fallback parser for unrecognized bank PDFs
const GENERIC_PDF: BankPDFFormat = {
  name: 'Unknown Bank',
  detect: () => true, // Always matches as fallback
  getColumnHeaders: () => ['date', 'description', 'debit', 'credit', 'balance'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];

    for (const row of rows) {
      const cells = row.cells;

      // Try to find a date in any cell
      let dateStr = '';
      let dateIndex = -1;
      for (let i = 0; i < cells.length; i++) {
        const parsed = parseDate(cells[i]?.trim());
        if (parsed) {
          dateStr = parsed;
          dateIndex = i;
          break;
        }
      }

      if (!dateStr) continue;

      // Find the narration (longest non-date, non-numeric text)
      let narration = '';
      for (let i = 0; i < cells.length; i++) {
        if (i === dateIndex) continue;
        const text = cells[i]?.trim();
        if (text && text.length > narration.length && parseAmount(text) === 0 && !parseDate(text)) {
          narration = text;
        }
      }

      // Find amounts (numeric cells after the narration)
      const amounts: number[] = [];
      for (let i = 0; i < cells.length; i++) {
        const amt = parseAmount(cells[i] || '');
        if (amt > 0) amounts.push(amt);
      }

      if (amounts.length >= 1 && narration) {
        // If we have 2+ amounts, first non-zero is debit, second is credit
        // If only 1 amount, treat it as expense
        const amount = amounts[0];
        transactions.push({
          date: dateStr,
          narration,
          amount,
          transactionType: 'expense', // Default; user can override
        });
      }
    }

    return transactions;
  },
};

const BANK_PDF_FORMATS: BankPDFFormat[] = [HDFC_PDF, ICICI_PDF, SBI_PDF, GENERIC_PDF];

// ============================================
// Main Parse Function
// ============================================

/**
 * Parse a PDF bank statement file.
 * Returns structured transactions.
 */
export async function parsePDF(
  file: File,
  password?: string
): Promise<StatementParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    let items: TextItem[];
    let fullText: string;

    try {
      const result = await extractTextItems(arrayBuffer, password);
      items = result.items;
      fullText = result.fullText;
    } catch (err: any) {
      // Check if it's a password error
      if (err?.name === 'PasswordException' || err?.message?.includes('password')) {
        return {
          success: false,
          error: 'This PDF is password-protected. Please enter the password.',
          passwordRequired: true,
        };
      }
      throw err;
    }

    if (items.length === 0) {
      return {
        success: false,
        error: 'Could not extract text from PDF. It may be a scanned image.',
      };
    }

    // Detect bank format
    const format = BANK_PDF_FORMATS.find(f => f.detect(fullText));
    if (!format) {
      return { success: false, error: 'Could not determine the bank format.' };
    }

    // Reconstruct table
    const textRows = groupIntoRows(items);
    const columnBoundaries = detectColumnBoundaries(textRows, format.getColumnHeaders());

    let transactions: ParsedStatementTransaction[];

    if (columnBoundaries.length > 0) {
      // Use column-based parsing
      const tableRows = buildTable(textRows, columnBoundaries);
      transactions = format.parseRows(tableRows, columnBoundaries);
    } else {
      // Fallback: try parsing with raw row text
      const simpleRows: TableRow[] = textRows.map(row => ({
        cells: row.map(item => item.text),
        y: row[0]?.y || 0,
      }));
      transactions = format.parseRows(simpleRows, []);
    }

    if (transactions.length === 0) {
      return {
        success: false,
        error: `Recognized as ${format.name} statement but could not parse any transactions. The format may differ from what we support.`,
      };
    }

    return {
      success: true,
      transactions,
      bankName: format.name,
    };
  } catch (err: any) {
    console.error('[parsePDF] Error:', err);
    return {
      success: false,
      error: `Failed to parse PDF: ${err.message || 'Unknown error'}`,
    };
  }
}
