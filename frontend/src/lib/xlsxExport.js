// Excel export helper — wraps the SheetJS ("xlsx") library so the rest
// of the app calls a single `exportXlsx(filename, sheets)` and we keep
// the SheetJS surface area in one file (easy to swap if we ever change
// libraries).
//
// SheetJS supports comma/colon dates, formulas and styling, but for the
// SavdoPRO use-case (accountant reports) we stay with plain strings +
// numbers — no formatting needed, opens cleanly in Excel and Google
// Sheets alike.

import * as XLSX from 'xlsx';

/**
 * Write one or more sheets to an .xlsx file and trigger a browser download.
 *
 * @param {string} filename  e.g. "savdolar-2026-05-27" — ".xlsx" is appended
 * @param {Array<{name: string, rows: Array<object>}>} sheets
 *   Each sheet is a name + an array of plain objects. The keys of the
 *   first row become the column headers; subsequent rows that are
 *   missing a key get an empty cell.
 */
export function exportXlsx(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows || []);
    // Auto-fit column widths to the longest cell value (capped at 60).
    if (rows && rows.length) {
      const cols = Object.keys(rows[0]).map((key) => {
        const maxLen = rows.reduce((acc, row) => {
          const v = row[key] == null ? '' : String(row[key]);
          return Math.max(acc, v.length);
        }, key.length);
        return { wch: Math.min(60, Math.max(8, maxLen + 2)) };
      });
      ws['!cols'] = cols;
    }
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(name));
  });
  const fname = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, fname);
}

/**
 * Convenience overload — one sheet, one file. Same as calling
 * exportXlsx(filename, [{ name: 'Sheet1', rows }]).
 */
export function exportSheet(filename, rows, sheetName = 'Sheet1') {
  exportXlsx(filename, [{ name: sheetName, rows }]);
}

// Excel forbids these chars in sheet names; SheetJS would throw.
function safeSheetName(name) {
  return String(name).replace(/[\\/?*:[\]]/g, '_').slice(0, 31);
}
