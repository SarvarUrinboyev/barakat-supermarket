import { useState } from 'react';
import { ShopApi } from '../api/endpoints.js';
import { ConfirmDialog, Modal } from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import {
  EmptyState, Loader, PageHeader,
} from '../components/ui.jsx';
import { useAuth } from '../context/Auth.jsx';
import { useT } from '../context/Settings.jsx';
import { useShop } from '../context/Shop.jsx';
import { useApi } from '../hooks/useApi.js';

/**
 * Shops management — account owner can add new shops, rename, mark the
 * main shop and delete (non-main) ones. Hidden from regular shop users
 * (the App.jsx route check redirects them away).
 */
export function Shops() {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const { reload: reloadShops } = useShop();
  const { data, loading, error, reload } = useApi(() => ShopApi.list(), []);
  const [modal, setModal] = useState(null);

  const shops = data || [];
  const isOwner = user?.role === 'ACCOUNT_OWNER' || user?.role === 'SUPER_ADMIN';

  const refresh = async () => {
    await reload();
    await reloadShops();
  };

  const setMain = async (s) => {
    if (s.main) return;
    try {
      await ShopApi.setMain(s.id);
      toast.success(t("Asosiy do'kon o'zgartirildi"));
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await ShopApi.remove(modal.item.id);
      toast.success(t("Do'kon o'chirildi"));
      setModal(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={t("Do'konlar")}
        desc={t("Akkauntingizdagi do'konlarni boshqarish")}
      >
        {isOwner && (
          <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>
            + {t("Yangi do'kon")}
          </button>
        )}
      </PageHeader>

      <Loader loading={loading} error={error} onRetry={reload}>
        {shops.length === 0 ? (
          <EmptyState icon="🏪" text={t("Do'kon yo'q")} />
        ) : (
          <div className="grid grid-2 section">
            {shops.map((s) => (
              <div key={s.id} className={`shop-card ${s.main ? 'main' : ''}`}>
                <div className="shop-card-head">
                  <div>
                    <h3>🏪 {s.name}</h3>
                    {s.address && <div className="shop-addr">{s.address}</div>}
                    {s.contactPhone && (
                      <div className="shop-phone mono">{s.contactPhone}</div>
                    )}
                  </div>
                  {s.main && (
                    <span className="shop-main-badge">{t('ASOSIY')}</span>
                  )}
                </div>
                {isOwner && (
                  <div className="shop-actions">
                    {!s.main && (
                      <button className="btn-debt outline" onClick={() => setMain(s)}>
                        ⭐ {t('Asosiy qil')}
                      </button>
                    )}
                    <button
                      className="btn-debt icon"
                      title={t('Tahrirlash')}
                      onClick={() => setModal({ type: 'edit', item: s })}
                    >✏️</button>
                    <button
                      className="btn-debt icon danger"
                      title={t("O'chirish")}
                      disabled={s.main}
                      onClick={() => setModal({ type: 'delete', item: s })}
                    >🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Loader>

      <div className="card section">
        <div className="card-pad">
          <div className="hint" style={{ fontSize: 12 }}>
            ℹ️ {t("Hozir do'kon switcher faollashtirildi va har bir do'kon alohida sub-tenant sifatida saqlanmoqda. Keyingi versiyada har do'kon o'z mahsuloti, mijozi, kassasi bilan to'liq ajratiladi.")}
          </div>
        </div>
      </div>

      {modal?.type === 'create' && (
        <ShopFormModal
          title={t("Yangi do'kon")}
          onSubmit={async (body) => {
            await ShopApi.create(body);
            toast.success(t("Do'kon yaratildi"));
            await refresh();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'edit' && (
        <ShopFormModal
          title={t("Do'konni tahrirlash")}
          initial={modal.item}
          onSubmit={async (body) => {
            await ShopApi.update(modal.item.id, body);
            toast.success(t("Do'kon yangilandi"));
            await refresh();
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={t("Do'konni o'chirish")}
          message={t("Ushbu do'konni o'chirmoqchimisiz?")}
          confirmLabel={t("O'chirish")}
          onConfirm={confirmDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function ShopFormModal({ title, initial, onSubmit, onClose }) {
  const t = useT();
  const [name, setName] = useState(initial?.name || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [phone, setPhone] = useState(initial?.contactPhone || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError(t("Do'kon nomi kiritilishi shart"));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || null,
        contactPhone: phone.trim() || null,
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
        <label>{t("Do'kon nomi *")}</label>
        <input className="input" autoFocus value={name}
               onChange={(e) => setName(e.target.value)}
               placeholder="Chilonzor filiali" />
      </div>
      <div className="field">
        <label>{t('Manzil')}</label>
        <input className="input" value={address}
               onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="field">
        <label>{t('Telefon')}</label>
        <input className="input" value={phone}
               onChange={(e) => setPhone(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div>}
    </Modal>
  );
}
