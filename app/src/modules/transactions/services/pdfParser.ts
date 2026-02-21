/**
 * PDF Statement Parser
 *
 * Uses pdfjs-dist to extract text with coordinates from bank statement PDFs,
 * then reconstructs tables using Y-coordinate grouping and X-coordinate column detection.
 *
 * Supports Indian bank statement formats:
 * - Bank-specific (tested): ICICI, Axis
 * - Generic fallback (X-coordinate auto-detection): all other banks
 * - Commented out (untested): HDFC, SBI — uncomment after real statement validation
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
  /** If true, this parser operates on raw TextItem rows instead of pre-mapped TableRows */
  usesRawRows?: boolean;
  /** Parse from raw text rows with X/Y coordinates — used by generic parser */
  parseRawRows?: (rows: TextItem[][]) => ParsedStatementTransaction[];
}

// ============================================
// PDF.js Loading (Lazy)
// ============================================

let pdfjsLib: any = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  // Dynamic import for code splitting
  pdfjsLib = await import('pdfjs-dist');

  // Use worker from public folder — served as a static asset
  // The file is copied from node_modules/pdfjs-dist/build/pdf.worker.min.mjs to public/
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.mjs', window.location.origin).href;

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
  // Remove commas, spaces, currency symbols, "Cr", "Dr" suffixes
  const clean = amountStr.replace(/[,\s₹INR]/g, '').replace(/\(|\)/g, '').replace(/(Cr|Dr)\.?$/i, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.abs(num);
}

// ============================================
// Bank-Specific PDF Parsers
// ============================================

// ── HDFC Bank PDF parser — COMMENTED OUT (untested with real statements) ──
// Uncomment after testing with a real HDFC bank statement PDF.
// const HDFC_PDF: BankPDFFormat = {
//   name: 'HDFC Bank',
//   detect: (allText: string) => {
//     const lower = allText.toLowerCase();
//     return (lower.includes('hdfc bank') || lower.includes('hdfcbank') || /\bhdfc\d/.test(lower)) &&
//            (lower.includes('narration') || lower.includes('transaction'));
//   },
//   getColumnHeaders: () => ['date', 'narration', 'chq', 'value', 'withdrawal', 'deposit', 'closing'],
//   parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
//     const transactions: ParsedStatementTransaction[] = [];
//     let headerFound = false;
//     let currentNarration = '';
//     let currentTxn: Partial<ParsedStatementTransaction> | null = null;
//     for (const row of rows) {
//       const cells = row.cells;
//       const rowText = cells.join(' ').toLowerCase();
//       if (rowText.includes('narration') && (rowText.includes('withdrawal') || rowText.includes('debit'))) {
//         headerFound = true;
//         continue;
//       }
//       if (!headerFound) continue;
//       if (rowText.includes('statement summary') || rowText.includes('opening balance') ||
//           rowText.includes('closing balance') || rowText.includes('page ') ||
//           rowText.includes('***') || rowText.includes('total')) continue;
//       const dateStr = cells[0]?.trim();
//       const parsedDate = parseDate(dateStr);
//       if (parsedDate) {
//         if (currentTxn && currentTxn.date && currentTxn.narration) {
//           transactions.push(currentTxn as ParsedStatementTransaction);
//         }
//         const withdrawal = parseAmount(cells[4] || '');
//         const deposit = parseAmount(cells[5] || '');
//         const balance = parseAmount(cells[6] || '');
//         const narration = cells[1]?.trim() || '';
//         if (withdrawal > 0 || deposit > 0) {
//           currentTxn = {
//             date: parsedDate,
//             narration: narration,
//             amount: withdrawal > 0 ? withdrawal : deposit,
//             transactionType: withdrawal > 0 ? 'expense' : 'income',
//             balance: balance || undefined,
//           };
//           currentNarration = narration;
//         } else {
//           currentTxn = null;
//         }
//       } else if (currentTxn && cells[1]?.trim()) {
//         currentNarration += ' ' + cells[1].trim();
//         currentTxn.narration = currentNarration;
//       }
//     }
//     if (currentTxn && currentTxn.date && currentTxn.narration) {
//       transactions.push(currentTxn as ParsedStatementTransaction);
//     }
//     return transactions;
//   },
// };

const ICICI_PDF: BankPDFFormat = {
  name: 'ICICI Bank',
  detect: (allText: string) => {
    const lower = allText.toLowerCase();
    return (lower.includes('icici bank') || lower.includes('icicibank')) &&
           (lower.includes('particular') || lower.includes('remarks') || lower.includes('transaction'));
  },
  // Keywords for column boundary detection — covers both old (S No/Value Date/Remarks)
  // and current (Date/Mode/Particulars) ICICI formats
  getColumnHeaders: () => ['date', 'mode', 'particular', 'deposit', 'withdrawal', 'balance'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];
    let headerFound = false;
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;
    // Track column indices for deposits vs withdrawals
    let depositColIdx = -1;
    let withdrawalColIdx = -1;

    for (const row of rows) {
      const cells = row.cells;
      const rowText = cells.join(' ').toLowerCase();

      // Detect header row — matches both formats:
      // Old: "S No | Value Date | Txn Date | Cheque | Remarks | Withdrawal | Deposit | Balance"
      // New: "DATE | MODE | PARTICULARS | DEPOSITS | WITHDRAWALS | BALANCE"
      if (!headerFound &&
          (rowText.includes('particular') || rowText.includes('remarks')) &&
          (rowText.includes('withdrawal') || rowText.includes('deposit'))) {
        headerFound = true;
        // Determine column order for deposit vs withdrawal
        for (let i = 0; i < cells.length; i++) {
          const cellLower = cells[i].toLowerCase().trim();
          if (cellLower.includes('deposit')) depositColIdx = i;
          if (cellLower.includes('withdrawal')) withdrawalColIdx = i;
        }
        continue;
      }

      if (!headerFound) continue;
      if (rowText.includes('total') || rowText.includes('opening balance') ||
          rowText.includes('page') || rowText.includes('statement summary')) continue;

      // ICICI formats vary:
      // Old: S No. | Value Date | Txn Date | Cheque | Remarks | Withdrawal | Deposit | Balance
      // New: DATE | MODE | PARTICULARS | DEPOSITS | WITHDRAWALS | BALANCE
      let dateStr = '';
      let narration = '';
      let withdrawal = 0;
      let deposit = 0;
      let balance = 0;

      // Try to find date in first few cells
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

        // If we know column positions, use them for accurate deposit/withdrawal detection
        if (depositColIdx >= 0 && withdrawalColIdx >= 0) {
          deposit = parseAmount(cells[depositColIdx] || '');
          withdrawal = parseAmount(cells[withdrawalColIdx] || '');
          // Balance is typically the last column
          const lastIdx = cells.length - 1;
          if (lastIdx !== depositColIdx && lastIdx !== withdrawalColIdx) {
            balance = parseAmount(cells[lastIdx] || '');
          }
        } else {
          // Fallback: scan last cells for amounts
          const amountCells: { idx: number; amt: number }[] = [];
          for (let i = Math.max(0, cells.length - 4); i < cells.length; i++) {
            const amt = parseAmount(cells[i] || '');
            if (amt > 0) amountCells.push({ idx: i, amt });
          }
          if (amountCells.length === 1) {
            // Single amount — assume withdrawal (expense)
            withdrawal = amountCells[0].amt;
          } else if (amountCells.length === 2) {
            // Two amounts: first is deposit or withdrawal, second is balance
            withdrawal = amountCells[0].amt;
            balance = amountCells[1].amt;
          } else if (amountCells.length >= 3) {
            deposit = amountCells[0].amt;
            withdrawal = amountCells[1].amt;
            balance = amountCells[2].amt;
          }
        }

        // Skip B/F (brought forward) rows
        if (narration.toLowerCase().includes('b/f') && withdrawal === 0 && deposit === 0) {
          currentTxn = null;
          continue;
        }

        if (withdrawal > 0 || deposit > 0) {
          currentTxn = {
            date: dateStr,
            narration: narration || 'Transaction',
            amount: withdrawal > 0 ? withdrawal : deposit,
            transactionType: withdrawal > 0 ? 'expense' : 'income',
            balance: balance || undefined,
          };
        } else {
          currentTxn = null;
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

// ── SBI PDF parser — COMMENTED OUT (untested with real statements) ──
// Uncomment after testing with a real SBI bank statement PDF.
// const SBI_PDF: BankPDFFormat = {
//   name: 'SBI',
//   detect: (allText: string) => {
//     const lower = allText.toLowerCase();
//     return (lower.includes('state bank of india') || lower.includes('sbi ')) &&
//            (lower.includes('txn date') || lower.includes('transaction') || lower.includes('description'));
//   },
//   getColumnHeaders: () => ['txndate', 'valuedate', 'description', 'refno', 'debit', 'credit', 'balance'],
//   parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
//     const transactions: ParsedStatementTransaction[] = [];
//     let headerFound = false;
//     let currentTxn: Partial<ParsedStatementTransaction> | null = null;
//     for (const row of rows) {
//       const cells = row.cells;
//       const rowText = cells.join(' ').toLowerCase();
//       if ((rowText.includes('txn date') || rowText.includes('transaction date')) &&
//           (rowText.includes('description') || rowText.includes('debit') || rowText.includes('credit'))) {
//         headerFound = true;
//         continue;
//       }
//       if (!headerFound) continue;
//       if (rowText.includes('opening balance') || rowText.includes('closing balance') || rowText.includes('page')) continue;
//       const dateStr = cells[0]?.trim();
//       const parsedDate = parseDate(dateStr);
//       if (parsedDate) {
//         if (currentTxn && currentTxn.date) {
//           transactions.push(currentTxn as ParsedStatementTransaction);
//         }
//         const narration = cells[2]?.trim() || cells[1]?.trim() || '';
//         const debit = parseAmount(cells[4] || cells[3] || '');
//         const credit = parseAmount(cells[5] || cells[4] || '');
//         const balance = parseAmount(cells[6] || cells[5] || '');
//         if (debit > 0 || credit > 0) {
//           currentTxn = {
//             date: parsedDate,
//             narration: narration,
//             amount: debit > 0 ? debit : credit,
//             transactionType: debit > 0 ? 'expense' : 'income',
//             balance: balance || undefined,
//           };
//         }
//       } else if (currentTxn && cells.some(c => c.trim())) {
//         const extraText = cells.filter(c => c.trim() && !parseDate(c) && parseAmount(c) === 0).join(' ').trim();
//         if (extraText) {
//           currentTxn.narration = (currentTxn.narration || '') + ' ' + extraText;
//         }
//       }
//     }
//     if (currentTxn && currentTxn.date) {
//       transactions.push(currentTxn as ParsedStatementTransaction);
//     }
//     return transactions;
//   },
// };

const AXIS_PDF: BankPDFFormat = {
  name: 'Axis Bank',
  detect: (allText: string) => {
    const lower = allText.toLowerCase();
    // Require Axis IFSC prefix (UTIB) — most reliable indicator
    // OR "axis bank" branding with Axis-specific "Tran Date" column header
    // Jupiter/Federal Bank PDFs may mention "Axis" but use FDRL IFSC — don't match those
    const hasAxisIFSC = /\butib\d/.test(lower);
    const hasAxisBranding = lower.includes('axis bank');
    const hasFederalIFSC = /\bfdrl\d/.test(lower);
    const hasTranDate = lower.includes('tran date');
    // If Federal Bank IFSC is present, this is NOT an Axis statement even if it mentions Axis
    if (hasFederalIFSC) return false;
    return (hasAxisIFSC || hasAxisBranding) && hasTranDate;
  },
  // Axis PDF columns: Tran Date | Chq No | Particulars | Debit | Credit | Balance | Init. Br
  getColumnHeaders: () => ['tran', 'chq', 'particular', 'debit', 'credit', 'balance', 'init'],
  parseRows: (rows: TableRow[]): ParsedStatementTransaction[] => {
    const transactions: ParsedStatementTransaction[] = [];
    let headerFound = false;
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;
    // Track column indices
    let debitColIdx = -1;
    let creditColIdx = -1;
    let balanceColIdx = -1;
    let particularsColIdx = -1;

    /**
     * Helper: scan a row's cells for amounts, assigning to debit/credit/balance
     * by proximity to known column indices.
     */
    function extractAmounts(cells: string[]): { debit: number; credit: number; balance: number } {
      // Try indexed columns first
      let debit = parseAmount(debitColIdx >= 0 ? cells[debitColIdx] || '' : '');
      let credit = parseAmount(creditColIdx >= 0 ? cells[creditColIdx] || '' : '');
      let balance = parseAmount(balanceColIdx >= 0 ? cells[balanceColIdx] || '' : '');

      // Fallback: if indexed columns found nothing, scan all cells
      if (debit === 0 && credit === 0) {
        const amounts: { idx: number; amt: number }[] = [];
        for (let i = 0; i < cells.length; i++) {
          if (i === 0 || i === 1 || i === particularsColIdx) continue; // skip date, chq, narration cols
          const amt = parseAmount(cells[i] || '');
          if (amt > 0) amounts.push({ idx: i, amt });
        }

        if (amounts.length >= 1 && debitColIdx >= 0 && creditColIdx >= 0) {
          // Assign each amount by proximity to debit or credit column
          for (const a of amounts) {
            const distDebit = Math.abs(a.idx - debitColIdx);
            const distCredit = Math.abs(a.idx - creditColIdx);
            const distBalance = balanceColIdx >= 0 ? Math.abs(a.idx - balanceColIdx) : 999;
            const minDist = Math.min(distDebit, distCredit, distBalance);

            if (minDist === distBalance && balanceColIdx >= 0) {
              balance = a.amt;
            } else if (distDebit <= distCredit) {
              debit = a.amt;
            } else {
              credit = a.amt;
            }
          }
        } else if (amounts.length === 1) {
          debit = amounts[0].amt; // default to expense
        } else if (amounts.length >= 2) {
          debit = amounts[0].amt;
          balance = amounts[1].amt;
        }
      }

      return { debit, credit, balance };
    }

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const cells = row.cells;
      const rowText = cells.join(' ').toLowerCase();

      // Detect header row: "Tran Date | Chq No | Particulars | Debit | Credit | Balance | Init."
      if (!headerFound && rowText.includes('tran') && rowText.includes('particular') &&
          (rowText.includes('debit') || rowText.includes('credit'))) {
        headerFound = true;
        for (let i = 0; i < cells.length; i++) {
          const cellLower = cells[i].toLowerCase().trim();
          if (cellLower.includes('particular')) particularsColIdx = i;
          if (cellLower.includes('debit')) debitColIdx = i;
          if (cellLower.includes('credit')) creditColIdx = i;
          if (cellLower.includes('balance')) balanceColIdx = i;
        }
        console.log(`[Axis PDF] Header found at row ${r}. Cols: particulars=${particularsColIdx}, debit=${debitColIdx}, credit=${creditColIdx}, balance=${balanceColIdx}`);
        continue;
      }

      if (!headerFound) continue;

      // Skip metadata/footer rows
      if (rowText.includes('opening balance') || rowText.includes('closing balance') ||
          rowText.includes('page ') || rowText.includes('statement summary') ||
          rowText.includes('transaction total') || rowText.includes('***')) continue;

      // Try to find date in any of the first few cells
      let parsedDate: string | null = null;
      for (let i = 0; i < Math.min(cells.length, 3); i++) {
        parsedDate = parseDate(cells[i]?.trim());
        if (parsedDate) break;
      }

      if (parsedDate) {
        // Save previous transaction (only if it has a valid amount)
        if (currentTxn && currentTxn.date && currentTxn.amount && currentTxn.amount > 0) {
          transactions.push(currentTxn as ParsedStatementTransaction);
        }

        const narration = (particularsColIdx >= 0 ? cells[particularsColIdx] : cells[2])?.trim() || '';
        const { debit, credit, balance } = extractAmounts(cells);

        console.log(`[Axis PDF] Row ${r}: date=${parsedDate}, narration="${narration.substring(0, 50)}", debit=${debit}, credit=${credit}, balance=${balance}, cells=[${cells.map(c => `"${c}"`).join(', ')}]`);

        // Start new transaction — amounts may be 0 if they appear on continuation line
        currentTxn = {
          date: parsedDate,
          narration: narration || 'Transaction',
          amount: debit > 0 ? debit : credit,
          transactionType: debit > 0 ? 'expense' : (credit > 0 ? 'income' : 'expense'),
          balance: balance || undefined,
        };
      } else if (currentTxn) {
        // Non-date row — could be multi-line narration AND/OR amount continuation
        console.log(`[Axis PDF] Row ${r} (continuation): cells=[${cells.map(c => `"${c}"`).join(', ')}]`);

        // Always check for amounts on continuation rows if current txn has no amounts yet
        // In Axis PDFs, the date+narration is on line 1, amounts on line 2
        if (currentTxn.amount === 0 || !currentTxn.amount) {
          const { debit, credit, balance } = extractAmounts(cells);

          if (debit > 0 || credit > 0) {
            currentTxn.amount = debit > 0 ? debit : credit;
            currentTxn.transactionType = debit > 0 ? 'expense' : 'income';
            if (balance > 0) currentTxn.balance = balance;
            console.log(`[Axis PDF] Row ${r} (continuation): found amounts debit=${debit}, credit=${credit}, balance=${balance}`);
          }
        }

        // Append narration text from the particulars column
        // Be careful: text like "09-2025" is narration continuation, not a date
        const extraText = (particularsColIdx >= 0 ? cells[particularsColIdx] : cells[2])?.trim() || '';
        if (extraText) {
          currentTxn.narration = (currentTxn.narration || '') + ' ' + extraText;
        }
      }
    }

    // Push last transaction (only if it has a valid amount)
    if (currentTxn && currentTxn.date && currentTxn.amount && currentTxn.amount > 0) {
      transactions.push(currentTxn as ParsedStatementTransaction);
    }

    return transactions;
  },
};

/**
 * Generic fallback PDF parser for unrecognized bank formats.
 *
 * Unlike bank-specific parsers that rely on pre-mapped column cells, this parser
 * works directly with raw TextItem rows (text + X coordinates). It clusters items
 * into columns by X-position, detects header rows with amount keywords, and uses
 * X-coordinate proximity to assign values to debit/credit/balance columns.
 *
 * This approach handles:
 * - Unknown column headers (any language, any abbreviation)
 * - Multi-line transactions (date row + continuation row with amounts)
 * - Variable column layouts
 * - Both column-mapped and raw text item inputs
 */
const GENERIC_PDF: BankPDFFormat = {
  name: 'Unknown Bank',
  detect: () => true, // Always matches as fallback
  getColumnHeaders: () => ['date', 'description', 'debit', 'credit', 'balance'],
  usesRawRows: true,

  // Stub — not used when usesRawRows is true
  parseRows: () => [],

  /**
   * Parse raw TextItem rows with full X/Y coordinate access.
   * This is the real parser for the generic format.
   */
  parseRawRows: (rawRows: TextItem[][]): ParsedStatementTransaction[] => {
    if (rawRows.length === 0) return [];

    // ── Step 1: Cluster X positions to detect columns ──
    // Collect all X positions and cluster them into column zones.
    // Items in the same column will have similar X coordinates.
    const allXPositions: number[] = [];
    for (const row of rawRows) {
      for (const item of row) {
        allXPositions.push(item.x);
      }
    }

    // Cluster X positions with ~30px tolerance into column centers
    const sortedX = [...allXPositions].sort((a, b) => a - b);
    const columnCenters: number[] = [];
    const CLUSTER_TOLERANCE = 30;

    for (const x of sortedX) {
      const existingCluster = columnCenters.find(c => Math.abs(c - x) <= CLUSTER_TOLERANCE);
      if (!existingCluster) {
        columnCenters.push(x);
      }
    }
    columnCenters.sort((a, b) => a - b);

    console.log(`[Generic PDF] Detected ${columnCenters.length} column clusters at X: [${columnCenters.map(x => Math.round(x)).join(', ')}]`);

    // Helper: assign text item to the nearest column center
    function getColumnIndex(x: number): number {
      let bestIdx = 0;
      let bestDist = Math.abs(x - columnCenters[0]);
      for (let i = 1; i < columnCenters.length; i++) {
        const dist = Math.abs(x - columnCenters[i]);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    // ── Step 2: Convert raw rows to structured column-mapped rows ──
    // Map each text item to its column by X proximity
    interface ColumnMappedRow {
      cells: Map<number, string>; // column index → text
      items: TextItem[]; // raw items for this row
      rowText: string; // joined text for pattern matching
    }

    const mappedRows: ColumnMappedRow[] = rawRows.map(row => {
      const cells = new Map<number, string>();
      for (const item of row) {
        const colIdx = getColumnIndex(item.x);
        const existing = cells.get(colIdx) || '';
        cells.set(colIdx, existing ? existing + ' ' + item.text : item.text);
      }
      return {
        cells,
        items: row,
        rowText: row.map(item => item.text).join(' ').toLowerCase(),
      };
    });

    // ── Step 3: Detect header row and column roles ──
    // Look for a row with debit/credit/withdrawal/deposit keywords
    let headerRowIdx = -1;
    let debitColX = -1; // X coordinate of the debit/withdrawal column
    let creditColX = -1;
    let balanceColX = -1;

    const debitKeywords = ['debit', 'withdrawal', 'withdrawals', 'debit amt', 'debit amount'];
    const creditKeywords = ['credit', 'deposit', 'deposits', 'credit amt', 'credit amount'];
    const balanceKeywords = ['balance', 'closing balance', 'running balance'];

    for (let r = 0; r < mappedRows.length; r++) {
      const row = mappedRows[r];
      const hasDebit = debitKeywords.some(kw => row.rowText.includes(kw)) || /\bdr\b/.test(row.rowText);
      const hasCredit = creditKeywords.some(kw => row.rowText.includes(kw)) || /\bcr\b/.test(row.rowText);

      if (hasDebit || hasCredit) {
        headerRowIdx = r;
        // Find the X positions of the amount column headers
        for (const item of row.items) {
          const lower = item.text.toLowerCase().trim();
          if (debitKeywords.some(kw => lower.includes(kw)) || lower === 'dr' || lower === 'dr.') {
            debitColX = item.x;
          }
          if (creditKeywords.some(kw => lower.includes(kw)) || lower === 'cr' || lower === 'cr.') {
            creditColX = item.x;
          }
          if (balanceKeywords.some(kw => lower.includes(kw))) {
            balanceColX = item.x;
          }
        }
        console.log(`[Generic PDF] Header at row ${r}: "${row.rowText.substring(0, 80)}", debitX=${Math.round(debitColX)}, creditX=${Math.round(creditColX)}, balanceX=${Math.round(balanceColX)}`);
        break;
      }
    }

    // If no header found with both debit+credit, try single amount column header
    if (headerRowIdx === -1) {
      for (let r = 0; r < mappedRows.length; r++) {
        const row = mappedRows[r];
        const hasAmount = row.rowText.includes('amount') || row.rowText.includes('debit') || row.rowText.includes('credit');
        const hasDate = row.rowText.includes('date') || row.rowText.includes('txn');
        if (hasAmount && hasDate) {
          headerRowIdx = r;
          for (const item of row.items) {
            const lower = item.text.toLowerCase().trim();
            if (lower.includes('amount') || lower.includes('debit') || lower.includes('withdrawal')) {
              debitColX = item.x;
            }
            if (lower.includes('credit') || lower.includes('deposit')) {
              creditColX = item.x;
            }
            if (lower.includes('balance')) {
              balanceColX = item.x;
            }
          }
          console.log(`[Generic PDF] Weaker header at row ${r}: "${row.rowText.substring(0, 80)}", debitX=${Math.round(debitColX)}, creditX=${Math.round(creditColX)}, balanceX=${Math.round(balanceColX)}`);
          break;
        }
      }
    }

    // ── Step 4: Parse transactions ──
    // Helper: from a raw row's items, extract amounts using X-proximity to header columns
    function extractAmountsFromItems(items: TextItem[]): { debit: number; credit: number; balance: number } {
      let debit = 0;
      let credit = 0;
      let balance = 0;

      // Collect all numeric items with their X positions
      const amountItems: { x: number; amt: number }[] = [];
      for (const item of items) {
        const amt = parseAmount(item.text);
        if (amt > 0) {
          amountItems.push({ x: item.x, amt });
        }
      }

      if (amountItems.length === 0) return { debit: 0, credit: 0, balance: 0 };

      if (debitColX >= 0 || creditColX >= 0) {
        // Assign each amount to nearest known column by X distance
        const AMOUNT_COL_TOLERANCE = 60; // wider tolerance for amounts
        for (const a of amountItems) {
          const distDebit = debitColX >= 0 ? Math.abs(a.x - debitColX) : 9999;
          const distCredit = creditColX >= 0 ? Math.abs(a.x - creditColX) : 9999;
          const distBalance = balanceColX >= 0 ? Math.abs(a.x - balanceColX) : 9999;
          const minDist = Math.min(distDebit, distCredit, distBalance);

          if (minDist > AMOUNT_COL_TOLERANCE) {
            // Too far from any known column — try best guess
            if (debit === 0) debit = a.amt;
            else if (balance === 0) balance = a.amt;
            continue;
          }

          if (minDist === distBalance && balanceColX >= 0) {
            balance = a.amt;
          } else if (distDebit <= distCredit) {
            debit = a.amt;
          } else {
            credit = a.amt;
          }
        }
      } else {
        // No header column positions — assign by order (left to right)
        // Convention: amounts towards right side of page
        const sorted = [...amountItems].sort((a, b) => a.x - b.x);
        if (sorted.length === 1) {
          debit = sorted[0].amt; // single amount = expense
        } else if (sorted.length === 2) {
          debit = sorted[0].amt;
          balance = sorted[1].amt;
        } else if (sorted.length >= 3) {
          debit = sorted[0].amt;
          credit = sorted[1].amt;
          balance = sorted[sorted.length - 1].amt;
        }
      }

      return { debit, credit, balance };
    }

    // Helper: extract narration from items (longest non-date, non-numeric text cluster)
    function extractNarration(items: TextItem[], excludeDateX?: number): string {
      // Concatenate all text items that aren't dates or amounts, respecting X order
      const textParts: { x: number; text: string }[] = [];
      for (const item of items) {
        const text = item.text.trim();
        if (!text) continue;
        // Skip if it's a date
        if (parseDate(text)) continue;
        // Skip if it's a pure amount (but keep mixed text like "UPI-SWIGGY-123")
        if (parseAmount(text) > 0 && /^[\d,.\s₹()]+$/.test(text.replace(/(Cr|Dr)\.?$/i, ''))) continue;
        // Skip if it's at the same X as the date and very short
        if (excludeDateX !== undefined && Math.abs(item.x - excludeDateX) < 10 && text.length < 3) continue;
        textParts.push({ x: item.x, text });
      }

      // Find the longest contiguous text block (items close together in X)
      if (textParts.length === 0) return '';

      // Group into clusters by X proximity — narration items are usually in the left-center
      // For simplicity, take all non-numeric text
      return textParts.map(p => p.text).join(' ').trim();
    }

    const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
    const transactions: ParsedStatementTransaction[] = [];
    let currentTxn: Partial<ParsedStatementTransaction> | null = null;
    let currentTxnItems: TextItem[] = [];

    for (let r = startRow; r < rawRows.length; r++) {
      const row = rawRows[r];
      const rowText = row.map(item => item.text).join(' ').toLowerCase();

      // Skip footer/summary rows
      if (rowText.includes('opening balance') || rowText.includes('closing balance') ||
          rowText.includes('statement summary') || rowText.includes('transaction total') ||
          rowText.includes('page ') || rowText.includes('***') ||
          rowText.includes('total debit') || rowText.includes('total credit')) continue;

      // Try to find a date in any text item
      let dateStr = '';
      let dateItem: TextItem | null = null;
      for (const item of row) {
        const parsed = parseDate(item.text.trim());
        if (parsed) {
          dateStr = parsed;
          dateItem = item;
          break;
        }
      }

      if (dateStr) {
        // Save previous transaction if it has a valid amount
        if (currentTxn && currentTxn.date && currentTxn.amount && currentTxn.amount > 0) {
          transactions.push(currentTxn as ParsedStatementTransaction);
        }

        const narration = extractNarration(row, dateItem?.x);
        const { debit, credit, balance } = extractAmountsFromItems(row);

        console.log(`[Generic PDF] Row ${r}: date=${dateStr}, narr="${narration.substring(0, 50)}", debit=${debit}, credit=${credit}, bal=${balance}`);

        currentTxn = {
          date: dateStr,
          narration: narration || 'Transaction',
          amount: debit > 0 ? debit : credit,
          transactionType: debit > 0 ? 'expense' : (credit > 0 ? 'income' : 'expense'),
          balance: balance || undefined,
        };
        currentTxnItems = [...row];
      } else if (currentTxn) {
        // Continuation row — could have amounts and/or narration text

        // Check for amounts if current txn has none yet
        if (!currentTxn.amount || currentTxn.amount === 0) {
          const { debit, credit, balance } = extractAmountsFromItems(row);
          if (debit > 0 || credit > 0) {
            currentTxn.amount = debit > 0 ? debit : credit;
            currentTxn.transactionType = debit > 0 ? 'expense' : 'income';
            if (balance > 0) currentTxn.balance = balance;
            console.log(`[Generic PDF] Row ${r} (cont): amounts debit=${debit}, credit=${credit}, bal=${balance}`);
          }
        }

        // Append narration text
        const extraNarr = extractNarration(row);
        if (extraNarr && extraNarr.length > 1) {
          currentTxn.narration = (currentTxn.narration || '') + ' ' + extraNarr;
        }
        currentTxnItems.push(...row);
      }
    }

    // Push last transaction
    if (currentTxn && currentTxn.date && currentTxn.amount && currentTxn.amount > 0) {
      transactions.push(currentTxn as ParsedStatementTransaction);
    }

    console.log(`[Generic PDF] Parsed ${transactions.length} transactions`);
    return transactions;
  },
};

// Only include bank-specific parsers that have been tested with real statements.
// Untested parsers (HDFC, SBI) are commented out above — enable after real validation.
// All other banks fall through to GENERIC_PDF which uses X-coordinate based auto-detection.
const BANK_PDF_FORMATS: BankPDFFormat[] = [ICICI_PDF, AXIS_PDF, GENERIC_PDF];

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

    // Debug: log extraction summary
    console.log(`[parsePDF] Bank: ${format.name}, Text items: ${items.length}, Rows: ${textRows.length}, Columns detected: ${columnBoundaries.length}`);
    // Log first 10 rows for debugging
    const sampleRows = textRows.slice(0, 15).map((row, i) =>
      `  Row ${i}: [${row.map(item => `"${item.text}"`).join(' | ')}]`
    );
    console.log(`[parsePDF] First 15 rows:\n${sampleRows.join('\n')}`);

    let transactions: ParsedStatementTransaction[];

    // If the format uses raw rows (e.g., generic parser), pass raw TextItem rows directly
    if (format.usesRawRows && format.parseRawRows) {
      console.log(`[parsePDF] Using raw row parser for ${format.name}`);
      // Log first 15 raw rows for debugging
      textRows.slice(0, 15).forEach((row, i) => {
        console.log(`[parsePDF] RawRow ${i}: [${row.map(item => `"${item.text}"@x${Math.round(item.x)}`).join(' | ')}]`);
      });
      transactions = format.parseRawRows(textRows);
    } else if (columnBoundaries.length > 0) {
      // Use column-based parsing
      const tableRows = buildTable(textRows, columnBoundaries);
      console.log(`[parsePDF] Column-based parsing: ${tableRows.length} table rows built`);
      // Log first 5 table rows with cell contents
      tableRows.slice(0, 8).forEach((tr, i) => {
        console.log(`[parsePDF] TableRow ${i}: [${tr.cells.map(c => `"${c}"`).join(' | ')}]`);
      });
      transactions = format.parseRows(tableRows, columnBoundaries);
    } else {
      // Fallback: try parsing with raw row text
      console.log(`[parsePDF] No column boundaries found, using raw row fallback`);
      const simpleRows: TableRow[] = textRows.map(row => ({
        cells: row.map(item => item.text),
        y: row[0]?.y || 0,
      }));
      // Log first 5 simple rows
      simpleRows.slice(0, 8).forEach((tr, i) => {
        console.log(`[parsePDF] SimpleRow ${i}: [${tr.cells.map(c => `"${c}"`).join(' | ')}]`);
      });
      transactions = format.parseRows(simpleRows, []);
    }

    console.log(`[parsePDF] Parsed ${transactions.length} transactions`);
    if (transactions.length > 0) {
      console.log(`[parsePDF] First txn:`, transactions[0]);
    }

    if (transactions.length === 0) {
      return {
        success: false,
        error: `Recognized as ${format.name} statement but could not parse any transactions. The format may differ from what we support. Check browser console for debug details.`,
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
