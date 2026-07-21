# B4 ProofTwin Decision Center Contract

## Scope and route

B4 is a frontend-only consumer of the committed B1, B2, B3, and B3.5
contracts. The authenticated application exposes `/savdograph` inside the
existing `Layout` and sidebar. The navigation item is visible only when the
server-issued `/me.permissions` contains `SAVDOGRAPH:READ` (or `*:*`). Direct
access by another user renders a safe denial state and does not start a
ProofTwin feature API request.

The page never accepts shop/account/tenant authority as a form field. All API
calls reuse the authenticated client and its active `X-Shop-Id`. Consolidated
`ALL` mode is rejected by the UI because evidence and decision writes require
one explicit store.

## Committed API matrix

| Journey | Method and route | Permission | Exact request | Primary typed response | Write |
|---|---|---|---|---|---|
| Gross Profit Brief | `POST /api/savdograph/gross-profit-briefs` | `SAVDOGRAPH:WRITE` | `periodStart`, `periodEnd` | classification, backend monetary values/counts, calculation/version, assumptions, limitations, evidence map | Yes: AnalysisRun/evidence only |
| Gross Profit retrieval | `GET /api/savdograph/gross-profit-briefs/{analysisRunId}` | `SAVDOGRAPH:READ` | path ID | same brief response | No |
| Ask Your Store | `POST /api/savdograph/ask` | `SAVDOGRAPH:READ` | strict B3 question/locale/context fields; optional explicit `productId` | typed status, language, answer, facts, evidence, assumptions, limitations, tools, next actions, audit metadata | Read boundary; deterministic tools may append analysis/evidence audit records |
| Evidence Viewer | `GET /api/savdograph/evidence-items/{id}` | `SAVDOGRAPH:READ` | path ID | immutable evidence metadata, structured input JSON, result/unit/currency, hash presence, timestamp | No |
| Product search | `GET /api/products?search=...&status=ACTIVE` | existing product read authority | query only | tenant-scoped products | No |
| Reorder simulation | `POST /api/savdograph/reorder-simulations` | `SAVDOGRAPH:WRITE` | `productId`, lookback start/end, lead/safety/forecast days | backend scenario values, classification, assumptions/risks/limitations, evidence map | Yes: AnalysisRun/evidence only |
| Reorder retrieval | `GET /api/savdograph/reorder-simulations/{analysisRunId}` | `SAVDOGRAPH:READ` | path ID | same simulation response | No |
| Supplier selection | `GET /api/suppliers` | existing supplier read authority | none | tenant-scoped suppliers; B4 retains only `id` and `name` | No |
| B3.5 bridge | `POST /api/savdograph/reorder-simulations/{analysisRunId}/proposals` | `SAVDOGRAPH:WRITE` | exactly `{ "supplierId": <numeric Long> }` | server-derived pending proposal, classification, quantity, source run, evidence, assumptions/risks/limitations, idempotent flag | Yes: pending proposal and ledger event |
| Proposal list/detail | `GET /api/savdograph/proposals[/{id}]` | `SAVDOGRAPH:READ` | optional path ID | B1 proposal response | No |
| Owner approval | `POST /api/savdograph/proposals/{id}/approve` | `SAVDOGRAPH:DECIDE` plus exact backend `ACCOUNT_OWNER` check | bounded optional `reason`, retained `idempotencyKey` | confirmed decision/status, at-most-one DRAFT ID, idempotent flag, timestamp | Yes: decision, at most one PO DRAFT, ledger |
| Owner rejection | `POST /api/savdograph/proposals/{id}/reject` | same as approval | same as approval | confirmed rejection/status, no PO, idempotent flag, timestamp | Yes: decision and ledger |
| Action Ledger | `GET /api/savdograph/action-ledger` | `SAVDOGRAPH_LEDGER:READ` | none | immutable event list | No |

Validation errors remain typed HTTP errors. B4 converts network, 401/403, 404,
409, and 429 into localized safe states and never prints a stack trace. The
B3.5 bridge distinguishes initial `201`, replay `200` through the typed
`idempotent` flag, supplier/state conflict `409`, safe not-found, validation,
permission, and network failures.

## Component architecture

- `pages/SavdoGraph.jsx` owns orchestration and authenticated store context.
- `features/savdograph/model.js` owns permissions, localization, bounds,
  supplier-only bridge construction, decision request construction,
  eligibility, safe error mapping, and evidence redaction. It contains no
  financial formula.
- `features/savdograph/components.jsx` renders classifications, typed Brief,
  Ask, simulation, proposal, evidence, decision, and ledger views.
- `styles/savdograph.css` supplies route-scoped responsive/accessibility styles.
- `api/endpoints.js` exposes the committed routes without adding authority or
  client-derived proposal fields.

## Classification and financial display

`VERIFIED`, `ESTIMATED`, `INSUFFICIENT_DATA`, and `UNSUPPORTED` always include
text, a non-color symbol, and an accessible description. B4 never promotes a
classification. `ESTIMATED` results expose assumptions. Missing values render
an explicit localized unavailable state, while a backend-returned zero remains
zero. Monetary and precision strings are displayed as returned; JavaScript
does not calculate or round financial results. The Brief title is exactly
`Daily Gross Profit Brief`, and the UI never calls it Net Profit.

## Ask Your Store

The route renders the public typed B3 response as React text, never arbitrary
HTML/Markdown. It shows facts, fact evidence, classification, language,
assumptions, limitations, tools, next actions, interaction/model/prompt
metadata, and typed degraded states. Raw provider request/response, tool
protocol, hidden reasoning, credentials, and tenant authority are not rendered.

The public B3 DTO has no candidate-list field even though the internal product
search tool has bounded candidates. Therefore, on `NEEDS_CLARIFICATION`, B4
shows the backend clarification question and uses the committed tenant-scoped
product endpoint to present at most eight candidates. Resubmission requires an
explicit selection and sends the selected numeric `productId`; it never reads
or exposes internal tool output and never silently selects a candidate.

## Simulator and B3.5 proposal bridge

Product results show only name, SKU/barcode, current stock, and unit. Scenario
inputs use the backend bounds: lookback `1..90`, horizon `1..180`, lead time
`0..60`, and safety stock `0..90`. All outputs, risks, coverage, quantity, and
tied-up-capital state come from the backend response.

Simulation has no proposal side effect. `Create proposal for review` appears
only for an `ESTIMATED` result with a positive integral quantity, backend
`analysisRunId`, and immutable evidence. Its body is constructed by one helper
and contains only numeric `supplierId`; product, quantity, evidence,
classification, tenant/shop, cost/price, assumptions, risks, and status are
never submitted.

## Human decision and ledger

Decision controls require both exact frontend role `ACCOUNT_OWNER` and the
server-issued `SAVDOGRAPH:DECIDE` permission. This is visibility only; backend
authorization remains authoritative. Approval and rejection open a focus-
managed confirmation dialog, show server-derived product/quantity/supplier,
classification, assumptions, risks, and the localized DRAFT-only consequence.
No optimistic state is shown. The submit is disabled in flight, the same
idempotency key is retained across a retry, and proposal/ledger state updates
only after backend confirmation.

The Action Ledger is a read-only responsive timeline. It contains no edit or
delete action and exposes only returned actor label, event/outcome, proposal,
DRAFT, timestamp, details, and evidence references.

## Evidence safety

Evidence is rendered as escaped React text. Structured JSON is parsed and
bounded; tenant/shop/account IDs, customer/employee fields, credentials,
tokens, API keys, provider payloads, and hidden reasoning keys are removed.
The viewer shows hash presence as an integrity status, not the raw hash value.

## Localization, accessibility, and responsiveness

ProofTwin AI derives its UZ/UZC/RU/EN presentation and Ask locale from the
global application language selector, which remains the single source of truth.
The route includes localized section labels, fields, classifications, statuses,
errors, empty/loading states, confirmation copy, and demo messaging.

Dialogs/drawers use semantic headings, `role=dialog`, `aria-modal`, initial
focus, Tab/Shift+Tab containment, Escape close, and focus return. Async states
use live/status semantics; form labels and validation are explicit; controls
have visible focus; classifications do not depend on color. Route CSS covers
1440, 1024, 768, and 390 layouts, scroll-safe content, mobile dialogs, usable
touch targets, and reduced-motion preferences.

## Demo-data signal

`VITE_DEMO_DATA=true` is the only B4 sample-data signal. When set, a permanent
localized `Demo Data` banner states that the environment contains anonymized
sample data and does not write to production. B4 does not infer demo mode from
the hostname.

## Verification record

- Frontend: `npm test -- --reporter=dot` -> `99/99` passed (`13` existing plus
  `86` ProofTwin focused cases).
- Production bundle: `npm run build` -> passed, separate SavdoGraph JS/CSS
  chunks, ignored configured static output, no source map.
- Backend focused regression:
  `.\mvnw.cmd '-Dtest=SavdoGraphProposalBridgeIT,SavdoGraphControllerIT' test`
  -> `17/17` passed.
- Dedicated typecheck: not configured in `frontend/package.json`; no success is
  claimed.
- Browser: test journey exists in `e2e/savdograph.mock.spec.js`, but the local
  Playwright Chromium executable is absent. `BROWSER_VERIFICATION=DEFERRED`.
- `LIVE_OPENAI_SMOKE=DEFERRED`; B4 does not request a provider key.
- `POSTGRES_PARITY=DEFERRED`; B4 changes no backend or migration.

## B5 release boundary

B5 may perform only release-candidate validation, approved non-production live
smoke, approved PostgreSQL parity, deployment/submission preparation, and
evidence capture. It must not add product features, change formulas/evidence,
weaken permissions/tenant isolation/idempotency, introduce autonomous actions,
or touch production without a separate explicit approval gate. Start B5 only
from the clean committed B4 HEAD and re-run the preconditions in the final B4
report.
