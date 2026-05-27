import { useEffect, useRef, useState } from 'react';
import { AiApi } from '../api/endpoints.js';
import { useT } from '../context/Settings.jsx';

/**
 * Floating AI chat button + panel. Sits on top of every page so the
 * shop-owner can ask "O'tgan haftada qancha sotdik?" anywhere.
 *
 * State lives in this component (not global) so the conversation
 * resets on page change — that's intentional: each session is a
 * fresh query against the same backend snapshot.
 */
export function AiChatWidget() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: "Salom! Men SavdoPRO AI yordamchisiman. Misol uchun \"O'tgan oyda qancha sotdik?\" deb so'rang." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' });
  }, [open, msgs]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    try {
      const resp = await AiApi.ask(q);
      setMsgs((m) => [...m, { role: 'ai', text: resp.answer }]);
    } catch (err) {
      setMsgs((m) => [...m, { role: 'ai', text: '⚠️ ' + (err.message || 'Xatolik') }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="ai-chat-fab"
        onClick={() => setOpen((v) => !v)}
        title={t('AI yordamchi')}
      >
        🤖
      </button>
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-head">
            <strong>🤖 {t('AI yordamchi')}</strong>
            <button
              style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', fontSize: 20 }}
              onClick={() => setOpen(false)}
            >×</button>
          </div>
          <div className="ai-chat-body" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}`}>{m.text}</div>
            ))}
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
            <button className="btn btn-primary" onClick={send} disabled={busy || !input.trim()}>
              {busy ? '...' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
