import { useState } from 'react';
import { useToast } from './Toast.jsx';
import { useT } from '../context/Settings.jsx';
import { exportXlsx } from '../lib/xlsxExport.js';

/**
 * "Excel'ga eksport" button — drops a multi-sheet xlsx alongside any
 * page that has tabular data. The caller passes either an inline rows
 * array (synchronous) or a getRows() function (async, fetched on click)
 * so a list page doesn't have to lift the entire dataset into memory
 * unless the user actually exports.
 */
export function ExportButton({ filename, rows, sheets, getRows, getSheets, label, ariaLabel }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      let payload = sheets;
      if (!payload) {
        if (getSheets) payload = await getSheets();
        else {
          const r = getRows ? await getRows() : rows;
          payload = [{ name: 'Sheet1', rows: r || [] }];
        }
      }
      if (!payload || payload.every((s) => !s.rows || s.rows.length === 0)) {
        toast.error(t("Eksport uchun ma'lumot yo'q"));
        return;
      }
      await exportXlsx(filename, payload);
      toast.success(t('Eksport tayyor'));
    } catch (err) {
      toast.error(err.message || t("Eksport qilib bo'lmadi"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      className="btn btn-ghost"
      onClick={handle}
      disabled={busy}
      aria-label={ariaLabel || t("Excel'ga eksport")}
    >
      {busy ? t('Eksport qilinmoqda...') : (label || `📊 ${t("Excel'ga eksport")}`)}
    </button>
  );
}
