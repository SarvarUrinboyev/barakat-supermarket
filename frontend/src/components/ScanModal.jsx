import { useRef, useState } from 'react';
import { ProductApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';

/**
 * Barcode scanner dialog. A USB scanner behaves like a keyboard: it
 * "types" the barcode into the focused input and presses Enter. A known
 * barcode adds +1 stock; an unknown one opens a quick new-product form.
 */
export function ScanModal({ categories, onClose, onChanged }) {
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [log, setLog] = useState([]);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useT();

  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [categoryId, setCategoryId] = useState('');

  const refocus = () => setTimeout(() => inputRef.current?.focus(), 30);

  const handleScan = async (raw) => {
    const barcode = (raw || '').trim();
    setCode('');
    if (!barcode || busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await ProductApi.scan({ barcode });
      if (result.found) {
        setLog((entries) => [
          {
            id: Date.now(),
            kind: 'ok',
            text: `${result.product.name} — ${t('qoldiq:')} ${result.product.quantity} ${t('dona')}`,
          },
          ...entries,
        ]);
        onChanged();
        refocus();
      } else {
        setName('');
        setPurchasePrice('');
        setSalePrice('');
        setQuantity('1');
        setCategoryId('');
        setPending(barcode);
      }
    } catch (err) {
      toast.error(err.message);
      refocus();
    }
    setBusy(false);
  };

  const createPending = async () => {
    if (!name.trim()) {
      toast.error(t('Mahsulot nomini kiriting'));
      return;
    }
    setBusy(true);
    try {
      const created = await ProductApi.create({
        name: name.trim(),
        barcode: pending,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        quantity: parseInt(quantity, 10) || 0,
        categoryId: categoryId ? Number(categoryId) : null,
      });
      setLog((entries) => [
        {
          id: Date.now(),
          kind: 'new',
          text: `${created.name} ${t("omborga qo'shildi")} (${created.quantity} ${t('dona')})`,
        },
        ...entries,
      ]);
      setPending(null);
      onChanged();
      refocus();
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  return (
    <Modal
      title={t('Shtrix kod skaneri')}
      wide
      onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>{t('Yopish')}</button>}
    >
      {pending ? (
        <div>
          <div className="badge badge-karta" style={{ marginBottom: 12 }}>
            {t('Yangi shtrix kod:')} {pending}
          </div>
          <p className="muted" style={{ marginBottom: 10 }}>
            {t("Bu kod omborda yo'q. Mahsulot ma'lumotlarini kiriting:")}
          </p>
          <div className="field">
            <label>{t('Mahsulot nomi *')}</label>
            <input className="input" autoFocus value={name}
                   onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>{t('Kelish narxi (USD)')}</label>
              <input className="input" type="number" value={purchasePrice}
                     onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>{t('Sotilish narxi (USD)')}</label>
              <input className="input" type="number" value={salePrice}
                     onChange={(e) => setSalePrice(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>{t('Soni (dona)')}</label>
              <input className="input" type="number" value={quantity}
                     onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('Toifa')}</label>
              <select className="select" value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">{t('Tanlanmagan')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" disabled={busy}
                    onClick={() => { setPending(null); refocus(); }}>
              {t('Bekor')}
            </button>
            <button className="btn btn-primary" onClick={createPending} disabled={busy}>
              {busy ? t('Saqlanmoqda...') : t("Omborga qo'shish")}
            </button>
          </div>
        </div>
      ) : (
        <div className="field">
          <label>{t('Shtrix kod')}</label>
          <input
            ref={inputRef}
            className="input"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleScan(e.target.value);
              }
            }}
            placeholder={t('Skanerlang yoki kodni kiriting + Enter')}
            style={{ fontSize: 18, fontFamily: 'monospace', letterSpacing: '.04em' }}
          />
          <div className="field-hint">
            {t("Skanerni mahsulot shtrix kodiga tuting — kod o'zi kiritiladi. Mavjud mahsulot: miqdori +1 bo'ladi. Yangi kod: ma'lumot so'raladi.")}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <h2>{t('Skanerlangan')}</h2>
          <span className="hint">{log.length} {t('ta')}</span>
        </div>
        <div className="card-pad">
          {log.length === 0 ? (
            <div className="faint" style={{ fontSize: 13 }}>{t('Hali skanerlanmadi.')}</div>
          ) : (
            <div className="list-stack">
              {log.map((entry) => (
                <div key={entry.id} style={{ fontSize: 13 }}>
                  <b className={entry.kind === 'new' ? 'amount-pos' : ''}>
                    {entry.kind === 'new' ? '🆕 ' : '✓ '}
                  </b>
                  {entry.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
