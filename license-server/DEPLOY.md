# SavdoPRO License Server — VPS deployment

Tez ishga tushirish uchun qadamma-qadam qo'llanma. Boshidan oxirigacha ~30 daqiqa.

---

## 0. Nimaga kerak?

License Server bitta markaziy joyda turadi va **barcha mijozlarning desktop SavdoPRO ilovalari** unga ulanadi:

- Login/parol tekshiruvi (centralized)
- Akkaunt yaratish, bloklash, obuna muddatini boshqarish
- Mijoz qaysi noutbukdan ochsa ham bir xil login ishlaydi
- Ma'lumotlar (sotuv, tovar, qarz) **mahalliy qoladi** — VPS'ga jo'natilmaydi

VPS faqat **identity provider** rolida. Hech qanday sotuv/moliyaviy ma'lumot u yerda saqlanmaydi.

---

## 1. VPS tanlash

Tavsiya: **Hetzner CX22** yoki **DigitalOcean Basic Droplet**.

| Provayder        | Plan          | RAM   | Disk  | Narx ($/oy) |
| ---------------- | ------------- | ----- | ----- | ----------- |
| Hetzner          | CX22          | 4 GB  | 40 GB | ~$5         |
| DigitalOcean     | Basic         | 1 GB  | 25 GB | ~$6         |
| Vultr            | Cloud Compute | 1 GB  | 25 GB | ~$5         |

**Minimum**: 1 GB RAM, 10 GB disk, Ubuntu 22.04 yoki 24.04 LTS.

**Region**: Frankfurt yoki Helsinki — O'zbekistondan ping ~80–120 ms (ishlatishga yetarli).

---

## 2. VPS'ga birinchi marta kirish

VPS yaratilgandan keyin provayder sizga IP va root parol beradi (yoki SSH kalit).

```bash
ssh root@<VPS_IP>
```

Avval tizimni yangilang va xavfsizlikni asoslarini o'rnating:

```bash
apt update && apt upgrade -y
apt install -y ufw fail2ban
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9090/tcp   # License Server — keyinroq olib tashlaymiz (reverse proxy ortida)
ufw --force enable
```

---

## 3. Docker o'rnatish

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version   # tekshirish — v2.x bo'lishi kerak
```

---

## 4. License Server fayllarini ko'chirish

**Sizning kompyuteringizdan** (lokal mashina), faqat `license-server/` papkasini VPS'ga ko'chiramiz:

```bash
# Lokal mashinada
cd C:\Users\Laptop\Downloads\barakat-supermarket
scp -r license-server root@<VPS_IP>:/opt/savdopro-license/
```

Yoki `git clone` orqali (agar git'da bo'lsa):

```bash
# VPS'da
mkdir -p /opt && cd /opt
git clone https://github.com/sarvar/savdopro.git
mv savdopro/license-server savdopro-license
rm -rf savdopro
cd savdopro-license
```

---

## 5. .env faylini to'ldirish

```bash
cd /opt/savdopro-license
cp .env.example .env
nano .env
```

Mana shu uchta qiymatni **albatta o'zgartiring**:

```bash
POSTGRES_PASSWORD=$(openssl rand -base64 24)
SAVDOPRO_JWT_SECRET=$(openssl rand -base64 48)
SAVDOPRO_ADMIN_PASSWORD=$(openssl rand -base64 18)
```

Yoki bitta buyruq bilan generate qilish:

```bash
sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -base64 24)|" .env
sed -i "s|SAVDOPRO_JWT_SECRET=.*|SAVDOPRO_JWT_SECRET=$(openssl rand -base64 48)|" .env
sed -i "s|SAVDOPRO_ADMIN_PASSWORD=.*|SAVDOPRO_ADMIN_PASSWORD=$(openssl rand -base64 18)|" .env
```

**Admin parolni eslab qoling**: `grep SAVDOPRO_ADMIN_PASSWORD .env`

---

## 6. Ishga tushirish

```bash
docker compose up -d --build
docker compose logs -f license
```

Quyidagi log chiqishi kerak (~30 soniyada):

```
Started LicenseServerApplication in 12.345 seconds
SavdoPRO License Server ready on port 9090
```

Sog'liqni tekshirish:

```bash
curl http://localhost:9090/api/health
# {"app":"SavdoPRO License Server","status":"UP",...}
```

---

## 7. Brauzerda admin panelga kirish

Brauzerda `http://<VPS_IP>:9090/` ni oching. Login formasi chiqadi:

- **Login**: `admin`
- **Parol**: `.env` faylidagi `SAVDOPRO_ADMIN_PASSWORD` qiymati

Kirgandan keyin akkauntlar ro'yxatini ko'rasiz. **Birinchi qadam — admin parolni o'zgartirish** (panel ichida).

---

## 8. HTTPS qo'shish (tavsiya)

`http://` bilan ishlash ham mumkin, lekin parollar matn ko'rinishida o'tadi. **Caddy** orqali avtomatik Let's Encrypt sertifikat olish — 2 daqiqalik ish:

```bash
apt install -y caddy
```

`/etc/caddy/Caddyfile` ga yozing:

```
license.sizning-domen.uz {
    reverse_proxy localhost:9090
}
```

Domenni VPS IP'ga yo'naltirgan bo'lishingiz kerak (DNS A record).

```bash
systemctl reload caddy
ufw delete allow 9090/tcp     # endi faqat 443 orqali kirishni xohlaymiz
```

`docker-compose.yml` da `LICENSE_BIND` ni `127.0.0.1` ga o'zgartiring — endi 9090 portga tashqaridan kirib bo'lmaydi:

```bash
sed -i 's|^LICENSE_BIND=.*|LICENSE_BIND=127.0.0.1|' .env
docker compose up -d
```

Brauzerda `https://license.sizning-domen.uz/` ochiladi.

---

## 9. Desktop ilovalarni shu serverga ulash

Har bir mijozning SavdoPRO ilovasida:

1. **Kirish ekranida** "⚙️ Server sozlamalari" tugmasini bosing
2. **License server URL** qatoriga yozing: `https://license.sizning-domen.uz` (yoki `http://<VPS_IP>:9090` agar HTTPS yo'q bo'lsa)
3. **Saqlash** — endi shu mijoz uchun login/parol siz brauzer panelda yaratganingiz bilan ishlaydi

---

## 10. Backup

**PostgreSQL volume'ini har kuni backup qiling.** `/etc/cron.daily/savdopro-license-backup` ga yozing:

```bash
#!/bin/bash
set -e
BACKUP_DIR=/var/backups/savdopro
mkdir -p $BACKUP_DIR
TS=$(date +%Y%m%d-%H%M%S)
docker exec savdopro-license-db-1 pg_dump -U license license | gzip > $BACKUP_DIR/license-$TS.sql.gz
# 14 kundan eski backup'larni o'chirish
find $BACKUP_DIR -name 'license-*.sql.gz' -mtime +14 -delete
```

```bash
chmod +x /etc/cron.daily/savdopro-license-backup
```

Tashqi joyga (S3, rsync.net, boshqa server) yuborishni ham qo'shish tavsiya etiladi.

---

## 11. Yangilash (yangi versiya chiqqanda)

```bash
cd /opt/savdopro-license
git pull   # yoki scp orqali yangi fayllarni ko'chirish
docker compose build license
docker compose up -d license
docker compose logs -f license
```

Flyway migratsiyalar avtomatik qo'llaniladi.

---

## 12. Muammolar (troubleshooting)

| Muammo                          | Yechim                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker compose up` xato beryapti | `docker compose logs license` ni o'qing — odatda `.env`'da bir o'zgaruvchi yo'q       |
| 9090 portga ulanib bo'lmayapti  | `ufw status` — port ochiqmi? VPS provayder firewall'i ham bormi?                       |
| Login `401` beryapti            | `docker exec savdopro-license-db-1 psql -U license -c "SELECT * FROM app_users;"`     |
| Postgres ishga tushmayapti      | `docker compose logs db` — odatda volume permission yoki disk to'la                    |
| Diskdagi joy tugayapti          | `docker system prune -af --volumes` ehtiyot bilan; volume'larni saqlash uchun `-f` siz |

---

## 13. Xavfsizlik tavsiyalari

- [ ] Root SSH parol bilan kirishni o'chiring (faqat SSH key)
- [ ] `fail2ban` ishga tushirilgan bo'lsin
- [ ] `ufw` faqat 22, 80, 443 portlarni ochiq qoldirsin (9090 reverse proxy ortida)
- [ ] HTTPS (Caddy yoki Cloudflare) majburiy
- [ ] JWT secret 64+ random char
- [ ] Admin parolni har 90 kunda o'zgartiring
- [ ] Backup'larni boshqa lokatsiyaga ham nusxalang
- [ ] `docker compose pull && docker compose up -d` har oyda Postgres'ni yangilash uchun

---

**Tayyor.** Endi mijozlar `https://license.sizning-domen.uz/` orqali tizimga kirishadi va siz brauzer admin panelda ularning hisoblarini boshqarasiz.
