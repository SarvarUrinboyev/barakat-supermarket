import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiApi, CustomerApi, OrderApi } from '../api/endpoints.js';
import { ConfirmDialog } from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { useT } from '../context/Settings.jsx';
import { shiftIso, todayIso } from '../lib/format.js';
import { localizedErrorMessage } from '../lib/localizedError.js';

/**
 * Floating AI CFO — ask "Bugun foyda nega kamaydi?", "Qaysi tovar narxini
 * oshiray?", "Kim qarzni kechiktiryapti?" anywhere. The backend answers from
 * the shop's own data (read-only tool calls) and may attach ACTION suggestions
 * which render here as buttons:
 *   • ORDER / NOTIFY  — executed inline (with a confirm) via the normal,
 *     permission-gated write endpoints;
 *   • DISCOUNT / PRICE — open the relevant prefilled page (promo / product).
 * The AI never mutates anything itself — the user always confirms.
 */
const SUGGESTIONS = [
  'Bugun foyda nega kamaydi?',
  'Qaysi tovar narxini oshiray?',
  'Kim qarzni kechiktiryapti?',
];

export function AiChatWidget() {
  const t = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: 'ai', translationKey: "Salom! Men AI CFO yordamchingizman. \"Bugun foyda nega kamaydi?\" yoki \"Kim qarzni kechiktiryapti?\" deb so'rang.", actions: [] },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);   // { action } pending inline execute
  const [acting, setActing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' });
  }, [open, msgs]);

  const recentTurns = () => {
    const turns = [];
    for (let i = 0; i < msgs.length - 1; i += 1) {
      if (msgs[i].role === 'user' && msgs[i + 1]?.role === 'ai') {
        turns.push({ question: msgs[i].text, answer: msgs[i + 1].text });
      }
    }
    return turns.slice(-5);
  };

  const send = async (preset) => {
    const q = (preset ?? input).trim();
    if (!q || busy) return;
    const history = recentTurns();
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const resp = await AiApi.ask(q, history);
      setMsgs((m) => [...m, { role: 'ai', text: resp.answer, actions: resp.actions || [] }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: 'ai', text: `⚠️ ${localizedErrorMessage(t, err)}`, actions: [] }]);
    } finally {
      setBusy(false);
    }
  };

  // DISCOUNT / PRICE → open the right prefilled page; ORDER / NOTIFY → confirm + run.
  const onAction = (a) => {
    if (a.type === 'PRICE' && a.params?.productId) {
      navigate(`/warehouse/${a.params.productId}`);
      setOpen(false);
      return;
    }
    if (a.type === 'DISCOUNT') {
      navigate('/promos');
      setOpen(false);
      return;
    }
    setConfirm({ action: a });
  };

  const execute = async () => {
    const a = confirm.action;
    setActing(true);
    try {
      if (a.type === 'ORDER') {
        await OrderApi.create({
          orderDate: todayIso(),
          deliveryDate: shiftIso(3),
          name: `${a.params.productName} — qayta buyurtma`,
          supplier: '',
          amount: a.params.estAmountUsd ?? 0,
          note: 'AI CFO tavsiyasi',
        });
        toast.success(t('Buyurtma yaratildi'));
      } else if (a.type === 'NOTIFY') {
        const r = await CustomerApi.notify(a.params.customerId, { template: 'DEBT' });
        toast.success(t('Eslatma yuborildi') + (r?.channel ? ` (${r.channel})` : ''));
      } else if (a.type === 'NOTIFY_ALL') {
        const r = await CustomerApi.remindDebtors();
        const sent = (r?.telegram ?? 0) + (r?.sms ?? 0);
        toast.success(`${t('Eslatma yuborildi')}: ${sent}/${r?.debtors ?? 0} ${t('mijoz')}`
          + (r?.noChannel ? ` (${r.noChannel} ${t('kanalsiz')})` : ''));
      }
      setConfirm(null);
    } catch (err) {
      toast.error(localizedErrorMessage(t, err));
    }
    setActing(false);
  };

  const confirmText = () => {
    const a = confirm?.action;
    if (!a) return '';
    if (a.type === 'ORDER') {
      return t('“{name}” mahsuloti uchun qayta buyurtma yaratilsinmi?')
        .replace('{name}', a.params.productName);
    }
    if (a.type === 'NOTIFY') {
      return t('“{name}” mijoziga qarz eslatmasi yuborilsinmi?')
        .replace('{name}', a.params.customerName);
    }
    if (a.type === 'NOTIFY_ALL') {
      return t('BARCHA qarzdor mijozlarga qarz eslatmasi yuborilsinmi? Har biriga o\'z kanalida (Telegram/SMS) ketadi.');
    }
    return t('Davom etamizmi?');
  };

  const actionLabel = (action) => ({
    ORDER: t('Buyurtma yaratish'),
    NOTIFY: t('Eslatma yuborish'),
    NOTIFY_ALL: t('Eslatma yuborish'),
    PRICE: t('Narxni ko‘rib chiqish'),
    DISCOUNT: t('Aksiyani ko‘rib chiqish'),
  })[action?.type] || t('Davom etish');

  return (
    <>
      <button className="ai-chat-fab" onClick={() => setOpen((v) => !v)} title={t('AI CFO')}>
        🤖
      </button>
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-head">
            <strong>🤖 {t('AI CFO')}</strong>
            <button
              style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', fontSize: 20 }}
              onClick={() => setOpen(false)}
              title={t('Yopish')}
              aria-label={t('Yopish')}
            >×</button>
          </div>
          <div className="ai-chat-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i}>
                <div className={`ai-msg ${m.role}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {m.translationKey ? t(m.translationKey) : m.text}
                </div>
                {m.actions && m.actions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0 10px' }}>
                    {m.actions.map((a, j) => (
                      <button
                        key={j}
                        type="button"
                        title={actionLabel(a)}
                        onClick={() => onAction(a)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 14,
                          border: '1px solid var(--brand-primary, #3b82f6)',
                          background: 'var(--brand-primary, #3b82f6)', color: '#fff', cursor: 'pointer',
                        }}
                      >
                        {actionLabel(a)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {msgs.length === 1 && !busy && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(t(s))}
                    style={{
                      fontSize: 12, padding: '4px 10px', borderRadius: 14,
                      border: '1px solid var(--brand-primary, #3b82f6)',
                      background: 'transparent', color: 'var(--brand-primary, #3b82f6)', cursor: 'pointer',
                    }}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>
            )}
            {busy && <div className="ai-msg ai">⋯</div>}
          </div>
          <div className="ai-chat-foot">
            <input
              type="text"
              placeholder={t('Savolingizni yozing...')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={busy}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={busy || !input.trim()}>
              {busy ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.action.type === 'ORDER' ? t('Buyurtma yaratish') : t('Eslatma yuborish')}
          message={confirmText()}
          confirmLabel={acting ? t('Bajarilmoqda...') : t('Tasdiqlash')}
          confirmTone="btn-primary"
          onConfirm={execute}
          onCancel={() => (acting ? null : setConfirm(null))}
        />
      )}
    </>
  );
}
