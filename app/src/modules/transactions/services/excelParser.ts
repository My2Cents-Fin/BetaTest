/**
 * Excel Statement Parser
 *
 * Uses SheetJS (xlsx) to read .xlsx/.xls bank statement files.
 * Converts the first sheet to CSV-like rows (header → Record<string, string>[])
 * and delegates to the existing CSV parser logic for bank detection and parsing.
 */

import type { StatementParseResult } from '../../budget/types';
import { parseCSVRows } from './csvParser';

/**
 * Parse an Excel bank statement file (.xlsx or .xls).
 * Reads the first sheet, extracts headers from the first non-empty row,
 * and converts to Record<string, string>[] for the CSV parser pipeline.
 */
export async function parseExcel(file: File): Promise<StatementParseResult> {
  try {
    // Lazy-load xlsx for code splitting (it's ~300KB)
    const XLSX = await import('xlsx');

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: 'Excel file has no sheets.' };
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { success: false, error: 'Could not read the first sheet.' };
    }

    // Convert sheet to array of arrays (raw rows)
    const rawRows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,       // Return array of arrays (not objects)
      defval: '',       // Default empty cells to ''
      raw: false,       // Return formatted strings (not raw numbers/dates)
      blankrows: false, // Skip blank rows
    });

    if (rawRows.length < 2) {
      return { success: false, error: 'Excel file has no data rows (need at least a header + 1 data row).' };
    }

    // Find the header row — first row that has 3+ non-empty cells
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const nonEmpty = rawRows[i].filter(cell => cell != null && String(cell).trim() !== '').length;
      if (nonEmpty >= 3) {
        headerRowIdx = i;
        break;
      }
    }

    const headerRow = rawRows[headerRowIdx];
    const headers: string[] = headerRow.map(cell => String(cell ?? '').trim());

    // Convert data rows to Record<string, string>[] (same shape as papaparse output)
    const dataRows: Record<string, string>[] = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const record: Record<string, string> = {};

      // Skip rows that are entirely empty
      let hasContent = false;
      for (let j = 0; j < headers.length; j++) {
        const value = String(row[j] ?? '').trim();
        if (headers[j]) {
          record[headers[j]] = value;
          if (value) hasContent = true;
        }
      }

      if (hasContent) {
        dataRows.push(record);
      }
    }

    if (dataRows.length === 0) {
      return { success: false, error: 'Excel file has headers but no data rows.' };
    }

    console.log(`[parseExcel] Sheet: "${sheetName}", Headers: [${headers.join(', ')}], Data rows: ${dataRows.length}`);

    // Delegate to the CSV parser pipeline (same bank detection + row parsing)
    return parseCSVRows(headers, dataRows);

  } catch (err: any) {
    console.error('[parseExcel] Error:', err);
    return {
      success: false,
      error: `Failed to parse Excel file: ${err.message || 'Unknown error'}`,
    };
  }
}
