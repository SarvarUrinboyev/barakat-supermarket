# Railway demo deployment contract

This is a manual, approval-gated runbook for the existing empty Railway project
`demo` environment. It is not deployment evidence. B5.3D creates no Railway
service, database, domain, volume, variable, or deployment.

## Required public/private boundary

| Surface | Exposure | Purpose |
|---|---|---|
| `savdograph-backend` | public Railway domain only | Bundled React SPA, normal backend API, `/api/license` gateway, and `/actuator/health`. |
| `savdograph-license` | private Railway networking only | License auth, refresh, billing, admin, and `/api/health`. Never attach a public domain. |
| Railway PostgreSQL | private Railway networking only | Backend demo data and Flyway V1–V46. Never create a public TCP proxy. |

The browser calls only the public backend origin. The backend calls the private
License Server using `LICENSE_SERVER_URL`. The built frontend contains the fixed
same-origin `/api/license` path, never a License hostname.

## Exact frontend-to-gateway contract

Authentication uses a bearer access token in `Authorization` and a refresh token
in the JSON request/response body. The committed frontend does not use an
HttpOnly cookie or relay arbitrary cookies.

| Frontend operation | Method | Current License route | Authentication | Required gateway route |
|---|---|---|---|---|
| Login | `POST` | `/api/auth/login` | public JSON | `/api/license/auth/login` |
| Register | `POST` | `/api/auth/register` | public JSON | `/api/license/auth/register` |
| Signup configuration | `GET` | `/api/auth/signup/config` | public | `/api/license/auth/signup/config` |
| Signup OTP | `POST` | `/api/auth/signup/request-otp` | public JSON | `/api/license/auth/signup/request-otp` |
| Google social login | `POST` | `/api/auth/social/google` | public JSON | `/api/license/auth/social/google` |
| Telegram login | `POST` | `/api/auth/telegram` | public JSON | `/api/license/auth/telegram` |
| Facebook social login | `POST` | `/api/auth/social/facebook` | public JSON | `/api/license/auth/social/facebook` |
| X social login | `POST` | `/api/auth/social/x` | public JSON | `/api/license/auth/social/x` |
| Forgot password | `POST` | `/api/auth/forgot-password` | public JSON | `/api/license/auth/forgot-password` |
| Reset password | `POST` | `/api/auth/reset-password` | public JSON | `/api/license/auth/reset-password` |
| Refresh session | `POST` | `/api/auth/refresh` | public JSON refresh token | `/api/license/auth/refresh` |
| Logout | `POST` | `/api/auth/logout` | public JSON refresh token | `/api/license/auth/logout` |
| Current session | `GET` | `/api/auth/me` | bearer | `/api/license/auth/me` |
| Billing status | `GET` | `/api/billing/status` | bearer | `/api/license/billing/status` |
| Billing checkout | `POST` | `/api/billing/checkout` | bearer JSON | `/api/license/billing/checkout` |
| Payment history | `GET` | `/api/billing/payments` | bearer | `/api/license/billing/payments` |
| Admin audit | `GET` | `/api/admin/audit?page=&size=` | bearer + `SUPER_ADMIN` | `/api/license/admin/audit?page=&size=` |
| Admin accounts | `GET` / `POST` | `/api/admin/accounts` | bearer + `SUPER_ADMIN` | `/api/license/admin/accounts` |
| Admin account | `GET` / `PUT` / `DELETE` | `/api/admin/accounts/{id}` | bearer + `SUPER_ADMIN` | `/api/license/admin/accounts/{id}` |
| Admin grant/block/modules | `POST` / `PATCH` | `/api/admin/accounts/{id}/grant`, `/block`, `/modules` | bearer + `SUPER_ADMIN` | matching `/api/license/admin/accounts/{id}/…` route |
| Admin user create | `POST` | `/api/admin/accounts/{id}/users` | bearer + `SUPER_ADMIN` | `/api/license/admin/accounts/{id}/users` |
| Admin user password/permissions/delete | `PATCH` / `DELETE` | `/api/admin/users/{id}/password`, `/permissions`, or `{id}` | bearer + `SUPER_ADMIN` | matching `/api/license/admin/users/{id}/…` route |

No other License Server endpoint is exposed by the gateway. In particular,
TOTP, SMS, Telegram link management, audit export, MFA enforcement, and billing
webhooks/callbacks are not browser gateway mappings.

## Gateway security contract

- Only the server-side `LICENSE_SERVER_URL` configures the upstream origin.
- Every controller mapping selects a fixed method and fixed upstream path; no
  wildcard proxy, client URL, client host, query-selected host, CONNECT, or
  WebSocket tunnel exists.
- Only a bearer `Authorization` header is forwarded when present. The gateway
  generates `Accept`, `Content-Type`, and `User-Agent`; it does not relay
  client `Host`, `Cookie`, hop-by-hop, or `X-Forwarded-*` headers.
- JSON request and response bodies are bounded. The upstream client has bounded
  connect/response timeouts and rejects redirects.
- Upstream 5xx/unavailable, redirect, invalid content, oversized body, and
  private-hostname leakage return safe JSON errors. Request/response bodies and
  credentials are not logged by the gateway.
- Gateway paths skip local account-stub creation and tenant fallback so they do
  not create backend account, shop, payment, inventory, or supplier state.

## Manual Railway creation sequence

Do these steps only after a new explicit deployment approval.

1. Create a Railway PostgreSQL service in the existing `demo` environment.
   Keep it private. Configure only the backend’s datasource reference; it must
   be a fresh demo database so backend Flyway applies V1 through V46.
2. Create `savdograph-license` from branch `feat/build-week-savdograph-ai` with
   source directory `license-server`. Its committed `railway.json` uses the
   local License Dockerfile and `/api/health`. Do not attach a public domain.
3. Attach a persistent volume to `savdograph-license` at `/data`. Set the H2
   JDBC URL to the mounted file path described in the variable matrix. This is
   intentionally a separate H2/Flyway history from backend PostgreSQL.
4. Set the License variables from `RAILWAY_VARIABLE_MATRIX.md`, including an
   isolated strong admin password, guarded demo seed, and shared JWT secret.
5. Create `savdograph-backend` from the repository root on the same branch.
   The root `railway.json` selects `backend/Dockerfile` and `/actuator/health`.
   Attach its public domain only after health is green.
6. Set backend datasource values from the private PostgreSQL reference, set
   `SERVER_ADDRESS=0.0.0.0`, `SPRING_PROFILES_ACTIVE=staging`, guarded demo
   seed variables, safe integration opt-outs, and the private License reference.
   Use the same JWT secret as the License service.
7. Build with `VITE_TARGET=web` and `VITE_DEMO_DATA=true`; leave
   `VITE_API_URL` blank. The rendered Demo Data badge is mandatory.
8. Verify, with synthetic data only: public backend `/actuator/health`, private
   License `/api/health`, login/refresh through `/api/license`, backend Flyway
   V1–V46, License persistence after restart, and absence of a public License
   or PostgreSQL endpoint.

Do not configure TezGo/SavdoPRO remote hosts, Redis, payment integrations,
supplier messaging, a public License domain, a public database proxy, or an
OpenAI key without separate approval.

## Local contract evidence

The gateway integration test starts an in-process fake License upstream. It
proves exact mappings, bearer-only forwarding, backend `SUPER_ADMIN` defense,
rejected unknown/method/query/traversal inputs, safe failure mappings, response
limits, timeout behavior, and no local account stub creation. It never contacts
Railway, a provider, production, or an external credential service.