# Sprint A + B + C — Deferred features hujjati

Shu sessiyada bajarilmagan, lekin arxitektura + skelet tayyor funksiyalar.
Har biri 1-5 ish kunida bajarilishi mumkin.

## SPRINT A — TIER 3 deferred

### A.1 PostgreSQL migration (1-2 kun)
VPS'da: `apt install postgresql-16` + `pgloader h2://... postgresql://...` + properties almashtirish.
application-local.properties:
```
spring.datasource.url=jdbc:postgresql://localhost:5432/barakat
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```
pom.xml: `org.postgresql:postgresql` runtime dependency.

### A.2 Click Integration (2-3 kun)
Click merchant account + secret_key. ExternalPaymentProvider interface + ClickProvider implementation + /api/payments/click/callback webhook (HMAC signature verify).
POS UI: method=CLICK -> QrCodeModal.

### A.3 Payme Integration (2-3 kun)
Click bilan o'xshash. JSON-RPC 2.0 + Basic Auth. Endpoints: CheckPerformTransaction / CreateTransaction / PerformTransaction / CancelTransaction.

## SPRINT B — TIER 4 done

### B.1 Voice POS — DONE (Web Speech API + ru-RU)
### B.2 Offline POS queue — DONE (Dexie IndexedDB)

### B.3 Mobile Offline POS (2-3 kun)
WatermelonDB schema + sync engine. EAS rebuild kerak.

## SPRINT C — Yangi g'oyalar

### C.1 Multi-tenant subdomain (3-5 kun)
accounts.subdomain ustun + nginx wildcard + X-Tenant-Slug header.

### C.2 Mobile Offline → B.3

### C.3 Telegram Mini App (2-3 kun)
BotFather setmenubutton + /telegram-app route + Telegram WebApp SDK.

### C.4 Supplier REST API (3-4 kun)
supplier_api_keys jadval + X-Supplier-Key header auth + /api/supplier/products bulk upsert.

### C.5 Embeddable widget (2-3 kun)
/embed.js loader script + /pos?embed=true iframe + CORS.

### C.6 Anomaly Telegram alert (1 kun)
@Scheduled cron + AnomalyService.check() + telegram.sendMessage.

### C.7 OpenAPI SDK clients (1-2 kun)
openapi-typescript-codegen + Python SDK + Postman collection auto-generate from /v3/api-docs.

## PRIORITY for next sprint
1. A.1 PostgreSQL (texnik debt)
2. A.2 Click integration (customer payment ease)
3. C.4 Supplier API (automation)
4. C.3 Telegram Mini App (customer engagement)
5. C.1 White-label subdomain (multi-tenant SaaS)
