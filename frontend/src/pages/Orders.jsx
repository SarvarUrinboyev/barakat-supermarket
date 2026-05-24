import { useState } from 'react';
import { OrderApi } from '../api/endpoints.js';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useT } from '../context/Settings.jsx';
import { EmptyState, Loader, PageHeader } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { PAYMENT_LABELS, formatDate, money, todayIso, usd } from '../lib/format.js';

export function Orders() {
  const { data, loading, error, reload } = useApi(() => OrderApi.grouped(), []);
  const [modal, setModal] = useState(null);
  const toast = useToast();
  const t = useT();

  const close = () => setModal(null);

  const confirmDelete = async () => {
    try {
      await OrderApi.remove(modal.item.id);
      toast.success(t("Buyurtma o'chirildi"));
      close();
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title={t('Buyurtmalar')} desc={t('Kelishi kutilayotgan tovarlarni kuzatish')}>
        <button className="btn btn-primary" onClick={() => setModal({ type: 'add' })}>
          + {t('Buyurtma')}
        </button>
      </PageHeader>

      <Loader loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <OrderSection
              tag="tag-red"
              title={t('Bugun kelishi kerak')}
              orders={data.today}
              actions={{ setModal }}
            />
            <OrderSection
              tag="tag-red"
              title={t('Kelmagan')}
              orders={data.overdue}
              actions={{ setModal }}
            />
            <OrderSection
              tag="tag-amber"
              title={t('Kutilayotgan')}
              orders={data.upcoming}
              actions={{ setModal }}
            />
          </>
        )}
      </Loader>

      {modal?.type === 'add' && (
        <OrderFormModal
          title={t('Yangi buyurtma')}
          onSubmit={async (body) => {
            await OrderApi.create(body);
            toast.success(t("Buyurtma qo'shildi"));
            reload();
          }}
          onClose={close}
        />
      )}

      {modal?.type === 'edit' && (
        <OrderFormModal
          title={t('Buyurtmani tahrirlash')}
          initial={modal.item}
          onSubmit={async (body) => {
            await OrderApi.update(modal.item.id, body);
            toast.success(t('Buyurtma yangilandi'));
            reload();
          }}
          onClose={close}
        />
      )}

      {modal?.type === 'complete' && (
        <OrderCompleteModal
          order={modal.item}
          onSubmit={async (body) => {
            await OrderApi.complete(modal.item.id, body);
            toast.success(t("Tovar qabul qilindi va xarajatga qo'shildi"));
            reload();
          }}
          onClose={close}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Buyurtmani o'chirish")}
          message={`"${modal.item.name}" ${t("buyurtmasini o'chirmoqchimisiz?")}`}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={close}
        />
      )}
    </>
  );
}

function OrderSection({ tag, title, orders, actions }) {
  const t = useT();
  return (
    <div className="card section">
      <div className="card-head">
        <div className="section-label" style={{ margin: 0 }}>
          <span className={`tag ${tag}`} />
          {title}
        </div>
        <span className="hint">{orders.length} {t('ta')}</span>
      </div>
      <div className="card-pad">
        {orders.length === 0 ? (
          <EmptyState icon="📦" text={t("Buyurtma yo'q")} />
        ) : (
          <div className="grid grid-2">
            {orders.map((o) => (
              <div className="line-item" key={o.id}>
                <div className="li-top">
                  <div>
                    <div className="li-name">{o.name}</div>
                    <div className="li-meta">
                      {o.supplier ? `${o.supplier} · ` : ''}
                      {t('Yetkazish:')} {formatDate(o.deliveryDate)}
                    </div>
                  </div>
                  <div className="mono" style={{ fontWeight: 700 }}>
                    {usd(o.amount)}
                  </div>
                </div>
                <div className="li-actions">
                  <button
                    className="btn btn-green btn-sm"
                    onClick={() => actions.setModal({ type: 'complete', item: o })}
                  >
                    ✓ {t('Keldi')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => actions.setModal({ type: 'edit', item: o })}
                  >
                    {t('Tahrirlash')}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => actions.setModal({ type: 'delete', item: o })}
                  >
                    {t("O'chirish")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderFormModal({ title, initial, onSubmit, onClose }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [orderDate, setOrderDate] = useState(initial?.orderDate ?? todayIso());
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? todayIso());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();

  const submit = async () => {
    if (!name.trim()) {
      setError(t('Tovar nomi kiritilishi shart'));
      return;
    }
    if (!deliveryDate) {
      setError(t('Yetkazib berish sanasini tanlang'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        supplier: supplier.trim() || null,
        amount: Number(amount) || 0,
        orderDate,
        deliveryDate,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{t('Tovar nomi')}</label>
        <input className="input" autoFocus value={name}
               onChange={(e) => setName(e.target.value)} placeholder={t('Masalan: Cola 1.5L')} />
      </div>
      <div className="field">
        <label>{t('Yetkazib beruvchi (ixtiyoriy)')}</label>
        <input className="input" value={supplier}
               onChange={(e) => setSupplier(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('Summa (USD)')}</label>
        <input className="input" type="number" value={amount}
               onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </div>
      <div className="form-row">
        <div className="field">
          <label>{t('Buyurtma sanasi')}</label>
          <input className="input" type="date" value={orderDate}
                 onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div className="field">
          <label>{t('Yetkazish sanasi')}</label>
          <input className="input" type="date" value={deliveryDate}
                 onChange={(e) => setDeliveryDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label>{t('Izoh (ixtiyoriy)')}</label>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </Modal>
  );
}

const PAY_TYPES = ['NAQD', 'KASSA', 'KARTA', 'ARALASH', 'QARZGA'];

function OrderCompleteModal({ order, onSubmit, onClose }) {
  const [amount, setAmount] = useState(order.amount || '');
  const [paymentType, setPaymentType] = useState('NAQD');
  const [cash, setCash] = useState('');
  const [naqd, setNaqd] = useState('');
  const [card, setCard] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = useT();

  const submit = async () => {
    const total = Number(amount);
    if (!total || total <= 0) {
      setError(t("To'langan summani kiriting"));
      return;
    }
    const body = { amount: total, paymentType, date: todayIso() };
    if (paymentType === 'ARALASH') {
      body.cashAmount = Number(cash) || 0;
      body.naqdAmount = Number(naqd) || 0;
      body.cardAmount = Number(card) || 0;
      // 1-tiyin tolerance: 0.1 + 0.2 !== 0.3 in IEEE-754, so strict
      // equality wrongly rejects valid splits the user typed by hand.
      if (Math.abs(body.cashAmount + body.naqdAmount + body.cardAmount - total) > 0.01) {
        setError(t("Aralash bo'laklar yig'indisi summaga teng emas"));
        return;
      }
    }
    setBusy(true);
    try {
      await onSubmit(body);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`"${order.name}" ${t('qabul qilindi')}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {t('Bekor qilish')}
          </button>
          <button className="btn btn-green" onClick={submit} disabled={busy}>
            {busy ? t('Saqlanmoqda...') : t('Tasdiqlash')}
          </button>
        </>
      }
    >
      <p className="muted" style={{ marginBottom: 14 }}>
        {t("Tovar keldi. To'langan summa va to'lov turini kiriting — bu avtomatik ravishda xarajatlar bo'limiga qo'shiladi.")}
      </p>
      <div className="field">
        <label>{t("To'langan summa (USD)")}</label>
        <input className="input" type="number" autoFocus value={amount}
               onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="field">
        <label>{t("To'lov turi")}</label>
        <div className="chip-row">
          {PAY_TYPES.map((pt) => (
            <button key={pt} type="button"
                    className={`chip ${paymentType === pt ? 'active' : ''}`}
                    onClick={() => setPaymentType(pt)}>
              {t(PAYMENT_LABELS[pt])}
            </button>
          ))}
        </div>
      </div>
      {paymentType === 'ARALASH' && (
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div className="field">
            <label>{t('Kassa')}</label>
            <input className="input" type="number" value={cash}
                   onChange={(e) => setCash(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('Naqd')}</label>
            <input className="input" type="number" value={naqd}
                   onChange={(e) => setNaqd(e.target.value)} />
          </div>
          <div className="field">
            <label>{t('Karta')}</label>
            <input className="input" type="number" value={card}
                   onChange={(e) => setCard(e.target.value)} />
          </div>
        </div>
      )}
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </Modal>
  );
}
