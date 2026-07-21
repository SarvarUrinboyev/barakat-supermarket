# ProofTwin AI Final Video Script

Target duration: 2 minutes 50 seconds maximum.

Current status: `NOT_STARTED`. Record only after the final browser, demo seed,
deployment, and evidence gates pass. The present B5.0 browser journey is blocked
at supplier loading, so this script is a plan and not proof of live behavior.

## Recording rules

- Use only the isolated anonymized demo tenant.
- Keep the permanent Demo Data label, shop scope, and period visible.
- Never show credentials, environment files, IP addresses, provider payloads,
  hidden reasoning, real contacts, or deployment internals.
- Call the metric Gross Profit, never Net Profit.
- Call the approval result PurchaseOrder DRAFT, never an order or payment.
- Do not claim PostgreSQL or live GPT-5.6 proof unless the corresponding final
  gate has direct evidence from the exact release commit.
- If a required step fails during recording, stop. Do not splice a fabricated
  success or substitute production data.

## 0:00-0:20 - Problem and product

Screen: 3:2 title card, then owner workspace overview with Demo Data label.

Voiceover:

"Small retailers have sales and stock data, but the decision trail is often
missing. ProofTwin turns raw store transactions into verified decisions,
compares three possible futures, and never spends without human approval."

Proof on screen:

- ProofTwin AI title;
- anonymized demo store and selected period;
- permanent Demo Data label;
- Brief, Ask, Simulator, Review, and Ledger sections.

## 0:20-0:45 - Daily Gross Profit Brief

Screen: generate the Daily Gross Profit Brief and open its evidence summary.

Voiceover:

"The brief computes revenue, historical cost, refunds, Gross Profit, and margin
server-side. Every number has a period, currency, calculation version, and
immutable evidence reference. Insufficient cost or currency data is labeled,
not guessed."

Proof on screen:

- valid date boundary and UZS;
- visible refund;
- revenue, COGS, Gross Profit, and margin;
- classification and evidence IDs.

## 0:45-1:15 - Ask Your Store and evidence

Screen: ask `Bugungi yalpi foyda qancha?`, then open Evidence Viewer.

Voiceover:

"Ask Your Store supports Uzbek, Russian, and English. GPT-5.6 may select only
server-owned read tools. Strict schemas, bounded sequential tool calls, and a
grounding validator reject unsupported business numbers. The provider cannot
create a purchase order or change inventory."

Proof on screen:

- Uzbek answer and classification;
- tool and evidence chips;
- calculation/version and safe structured inputs;
- assumptions and limitations;
- no raw provider payload or hidden reasoning.

If live OpenAI smoke was not approved and passed, replace the provider claim
with: "The provider path is not enabled in this demo; the deterministic evidence
contract is shown with the verified mock." Keep the mock visibly labeled.

## 1:15-1:50 - Reorder simulation and proposal

Screen: search two similarly named products, select one, run the simulation,
select the anonymized supplier, and create a proposal.

Voiceover:

"The reorder simulator uses recorded stock and sales velocity to show quantity,
coverage, stockout risk, and overstock risk. The browser sends only the selected
supplier. Quantity, source run, classification, and evidence are reconstructed
and validated by the server."

Proof on screen:

- explicit product choice;
- ESTIMATED label and deterministic inputs;
- recommended quantity and coverage;
- contact-free Demo Supplier;
- pending proposal with evidence links.

## 1:50-2:20 - Human approval and DRAFT-only result

Screen: open approval dialog, pause on warning, confirm, then briefly show a
separate rejected proposal.

Voiceover:

"The agent proposes; the owner decides. Approval is explicit, owner-only, and
idempotent. It creates exactly one PurchaseOrder DRAFT for later review. It does
not order, notify a supplier, receive goods, alter stock, or make a payment. A
rejection is equally durable and creates no draft."

Proof on screen:

- human confirmation and optional reason;
- DRAFT-only warning;
- one draft reference;
- rejection with no draft reference.

## 2:20-2:40 - Ledger and safety

Screen: Action Ledger timeline, then responsive mobile workspace.

Voiceover:

"The ledger preserves proposal, evidence, human actor, decision, timestamp, and
outcome. Tenant checks and append-only PostgreSQL controls protect the chain of
custody. The same workspace remains usable on desktop, tablet, and mobile."

Only say "PostgreSQL controls" if the final runtime parity gate passed. Otherwise
say: "The application contract is verified; PostgreSQL runtime proof remains a
documented release gate."

## 2:40-2:50 - Architecture and impact

Screen: compact architecture card, repository and demo links without credentials.

Voiceover:

"ProofTwin AI combines deterministic retail calculations, grounded GPT-5.6
tool use, the ProofTwin Scenario Engine, human approval, and an auditable
DRAFT-only workflow—useful AI without giving up business control."

End card:

- repository URL;
- demo URL;
- `Demo data only`;
- `No autonomous ordering or payment`.

## Capture acceptance

- Final encoded duration is at most 2:50.
- Text remains readable at 1080p without zooming into credentials or URLs.
- All UI shown comes from the exact release commit.
- Every screen in the narration has a corresponding verified screenshot.
- Audio contains no unverified live-provider, PostgreSQL, deployment, or impact
  claim.
- Upload remains `BLOCKED_NEEDS_APPROVAL` after the file is rendered.

## B5.1 verified recording source

The approved local source journey now passes in Chrome 150.0.7871.125 at
1440x900, 1024x768, 768x1024, and 390x844 with no page overflow and zero
console/page errors. Use only the eight images in
`docs/build-week/screenshots/b5.1/` as visual references; they were captured
after all four complete journeys passed.

For the mobile line, show `08-mobile-workspace-390x844.png` and say:
"The same owner controls remain reachable on mobile; long shop names shrink
inside the topbar instead of widening the page."

Do not claim that the final video is recorded, uploaded, or public. Keep the
spoken qualifiers unchanged:
`LIVE_OPENAI_SMOKE=DEFERRED` and
`POSTGRES_PARITY=NOT_STARTED / BLOCKED_NEEDS_APPROVAL`. Upload remains a
separate approval-gated action.
