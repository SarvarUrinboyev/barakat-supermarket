import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity via the global online/offline events.
 *
 * Note: navigator.onLine is best-effort — a captive portal can claim
 * you're online when no traffic actually flows. For the POS queue this
 * is still good enough: a failed POST is retried via the queue regardless.
 */
export function useOnline() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}
