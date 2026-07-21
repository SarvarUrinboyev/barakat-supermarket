# ProofTwin Copilot B3 Contract

## Scope and recovered draft

B3 completes a grounded, multilingual, read-only Ask Your Store backend at:

```text
POST /api/savdograph/ask
Permission: SAVDOGRAPH:READ
```

The recovery retained every original B3-only dirty file. No file was removed or restarted from scratch.

Tracked draft files:

- `backend/src/main/java/uz/barakat/market/auth/SecurityConfig.java`
- `backend/src/main/java/uz/barakat/market/repository/ProductRepository.java`

Untracked draft files recovered and completed:

- `backend/src/main/java/uz/barakat/market/controller/SavdoGraphB3Controller.java`
- `backend/src/main/java/uz/barakat/market/dto/SavdoGraphB3Dtos.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/OpenAiResponsesStoreCopilotProvider.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotAuditService.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotGroundingValidator.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotInstructions.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotPrivacy.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotProvider.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotProviderException.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotSafety.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotSchemas.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotService.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotStructuredOutputParser.java`
- `backend/src/main/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotToolRegistry.java`
- `backend/src/test/java/uz/barakat/market/savdograph/SavdoGraphB3ControllerIT.java`
- `backend/src/test/java/uz/barakat/market/service/savdograph/copilot/OpenAiResponsesStoreCopilotProviderTest.java`
- `backend/src/test/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotGroundingValidatorTest.java`
- `backend/src/test/java/uz/barakat/market/service/savdograph/copilot/StoreCopilotServiceTest.java`

The draft was repaired in place: request DTO authority rejection and period bounds; product ambiguity and tenant resolution; minimal per-field evidence tool outputs; exact numeric/date grounding across all visible fields; classification and Gross Profit label preservation; malicious-data sanitization; typed provider errors and bounded retries; sequential-call enforcement; and expanded unit/integration coverage.

## Provider and model configuration

The internal `StoreCopilotProvider` abstraction isolates the OpenAI Responses API adapter. Configuration is server-side only:

| Environment variable | Default / bound |
|---|---|
| `OPENAI_API_KEY` | Empty; provider returns `PROVIDER_UNAVAILABLE` and makes no HTTP call. |
| `OPENAI_MODEL` | `gpt-5.6-terra`; allow-list also permits `gpt-5.6-sol`. |
| `OPENAI_REASONING_EFFORT` | `medium`; bounded to reviewed effort names. |
| `OPENAI_MAX_OUTPUT_TOKENS` | `1200`; clamped to 256-4000. |
| `OPENAI_TIMEOUT_SECONDS` | `30`; clamped to 1-120 seconds. |

The request uses `https://api.openai.com/v1/responses`, strict function schemas, strict `text.format` JSON Schema, `parallel_tool_calls=false`, `store=false`, a non-identifying `safety_identifier`, and no response include/summary that requests hidden reasoning. The API key is only an Authorization header value and is never placed in JSON, a response DTO, audit details, or logs. One retry is permitted only for timeout, I/O, 429, or 5xx; authentication and other 4xx errors are not retried.

Prompt version: `SAVDOGRAPH_COPILOT_V1`.

## Tool registry

Exactly three server-registered tools are model-accessible:

| Tool | Source | Authority and effect |
|---|---|---|
| `get_daily_gross_profit_brief` | B2 deterministic Gross Profit Brief | Active tenant; appends AnalysisRun/immutable evidence only. |
| `search_store_products` | Bounded `Pageable` tenant-filtered repository query | Maximum 10 candidates; authorizes a product only when exactly one result resolves it. |
| `run_reorder_simulation` | B2 deterministic simulator | Requires a current-interaction, unambiguous tenant product; appends AnalysisRun/immutable evidence only. |

Stockout-risk candidate batching is deliberately cut: B2 has no separate safe batch contract whose reuse preserves the required evidence and financial semantics. There is no approve/reject, PO, inventory, price, supplier, payment, delivery, receiving, or other mutation tool. The server permits at most five sequential calls and rejects a provider turn containing multiple calls.

## Structured final response

The public response contains server metadata plus only these model-facing fields: status, language, answer, classification, facts, assumptions, limitations, tools used, evidence IDs, and human-action suggestions. Schemas have exact required properties, `additionalProperties=false`, bounded string/array sizes, strict enums, and bounded tool arguments. Model-authored statuses cannot impersonate server-only provider-unavailable or groundedness-failure states. Raw provider protocol, prompts, API keys, tenant authority, and reasoning are absent.

Supported result languages are Uzbek (`uz`), Russian (`ru`), and English (`en`); `AUTO` uses bounded local detection and falls back to English.

## Groundedness and financial semantics

Validation runs after schema parsing and before any model content reaches the endpoint response:

1. Result tools must exactly match tools executed in this interaction.
2. Result/fact evidence must be from the current interaction and visible under the active tenant filter.
3. Every fact, including nonnumeric facts, requires evidence.
4. Every visible number in the answer, fact label/value/unit, assumption, limitation, or suggested-action label must occur in the correct deterministic evidence mapping. Exact request/tool ISO dates are allowed only as full dates and cannot authorize their numeric components as money.
5. Fact and overall classification cannot upgrade `ESTIMATED` or `INSUFFICIENT_DATA` to `VERIFIED`.
6. Gross Profit cannot be named Net Profit, Net Income, Final Profit, `sof foyda`, or the equivalent Russian label.
7. Claims that an order/payment/mutation/contact action occurred are rejected.

A failure returns a typed, number-free `GROUNDEDNESS_VALIDATION_FAILED` response.

## Privacy, injection, and audit boundary

Questions and display names are control-character normalized and redact email, phone, labeled customer/employee/supplier/name/address data, credential-like values, and long identifiers before provider use. The safety identifier is a one-way, non-identifying alias and contains no raw username, account, shop, email, or phone value. Audit events store safe event/status/model/tool/evidence metadata, not the raw question, provider body, key, hidden reasoning, or personal data.

System instructions declare user text, product names, imported labels, and all tool-returned text untrusted data. Tool names/schemas are a fixed server allow-list; malicious data cannot register or enable a write tool. Tool output is minimized, sanitized, marked deterministic/read-only, and returned only as `function_call_output` data.

## Error contract

Typed outcomes cover provider unavailable, refusal, timeout, rate limit, network/server failure, incomplete response, invalid structured output, unknown/invalid tool, tool execution failure, five-call limit, and groundedness failure. Errors expose no provider diagnostic, credential, raw request, unsupported business number, or generic-chat fallback. Existing deterministic B1/B2 endpoints do not depend on `OPENAI_API_KEY`.

## Validation record

Focused B3 tests passed `38/38`; affected B1/B2/B3 tests passed `57/57`; the full backend suite passed `365/365` with zero failures, errors, or skips; and the backend package passed. H2/Flyway ran in the integration contexts. The frontend production dependency audit reported zero vulnerabilities. The unchanged Electron dependency tree reported two moderate `js-yaml` findings through `electron-updater`, with no available fix; this is a pre-existing release risk, not B3 code.

## Runtime gates

- `LIVE_OPENAI_SMOKE=DEFERRED`: no safe key existed in the environment, so no live call was made.
- `POSTGRES_PARITY=DEFERRED`: H2/Flyway validates the test path, but no disposable PostgreSQL runtime was used and the stopped Windows PostgreSQL service was not started.

## Exact B4 scope

B4 is frontend-only. Implement the ProofTwin Decision Center using the committed B1/B2/B3 APIs: Daily Gross Profit Brief, multilingual Ask Your Store renderer, Evidence Card, deterministic reorder simulator, proposal human-review controls, and Action Ledger. Render evidence IDs, tool provenance, VERIFIED/ESTIMATED/INSUFFICIENT_DATA/UNSUPPORTED classification, assumptions, limitations, ambiguity clarification, provider/refusal/error/groundedness states, and permanent Demo/sample labeling. Preserve UZ/RU/EN, accessibility, responsive behavior, and owner-only explicit approval/rejection. Add focused frontend tests and run the frontend test/build gates. Do not change backend calculations, evidence semantics, provider/model configuration, tool registry, permissions, approval state machine, deployment, production data, or production infrastructure. Do not add autonomous ordering, receiving, payment, supplier messaging, inventory mutation, or price mutation.
