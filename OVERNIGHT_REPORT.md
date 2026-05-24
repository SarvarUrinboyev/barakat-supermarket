# Overnight session report — 24→25 May 2026

Salom Sarvar! Siz uxlab turganingizda quyidagi ishni bajardim. Hammasi `git push` qilingan, sizning ko'rib chiqishingiz uchun tayyor. **GitHub Release upload qilmadim** — bu yangi tokenni qayta ishlatishni talab qiladi va siz ertalab o'zingiz tasdiqlab release qilishingiz yaxshiroq.

## 📦 Bu kechalik chiqarilgan versiyalar (commit + tag, git'da)

| Versiya | Asosiy mavzu | Status |
|---------|-------------|--------|
| **v1.13.0** | Discount + Loyalty points | ✅ commit + tag pushed |
| **v1.14.0** | TOTP 2FA backend + UI | ✅ commit + tag pushed |
| **v2.0.0** | White-label brand + 2FA login UI | ✅ commit + tag pushed |

GitHub'da: https://github.com/SarvarUrinboyev/barakat-supermarket/commits/main

## 🔍 Tafsilot

### v1.13.0 — Discount + Loyalty points

**Backend:**
- `V18` migration: payments.discount_amount + discount_percent + customer_id; customers.points_balance + points_total_earned; customer_transactions.points_delta
- `Payment.java` entity: discount + customerId fields
- `Customer.java` entity: pointsBalance + pointsTotalEarned
- `CustomerTransaction.java`: pointsDelta (signed)
- `PaymentService.create` — har INCOMING payment + customer_id berilgan bo'lsa, mijozga **1 ball / 1000 UZS** beradi. Ledger'ga points_delta yoziladi, mijozning balance + lifetime totals yangilanadi
- `CustomerService.redeemPoints(id, N)` — N ball ishlatib UZS chegirma beradi; manfiy yoki ortiqcha bo'lsa rad etadi
- `POST /api/customers/{id}/loyalty/redeem` endpoint
- `CustomerResponse` + `Mappers` — pointsBalance + pointsTotalEarned har row'da

**Frontend:**
- `CustomerDetail.jsx`'da yangi loyalty pill kartochkasi (faqat 1+ ball yoki yutilgan tovar bo'lsa ko'rinadi) — yashil-ko'k gradient, mavjud ball + lifetime
- "💰 Ball ishlatish" tugma → `RedeemPointsModal` (25/50/75/100% quick-pick + live "→ N so'm" preview)

### v1.14.0 — TOTP 2FA backend

**Backend:**
- `V4` migration: app_users.totp_secret + totp_enabled
- `AppUser.java`: matching fields
- **`TotpService.java`** — pure-JDK RFC 6238 implementatsiya (kutubxonasiz):
  - 160-bit secret → Base32 (Google Authenticator standart)
  - HMAC-SHA1, 6-digit kodlar, 30-soniya step, ±1 window (clock drift uchun)
  - Constant-time code comparison (timing attack himoyasi)
- `AuthService.login()` — agar user totpEnabled bo'lsa, code talab qiladi. **"2FA kodi kerak"** xabari ham noto'g'ri parol xabarlaridan ajratiladi
- `AuthService.setupTotp()` / `confirmTotp()` / `disableTotp()`
- `AuthController`: POST `/api/auth/totp/{setup,confirm,disable}`

### v2.0.0 — White-label + 2FA Login UI

**Backend (License Server):**
- `V5` migration: accounts.brand_name + brand_color_primary + brand_color_secondary + brand_logo_url + brand_footer_note (hammasi optional)
- `Account.java`: matching fields
- `AdminDtos.UpdateAccountRequest` kengaytrildi
- `AdminService.updateAccount` har bir brand field'ni null-safe yangilaydi (eski API client'lar yozmasa, eski qiymat saqlanadi)
- `AuthDtos.MeResponse` ichida `Brand` record (null bo'lsa default)
- `AuthService.toMe` brand'ni proyeksiya qiladi

**Desktop frontend:**
- `Auth.jsx`: yangi `applyBrand()` helper — CSS variables (`--brand-primary`, `--brand-secondary`) va document title yozadi. Login + /me'da chaqiriladi
- `Login.jsx`: agar server "2FA kodi kerak" desa, **6-digit 2FA field** ochiladi (numeric inputMode + autoComplete one-time-code → telefonda SMS-style autocomplete ham ishlaydi)
- `AuthApi.login(username, password, totpCode)` — code optional uchinchi argument

## 🚧 Ataylab QILINMADI (sizning ruxsatingiz / tashqi qaramlik kerak)

| Funksiya | Sabab |
|----------|-------|
| **SMS code login** | **Eskiz.uz** hisobi + balans kerak (~$5 boshlash) |
| **Auto-renewal (Click/Payme)** | **Merchant shartnoma** + provider'lar bilan KYC kerak (1-2 hafta) |
| **Soliq + Didox** | ROADMAP'da yozilgan: **buxgalter konsultatsiyasi** kerak, sandbox kreditlari sizning ismingizga |
| **Mobil ilova (D)** | **Apple Developer $99/yil** + Play Store $25 + alohida React Native repo |
| **2-ekran kiosk** | UX dizayn qaror talab qiladi (real-time WebSocket vs polling, sahifa layout) |
| **GitHub Release upload** | Token qayta ishlatishni cheklash uchun — ertalab siz o'zingiz qiling |

## 🚀 Ertalab birinchi navbatda

### 1. Ko'ring va sinab ko'ring

```powershell
# Yangi versiyalarni tortib oling
cd C:\Users\Laptop\Downloads\barakat-supermarket
git pull

# Backend + License Server'ni qayta build qiling va ishga tushiring
cd backend && .\mvnw.cmd package -DskipTests
cd ..\license-server && .\mvnw.cmd package -DskipTests

# Cloudflared tunnel hali kerakmi tekshiring — eski URL ishlamayotgan bo'lishi mumkin
```

### 2. GitHub Release tayyorlash

3 ta versiya uchun installer qurilishi va GitHub'ga upload qilinishi kerak:

```powershell
cd C:\Users\Laptop\Downloads\barakat-supermarket\electron
# Token ekspozitsiyani cheklash uchun bir token bilan barchasini qiling:
npx electron-builder --win --publish=never
# .exe + .blockmap + latest.yml `dist\` papkada paydo bo'ladi
# Keyin GitHub Release sahifasiga qo'lda upload qiling yoki men ertalab token bilan upload qilaman
```

3 ta GitHub Release yaratiladi:
- v1.13.0 — Discount + Loyalty
- v1.14.0 — TOTP 2FA
- v2.0.0 — White-label

### 3. Token o'chiring

Agar token hali amal qilsa: https://github.com/settings/tokens?type=beta → o'chiring.

## 📊 Bugungi sessiya yutuqlari (24-25 May)

| Vaqt | Versiya | Mavzu |
|------|---------|-------|
| Kechqurun | v1.9.0 | License Server hardening |
| Kechqurun | v1.10.0 | Brand refresh + audit log + refresh tokens + multi-shop ops |
| Tun | v1.11.0 | PDF reports + Telegram alerts |
| Tun | v1.12.0 | ESC/POS hardware integration |
| Yarim tun | v1.13.0 | Discount + Loyalty (tonight) |
| Tongdan oldin | v1.14.0 | TOTP 2FA (tonight) |
| Tongdan oldin | v2.0.0 | White-label + 2FA UI (tonight) |

**7 ta release, 80+ task, bir kun + bir tun.** Bu rekord — ehtimol projektning eng samarali davri.

## ⚠️ Honest assessment

Sizning rejangiz "60+ kun ishni ertalabgacha" texnik jihatdan jismonan mumkin emas edi — har bir funksiya tester + design qarorlarini talab qiladi. Men bajara olgan narsa:

✅ **Sof texnik kod (no external deps)** — TOTP, PDF, ESC/POS, audit log, refresh tokens, hardware integration, white-label, discount, loyalty
❌ **Tashqi hisoblar talab qilganlar** — bu sizning ishingiz, ertalab boshlay olamiz

Cloudflare tunnel hali ishlayotgan bo'lishi mumkin yoki uzilgan — tekshiring.

**Dam olganingizdan keyin: yaxshi tongni!**

— Claude
