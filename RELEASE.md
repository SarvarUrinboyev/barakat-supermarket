# Yangi versiya chiqarish (Avtomatik yangilanish)

Bu hujjat — do'konlarga o'rnatilgan ilovaga **uydan turib yangilanish yuborish**
yo'riqnomasi. Mijoz dasturni ochganda yangi versiya avtomatik yuklab olinadi va
"qayta ishga tushirish" so'raladi (xuddi Telegram yoki Claude desktopdagidek).

---

## 1. Bir martalik sozlash

1. **GitHub akkaunt** oching — <https://github.com> (bepul).

2. **Ommaviy (Public) repozitoriy** yarating, nomi: `barakat-supermarket`.
   > Muhim: repozitoriy **Public** bo'lishi shart — shunda mijozlar kompyuteriga
   > hech qanday parol/token kerak bo'lmaydi.

3. `electron/package.json` dagi `owner` allaqachon `SarvarUrinboyev` ga
   sozlangan — o'zgartirish shart emas. Repozitoriy nomi: `barakat-supermarket`.

4. GitHub'da **Personal Access Token** yarating:
   Settings → Developer settings → Personal access tokens → Tokens (classic) →
   Generate new token. `public_repo` (yoki `repo`) ruxsatini belgilang, tokenni
   nusxalab oling (`ghp_...`).

---

## 2. Har safar yangi versiya chiqarish

1. Kodga kerakli o'zgartirishlarni kiriting.

2. `electron/package.json` dagi `version` ni oshiring, masalan
   `1.1.0` → `1.1.1`.

3. Buyruq oynasi (cmd) da tokenni o'rnating:

   ```
   set GH_TOKEN=ghp_sizning_tokeningiz
   ```

4. Loyiha papkasida `release.bat` ni ishga tushiring (yoki qo'lda):

   ```
   release.bat
   ```

   Bu frontend + backend ni yig'adi va yangi versiyani GitHub Releases'ga
   yuklaydi.

5. Tayyor. Mijozlar dasturni keyingi ochganda yangilanish o'zi keladi:
   fonda yuklab olinadi, so'ng "Hozir qayta ishga tushirish" oynasi chiqadi.

---

## Eslatma

- Birinchi versiyani ham shu yo'l bilan (`release.bat`) chiqarish kerak —
  shunda GitHub'da birinchi "release" paydo bo'ladi.
- `GH_TOKEN` ni hech kimga bermang va kodga yozib qo'ymang.
- Versiya raqami **har safar** oshishi shart, aks holda yangilanish ko'rinmaydi.
