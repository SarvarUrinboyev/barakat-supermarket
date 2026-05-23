import { useEffect } from 'react';
import { useT } from '../context/Settings.jsx';

/** Centered modal dialog with overlay, ✕ button and optional footer. */
export function Modal({ title, onClose, children, footer, wide }) {
  const t = useT();
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose} aria-label={t('Yopish')}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Yes/No confirmation built on top of {@link Modal}. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmTone = 'btn-red',
  onConfirm,
  onCancel,
}) {
  const t = useT();
  const label = confirmLabel ?? t('Tasdiqlash');
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>
            {t('Bekor qilish')}
          </button>
          <button className={`btn ${confirmTone}`} onClick={onConfirm}>
            {label}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}
