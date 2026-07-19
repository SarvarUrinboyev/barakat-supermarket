// Build-time configuration for the SavdoPRO frontend.
//
// The DESKTOP build leaves these unset. The hosted WEB (merchant portal) build
// sets them at build time, e.g.:
//   VITE_TARGET=web
//   VITE_API_URL=https://app.savdopro.uz       (omit if API is same-origin)
//
// API_ORIGIN === '' means "same origin": the Spring Boot JAR serves both the
// SPA and the API (how the desktop and a single-origin web deploy both run,
// and what the Vite dev proxy expects). Set VITE_API_URL only when the API
// lives on a different host than the SPA.

const env = import.meta.env || {};

/** True for the hosted multi-tenant web build. */
export const IS_WEB = String(env.VITE_TARGET || '').toLowerCase() === 'web';

/** Explicit sample-data signal; never inferred from hostnames or API origins. */
export const IS_DEMO_DATA = String(env.VITE_DEMO_DATA || '').toLowerCase() === 'true';

/** HTTP origin of the data API ('' = same origin). No trailing slash. */
export const API_ORIGIN = (env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * The License API is always same-origin. This path is intentionally fixed so
 * neither a build argument nor browser storage can select an upstream host.
 */
export const LICENSE_GATEWAY_PATH = '/api/license';

/** ws(s):// origin for the STOMP socket, derived from API_ORIGIN (or the
 *  current page when same-origin). */
export function wsOrigin() {
  const httpOrigin = API_ORIGIN || window.location.origin;
  return httpOrigin.replace(/^http/, 'ws'); // http->ws, https->wss
}
