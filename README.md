# SavdoPRO — Multi-Tenant Cloud POS SaaS

**Live at [savdopro.uz](https://savdopro.uz)**

SavdoPRO is a production multi-tenant cloud point-of-sale (POS) platform for retail shops in Uzbekistan — especially phone/electronics stores. Shop owners and cashiers ring up sales (kassa), manage inventory (ombor) with barcode scanning and national-catalogue (MXIK) auto-fill, track customer debt (qarz), handle per-unit **IMEI/device lifecycle** (intake → sale → verify, with Apple ID capture), run fiscalization, and view dashboards and reports. It ships as a **hosted web portal, an Electron desktop kiosk, and a mobile app**, all on a shared Spring Boot backend, with a **separate licensing/billing microservice**.

> Tenants (shops) are isolated at the database layer; a super-admin operates the SaaS platform itself.

---

## Architecture — five deployable modules

1. **Backend** — Spring Boot 3.3 / Java 21: 324 main Java files (33 controllers, 95 services, 57 JPA entities), layered domain/repository/dto/service/controller.
2. **License server** — a separate Spring Boot service (own DB) for activation, billing (Click/Payme), refresh tokens, and admin audit.
3. **Web portal** — React 18 + Vite SPA (40 pages).
4. **Desktop** — Electron 33 kiosk with auto-update (`electron-updater`), bundling the web SPA.
5. **Mobile** — Flutter (Dart/Riverpod) customer app + a React Native/Expo companion ([savdopro-mobile](https://github.com/SarvarUrinboyev/savdopro-mobile)).

### Database-layer multi-tenancy (done right)
Tenant isolation is enforced **in the persistence layer**, not in business code: a `TenantFilter` resolves shop scope from the JWT, `TenantContext` carries it, and a **fail-closed** `TenantFilterAspect` activates a Hibernate `@Filter` (`WHERE shop_id = :shopId`) on every service call — **refusing to run a query unscoped** rather than risk leaking cross-tenant rows. A consolidated multi-shop mode (`shop_id IN (:shopIds)`) supports owners with several stores.

## Tech Stack

**Java 21** · **Spring Boot 3.3** (Web, Data JPA, Security, WebSocket, AOP, Actuator, Mail) · **PostgreSQL** / H2 (dev) · **Flyway** · **Hibernate `@Filter`** row-level multi-tenancy · **jjwt** · **springdoc-openapi** · **Micrometer + Prometheus** · **Sentry** · Apache POI + OpenPDF (Excel/PDF) · **React 18 + Vite** · **Electron 33** · **Flutter / Dart** (Riverpod, dio, go_router) · **Docker / docker-compose** · **GitHub Actions** · **Click/Payme** + **Telegram Bot** + **Eskiz** SMS.

## At a Glance

| | |
|---|---|
| Code | ~68,500 LOC (Java + JS/JSX + SQL) |
| Backend | 324 Java files · 33 controllers · 95 services · 57 entities (+ 59-file license server) |
| Tests | **307 automated tests** (215 backend + 92 license-server), gated in CI on every push/PR |
| Database | 47 Flyway migrations (34 backend + 13 license) |
| Releases | **35 tagged releases** (v1.4 → v2.3) across 145 conventional commits |
| Public API | API keys + OpenAPI docs + webhooks |
| Notable | LLM assistant (multi-provider, tool-calling) · rule-based sales-anomaly detection with real-time alerts · recency-weighted demand forecasting · IMEI/Apple-ID device tracking · MXIK national-catalogue barcode auto-fill |

## Security

- JWT auth where `JwtService` **refuses to boot** on a weak/placeholder secret unless an explicit dev opt-in flag is set.
- API-key filter for the public API, per-tenant rate limiting, WebSocket auth interceptor, and an admin audit log.
- **All secrets externalized** via `${ENV:default}` — DB, JWT, Telegram, SMS, payment, SMTP — with no real credentials in tracked files; only `*.example` placeholders are committed.

## Operations

docker-compose deploy (backend + license + Postgres), scripted VPS provisioning, Postgres backup cron + restore drill, Prometheus/Micrometer metrics, Sentry, and two GitHub Actions workflows (CI quality gate + deploy).

## License

Proprietary — production SaaS codebase, shared as an engineering work sample.
---

## ProofTwin AI Build Week demo architecture

**ProofTwin AI** is evidence-backed retail decision intelligence for the
existing SavdoPRO POS. **Prove every number. Simulate every decision.** It turns
raw store transactions into verified decisions, compares three possible
futures, and never spends without human approval. It does not guess. It proves,
simulates, and waits for human approval.

The product combines deterministic Gross Profit evidence, the ProofTwin
Scenario Engine, grounded multilingual Ask Your Store, ProofTwin Copilot, and
human-approved draft-only procurement review.
It uses synthetic demo data, an immutable evidence/action ledger, and preserves
human approval boundaries. It does not autonomously submit orders, receive
goods, send supplier notifications, make payments, mutate inventory, or change
selling prices.

### Same-origin License gateway

For the Railway demo topology, the bundled React portal calls the fixed
same-origin `/api/license` path. The public backend applies a closed mapping
allowlist and calls the separate License Server over private networking. The
browser never selects, receives, or calls the License Server origin.

The gateway forwards only a bearer token when the existing contract requires
one. It rejects arbitrary upstream hosts/paths/queries, redirects, cookies,
hop-by-hop headers, and forwarded-host headers; it bounds JSON bodies and uses
safe timeouts/errors. Backend authorization independently requires
`SUPER_ADMIN` for License admin routes.

### Railway demo boundary

- Public: `savdograph-backend` only, serving the SPA, backend API,
  `/api/license`, and `/actuator/health`.
- Private: `savdograph-license` with file-backed H2 on a persistent `/data`
  volume, plus PostgreSQL for backend demo data and Flyway V1–V46.
- Build Week-specific configuration and manual deployment/rollback steps are in
  [the Railway variable matrix](docs/build-week/RAILWAY_VARIABLE_MATRIX.md),
  [deployment contract](docs/build-week/RAILWAY_DEMO_DEPLOYMENT.md), and
  [rollback guide](docs/build-week/RAILWAY_ROLLBACK.md).

No public demo URL is claimed here. Railway resources, domains, databases,
volumes, deployments, payment providers, remote SavdoPRO/TezGo systems, and
OpenAI are outside this repository change and require explicit approvals.

### Build Week scope and verification

SavdoPRO’s core POS, licensing service, payment/provider integrations, and
production workflow pre-existed Build Week. Build Week adds the evidence-led
ProofTwin Decision Center and the demo-safe gateway/runtime packaging; it
does not recast the pre-existing platform as new work. Current commands and
recorded results are maintained in
[Testing Instructions](docs/build-week/TESTING_INSTRUCTIONS.md).
