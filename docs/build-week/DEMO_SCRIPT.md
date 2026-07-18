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
