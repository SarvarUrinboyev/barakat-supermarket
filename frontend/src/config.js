// Build-time configuration for the SavdoPRO frontend.
//
// The DESKTOP build leaves these unset and keeps the legacy same-origin /
// localhost behaviour. The hosted WEB (merchant portal) build sets them at
// build time, e.g.:
//   VITE_TARGET=web
//   VITE_API_URL=https://app.savdopro.uz       (omit if API is same-origin)
//   VITE_LICENSE_URL=https://auth.savdopro.uz
//
// API_ORIGIN === '' means "same origin": the Spring Boot JAR serves both the
// SPA and the API (how the desktop and a single-origin web deploy both run,
// and what the Vite dev proxy expects). Set VITE_API_URL only when the API
// lives on a different host than the SPA.

const env = import.meta.env || {};

/** True for the hosted multi-tenant web build. */
export const IS_WEB = String(env.VITE_TARGET || '').toLowerCase() === 'web';

/** HTTP origin of the data API ('' = same origin). No trailing slash. */
export const API_ORIGIN = (env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Fixed License Server origin for the web build, or null to fall back to the
 * legacy desktop resolution (query param -> localStorage -> localhost).
 */
export const LICENSE_ORIGIN = (env.VITE_LICENSE_URL || '').replace(/\/+$/, '') || null;

/** ws(s):// origin for the STOMP socket, derived from API_ORIGIN (or the
 *  current page when same-origin). */
export function wsOrigin() {
  const httpOrigin = API_ORIGIN || window.location.origin;
  return httpOrigin.replace(/^http/, 'ws'); // http->ws, https->wss
}
