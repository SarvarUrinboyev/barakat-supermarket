import { Modal } from './Modal.jsx';
import { useT } from '../context/Settings.jsx';
import { buildNakladnoyText, printNakladnoyText } from '../lib/printNakladnoy.js';

/**
 * Modal that shows the nakladnoy chek on screen before sending it to the
 * printer. The user verifies the content, then clicks "Chop etish" — only
 * then do we open the system print dialog.
 */
export function NakladnoyPreview({ customer, date, items, paid = 0, note, onClose }) {
  const t = useT();
  const text = buildNakladnoyText({ customer, date, items, paid, note });
  return (
    <Modal
      title={t('Nakladnoy ko\'rinishi')}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('Yopish')}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              printNakladnoyText(text);
              onClose();
            }}
          >
            🖨 {t('Printerga yuborish')}
          </button>
        </>
      }
    >
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        {t('80mm chek qog\'oz uchun. Tekshiring va printerga yuboring.')}
      </p>
      <pre className="nakladnoy-preview">{text}</pre>
    </Modal>
  );
}
