# B3.5 canonical reorder simulation to review proposal bridge

## Scope

B3.5 adds one backend-only, server-controlled transition from a completed B2
reorder simulation to the existing B1 human-review workflow. It creates a
`DecisionProposal` in `PROPOSED` state only. It does not approve or reject the
proposal, create a PurchaseOrder, mutate inventory or prices, contact a supplier,
initiate receiving/payment/delivery, or call an AI provider.

## Endpoint and authority

`POST /api/savdograph/reorder-simulations/{analysisRunId}/proposals`

The existing `/api/savdograph` POST security rule requires `SAVDOGRAPH:WRITE`.
Authenticated `TenantContext` is the only shop authority. The existing domain
uses numeric `Long` identifiers, so the strict request is:

```json
{
  "supplierId": 123
}
```

Unknown properties are rejected. The client cannot submit a product, shop,
tenant, quantity, classification, calculation metadata, evidence selection,
assumptions, prices, costs, proposal state, or PurchaseOrder state.

A first creation returns `201`; an equivalent replay returns `200` with
`idempotent: true`. The typed response contains only proposal/status/source,
analysis-run, product and supplier display references, the server-derived
quantity, classification, assumptions, risks, limitations, immutable evidence
IDs, creation time, and replay indicator. It contains no tenant ID, supplier
contact data, entity internals, credentials, or security context.

## Source AnalysisRun validation

The service takes a pessimistic write lock on the tenant-filtered AnalysisRun
and requires all of the following:

- status `RECORDED`, the only completed status in the current AnalysisRun domain;
- analysis type `REORDER_SIMULATION`;
- tool version `savdograph-b2`;
- calculation `SCENARIO_NET_SALES_REORDER`, version `B2.0`;
- an intact SHA-256 input snapshot matching the run period and bounded scenario
  inputs;
- one current-tenant product matching the persisted product, SKU, unit, and
  currency semantics.

The current AnalysisRun model has no separate failed, expired, or invalidated
states; anything other than the one current completed contract fails closed.
Cross-tenant and missing run/product/supplier IDs use tenant-filtered not-found
behavior.

## Required immutable evidence taxonomy

Exactly one of each current B2 evidence item is required, all from the same run,
shop, product, period, calculation ID/version, expected source type, and current
canonical hash version:

- `PERIOD_TIMEZONE`
- `REORDER_CURRENT_STOCK`
- `REORDER_NET_UNITS_SOLD`
- `REORDER_VELOCITY`
- `REORDER_QUANTITY`
- `REORDER_COVERAGE_BEFORE`
- `REORDER_COVERAGE_AFTER`
- `REORDER_STOCKOUT_RISK`
- `REORDER_OVERSTOCK_RISK`
- `REORDER_TIED_UP_CAPITAL`
- `RESULT_CLASSIFICATION`

Every `contentHash` is recomputed from persisted content. The classification
snapshot must reference the complete non-classification evidence set and agree
with the run/product, period, quantity, stock, net units, velocity, risk fields,
scenario bounds, formula/version, assumptions, risks, and limitations. Evidence
is linked by its original immutable ID; it is never copied or rewritten as fake
B1 evidence.

## Eligibility rules

Only `ESTIMATED` is eligible, and its assumptions, risks, and limitations must be
present. `VERIFIED`, `INSUFFICIENT_DATA`, `UNSUPPORTED`, missing, duplicate, or
conflicting classification evidence is rejected without conversion.

The reorder quantity comes only from canonical `REORDER_QUANTITY` evidence. It
must be exact integral product units, greater than zero, no more than the existing
B2/PurchaseOrder safe bound of 100,000, consistent with the classification
snapshot, and use the unchanged product unit. Zero, negative, fractional,
overflow, conflicting, missing, tampered, and cross-unit values fail closed.

`Supplier` currently has no active/eligible status field. Therefore the exact
existing eligibility rule is tenant-filtered existence. Only its ID and safe
display name are used; phone, address, note, notification, and supplier APIs are
outside this bridge.

## Proposal, idempotency, and ledger

The proposal preserves the source AnalysisRun, product, supplier, exact
server-derived quantity, all 11 evidence links, aggregate evidence hash,
classification, assumptions, risks, and limitations. It uses the existing
proposal type `REORDER` and status `PROPOSED`, with `sourceKind` set to
`B2_REORDER_SIMULATION`, so the existing owner-only approve/reject path remains
unchanged and can create at most one PurchaseOrder in `DRAFT` after approval.

Migration `V46__savdograph_proposal_bridge.sql` adds nullable `source_kind` plus
a constrained unique key on `(shop_id, analysis_run_id, source_kind)`. Legacy B1
proposals keep `source_kind = NULL`. The AnalysisRun row lock serializes same-run
requests; the database unique constraint is the final race guard. An equivalent
`PROPOSED` replay returns the original proposal and writes no duplicate success
ledger event. A different supplier or finalized/incompatible proposal returns
`409`.

A successful first creation appends
`PROPOSAL_CREATED_FROM_REORDER_SIMULATION` with actor, proposal, source run,
evidence IDs, supplier ID, `ESTIMATED`, and `SUCCESS`. It stores no contacts,
customer/employee data, provider payload, credentials, or hidden reasoning. A
ledger failure rolls back proposal and join rows.

## Errors and verification

Malformed/unknown request fields and invalid source/evidence semantics return the
existing safe `400` error shape; absent or cross-tenant resources return the
existing tenant-filtered `404`; conflicting source reuse returns `409`; missing
write permission returns `403`.

Focused H2/Flyway tests cover success, exact mapping/evidence/ledger, strict body
and permission, classification and quantity failures, canonical/tamper/duplicate/
missing/cross-run/cross-tenant/cross-unit evidence, tenant product/supplier/run
isolation, retries/concurrency, rollback, no operational side effects, and the
existing owner approval/idempotent DRAFT-only contract. No test uses production
data or a real provider key.

`LIVE_OPENAI_SMOKE=DEFERRED` and `POSTGRES_PARITY=DEFERRED`. H2 applies V46, but
no stopped Windows PostgreSQL service is started and no production/deployment
configuration is changed.

## Exact B4 retry baseline

Use this prompt after verifying this B3.5 commit is the clean branch HEAD:

```text
MISSION: SAVDOGRAPH B4 RETRY - OWNER DECISION WORKSPACE FRONTEND

Repository: C:\Users\Laptop\Downloads\barakat-supermarket-build-week
Branch: feat/build-week-savdograph-ai
Required baseline: clean committed HEAD whose exact subject is "feat(savdograph): bridge reorder simulation to review proposal" and for which 606a83ebc1eac54720329d1f8d68a97f1b8581bc is an ancestor.

Implement frontend-only `/savdograph` owner workspace against the committed B1/B2/B3/B3.5 contracts. Use `POST /api/savdograph/reorder-simulations/{analysisRunId}/proposals` with a request containing only numeric `supplierId`; render its typed classification, assumptions, risks, limitations, evidence IDs, proposal status, and idempotent result. Keep all calculations and tenant authority server-side. Preserve owner-only approve/reject and DRAFT-only PurchaseOrder behavior.

Do not change backend code, migrations, provider/model configuration, permissions, financial/evidence semantics, deployment/production configuration, or external systems. Do not auto-approve, create an operational order, contact suppliers, mutate inventory/prices, receive, pay, deliver, push, deploy, or merge. Verify frontend tests/typecheck/build and relevant backend contract regressions before committing B4.
```
