// HTTP client for the SavdoPRO License Server.
//
// The License Server owns accounts / users / subscriptions centrally. The
// browser reaches it only through the backend's same-origin /api/license
// gateway; the private upstream origin is server-side configuration.
//
// Phase 3.2 refresh flow:
//   - Login stores BOTH an access JWT (~1h TTL) and a refresh token (~7d).
//   - On any 401 the client transparently calls /api/auth/refresh with
//     the stored refresh token, persists the new pair, and retries the
//     original request once. Only if the refresh itself fails do we
//     wipe credentials and surface the auth error.
//   - In-flight refreshes are coalesced via a single promise so 20
//     parallel requests don't trigger 20 refreshes.

import { getToken, setToken } from './client.js';
import { LICENSE_GATEWAY_PATH } from '../config.js';

const REFRESH_KEY = 'savdopro.refreshToken';

export function getLicenseUrl() {
  return LICENSE_GATEWAY_PATH;
}

// Existing endpoint definitions retain their License Server /api prefix; the
// browser-facing gateway intentionally exposes the same route after /api/license.
export function getLicenseGatewayUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/api/')) {
    throw new TypeError('License route must begin with /api/.');
  }
  return `${LICENSE_GATEWAY_PATH}${path.slice('/api'.length)}`;
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_KEY);
  }
}

let onUnauthorized = null;

/** Register a callback that fires when the License Server rejects auth. */
export function setLicenseUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/**
 * Persist a fresh access + refresh pair from a login or refresh response.
 * Called by the AuthProvider; centralised here so we have a single place
 * to keep the two tokens in sync.
 */
export function persistAuthPair(response) {
  if (!response) return;
  if (response.token) setToken(response.token);
  if (response.refreshToken) setRefreshToken(response.refreshToken);
}

/** Wipe both tokens — used on logout and on irrecoverable refresh failure. */
export function clearAuthPair() {
  setToken(null);
  setRefreshToken(null);
  // Also drop the active shop id so a logout (or a dead session) never leaves a
  // stale tenant header for whoever logs in next. Literal key matches
  // ACTIVE_SHOP_KEY in client.js (kept inline to avoid an import cycle).
  try { localStorage.removeItem('savdopro.activeShopId'); } catch { /* ignore */ }
}

// In-flight refresh promise; null when no refresh is happening. Every
// concurrent caller awaits the same promise, so parallel 401s only
// trigger one refresh round-trip.
let refreshInFlight = null;

async function refreshOnce() {
  if (refreshInFlight) return refreshInFlight;
  const stored = getRefreshToken();
  if (!stored) return null;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(getLicenseGatewayUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      persistAuthPair(data);
      return data.token;
    } catch (_) {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// The backend has a matching bounded upstream timeout; this browser-side
// timeout keeps the UI responsive if the public backend is unreachable.
const FETCH_TIMEOUT_MS = 8_000;

function buildOptions(method, body) {
  const options = { method, headers: {} };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const token = getToken();
  if (token) options.headers.Authorization = `Bearer ${token}`;
  return options;
}

function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function rawFetch(method, path, body) {
  const options = buildOptions(method, body);
  return fetchWithTimeout(getLicenseGatewayUrl(path), options);
}

async function request(method, path, body) {
  let response;
  try {
    response = await rawFetch(method, path, body);
  } catch {
    throw new LicenseError(
      "License xizmatiga ulanib bo'lmadi. Internet va backend holatini tekshiring.",
      0,
    );
  }

  // 401 → try a silent refresh and replay the original request once.
  // Skip the dance on the refresh endpoint itself to avoid loops.
  if (response.status === 401 && path !== '/api/auth/refresh') {
    const fresh = await refreshOnce();
    if (fresh) {
      try {
        response = await rawFetch(method, path, body);
      } catch {
        throw new LicenseError(
          "License Server'ga ulanib bo'lmadi.",
          0,
        );
      }
    }
  }

  if (response.status === 401 || response.status === 403) {
    clearAuthPair();
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
