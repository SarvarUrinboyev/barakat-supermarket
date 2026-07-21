# ProofTwin AI — Build Week Scope Lock

## Product promise

**ProofTwin AI is evidence-backed retail decision intelligence.** It turns raw
store transactions into verified decisions, compares three possible futures,
and never spends without human approval. It answers store questions only
through deterministic retail tools, explains each recommendation, and records
a human decision before it creates a non-financial draft.

It is not a generic chatbot and it never autonomously spends money.

## Target user

The primary user is a small-shop owner who needs to decide what to restock today
without manually reconciling sales, stock, margins, slow movers and anomalies.
A cashier or ordinary `SHOP_USER` may view only data their existing permissions
allow; approval is owner-only.

## Five-minute demo journey

Use the guarded, non-production seeded tenant only.

| Time | Owner action | Required visible proof |
|---:|---|---|
| 0:00 | Sign in as the seeded owner and select the demo shop/date. | Visible `Demo / sample data` label, shop scope, date period, and no production account. |
| 0:30 | Open **Daily Profit Brief**. | Net sales, gross profit, margin change, low stock, slow movers, anomalies and ranked actions each show a period/source badge. |
| 1:20 | Ask a fixed Uzbek, Russian, or English question, for example “What should I restock?” | The answer identifies the deterministic tool/evidence IDs it used; unsupported numeric claims are rejected or visibly unsupported. |
| 2:05 | Open one recommendation’s **Evidence Card**. | Inputs, period, calculation/version, assumptions, confidence, benefit and risk are inspectable. |
| 2:45 | Set a quantity in the **Decision Simulator**. | Stockout risk, sales coverage, tied-up capital and calculation inputs update deterministically. |
| 3:35 | Approve or reject the proposal as the owner. | Server-side proposal state, actor, timestamp, optional reason and immutable evidence snapshot are shown. |
| 4:15 | On approval, inspect the resulting purchase-order **draft** or employee task. | No order is placed, received, paid, or transmitted to a supplier. |
| 4:40 | Open **Action Ledger**. | Proposal → evidence → decision → draft result is visible as one immutable timeline. |

## Scope classification

All six experiences are mandatory only as a deliberately narrow vertical slice.
The deadline is 2026-07-21 17:00 PDT; broadening any one of them invalidates this
scope lock.

| Core experience | Classification | Locked implementation boundary |
|---|---|---|
| Daily Profit Brief | `MUST_HAVE` | One typed owner brief for a selected shop and day/range. Use net sale/sale-item P&L semantics, not the known discount/refund-incomplete SKU movement calculation. |
| Ask Your Store | `MUST_HAVE` | Tool-only answers for a finite retail tool allowlist. Uzbek/Russian/English input is accepted; any numeric output must cite evidence IDs. No free-form numeric answer path. |
| Evidence Card | `MUST_HAVE` | Reusable structured card for every brief action and AI recommendation; period, source, calculation/version, inputs, assumptions, confidence, expected benefit and risk are persisted. |
| Decision Simulator | `MUST_HAVE` | Reorder-only, one product at a time. Inputs are product, quantity and bounded lead-time; output is coverage, stockout risk, tied-up capital and expected demand with formula inputs. |
| Human Approval | `MUST_HAVE` | Owner-only proposal state machine. Approval can create only an idempotent PO `DRAFT` or employee task. It cannot order, receive, pay, notify a supplier, or invoke a legacy direct `ORDER` action. |
| Action Ledger | `MUST_HAVE` | Immutable, tenant-scoped events linking proposal, exact evidence snapshot, decision/actor/time/reason, and resultant draft action. |

### Should-have only if the Must-have slice is green

- A second recommendation family beyond reorder, such as a slow-mover promotion
  task; it must still use the same proposal/evidence/ledger contracts.
- Explicit confidence calibration copy and uncertainty diagnostics.
- Deep mobile visual polish and expanded Playwright cases after the core journey
  passes at desktop and a 375px viewport.
- A polished employee-task destination in addition to a PO draft.

### Explicit cuts and non-goals

- Generic chat, open-ended assistant personas, autonomous agents, or unbounded
  model tool access.
- A new POS, marketplace, accounting system, delivery flow, embedded finance, or
  ERP redesign.
- Automatic purchase-order ordering, supplier communication, receipt, payment,
  or money movement.
- Historical remediation of transfer movement gaps, full multicurrency
  normalization, batch/lot expiry, or a broad dead-stock redesign. The demo uses
  a single known currency and discloses these pre-existing limitations.
- Direct reuse of `AiChatWidget`’s legacy `ORDER` action, which creates an
  insufficiently specified legacy order rather than a server-approved PO draft.

## Architecture changes

### New backend domain boundary

Add a small `savdograph` module/package rather than extending generic AI prose
responses. It owns typed DTOs, deterministic services, tenant/permission checks,
and persistence.

| New record | Purpose and minimum fields |
|---|---|
| `analysis_run` | Tenant/shop scope, selected period, actor, tool version, deterministic input snapshot/hash and creation time. |
| `evidence_item` | `analysis_run` link, source type/IDs, calculation identifier/version, input/output JSON, assumptions, confidence, expected benefit and risk. |
| `decision_proposal` | Tenant/shop, evidence snapshot/hash, action type, structured parameters, state (`PROPOSED`, `APPROVED`, `REJECTED`, `DRAFT_CREATED`), expiry and idempotency key. |
| `proposal_decision` | Immutable approval/rejection actor, time, reason and prior state. |
| `action_ledger_event` | Append-only proposal/evidence/decision/result timeline, including resultant PO draft/task ID. |

The exact migration names may change, but every table must carry a tenant shop
scope and be protected by the existing Hibernate/TenantContext controls.

### New API boundary

Names below are intended contracts, not existing endpoints:

```text
GET  /api/savdograph/daily-brief?shopId=&from=&to=
POST /api/savdograph/ask
POST /api/savdograph/reorder-simulations
POST /api/savdograph/proposals
POST /api/savdograph/proposals/{id}/approve
POST /api/savdograph/proposals/{id}/reject
GET  /api/savdograph/action-ledger
```

Each response must be a structured contract. No API may rely on a model-generated
number without a deterministic evidence reference. An approved reorder must call
the existing `PurchaseOrderService` only to create a `DRAFT` record.

### New frontend boundary

Add feature-local components/routes rather than expanding the generic chat
widget:

- `DailyProfitBrief` and typed action list
- `EvidenceCard`
- `AskYourStore` response renderer with cited tool/evidence chips
- `ReorderSimulator`
- `ProposalDecision` modal/detail
- `ActionLedger` list/detail timeline

Reuse existing dashboard shell, date filter, modal, tenant scope, forecast,
reorder queue, supplier selector, PO draft and responsive primitives. Do not
reuse the generic direct-order confirmation as a substitute for approval.

## Mandatory security and privacy constraints

1. **Least privilege per tool.** Existing AI endpoints use `REPORTS:READ` for a
   catalog that includes supplier/expense data. Build Week code must map every
   tool to the minimum permission and default-deny unmapped tools.
2. **Tenant scope everywhere.** Query, evidence, proposal, ledger and direct-ID
   reads must be shop-scoped and covered by A/B tenant integration tests.
3. **Evidence before prose.** Numeric claims must refer to immutable tool/evidence
   IDs. Unsupported numbers are rejected or rendered as unsupported—not silently
   invented.
4. **Privacy-minimal providers.** Do not send customer or supplier contact data,
   raw history, or unnecessary identifiers to any external model provider.
   Send structured, minimal retail aggregates only after owner/provider policy
   consent is recorded.
5. **Human gate.** Only an owner can approve; approve/reject is idempotent; the
   server, not only the UI, enforces the state transition.
6. **No financial execution.** The only allowed output is a draft PO or task.
   Existing PO `ORDERED`, `PARTIAL`, `RECEIVED`, payment and supplier-notification
   transitions remain outside the agent path.
7. **Sensitive-demo rule.** Use only generated seed data. Do not expose
   environment values, production screenshots, real customer/supplier data, or
   unreviewed operations documentation.

## Acceptance criteria

The slice is acceptable only when all conditions are true:

- A seeded owner can complete the five-minute journey without an external
  provider key; deterministic/demo fallback remains clearly labeled.
- Every brief/recommendation displays a source period, calculation/version,
  assumptions and risk, and resolves to a stored evidence snapshot.
- A test proves an unsupported model numeric claim is rejected/marked unsupported.
- A test proves a cashier cannot use an AI tool to read supplier or expense data
  without its direct permission.
- A test proves cross-tenant evidence, proposal, simulation and ledger reads are
  denied/hidden.
- A test proves an unapproved proposal creates no PO/task; an approved proposal
  creates exactly one `DRAFT` and never advances it.
- Simulator test fixtures cover zero history, low stock, large quantity, lead
  time, and declared-currency cases.
- Staging demo visibly says `Demo / sample data`; production demo accounts and
  live production infrastructure are never used.
- Backend/license tests, frontend unit/build checks, secret scan and the focused
  Build Week flow tests have recorded results. Docker-backed E2E is required
  before release when Docker becomes available.

## Feasibility, effort, and gates

Estimated new work: **58–76 engineering hours** for the narrow slice, including
tests/demo hardening. It is a **CONDITIONAL GO**, not a promise that every
pre-existing data limitation will be fixed before the deadline.

| Gate | Exit condition | Estimated hours |
|---|---|---:|
| B1 — contract and security | Typed evidence/proposal schema, tenant filters, per-tool permissions, no-number-invention guard | 12–16 |
| B2 — deterministic intelligence | Brief aggregation and reorder-only simulator with golden calculations | 12–16 |
| B3 — owner workflow | Proposal state machine, draft-only PO/task integration, immutable ledger | 12–16 |
| B4 — experience | Brief, Ask renderer, Evidence Card, simulator and ledger UI | 14–18 |
| B5 — proof and demo | Focused unit/integration/UI tests, seed-demo script and evidence capture | 8–10 |

Stop and return to scope review if a must-have gate exceeds its estimate, a
single-currency demo cannot be guaranteed, source P&L cannot reconcile, or
least-privilege AI-tool enforcement cannot be completed. Do not conceal the
blocker with model prose or a mocked success path.
