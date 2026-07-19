# Railway variable matrix

This is a source-proven configuration contract for the isolated
`demo` environment. It contains variable names and safe roles only, never
secret values. It does not create a Railway resource or deployment.

The backend and License Server share one `SAVDOPRO_JWT_SECRET`: the License
Server signs the session JWT and the backend verifies it. There is no separate
backend-to-License API key in the committed source.

## Backend service: `savdograph-backend`

| Variable | Required | Secret | Source | Redeploy | Safe use |
|---|---|---:|---|---|---|
| `PORT` | Railway supplied | no | Railway runtime | automatic | Spring listens on `${PORT:8086}`. Do not set a fixed public port. |
| `SERVER_ADDRESS` | yes | no | manual | yes | Set `0.0.0.0` so the Railway container listener is reachable. |
| `SPRING_PROFILES_ACTIVE` | yes | no | manual | yes | Set `staging`; never use `prod` for this demo because the guarded seed is disabled there. |
| `SPRING_DATASOURCE_URL` | yes | no | Railway reference/manual | yes | Private Railway PostgreSQL JDBC URL for the demo database only. |
| `SPRING_DATASOURCE_USERNAME` | yes | no | Railway reference/manual | yes | Demo PostgreSQL username only. |
| `SPRING_DATASOURCE_PASSWORD` | yes | yes | Railway reference/manual | yes | Demo PostgreSQL password only. |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | yes | no | manual | yes | Set `org.postgresql.Driver`; the local default is H2. |
| `SAVDOPRO_JWT_SECRET` | yes | yes | Railway secret/reference | yes | Same strong value supplied to `savdograph-license`; never expose it to the browser. |
| `LICENSE_SERVER_URL` | yes | no | Railway reference/manual | yes | Private License Server origin only. It is read only by the backend gateway and is never built into the SPA. |
| `LICENSE_GATEWAY_CONNECT_TIMEOUT_MS` | optional | no | manual | yes | Bounded private-upstream connect timeout; default `3000`, capped by code. |
| `LICENSE_GATEWAY_RESPONSE_TIMEOUT_MS` | optional | no | manual | yes | Bounded private-upstream response timeout; default `8000`, capped by code. |
| `LICENSE_GATEWAY_MAX_REQUEST_BYTES` | optional | no | manual | yes | JSON request limit; default `262144`. |
| `LICENSE_GATEWAY_MAX_RESPONSE_BYTES` | optional | no | manual | yes | JSON response limit; default `1048576`. |
| `ALLOW_DEMO_SEED` | yes | no | manual | yes | Set `true` only for the dedicated synthetic demo database. |
| `DEMO_SEED_PASSWORD` | yes | yes | Railway secret | yes | Strong seed-only password for idempotent synthetic demo users. |
| `VITE_TARGET` | yes, build time | no | manual build variable | rebuild | Set `web` for the hosted demo SPA. |
| `VITE_DEMO_DATA` | yes, build time | no | manual build variable | rebuild | Set `true` so the permanent Demo Data badge is baked into the SPA. |
| `VITE_API_URL` | optional, build time | no | manual build variable | rebuild | Leave blank for the public backend’s same-origin SPA/API topology. |
| `WEB_ALLOWED_ORIGINS` | optional | no | manual | yes | Only if a separately proven backend CORS setting needs it; leave blank for same-origin demo traffic. |
| `OPENAI_API_KEY` | optional | yes | Railway secret | yes | Server-only, only if separately authorized; never put it in a Vite variable. |
| `OPENAI_MODEL` | optional | no | manual | yes | Allowed server model selector; default source contract remains `gpt-5.6-terra`. |
| `OPENAI_REASONING_EFFORT` | optional | no | manual | yes | Bounded server reasoning-effort selector. |
| `OPENAI_MAX_OUTPUT_TOKENS` | optional | no | manual | yes | Bounded server output limit. |
| `OPENAI_TIMEOUT_SECONDS` | optional | no | manual | yes | Bounded server provider timeout. |
| `TELEGRAM_ENABLED` | yes for demo safety | no | manual | yes | Set `false`. |
| `WEBHOOK_ENABLED` | yes for demo safety | no | manual | yes | Set `false`. |
| `PAYME_ENABLED` / `CLICK_ENABLED` | yes for demo safety | no | manual | yes | Set both `false`; do not configure payment credentials. |

The same-origin frontend License path is fixed in committed source as
`/api/license`; there is no `VITE_LICENSE_URL` contract.

## License service: `savdograph-license`

| Variable | Required | Secret | Source | Redeploy | Safe use |
|---|---|---:|---|---|---|
| `PORT` | Railway supplied | no | Railway runtime | automatic | Spring listens on `${PORT:${SERVER_PORT:9090}}`. |
| `SERVER_ADDRESS` | optional | no | manual | yes | Default is `0.0.0.0`, which is required for the private Railway service listener. |
| `SPRING_PROFILES_ACTIVE` | yes | no | manual | yes | Set `staging`; do not use `prod` for the seeded demo. |
| `SPRING_DATASOURCE_URL` | yes | no | manual | yes | Use a file H2 URL on the mounted volume, for example the documented `/data/license-data` path; do not point it at backend PostgreSQL. |
| `SPRING_DATASOURCE_USERNAME` | yes | no | manual | yes | H2 user for the isolated License database. |
| `SPRING_DATASOURCE_PASSWORD` | yes | yes | Railway secret | yes | H2 password for the isolated License database. |
| `SPRING_DATASOURCE_DRIVER` | yes | no | manual | yes | Set `org.h2.Driver` for the file-backed demo volume. |
| `SAVDOPRO_JWT_SECRET` | yes | yes | Railway secret/reference | yes | Exact same value as the backend verifier. |
| `ALLOW_DEMO_SEED` | yes | no | manual | yes | Set `true` only for the isolated synthetic demo service. |
| `DEMO_SEED_PASSWORD` | yes | yes | Railway secret | yes | Strong password for the guarded synthetic demo users. |
| `SAVDOPRO_ADMIN_USER` | optional | no | manual | yes | Isolated super-admin login name; use a demo-only value. |
| `SAVDOPRO_ADMIN_PASSWORD` | yes | yes | Railway secret | yes | Isolated super-admin password; never use the committed development default. |
| `SAVDOPRO_ADMIN_NAME` | optional | no | manual | yes | Demo-only administrator display name. |
| `SERVER_PORT` | optional legacy fallback | no | manual | yes | Local fallback only; Railway uses `PORT` first. |

Keep optional OAuth, SMS, dunning, Telegram-alert, Click, Payme, and webhook
variables blank or disabled for the demo. No provider credentials, payment
callback, public License domain, or public PostgreSQL TCP proxy belongs in this
matrix.