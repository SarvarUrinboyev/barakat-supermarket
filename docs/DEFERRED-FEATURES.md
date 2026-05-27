# Keyingi sprintlarga qoldirilgan funksiyalar

Bu hujjat — TIER 3 va TIER 4 dan tashqi infratuzilma yoki katta migration
talab qiladigan, shuning uchun shu sessiyada bajarilmagan funksiyalar uchun
arxitektura eskizlari va o'rnatish bo'yicha yo'riqnoma.

---

## 1. Offline Mode + Sync (T3.2)

**Maqsad:** Internet uzilsa ham POS sotish ishlasin, qayta ulanganda VPS bilan
sinxron bo'lsin.

### Arxitektura
```
React (online)                    React (offline mode)
   │                                       │
   ▼                                       ▼
api/client.js  ───>  Backend     api/offlineQueue.js
                                          │
                                          ▼
                                   IndexedDB (Dexie)
                                          │
                                          ▼  (network back)
                                   Sync worker
                                          │
                                          ▼
                                   Backend bulk endpoint
```

### Asosiy bosqichlar
1. **Dexie.js** (IndexedDB wrapper) qo'shish — `frontend/src/lib/offlineDb.js`
2. ProductApi.list() natijasini cache qilish → 30 daqiqali TTL
3. POS checkout offline'da:
   - `pos_checkout_queue` jadvaliga yozish
   - UI darhol "sotildi" ko'rinishini ko'rsatish (optimistic)
   - Local stock'ni cache'da kamaytirish
4. Online bo'lganda **sync worker** ishga tushadi:
   - Queue'dagi har bir sotuvni `POST /api/pos/checkout` ga jo'natish
   - Konflikt (stock yetmasa): admin'ga toast
   - Muvaffaqiyatlilarni queue'dan o'chirish
5. Service Worker (Workbox) — static assets cache + offline fallback page

### Murakkablik
- Yuqori (3-5 ish kuni)
- Konflikt resolution dizayni juda muhim
- E2E test setup'i alohida

---

## 2. PostgreSQL Migration (T3.3)

**Sabab:** H2 ~100k satrdan keyin sekinlashadi. Production tezligi va ko'p
ulanish uchun PostgreSQL kerak.

### O'rnatish qadamlari (VPS)

```bash
# 1. PostgreSQL 16 o'rnatish
apt update && apt install -y postgresql-16 postgresql-contrib

# 2. Database yaratish
sudo -u postgres psql <<SQL
CREATE DATABASE barakat;
CREATE USER barakat WITH ENCRYPTED PASSWORD 'CHOOSE_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE barakat TO barakat;
\c barakat
GRANT ALL ON SCHEMA public TO barakat;
SQL

# 3. H2 ma'lumotlarini dump qilish
# SavdoPRO'da: http://localhost:8086/h2-console (agar yoqilgan)
# yoki BackupService yaratgan oxirgi backup zip'idan SQL chiqarib olish
unzip backups/barakat-YYYY-MM-DD.zip -d /tmp/h2dump

# 4. H2 → PostgreSQL DDL konvertatsiya
# pgloader yoki qo'lda SQL fayl ko'chirish
apt install -y pgloader
pgloader h2 postgresql:///barakat
```

### application-local.properties (VPS)

```properties
# Eskisini almashtiring
spring.datasource.url=jdbc:postgresql://localhost:5432/barakat
spring.datasource.username=barakat
spring.datasource.password=CHOOSE_A_STRONG_PASSWORD
spring.datasource.driver-class-name=org.postgresql.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
```

### pom.xml — dependency qo'shish

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Xavf
- Live data migration risk. Albatta avval **backup oling**.
- Flyway migration'larni qayta tekshirish (H2 va PG sintaksisi farqlari).
- Test environment'da to'liq sinash, keyin production'ga.

### Muddati
- 1-2 ish kuni (migration + smoke test)
- Downtime: ~30 daqiqa

---

## 3. Click / Payme Integration (T3.4)

**Maqsad:** Mijoz mahsulot uchun QR-kod orqali to'lashi.

### Talab qilinadi (sizning tarafingizda)
1. **Click** uchun: `merchant_id`, `service_id`, `secret_key` (click.uz dashboard)
2. **Payme** uchun: `merchant_id`, `secret_key` (paycom.uz dashboard)
3. Yuridik shaxs / IP — to'lov tizimlarida ro'yxatdan o'tish

### Backend qo'shilishi kerak

```java
// PaymentProviderService.java
public interface PaymentProvider {
    QrPayment createInvoice(BigDecimal amount, String reference);
    PaymentStatus check(String invoiceId);
    void handleWebhook(Map<String, Object> payload);  // Click/Payme call back
}

// ClickPaymentProvider.java implements PaymentProvider
// PaymeMerchantApi.java implements PaymentProvider
```

### Frontend POS sahifaga
```jsx
{method === 'CLICK' && saleTotal > 0 && (
  <QrCodeModal
    qrUrl={await ClickApi.invoice(saleTotal)}
    onPaid={() => doCheckout()}
  />
)}
```

### Sertifikat va xavfsizlik
- Click webhook IP-whitelist talab qiladi
- HTTPS (allaqachon Let's Encrypt orqali bor)
- Webhook signature verification (HMAC)

### Muddati
- 2-3 ish kuni har bir provider uchun
- Sandbox test → production approval ~1 hafta

---

## 4. Voice POS (T4.5)

**Maqsad:** "Yangi sotuv: 2 kg shakar 1 nondan" — mikrofon orqali sotuv.

### Texnologiyalar
- **Brauzer:** Web Speech API (`SpeechRecognition`) — Chrome'da yaxshi
- **Mobil:** `expo-speech-recognition` (custom dev build kerak)
- **NLU:** OpenRouter / OpenAI ga voice transcription → JSON
- **TTS feedback:** Web Speech `speechSynthesis.speak(...)`

### O'zbek tili muammosi
- Web Speech API'da `uz-UZ` rasman qo'llab-quvvatlanmaydi
- Variant: rus tilida transcribe qilish → keyin LLM o'zbekchaga tushunadi
- Yoki Google Cloud Speech-to-Text (uz qo'llab-quvvatlanadi, lekin pullik)

### Arxitektura
```
Mic → Web Speech → "ikki kilo shakar bir non"
                    │
                    ▼
                  OpenRouter LLM (intent + entity extraction)
                    │
                    ▼
                  { items: [{name:"shakar",qty:2},{name:"non",qty:1}] }
                    │
                    ▼
                  ProductApi.scan() har biri uchun → POS.checkout()
                    │
                    ▼
                  TTS: "Sotuv yakunlandi, jami 15 000 so'm"
```

### Muddati
- 3-5 ish kuni
- Aniqlik 70-85% (o'zbek tili uchun)

---

## Xulosa

| Funksiya | Murakkablik | Ish kuni | Tashqi xarajat |
|----------|-------------|----------|----------------|
| Offline mode + sync | Yuqori | 3-5 | Yo'q |
| PostgreSQL migration | O'rta | 1-2 | Yo'q |
| Click integration | O'rta | 2-3 | Click merchant fee |
| Payme integration | O'rta | 2-3 | Payme merchant fee |
| Voice POS | Yuqori | 3-5 | LLM API tokens |

Eng tezda biznes qiymat keltiradigani: **PostgreSQL migration** (texnik debt) +
**Click/Payme** (mijoz uchun qulaylik).
