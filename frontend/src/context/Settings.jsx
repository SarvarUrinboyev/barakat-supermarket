import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translate } from '../i18n/i18n.js';

const SettingsContext = createContext(null);

const THEME_KEY = 'barakat.theme';
const LANG_KEY = 'barakat.lang';

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    /* localStorage unavailable */
  }
  return 'light';
}

function readLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'uz' || saved === 'uzc' || saved === 'ru') {
      return saved;
    }
  } catch {
    /* localStorage unavailable */
  }
  return 'uz';
}

/** App-wide UI settings: colour theme (light / dark) and interface language. */
export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(readTheme);
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore persistence failure */
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uz';
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore persistence failure */
    }
  }, [lang]);

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  const t = useCallback((text) => translate(lang, text), [lang]);

  return (
    <SettingsContext.Provider
      value={{ theme, setTheme, toggleTheme, lang, setLang, t }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Shortcut hook returning just the translate function `t`. */
export function useT() {
  return useContext(SettingsContext).t;
}
