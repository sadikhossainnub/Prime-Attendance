# EasyPanel-এ Prime Attendance Deploy

## প্রয়োজনীয় জিনিস

- EasyPanel ইনস্টল করা VPS (যেমন `https://panel.yourdomain.com`)
- GitHub-এ এই প্রজেক্টের repo (push করা)
- ZKTeco ডিভাইস যেটা **Cloud Server / ADMS** সাপোর্ট করে

---

## ধাপ ১ — PostgreSQL ডাটাবেস

1. EasyPanel → **New Project** → নাম: `prime-attendance`
2. **+ Service** → **Database** → **PostgreSQL**
3. সেটিংসে মনে রাখুন:
   - Database name: `prime_attendance`
   - User / Password (নিজে সেট করুন)
4. **Create** করুন
5. Database সার্ভিসে **Internal Connection URL** কপি করুন।  
   উদাহরণ:
   ```
   postgresql://prime:YOUR_PASSWORD@prime-attendance-db:5432/prime_attendance
   ```
   (`prime-attendance-db` = আপনার DB সার্ভিসের নাম — EasyPanel-এ যা দেখাবে)

---

## ধাপ ২ — App (Prime Attendance)

1. একই প্রজেক্টে **+ Service** → **App**
2. **Source:** GitHub → repo select → branch `main`
3. **Build:**
   - Method: **Dockerfile**
   - Dockerfile path: `Dockerfile` (repo root)
4. **Port:** `7788` (Container port)
5. **Domain:** যোগ করুন, যেমন `attendance.primetechbd.xyz`
   - SSL: Let's Encrypt চালু করুন (UI-এর জন্য)
6. **Environment** ট্যাবে যোগ করুন:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | ধাপ ১-এর Internal URL |
| `PORT` | `7788` |
| `JWT_SECRET` | শক্তিশালী র্যান্ডম স্ট্রিং (৩২+ অক্ষর) |
| `SUPER_ADMIN_EMAIL` | আপনার admin email |
| `SUPER_ADMIN_PASSWORD` | শক্তিশালী পাসওয়ার্ড |
| `TZ` | `Asia/Dhaka` |
| `ERPNEXT_ENABLED` | `false` |
| `CLIENT_DIST_PATH` | `/app/client-dist` |

7. **Deploy** ক্লিক করুন
8. লগে দেখুন: `Prisma migrate` সফল + `listening on port 7788`

---

## ধাপ ৩ — লগইন

1. ব্রাউজারে: `https://attendance.primetechbd.xyz/login`
2. Super Admin দিয়ে লগইন → `/admin` থেকে ক্লায়েন্ট তৈরি করুন
3. ক্লায়েন্ট admin দিয়ে `/portal` লগইন

---

## ধাপ ৪ — ZKTeco ডিভাইস কনফিগ

ডিভাইস **HTTP** দিয়ে সরাসরি IP/পোর্টে কানেক্ট করে (অনেক মডেল HTTPS সাপোর্ট করে না)।

### অপশন A — VPS IP + পোর্ট (সবচেয়ে সহজ)

EasyPanel App সার্ভিসে **Public Port** / **Expose** থাকলে `7788` ম্যাপ করুন।

ডিভাইসে:
- **Server IP:** VPS-এর পাবলিক IP
- **Port:** `7788`
- Cloud Server: **Enabled**

### অপশন B — সাবডোমেন (HTTPS)

কিছু নতুন ZKTeco HTTPS নেয়:
- Server: `attendance.primetechbd.xyz`
- Port: `443`

পুরনো ডিভাইসে কাজ না করলে **অপশন A** ব্যবহার করুন।

### ফায়ারওয়াল (VPS)

```bash
sudo ufw allow 7788/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## টেস্ট

```bash
curl -X POST "http://YOUR_VPS_IP:7788/iclock/cdata?SN=TEST001&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d $'101\t2026-05-16 09:00:00\t0\t1\t0\t0'
```

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
  "https://attendance.primetechbd.xyz/api/attendance?limit=5"
```

---

## সমস্যা সমাধান

| সমস্যা | সমাধান |
|--------|--------|
| Build fail | EasyPanel লগ দেখুন; `Dockerfile` path `Dockerfile` আছে কিনা |
| Database error | `DATABASE_URL` Internal URL ঠিক আছে কিনা; DB সার্ভিস running |
| 502 Bad Gateway | Container port `7788` মিলিয়েছে কিনা |
| ডিভাইস কানেক্ট হয় না | LAN নয় — পাবলিক IP + port 7788 খোলা; Cloud Server ON |
| UI 401 | Settings-এ `API_KEY` মিলিয়েছে কিনা |
| PathError: Missing parameter name | src/ এ app.get('*' খুঁজে app.use( বা regex দিয়ে replace করো |

---

## ERPNext (পরে)

```
ERPNEXT_ENABLED=true
ERPNEXT_URL=https://erp.yourdomain.com
ERPNEXT_API_KEY=...
ERPNEXT_API_SECRET=...
```

Deploy আবার চালান।
