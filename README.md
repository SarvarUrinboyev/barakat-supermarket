# Barakat SuperMarket

**Supermarket egasi uchun moliyaviy boshqaruv tizimi.** Qog'oz daftar o'rnini
bosadi: kunlik xarajatlar, qarzlar, buyurtmalar va smena hisobotlarini raqamli
shaklda saqlaydi, tahlil qiladi va Telegram orqali yuboradi.

Desktop ilova (Electron) + REST backend (Spring Boot) + React dashboard +
PostgreSQL bazasi.

---

## 1. Texnologiyalar

| Qism      | Texnologiya              | Versiya |
| --------- | ------------------------ | ------- |
| Backend   | Java + Spring Boot       | 21 / 3.3 |
| Database  | PostgreSQL               | 16+ (18 sinovdan o'tgan) |
| Frontend  | React + Vite             | 18      |
| Desktop   | Electron                 | 33      |
| Build     | Maven (wrapper) + Node.js| —       |

## 2. Talablar (kompyuterda o'rnatilgan bo'lishi kerak)

- **Java 21** (JDK) — backend uchun
- **Node.js 18+** — frontend va Electron build uchun
- **PostgreSQL 16+** — ma'lumotlar bazasi
- Maven kerak emas — loyiha ichidagi `mvnw` wrapper avtomatik yuklab oladi

## 3. Birinchi marta sozlash

### 3.1. PostgreSQL bazasi

PostgreSQL o'rnatilgach, `barakat_market` bazasini yarating:

```sql
CREATE DATABASE barakat_market;
```

Standart ulanish sozlamasi (`backend/src/main/resources/application.properties`):

| Parametr | Qiymat          |
| -------- | --------------- |
| Host     | localhost:5432  |
| Baza     | barakat_market  |
| User     | postgres        |
| Parol    | 1234            |

Agar parolingiz boshqacha bo'lsa — `backend/application-local.properties`
faylini yarating (`application-local.properties.example` dan nusxa oling) va
`spring.datasource.password` ni o'zgartiring.

Jadvallar **avtomatik** yaratiladi (Flyway migratsiyasi orqali) — qo'lda
yaratish shart emas.

### 3.2. Telegram bot

`backend/application-local.properties.example` faylidan nusxa olib,
`application-local.properties` deb saqlang va to'ldiring:

```properties
telegram.enabled=true
telegram.bot-token=BOT-FATHER-DAN-OLINGAN-TOKEN
telegram.chat-ids=CHAT-ID-1,CHAT-ID-2
```

Bu fayl git ga tushmaydi (`.gitignore`). Telegram sozlanmasa — tizim baribir
to'liq ishlaydi, faqat xabarlar yuborilmaydi.

> Desktop ilovada bu fayl `C:\Users\<foydalanuvchi>\.barakat\` papkasida
> joylashadi va birinchi ishga tushishda namunadan avtomatik yaratiladi.

### 3.3. JWT signing key

Backend (va license-server) sukut bo'yicha kuchsiz secret bilan ishga
tushmaydi — quyidagidan birini tanlang:

- **Lokal dasturchilik (oson yo'l):** environment'ga
  `SAVDOPRO_ALLOW_DEV_SECRET=true` qo'shing. Server umumiy dev fallback
  bilan ishga tushadi va balandovozli WARN yozadi. **Hech qachon real
  ma'lumotli serverda yoqmang.**
- **Production yoki sinov stendi:** 32+ belgili tasodifiy kalit yarating
  (`openssl rand -base64 48`) va `SAVDOPRO_JWT_SECRET` ga environment yoki
  `application-local.properties` orqali bering.

Hech qaysisi o'rnatilmasa server `IllegalStateException` bilan to'xtaydi —
bu ataylab, kuchsiz secret bilan productionga chiqib ketmaslik uchun.

## 4. Ishga tushirish

### Foydalanuvchi uchun (tayyor ilova)

1. `electron\dist\Barakat SuperMarket Setup 1.0.0.exe` ni ishga tushiring.
2. O'rnatishni yakunlang — Desktop'da yorliq paydo bo'ladi.
3. Yorliqni ikki marta bosing. "Tizim ishga tushmoqda..." ekrani 5-15 soniya
   ko'rinadi, so'ng dastur ochiladi.

### Dasturchi uchun (manba kodidan)

```
start.bat
```

Birinchi marta ishga tushganda hammasini build qiladi (bir necha daqiqa),
keyin Electron oynasini ochadi.

### Alohida ishga tushirish (debug)

```bash
# Backend (port 8086)
cd backend && mvnw.cmd spring-boot:run

# Frontend dev server (port 3000, /api ni 8086 ga proksilaydi)
cd frontend && npm run dev
```

## 5. Yangilash

Kodga o'zgartirish kiritilgach, yangi o'rnatuvchi yaratish uchun:

```
update.bat
```

Bu frontend → backend JAR → Electron installer ketma-ketligida build qiladi
(~10-15 daqiqa). Natija: `electron\dist\Barakat SuperMarket Setup 1.0.0.exe`.

## 6. Loyiha tuzilishi

```
barakat-supermarket/
├── backend/        Spring Boot REST API + PostgreSQL (Flyway migratsiya)
│   ├── src/main/java/uz/barakat/market/
│   │   ├── domain/        JPA entity'lar
│   │   ├── repository/    Spring Data repozitoriylar
│   │   ├── dto/           So'rov / javob obyektlari
│   │   ├── service/       Biznes mantiq (bulk-import parser shu yerda)
│   │   ├── controller/    REST endpointlar
│   │   └── telegram/      Telegram xizmati + rejalashtirilgan eslatmalar
│   └── src/main/resources/db/migration/   SQL sxema
├── frontend/       React + Vite dashboard (7 sahifa)
├── electron/       Desktop o'rami + installer konfiguratsiyasi
├── start.bat       Manba kodidan ishga tushirish
└── update.bat      To'liq qayta build + yangi installer
```

## 7. Portlar

| Parametr        | Qiymat         |
| --------------- | -------------- |
| Backend port    | 8086           |
| Frontend (dev)  | 3000           |
| Database port   | 5432           |

## 8. Sahifalar

| Sahifa         | Vazifasi |
| -------------- | -------- |
| Dashboard      | Ertalabgi balans, 6 ko'rsatkich, top xarajatlar, buyurtmalar holati |
| Xarajatlar     | Market + uy xarajatlari, sana filtri, bittalab va ko'p kiritish |
| Uy xarajatlari | Shaxsiy/oilaviy xarajatlar |
| Buyurtmalar    | Bugun / kelmagan / kutilayotgan; "Keldi" → avtomatik xarajat |
| Ombor          | Telefon/elektronika mahsulotlari: kelish/sotilish narxi, qoldiq, Kirim/Chiqim |
| Qarz           | Mening qarzlarim + Bizdan qarzlar, progress bar, qisman to'lash |
| Smena tarixi   | Ochilgan/yopilgan smenalar ro'yxati |
| Smena yopish   | Kunlik hisobot, 80mm chek, Telegram'ga yuborish |

## 9. API endpointlar (asosiy)

| Modul     | Endpoint                               |
| --------- | -------------------------------------- |
| Dashboard | `GET /api/dashboard`                   |
| Xarajatlar| `GET/POST /api/expenses`, `POST /api/expenses/bulk-import` |
| Uy xaraj. | `GET/POST /api/home-expenses`          |
| Buyurtma  | `GET /api/orders/grouped`, `PATCH /api/orders/{id}/complete` |
| Ombor     | `GET/POST /api/products`, `PATCH /api/products/{id}/adjust` |
| Qarzlar   | `GET /api/debts/summary`, `PATCH /api/debtors/{id}/partial-pay` |
| Balans    | `GET /api/balance/today`, `POST /api/balance` |
| Smena     | `POST /api/shifts/open`, `POST /api/shifts/close` |
| Hisobot   | `GET /api/report/end-of-day`, `POST /api/report/send-telegram` |
| Terminal  | `POST /api/terminal`                   |

## 10. Ma'lumotlar bazasi

12 ta jadval: `expenses`, `home_expenses`, `orders`, `debtors`,
`customer_debts`, `debt_payments`, `day_balance`, `shifts`,
`terminal_balances`, `products`, `categories`, `stock_movements`.

**Backup (har hafta tavsiya etiladi):** pgAdmin → `barakat_market` → o'ng tugma
→ Backup → format `Plain`. Backup faylni USB yoki bulutda saqlang.

## 11. Telegram bildirishnomalari

| Holat            | Xabar |
| ---------------- | ----- |
| Smena yopilganda | To'liq smena hisoboti |
| Har kuni 08:00   | Ertalabgi eslatma (bugun keladi, kelmagan, qarz) |
| Har kuni 22:00   | Smena yopish eslatmasi |

## 12. Chek printer

XP-80C (80mm) termal printer uchun moslangan. Chek `window.print()` orqali
chiqariladi; tizim sozlamalarida XP-80C ni standart printer qilib qo'ying.

## 13. Muammolar va yechimlar

| Muammo                  | Yechim |
| ----------------------- | ------ |
| Oq ekran ochiladi       | Backend ishga tushmagan — dasturni yoping va qayta oching |
| "Serverga ulanib bo'lmadi" | PostgreSQL ishlayotganini tekshiring |
| Port 8086 band          | `taskkill /F /IM java.exe` → qayta oching |
| Telegram xabar kelmadi  | Internet va `application-local.properties` token'ini tekshiring |
| Backend build xato      | Java 21 o'rnatilganini tekshiring (`java -version`) |

## 14. Xavfsizlik

- PostgreSQL parolini yodda saqlang.
- Telegram bot tokenini hech kimga bermang. `application-local.properties`
  git ga tushmaydi.
- Har hafta bazani backup qiling.

---

*Barakat SuperMarket · Moliyaviy boshqaruv tizimi · v1.0*
