import { useState } from 'react';
import { CategoryApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';
import { useApi } from '../hooks/useApi.js';
import { ConfirmDialog, Modal } from './Modal.jsx';
import { useToast } from './Toast.jsx';
import { EmptyState, Loader } from './ui.jsx';

/** Modal to view, add and delete product categories ("Toifalar"). */
export function CategoryManager({ onClose }) {
  const t = useT();
  const { data, loading, error, reload } = useApi(() => CategoryApi.list(), []);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const toast = useToast();

  const categories = data || [];

  const add = async () => {
    if (!name.trim()) {
      return;
    }
    setBusy(true);
    try {
      await CategoryApi.create({ name: name.trim() });
      setName('');
      toast.success(t("Toifa qo'shildi"));
      reload();
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  };

  const doRemove = async (category) => {
    try {
      await CategoryApi.remove(category.id);
      toast.success(t("Toifa o'chirildi"));
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <Modal
      title={t('Toifalar')}
      onClose={onClose}
      footer={<button className="btn btn-ghost" onClick={onClose}>{t('Yopish')}</button>}
    >
      <div className="flex gap-8" style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder={t('Yangi toifa nomi')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn btn-primary" onClick={add} disabled={busy}>
          {t("Qo'shish")}
        </button>
      </div>
      <Loader loading={loading} error={error} onRetry={reload}>
        {categories.length === 0 ? (
          <EmptyState icon="🗂" text={t("Hali toifa yo'q")} />
        ) : (
          <div className="list-stack">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex-between"
                style={{
                  padding: '9px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <span>
                  <b>{c.name}</b>{' '}
                  <span className="faint">&middot; {c.productCount} {t('mahsulot')}</span>
                </span>
                <button
                  className="icon-btn danger"
                  title={t("O'chirish")}
                  onClick={() => setConfirmRemove(c)}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </Loader>
      {confirmRemove && (
        <ConfirmDialog
          title={t("Toifani o'chirish")}
          message={`"${confirmRemove.name}" ${t("toifasini o'chirishni tasdiqlaysizmi")}?`}
          confirmLabel={t("O'chirish")}
          onConfirm={() => doRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </Modal>
  );
}
