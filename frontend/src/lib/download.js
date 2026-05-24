// Authenticated file download helper.
//
// Backend report endpoints return `Content-Disposition: attachment` so
// the browser saves the file directly. But because every API call needs
// an Authorization header, we can't just navigate to a URL with
// `window.open(url)` — that would lose the Bearer token. Instead we
// fetch the bytes ourselves, build a `Blob`, and trigger a programmatic
// click on a hidden `<a download>`.

import { getToken } from '../api/client.js';

/**
 * Download `path` (relative to the local backend) as a file.
 * Returns a promise that resolves once the file is in the browser's
 * download tray. Throws on HTTP errors so callers can toast them.
 */
export async function downloadAuthed(path, fallbackFileName = 'savdopro.pdf') {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const shopId = localStorage.getItem('savdopro.activeShopId');
  if (token && shopId) headers['X-Shop-Id'] = shopId;

  const url = path.startsWith('http') ? path : path;   // already starts with /api
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // Try to surface a JSON `message` if the backend returned one.
    let msg = `Yuklab olishda xatolik (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch (_) { /* response isn't JSON */ }
    throw new Error(msg);
  }

  // Extract the filename the server suggested in Content-Disposition;
  // fall back to the caller-provided default.
  const disp = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disp);
  const fileName = match ? match[1] : fallbackFileName;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  // Clean up immediately — the browser has already accepted the download.
  link.remove();
  // Defer revoke a tick so Chrome's download dialog finishes reading it.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}
