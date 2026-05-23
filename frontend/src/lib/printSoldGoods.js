// Builds a printable sold-goods report and sends it to the printer / PDF.
// The report is rendered as a standalone A4 document inside a hidden iframe,
// so the app's own print stylesheet (the 80mm receipt) never interferes.

import { formatDate, formatDateTime, todayIso, usd } from './format.js';

/** Escapes text for safe insertion into the report HTML. */
function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[ch]));
}

/** Renders the report HTML into a hidden iframe and opens the print dialog. */
function printHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const remove = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  };

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  win.onafterprint = remove;
  // Give the document a moment to lay out, then open the print dialog.
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(remove, 60000); // fallback if onafterprint never fires
  }, 250);
}

/**
 * Opens a print / save-as-PDF dialog for the given sold-goods report.
 *
 * @param {object} report  SoldGoodsReport payload from the backend
 * @param {function} t     translator from useT()
 */
export function printSoldGoods(report, t) {
  const rows = report.lines.map((line) => `
      <tr>
        <td>${esc(formatDateTime(line.soldAt))}</td>
        <td>${esc(line.productName)}</td>
        <td class="num">${esc(line.quantity)}</td>
        <td class="num">${esc(usd(line.unitPrice))}</td>
        <td class="num">${esc(usd(line.unitCost))}</td>
        <td class="num">${esc(usd(line.lineRevenue))}</td>
        <td class="num">${esc(usd(line.lineProfit))}</td>
        <td>${esc(line.note || '')}</td>
      </tr>`).join('');

  const title = t('Sotilgan tovarlar hisoboti');
  const html = `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #1a1a1a; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
  h1 { font-size: 17px; margin: 0 0 3px; }
  .meta { font-size: 11px; color: #555; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #b9c2cc; padding: 5px 7px; }
  th { text-align: left; }
  thead th { background: #1e3a5f; color: #fff; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  tbody tr:nth-child(even) { background: #f4f6f9; }
  tfoot td { font-weight: 700; background: #e8edf3; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">
    ${esc(t('Davr'))}: ${esc(formatDate(report.from))} — ${esc(formatDate(report.to))}
    &nbsp;&middot;&nbsp; ${esc(t('Jami'))}: ${esc(report.totalUnits)} ${esc(t('dona'))}
    &nbsp;&middot;&nbsp; ${esc(t('Hisobot sanasi'))}: ${esc(formatDate(todayIso()))}
  </div>
  <table>
    <thead>
      <tr>
        <th>${esc(t('Sana'))}</th>
        <th>${esc(t('Mahsulot'))}</th>
        <th class="num">${esc(t('Soni'))}</th>
        <th class="num">${esc(t('Sotuv narxi'))}</th>
        <th class="num">${esc(t('Tan narxi'))}</th>
        <th class="num">${esc(t('Summa'))}</th>
        <th class="num">${esc(t('Foyda'))}</th>
        <th>${esc(t('Izoh'))}</th>
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
    <tfoot>
      <tr>
        <td>${esc(t('Jami'))}</td>
        <td></td>
        <td class="num">${esc(report.totalUnits)}</td>
        <td></td>
        <td></td>
        <td class="num">${esc(usd(report.totalRevenue))}</td>
        <td class="num">${esc(usd(report.totalProfit))}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  printHtml(html);
}
