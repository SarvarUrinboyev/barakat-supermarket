import { useEffect, useState } from 'react';

/** Like useState, but the value is persisted in localStorage under `key`. */
export function useStickyState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore persistence failure */
    }
  }, [key, value]);

  return [value, setValue];
}
