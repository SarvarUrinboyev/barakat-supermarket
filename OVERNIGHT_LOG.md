# Work log — `feat/web-multitenant-hardening`

**Base:** `main` (`700fc3b`) · **Date:** 2026-05-30 · **Status:** not merged, no PR.

Hardens the backend for a hosted, multi-tenant **web merchant portal** and adapts
the existing React SPA into that portal. Every change targets the web deployment
(the desktop/Electron build keeps working: embedded H2, localhost license server,
kiosk conveniences).

## Test status (real numbers)

| Module | Command | Result |
|---|---|---|
| backend | `./mvnw -o test` | **104 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS** |
| license-server | `./mvnw -o test` | **62 tests, 0 failures, 0 errors, 0 skipped — BUILD SUCCESS** |
| frontend | `npm run build` | builds clean (no automated test suite exists) |

No `@Disabled`/`@Ignore`, no stubs/TODO in new code. One existing test file was
intentionally updated (`PermissionServiceTest`) to match the new — broader, not
weaker — permission matrix.

## Commits (oldest → newest)

1. `5660227` **feat(tenancy): enforce X-Shop-Id ownership and fail-closed scoping** — `TenantFilter` validates the `X-Shop-Id` header belongs to the caller's account (cross-tenant → 403); `TenantFilterAspect` rethrows instead of running unscoped; native sales-report queries scoped by the active shop(s).
2. `6bc98de` **feat(authz): enforce granular RESOURCE:ACTION permissions** — License Server mints the effective permission set into the JWT (`perms`); backend maps it to authorities and enforces per endpoint in `SecurityConfig` via a wildcard `PermissionChecker`; expanded taxonomy/role defaults (owner = full account control, cashier = front-of-shop); permission-denied → distinct `403 {code:FORBIDDEN}`.
3. `0ce181b` **feat(realtime): authenticate WebSocket + per-shop topics** — STOMP CONNECT requires a Bearer JWT (channel interceptor); events on `/topic/shops/{shopId}/…`; SUBSCRIBE authorized against the account; configurable origins.
4. `f681623` **fix(backend): correctness, validation, per-shop constraints, PostgreSQL** — payments-timeline sort; `orderStatus` NPE; loyalty unified on `LoyaltyService` (fixes USD under-crediting); POS/refund/customer-tx/order validation; `DataIntegrityViolation → 409`; V22 widens stale global UNIQUE (`categories.name`, `terminal_balances.date`) to per-shop; Postgres driver + `prod` datasource.
5. `dd33723` **test(backend): context-load smoke test + test profile** — `@SpringBootTest` boots the whole app on in-mem H2 and applies every Flyway migration (incl. V15/V22 Java migrations).
6. `064824c` **feat(web): adapt the SPA into a hosted multi-tenant merchant portal** — env-driven API/License/WS origins; JWT on STOMP CONNECT + per-shop subscribe; 403-FORBIDDEN shown inline (not a logout); no plaintext-password persistence on web; real route guards (role + module); shift-gate skipped on web; mobile nav.
7. `bfbe437` **feat(reports): value historical sales at the sale-time price snapshot** — V23 + `StockMovement` snapshot fields populated at both SALE sites; Management/Analytics value sales via `COALESCE(snapshot, current price)`; end-to-end test included.
8. `64cad2a` **test(tenancy): native report queries exclude other shops' rows** — `@DataJpaTest`, two shops seeded, asserts shop A's queries exclude shop B *(gap c)*.
9. `734fd5a` **test(authz): end-to-end MockMvc proof of per-endpoint 403/200** — anon→401, report w/o perm→403, w/ perm→200, delete w/o write-perm→403 *(gap d)*.
10. `2115335` **test(tenancy): tenant-filter aspect fails closed** — forces filter-activation failure and asserts the call is refused (rethrows, never proceeds) *(gap b)*.

## Phase-1 security fixes — each now proven by a test

| Fix | Proving test | Asserts |
|---|---|---|
| X-Shop-Id ownership | `TenantFilterTest` | foreign shop → 403 + chain never runs; owned → scope set, 200 |
| Fail-closed tenant filter | `TenantFilterAspectTest` | activation failure → rethrow, `proceed()` never called |
| Native query shop scoping | `StockMovementRepositoryTenantScopeTest` | shop A queries exclude shop B's rows (all 3 native queries) |
| Per-endpoint authorization | `AuthorizationEndpointTest` | real endpoint → 401/403/200 by permission |

## Operational notes (before running the web build)

- **Re-login required after deploy.** Old tokens lack the `perms` claim → backend denies until a fresh login/refresh (≤1h). Deploy the License Server too (it mints `perms`); both share `SAVDOPRO_JWT_SECRET`.
- **Web build:** `VITE_TARGET=web VITE_LICENSE_URL=https://… [VITE_API_URL=…] npm run build` (see `frontend/.env.example`).
- **Postgres (prod):** `SPRING_PROFILES_ACTIVE=prod` + `DB_URL`/`DB_USER`/`DB_PASSWORD` + `SAVDOPRO_JWT_SECRET` + `WEB_ALLOWED_ORIGINS`. Desktop is unaffected (stays on H2).

## Still open (optional, tracked — not started)

- Pagination on high-growth lists (sales history, customer transactions) — changes API response shape + needs frontend paging UI.
- Web polish: hide in-page hardware UI (printer picker, cash-drawer, `window.print` Z-report, scale/voice) when `IS_WEB`.
- `PaymentService` loyalty unit test (the consolidation is covered indirectly; a direct unit test is still worthwhile).
