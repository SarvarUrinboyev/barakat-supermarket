# SavdoGraph Final Screenshot Shot List

Current status: `NOT_STARTED`.

B5.0 did not capture pass screenshots because the complete mocked journey is
blocked at supplier loading. Failure artifacts are diagnostics, not submission
assets. Capture this list only after the exact release commit passes the entire
journey with zero console/page error.

## Global capture rules

- Use only the isolated anonymized demo tenant.
- Keep the permanent Demo Data label visible in every product screenshot.
- Keep enough workspace chrome to prove owner/shop/period context.
- Do not show credentials, auth tokens, environment values, IP addresses,
  provider payloads, hidden reasoning, real contacts, production records, or
  deployment commands.
- Do not crop away `ESTIMATED`, assumptions, limitations, evidence IDs, or the
  PurchaseOrder DRAFT label.
- Use the exact release commit and record its hash with the asset manifest.
- Capture PNG originals; make presentation crops from copies.

## 1. Owner workspace overview

Status: `VERIFIED`.

- Viewport: `1440x900`.
- Show SavdoGraph navigation and all five decision sections.
- Show account/shop scope, selected period, UZ locale, and Demo Data banner.
- No loading, error, dialog, or horizontal overflow.
- Recommended gallery position: first.

## 2. Daily Gross Profit Brief

Status: `VERIFIED`.

- Viewport: `1440x900` or `1024x768` if every field stays readable.
- Show revenue, refunded revenue, COGS, Gross Profit, margin, currency,
  classification, period, calculation/version, and evidence links.
- Include a valid visible refund and cost provenance.
- Never label this Net Profit.

## 3. Ask Your Store with evidence

Status: `VERIFIED`.

- Viewport: `1440x900`.
- Show the exact Uzbek question and grounded response.
- Show classification, fact, tool, evidence, assumption, limitation, model, and
  prompt-version metadata that is safe for the UI.
- Keep the Evidence Viewer open with safe structured inputs and integrity state.
- Do not expose safety identifier or raw provider request/response.

## 4. Reorder simulator

Status: `VERIFIED`.

- Viewport: `1440x900`.
- Show explicit product selection among at least two candidates.
- Show current stock, sales velocity, lead/safety/horizon inputs, recommended
  quantity, coverage before/after, stockout/overstock risks, and `ESTIMATED`.
- Show contact-free Demo Supplier selection only if enabled and tenant-owned.

## 5. Pending proposal

Status: `VERIFIED`.

- Viewport: `1440x900`.
- Show `PENDING`/review state, product, supplier, server-derived quantity,
  source simulation, classification, assumptions, risks, limitations, and
  evidence references.
- Make clear that no order, inventory change, or payment has occurred.

## 6. Human approval dialog

Status: `VERIFIED`.

- Viewport: `1024x768`.
- Show proposal summary, optional reason, explicit confirmation control, and
  human-decision/PurchaseOrder DRAFT warning.
- Capture before confirmation; do not include a credential manager overlay.
- Verify Escape closes and focus returns before the final capture session.

## 7. Action Ledger

Status: `VERIFIED`.

- Viewport: `1440x900`.
- Show proposal reference, evidence references, human actor label, decision,
  timestamp, outcome, and one DRAFT reference.
- Include a separate rejection entry or second crop showing no draft outcome.
- Do not show internal numeric user IDs or audit payload internals.

## 8. Responsive mobile workspace

Status: `VERIFIED`.

- Viewport: `390x844`.
- Show Demo Data banner, locale switch, one complete result card, and primary
  next action without horizontal overflow.
- Use this as the responsive gallery proof.

## Responsive evidence matrix

These are verification captures, even if only one becomes a gallery asset:

| Viewport | Required proof | Status |
|---|---|---|
| `1440x900` | Full owner journey, no overflow, zero console/page error | `VERIFIED` |
| `1024x768` | Dialog and workspace usability, no overflow | `VERIFIED` |
| `768x1024` | Tablet stacking, no clipped controls, no overflow | `VERIFIED` |
| `390x844` | Mobile stacking, readable cards/actions, no overflow | `VERIFIED` |

## 3:2 project thumbnail

Status: `NOT_STARTED`.

- Canvas: 1500x1000 or another true 3:2 export.
- Title: `SavdoGraph AI`.
- Subtitle: `Evidence-backed decisions for neighborhood retail`.
- Visual: one clean owner-workspace crop plus a compact evidence -> decision ->
  DRAFT -> ledger line.
- Badge: `Demo data`.
- Avoid tiny dashboard text, fake metrics, logos without rights, or a live URL.

## Asset manifest

For each accepted image record:

| Field | Required value |
|---|---|
| Filename | Stable descriptive PNG name |
| Release commit | Exact full SHA |
| Environment | Isolated demo identifier, no secret value |
| Viewport | Exact width x height |
| Captured at | ISO-8601 timestamp |
| Browser | Chrome version |
| Test evidence | Passing Playwright run reference |
| Redaction review | Reviewer and status |

## Rejection conditions

Reject and recapture any image containing a missing Demo Data label, a failing
or loading state, horizontal overflow, real/personally identifying data, an
unverified number, a raw provider field, a credential, production topology, or
language suggesting the DRAFT was ordered or paid.

## B5.1 verified asset manifest - 2026-07-19

Capture gate: Chrome 150.0.7871.125; four complete viewport journeys passed
first; capture run then passed. All files show mocked/anonymized Demo Data.

| File | Pixels | Status |
|---|---:|---|
| `screenshots/b5.1/01-owner-workspace-1440x900.png` | 1440x900 | VERIFIED |
| `screenshots/b5.1/02-gross-profit-brief.png` | 641x601 | VERIFIED |
| `screenshots/b5.1/03-ask-store-with-evidence.png` | 1440x900 | VERIFIED |
| `screenshots/b5.1/04-reorder-simulation.png` | 1300x1063 | VERIFIED |
| `screenshots/b5.1/05-pending-proposal.png` | 641x623 | VERIFIED |
| `screenshots/b5.1/06-approval-confirmation.png` | 1440x900 | VERIFIED |
| `screenshots/b5.1/07-action-ledger.png` | 1300x587 | VERIFIED |
| `screenshots/b5.1/08-mobile-workspace-390x844.png` | 390x7256 | VERIFIED |

Responsive evidence is VERIFIED at 1440x900, 1024x768, 768x1024, and 390x844:
client, document scroll, and body scroll widths were equal at each viewport;
console/page error counts were zero. The 390px capture is full-page by design.
The thumbnail and any video/public upload remain `NOT_STARTED` and approval-gated.
