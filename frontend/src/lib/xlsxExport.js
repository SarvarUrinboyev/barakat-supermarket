// Excel export helper — wraps the ExcelJS library so the rest of the app
// calls a single `exportXlsx(filename, sheets)` and we keep the workbook
// surface area in one file (easy to swap if we ever change libraries).
//
// We only need plain strings + numbers for accountant reports — no
// formulas or styling — so the simple `ws.columns + addRows` path is
// enough. Opens cleanly in Excel and Google Sheets alike.

import ExcelJS from 'exceljs';

/**
 * Write one or more sheets to an .xlsx file and trigger a browser download.
 *
 * @param {string} filename  e.g. "savdolar-2026-05-27" — ".xlsx" is appended
 * @param {Array<{name: string, rows: Array<object>}>} sheets
 *   Each sheet is a name + an array of plain objects. The keys of the
 *   first row become the column headers; subsequent rows that are
 *   missing a key get an empty cell.
 * @returns {Promise<void>}  ExcelJS writes the buffer asynchronously.
 */
export async function exportXlsx(filename, sheets) {
  const wb = new ExcelJS.Workbook();
  sheets.forEach(({ name, rows }) => {
    const ws = wb.addWorksheet(safeSheetName(name));
    if (rows && rows.length) {
      const keys = Object.keys(rows[0]);
      // Auto-fit column widths to the longest cell value (capped at 60).
      ws.columns = keys.map((key) => {
        const maxLen = rows.reduce((acc, row) => {
          const v = row[key] == null ? '' : String(row[key]);
          return Math.max(acc, v.length);
        }, key.length);
        return { header: key, key, width: Math.min(60, Math.max(8, maxLen + 2)) };
      });
      ws.addRows(rows);
    }
  });
  const buffer = await wb.xlsx.writeBuffer();
  const fname = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  triggerDownload(buffer, fname);
}

/**
 * Convenience overload — one sheet, one file. Same as calling
 * exportXlsx(filename, [{ name: 'Sheet1', rows }]).
 *
 * @returns {Promise<void>}
 */
export async function exportSheet(filename, rows, sheetName = 'Sheet1') {
  await exportXlsx(filename, [{ name: sheetName, rows }]);
}

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Excel forbids these chars in sheet names; ExcelJS would throw.
function safeSheetName(name) {
  return String(name).replace(/[\\/?*:[\]]/g, '_').slice(0, 31);
}
