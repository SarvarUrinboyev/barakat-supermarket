# SavdoGraph AI — Five-Minute Demo Script

## Demo safety setup

This script is a planned acceptance/demo runbook, not evidence that SavdoGraph
features already exist. Run it only after the Build Week acceptance criteria pass.

- Use the local/staging guarded seed only. It is hard-disabled under the `prod`
  profile.
- Show a persistent `Demo / sample data` label, selected shop and data period.
- Use a seeded owner account with a password supplied through local staging
  configuration; never show the password, token, `.env` file or provider key.
- Do not use a production URL, production database, customer/supplier data,
  screenshots with personal data, or unreviewed operations documentation.
- Keep provider access disabled unless the demo has an approved minimal-data
  provider policy. The deterministic evidence path must remain demonstrable
  without a live provider.

## Presenter story

> “A shop owner does not need another chatbot. They need to know what changed,
> why it matters, what a safe action would do, and retain control of the action.
> SavdoGraph turns existing retail data into evidence-backed decisions, then lets
> the owner approve a draft—not a purchase or payment.”

## Before recording or presenting

1. Start the isolated staging stack only after Docker is healthy.
2. Confirm the UI shows the demo label, account/shop scope and selected date.
3. Confirm all seeded figures are from the generated sample dataset and the
   current period displays correctly.
4. Prepare a deliberately low-stock product and one explainable reorder
   recommendation from the deterministic brief.
5. Verify at least one owner approval and one rejection are possible in the demo
   tenant without any supplier communication or financial execution.
6. Have a clean fallback recording/screenshot of the deterministic evidence flow
   only; never replace a failing calculation with invented text.

## Timed walkthrough

| Time | Screen/action | Presenter line | What the reviewer should be able to verify |
|---:|---|---|---|
| 0:00–0:20 | Login → owner dashboard | “This is generated demo data, scoped to one shop and period.” | `Demo / sample data`, owner role, shop name/scope and date range. |
| 0:20–0:55 | Daily Profit Brief | “Today’s sales, gross profit, margin movement, low stock, slow movers and anomalies are one brief—not disconnected widgets.” | Every card/action has period and source badges; profit uses declared currency. |
| 0:55–1:30 | Expand a priority action | “Before asking AI to phrase it, the recommendation is already backed by deterministic retail data.” | Evidence Card shows source IDs, formula/version, inputs, assumptions, confidence, benefit and risk. |
| 1:30–2:05 | Ask Your Store in Uzbek, Russian or English | “The question routes to deterministic tools. A number is allowed only when the answer cites evidence.” | Tool/evidence chips appear; unsupported numeric response is labeled unsupported or rejected. |
| 2:05–2:45 | Open reorder simulator | “Here is the decision, not just a prediction: quantity, coverage, stockout risk and tied-up capital.” | Product, quantity, lead-time, currency and calculation inputs are visible; changing quantity changes deterministic outputs. |
| 2:45–3:25 | Create proposal | “The agent proposes. It cannot order, receive or pay.” | Proposal starts `PROPOSED`; exact evidence snapshot and proposed action type are visible. |
| 3:25–4:05 | Approve as owner | “The owner’s decision is server-side, time-stamped and idempotent.” | Actor/time/reason, owner-only control and resultant PO **DRAFT** or task. No `ORDERED`, payment or supplier notification. |
| 4:05–4:35 | Show Action Ledger | “The decision remains auditable after the chat is gone.” | Proposal → evidence → decision → draft result timeline. |
| 4:35–5:00 | Show rejected proposal / close | “A rejection is equally durable, and the business remains in control.” | Rejection reason/event, no resultant draft; restate non-goals and demo-data safety. |

## Required proof screens

Capture, in order:

1. Demo label + owner/shop/date scope.
2. Daily Profit Brief with one source-period badge.
3. Evidence Card showing inputs/formula/assumptions/risk.
4. Ask Your Store response with cited evidence IDs.
5. Reorder Simulator with visible deterministic inputs/outputs.
6. Proposal in `PROPOSED` state.
7. Approved PO draft/task, clearly not an order/payment.
8. Action Ledger with full timeline.
9. Rejected proposal showing no draft action.

Never crop screenshots so that a reviewer cannot distinguish a demo from live
production data. Never show real credentials, raw provider payloads, customer
names, supplier contacts, IP addresses, or internal deployment instructions.

## Failure handling

| Failure | Safe response |
|---|---|
| External provider unavailable | Continue only with the deterministic brief/evidence path; say the provider is unavailable and do not fabricate a chat answer. |
| Evidence is missing or currency is ambiguous | Stop that recommendation, label it insufficient data, and show a different seeded example. Do not present it as a valid decision. |
| Approval endpoint fails | Show the saved `PROPOSED` state and stop. Do not create a PO manually and claim it was agent-approved. |
| Docker/staging unavailable | Do not point at production. Record the blocker and use only previously verified, clearly labeled non-production evidence if the submission format permits it. |
| Demo account behaves like production | Stop immediately and verify the environment. The seed must never run under `prod`. |

## Reviewer takeaway

SavdoGraph is differentiated by the chain of custody around a recommendation:
deterministic data → evidence → simulation → human decision → non-financial
draft → immutable ledger. The AI is useful only inside that chain of custody.

## B3 Ask Your Store demo behavior

The B3 backend endpoint is ready for the B4 renderer, but no live provider smoke is claimed. When a safe provider is not configured, show the typed `PROVIDER_UNAVAILABLE` state and continue with the deterministic B1/B2 evidence path; never substitute invented chat text.

For the eventual non-production B4 demo, ask one question in each supported language (`uz`, `ru`, `en`), show tool and evidence chips, classification, assumptions, and limitations, then demonstrate an ambiguous product clarification and a Net Profit request reframed as unsupported Gross Profit scope. Keep any suggested action human-only. Do not show raw provider input/output, safety identifiers, API keys, tenant IDs, contacts, or hidden reasoning.

The frontend must render typed refusal, unavailable, timeout/rate/network, invalid-output, unknown/invalid-tool, tool-limit, insufficient-data, and groundedness-failure states. A groundedness failure must show no unsupported business number. The Ask flow cannot create/approve a PO, alter inventory/prices, message a supplier, receive/deliver goods, or make a payment.

`LIVE_OPENAI_SMOKE=DEFERRED`. `POSTGRES_PARITY=DEFERRED`.

## B4 owner workspace click path

Use only an approved local/staging environment with anonymized seed data and
`VITE_DEMO_DATA=true`. Confirm the permanent localized Demo Data banner before
showing any figure.

1. Open `/savdograph` as an ACCOUNT_OWNER with SavdoGraph read/write/decide and
   ledger-read permissions; point out that an unauthorized user has no nav item.
2. Set the end-exclusive period and generate `Daily Gross Profit Brief`; call
   it Gross Profit, never Net Profit.
3. Ask the exact Uzbek example and show classification, facts, assumptions,
   limitations, tools, interaction metadata, and cited evidence.
4. Open evidence. Show safe inputs, source period, calculation/version, result
   and integrity status; do not show raw hash/provider data.
5. Explicitly select a product, run the scenario, select only a supplier, and
   click `Create proposal for review`.
6. Explain that the bridge body contains only `supplierId`; proposal quantity,
   classification, source run and evidence are server-derived.
7. Open Approve or Reject, read the human-decision/DRAFT-only warning, and
   explicitly confirm. Never describe DRAFT as an order.
8. Refresh Action Ledger and show decision, proposal, evidence, actor label,
   timestamp, outcome and optional DRAFT reference.
9. Switch UZ, RU and EN; verify 1440, 1024, 768 and 390 layouts.

The mocked Playwright script encodes this path, but B4 execution is
`BROWSER_VERIFICATION=DEFERRED` because Chromium is not installed locally.
No screenshot or live-browser result is claimed.

## B5.0 final-demo readiness gate

Current status: `DEFERRED`. Do not record or present the final live journey yet.
The existing-Chrome B5.0 run is blocked at supplier selection by the product
loading effect documented in `B5_RELEASE_READINESS.md`.

### Entry criteria

Before any final rehearsal:

1. Fix the supplier-loading defect with focused regression coverage.
2. Add the narrow anonymized seed gaps: one visible refund with valid cost and
   one tenant-owned contact-free Demo Supplier.
3. Pass the complete mocked Chrome journey at `1440x900`, `1024x768`,
   `768x1024`, and `390x844` with zero console/page error and no overflow.
4. If the final demo uses PostgreSQL claims, pass the approved isolated runtime
   trigger/constraint proof. H2 is not sufficient.
5. If the final demo uses live GPT-5.6 claims, pass one separately approved,
   bounded, server-side live smoke. Otherwise label the provider path as mocked
   or unavailable.
6. Use the exact release commit and a separate HTTPS demo environment with no
   production database or write route.
7. Verify the judge credential is delivered out of band and absent from the
   screen, repository, logs, and script.

### Final 2:50 click path

| Time | Action | Truth to state |
|---:|---|---|
| 0:00-0:20 | Open owner workspace | Anonymized demo data, one shop and period, permanent Demo Data label. |
| 0:20-0:45 | Generate Gross Profit Brief | Revenue, refund, historical cost, Gross Profit, margin, classification, and evidence are deterministic. |
| 0:45-1:15 | Ask in Uzbek and open evidence | GPT-5.6 is bounded by server tools/strict schemas only if live smoke passed; otherwise identify the mock. |
| 1:15-1:50 | Search product, run reorder, select supplier, create proposal | The browser selects only supplier; the server reconstructs quantity and evidence. |
| 1:50-2:20 | Approve to one DRAFT and show rejection | Human-only, idempotent, DRAFT-only; no order, notification, receipt, stock change, or payment. |
| 2:20-2:40 | Open Action Ledger and mobile layout | Actor, evidence, decision, outcome, timestamp, and responsive safety remain visible. |
| 2:40-2:50 | Architecture/end card | Deterministic data plus grounded AI plus human control; show repo/demo links only. |

### Required demo records

- Gross Profit Brief with a real synthetic refund and valid cost provenance;
- two similarly named demo product candidates;
- one ESTIMATED reorder simulation;
- one tenant-owned supplier without real contact information;
- one pending proposal bridged from the simulation;
- one owner approval producing exactly one PurchaseOrder DRAFT;
- one rejection producing no DRAFT;
- one ledger timeline for each decision;
- UZ, RU, and EN display proof;
- tenant-isolation negative proof outside the public walkthrough.

### Stop conditions

Stop immediately if:

- the Demo Data label is absent;
- supplier selection is disabled or loading never ends;
- any console/page error appears;
- evidence, currency, historical cost, or classification is missing;
- a number is not backed by an evidence ID;
- the app points at any production host/database;
- an environment file, credential, provider payload, real contact, or hidden
  reasoning becomes visible;
- approval produces anything other than one DRAFT;
- PostgreSQL or live-provider proof is mentioned without the final gate result.

Use the deterministic brief/evidence fallback only when it has separately
passed. Never replace a failed proposal/approval/ledger step with narration.

### Asset rule

Follow `SCREENSHOT_SHOTLIST.md` and `FINAL_VIDEO_SCRIPT.md`. Screenshots are
accepted only after the whole journey passes; a Playwright failure screenshot
is never a gallery asset. Video upload and final submission remain separate
`BLOCKED_NEEDS_APPROVAL` actions even after recording succeeds.

## B5.1 verified local demo path

The previously blocked supplier/proposal path and 390px shell are now locally
verified. Before presenting, use the exact committed B5.1 descendant and rerun
the two Chrome specs. The required path passed independently at 1440x900,
1024x768, 768x1024, and 390x844:

1. open SavdoGraph and keep the permanent Demo Data note visible;
2. create the Daily Gross Profit Brief;
3. ask in Uzbek and open/close evidence with focus return;
4. search and select the demo product;
5. run the reorder simulation and select the contact-free demo supplier;
6. create the review proposal;
7. approve with the DRAFT-only warning and verify exactly one DRAFT reference;
8. create a separate proposal, reject it, and verify no new DRAFT;
9. show the Action Ledger and switch UZ/RU/EN;
10. confirm no page overflow and zero console/page errors.

At 390px, the topbar is intentionally two contained rows; the shop name can
truncate visually while its full accessible name remains available. Use only
`docs/build-week/screenshots/b5.1/` for approved local images.

Do not narrate the H2 run as PostgreSQL parity and do not imply a live GPT call.
`LIVE_OPENAI_SMOKE=DEFERRED` and
`POSTGRES_PARITY=NOT_STARTED / BLOCKED_NEEDS_APPROVAL`. Video upload and final
submission remain unperformed approval gates.
