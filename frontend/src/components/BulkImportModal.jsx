import { useState } from 'react';
import { useT } from '../context/Settings.jsx';
import { money } from '../lib/format.js';
import { Modal } from './Modal.jsx';
import { PaymentBadge } from './ui.jsx';
import { useToast } from './Toast.jsx';

const PLACEHOLDER = `21.05.2026
1)Telefon g'ilofi 5 berildi
2)Quloqchin 12 kassadan
3)Zaryadlovchi 20 kartadan`;

/**
 * "Ko'p kiritish" dialog: paste old-notebook text, preview the parsed
 * rows, then commit. `api` must expose bulkPreview / bulkImport.
 */
export function BulkImportModal({ api, onClose, onDone }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useT();

  const runPreview = async () => {
    if (!text.trim()) {
      toast.error(t('Avval matnni kiriting'));
      return;
    }
    setBusy(true);
    try {
      setPreview(await api.bulkPreview({ text }));
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const runSave = async () => {
    setBusy(true);
    try {
      const result = await api.bulkImport({ text });
      const extra = result.skippedCount
        ? `, ${result.skippedCount} ${t("ta o'tkazib yuborildi")}`
        : '';
      toast.success(`${result.savedCount} ${t('ta yozuv saqlandi')}${extra}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t("Ko'p kiritish")}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Yopish')}
          </button>
          <button className="btn btn-accent" onClick={runPreview} disabled={busy}>
            {t("Ko'rib chiqish")}
          </button>
          <button
            className="btn btn-primary"
            onClick={runSave}
            disabled={busy || !preview || preview.validCount === 0}
          >
            {busy ? t('Saqlanmoqda...') : `${t('Saqlash')} (${preview?.validCount ?? 0})`}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t('Eski daftar matni')}</label>
        <textarea
          className="input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={t(PLACEHOLDER)}
          rows={7}
        />
        <div className="field-hint">
          {t("Har bir qatorda: nomi, summa va to'lov turi. Birinchi qatorga sanani yozing.")}
        </div>
      </div>

      {preview && (
        <div className="card mt-8">
          <div className="card-head">
            <h2>{t('Tekshiruv')} &middot; {preview.date}</h2>
            <span className="hint">
              {preview.validCount} {t("ta to'g'ri")}, {preview.invalidCount} {t('ta xato')}
            </span>
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('Nomi')}</th>
                  <th className="num">{t('Summa')}</th>
                  <th>{t("To'lov")}</th>
                  <th>{t('Holat')}</th>
                </tr>
              </thead>
              <tbody>
                {preview.lines.map((line) => (
                  <tr key={line.lineNumber}>
                    <td>{line.lineNumber}</td>
                    <td className="name-cell">{line.name || line.raw}</td>
                    <td className="num">{line.valid ? money(line.amount) : '-'}</td>
                    <td>{line.valid ? <PaymentBadge type={line.paymentType} /> : '-'}</td>
                    <td>
                      {line.valid ? (
                        <span className="badge badge-naqd">{t("To'g'ri")}</span>
                      ) : (
                        <span className="badge badge-qarzga" title={line.error}>
                          {line.error}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
