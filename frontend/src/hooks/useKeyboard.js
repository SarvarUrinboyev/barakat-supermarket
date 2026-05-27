import { useEffect } from 'react';

/**
 * Global keyboard-shortcut hook.
 *
 * `bindings` is a map from shortcut string -> handler. Shortcut syntax:
 *   "F2", "F9"            — function keys
 *   "Escape", "Enter"
 *   "ctrl+k", "ctrl+s"    — ctrl/alt/shift modifiers, case-insensitive
 *   "ctrl+shift+p"
 *
 * Typing inside an <input>, <textarea> or contenteditable element does
 * NOT trigger a shortcut, EXCEPT for Escape and the explicit Ctrl/Alt
 * modifier shortcuts (so Ctrl+S still saves while you're typing).
 *
 * The hook re-registers when `bindings` changes — pass a stable object
 * (memoised or module-level) to avoid re-binding on every render.
 */
export function useKeyboard(bindings) {
  useEffect(() => {
    if (!bindings) return undefined;
    const normalised = Object.fromEntries(
      Object.entries(bindings).map(([k, v]) => [normalise(k), v]),
    );

    const handler = (e) => {
      const key = e.key === ' ' ? 'space' : e.key;
      const combo = [
        e.ctrlKey || e.metaKey ? 'ctrl' : '',
        e.altKey ? 'alt' : '',
        e.shiftKey ? 'shift' : '',
        key.toLowerCase(),
      ].filter(Boolean).join('+');
      const fn = normalised[combo];
      if (!fn) return;
      // Don't hijack typing unless this is a modifier combo or Escape.
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select'
        || e.target?.isContentEditable;
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const escape = key === 'Escape';
      if (typing && !hasModifier && !escape) return;

      e.preventDefault();
      fn(e);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bindings]);
}

function normalise(shortcut) {
  return String(shortcut)
    .toLowerCase()
    .split('+')
    .map((s) => s.trim())
    .filter(Boolean)
    .sort((a, b) => priority(a) - priority(b))
    .join('+');
}

function priority(token) {
  if (token === 'ctrl' || token === 'cmd' || token === 'meta') return 0;
  if (token === 'alt') return 1;
  if (token === 'shift') return 2;
  return 3;
}
