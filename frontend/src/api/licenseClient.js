// HTTP client for the SavdoPRO License Server.
//
// The License Server owns accounts / users / subscriptions centrally
// — it lives on a separate port (9090 in dev) and, in production,
// on the operator's VPS. All other API traffic still goes to the
// local backend at :8086 via the regular `api` client.
//
// The URL is resolved in this order:
//   1. ?licenseUrl=... query parameter (injected by Electron main.js)
//   2. localStorage.savdopro.licenseUrl (set via the in-app settings)
//   3. http://localhost:9090 (dev fallback)

import { getToken, setToken } from './client.js';

const LICENSE_URL_KEY = 'savdopro.licenseUrl';
const DEFAULT_URL = 'http://localhost:9090';

function urlFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('licenseUrl');
    if (fromQuery) {
      localStorage.setItem(LICENSE_URL_KEY, fromQuery);
      return fromQuery;
    }
  } catch (_) { /* SSR safety */ }
  return null;
}

export function getLicenseUrl() {
  return urlFromQuery()
    || localStorage.getItem(LICENSE_URL_KEY)
    || DEFAULT_URL;
}

export function setLicenseUrl(url) {
  if (url) {
    localStorage.setItem(LICENSE_URL_KEY, url);
  } else {
    localStorage.removeItem(LICENSE_URL_KEY);
  }
}

let onUnauthorized = null;

/** Register a callback that fires when the License Server rejects auth. */
export function setLicenseUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  const base = getLicenseUrl().replace(/\/+$/, '');
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const token = getToken();
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${base}${path}`, options);
  } catch {
    throw new LicenseError(
      "License Server'ga ulanib bo'lmadi. Internet va server URL'ini tekshiring.",
      0,
    );
  }

  if (response.status === 401 || response.status === 403) {
    setToken(null);
    if (onUnauthorized) onUnauthorized(response.status);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? safeParse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.detail || data?.title
      || `Xatolik yuz berdi (${response.status})`;
    throw new LicenseError(message, response.status, data?.fieldErrors);
  }
  return data;
}

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export class LicenseError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.name = 'LicenseError';
    this.status = status;
    this.fieldErrors = fieldErrors || null;
  }
}

export const licenseApi = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body ?? {}),
  patch: (path, body) => request('PATCH', path, body ?? {}),
  del: (path) => request('DELETE', path),
};
