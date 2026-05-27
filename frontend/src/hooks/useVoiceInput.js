import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Web Speech API wrapper. Returns:
 *   - {supported}     true on Chromium / Edge / Safari; false on Firefox
 *   - {listening}     true while the mic is active
 *   - {transcript}    interim + final transcript (resets on start())
 *   - {start, stop}   control the recognizer
 *
 * Uses {@code ru-RU} as the recognition locale by default because the
 * O'zbekiston Web Speech API doesn't ship a {@code uz-UZ} model — Uzbek
 * speakers using mixed-language commands still work via Russian phonetics.
 * Locale is configurable.
 */
export function useVoiceInput({ lang = 'ru-RU', continuous = false } = {}) {
  const SR = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const recRef = useRef(null);
  const [supported] = useState(Boolean(SR));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!SR) return undefined;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    rec.onerror = (e) => { setError(e.error || 'unknown'); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.abort(); } catch { /* */ } };
  }, [SR, lang, continuous]);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    setError(null); setTranscript('');
    try { recRef.current.start(); setListening(true); }
    catch (err) { setError(err.message); }
  }, [listening]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* */ }
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
