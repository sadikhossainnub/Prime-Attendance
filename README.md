# Prime Attendance

ZKTeco বায়োমেট্রিক অ্যাটেনডেন্স ডিভাইস থেকে **সরাসরি** পাঞ্চ ডেটা গ্রহণের **প্ল্যাটফর্ম**। প্রতিটি ক্লায়েন্টের আলাদা portal, ডেটা আলাদা (multi-tenant), আপনি super admin হিসেবে সব ক্লায়েন্ট ম্যানেজ করেন।

## 🎉 Recent Updates (June 20, 2026)

### ✅ ERPNext Sync Fixed
- Fixed "setSuccess is not defined" error in Attendance page
- Added success notification UI for sync operations
- All TypeScript compilation errors resolved
- **Status:** Production ready! ✓

### 🔍 IN/OUT Mode Debugging Added
- Enhanced logging to track inOutMode values from devices
- Created automated debug script (`./scripts/debug-inout-mode.sh`)
- Added comprehensive troubleshooting guides
- Server now logs every punch with its IN/OUT mode

### 📚 New Documentation
- `/ERPNEXT_SYNC_TROUBLESHOOTING.md` - Complete sync troubleshooting
- `/SYNC_FIX_BN.md` - Sync fix summary (Bengali)
- `/INOUT_MODE_FIX.md` - IN/OUT mode troubleshooting (English)
- `/INOUT_FIX_BANGLA.md` - IN/OUT mode fix guide (Bengali)
- `/CHANGELOG.md` - Complete change history
- `/HRMS_IMPLEMENTATION_PLAN.md` - Full HRMS roadmap

---

## পোর্টাল

| পোর্টাল | URL | কে ব্যবহার করে |
|---------|-----|----------------|
| **Super Admin** | `/admin` | আপনি — ক্লায়েন্ট তৈরি, suspend, stats |
| **Client Portal** | `/portal` | আপনার ক্লায়েন্ট — attendance, devices, employees |

**ডিফল্ট Super Admin (প্রথম চালুতে অটো তৈরি):**

- Email: `admin@primetechbd.xyz` (`.env` দিয়ে পরিবর্তন)
- Password: `Admin@12345` — **প্রডাকশনে অবশ্যই বদলান**

## বৈশিষ্ট্য

- **Multi-tenant** — প্রতি ক্লায়েন্ট আলাদা ডেটা
- ZKTeco ADMS push (`/iclock/*`) + provision key
- **Super Admin:** ক্লায়েন্ট CRUD, suspend, global dashboard
- **Client Portal:** dashboard, attendance, devices, PIN mapping
- JWT লগইন (Super Admin / Tenant Admin / Tenant User)
- ERPNext সিঙ্ক হুক (ঐচ্ছিক)
- Docker ও EasyPanel-ready

## টেক স্ট্যাক

| অংশ | প্রযুক্তি |
|-----|-----------|
| Backend | Node.js 20, Express 5, Prisma |
| Database | PostgreSQL 16 |
| Frontend | React 19, Vite, Tailwind CSS 4 |
| Deploy | Docker, EasyPanel |

## প্রজেক্ট স্ট্রাকচার

```
Prime Attendance/
├── server/                 # Express API + ZKTeco /iclock handlers
│   ├── prisma/             # DB schema ও migrations
│   └── src/
│       ├── routes/         # iclock.ts, api.ts
│       └── services/       # parser, ingest, erpnext
├── client/                 # React admin UI
├── Dockerfile              # Production (UI + server এক ইমেজ)
├── docker-compose.yml      # Local PostgreSQL + server
├── DEPLOY_EASYPANEL.md     # EasyPanel বিস্তারিত গাইড
└── scripts/
    └── simulate-device.sh  # curl দিয়ে টেস্ট
```

---

## দ্রুত শুরু (Local)

### প্রয়োজনীয়তা

- Node.js 20+
- PostgreSQL 16 (বা Docker)
- npm

### ১. PostgreSQL

```bash
docker compose up -d postgres
```

### ২. Backend

```bash
cp .env.example server/.env
cd server
npm install
npx prisma migrate deploy
npm run dev
```

সার্ভার: `http://localhost:7788`

### ৩. Frontend (আলাদা টার্মিনাল)

```bash
cd client
npm install
npm run dev
```

UI: `http://localhost:5173`

লগইন: `http://localhost:5173/login` → Super Admin credentials (উপরে)

---

## Environment Variables

`server/.env` বা EasyPanel Environment ট্যাবে:

| Variable | বাধ্যতামূলক | বিবরণ |
|----------|-------------|--------|
| `DATABASE_URL` | হ্যাঁ | PostgreSQL connection string |
| `PORT` | না | ডিফল্ট `7788` |
| `JWT_SECRET` | হ্যাঁ | JWT সাইনিং (৩২+ অক্ষর) |
| `SUPER_ADMIN_EMAIL` | না | প্রথম super admin |
| `SUPER_ADMIN_PASSWORD` | না | প্রথম super admin পাসওয়ার্ড |
| `TZ` | না | ডিফল্ট `Asia/Dhaka` |
| `CLIENT_DIST_PATH` | না | Production UI path (`/app/client-dist`) |
| `ERPNEXT_ENABLED` | না | `true` / `false` (ডিফল্ট `false`) |
| `ERPNEXT_URL` | না | ERPNext সাইট URL |
| `ERPNEXT_API_KEY` | না | ERPNext API key |
| `ERPNEXT_API_SECRET` | না | ERPNext API secret |

উদাহরণ: [.env.example](./.env.example)

---

## ক্লায়েন্ট ওয়ার্কফ্লো

1. **Super Admin** (`/admin`) → **Clients** → **New client** (কোম্পানি + admin user)
2. ক্লায়েন্ট লগইন (`/portal`) → **Devices** → Serial Number যোগ করুন
3. **Settings** → Provision Key দেখুন
4. ZKTeco ডিভাইসে IP + port `7788` সেট করুন
5. প্রথম কানেকশন: ডিভাইস SN portal-এ আগে থেকে থাকলে অটো; নতুন ডিভাইসে URL-এ `?tenant=SLUG&key=PROVISION_KEY`

---

## ZKTeco অ্যাটেনডেন্স ডিভাইস কনফিগারেশন

ডিভাইস যেন **Prime Attendance সার্ভার**-এ সরাসরি পাঞ্চ পাঠায় — ZKTeco PC সফটওয়্যার বা USB এক্সপোর্ট লাগবে না।

### আগে যা প্রস্তুত থাকতে হবে

| ধাপ | কাজ |
|-----|-----|
| ১ | সার্ভার চালু (`npm run dev` বা EasyPanel deploy) |
| ২ | PostgreSQL কানেক্টেড |
| ৩ | সার্ভার IP ঠিক করা (নিচে দেখুন) |
| ৪ | পোর্ট **7788** খোলা (ফায়ারওয়াল/VPS) |
| ৫ | ডিভাইসে **Cloud Server / ADMS** অপশন আছে কিনা চেক করুন |

### সার্ভার IP কোথায় পাবেন

| সেটআপ | ডিভাইসে যে IP দেবেন |
|--------|----------------------|
| **অফিস LAN** (PC/VPS একই নেটওয়ার্ক) | সার্ভার PC-র LAN IP, যেমন `192.168.1.50` |
| **EasyPanel / VPS** | VPS-এর **পাবলিক IP** (যেমন `103.XX.XX.XX`) |
| **ডোমেন** (শুধু নতুন মডেল, HTTPS সাপোর্ট) | `attendance.yourdomain.com` + port `443` |

LAN IP খুঁজতে (সার্ভার PC-তে):

```bash
# Linux
hostname -I

# Windows (CMD)
ipconfig
```

> **গুরুত্বপূর্ণ:** বেশিরভাগ ZKTeco শুধু **HTTP + IP + Port** বোঝে। `https://` URL অনেক পুরনো ডিভাইসে কাজ করে না — তখন **IP + 7788** ব্যবহার করুন।

---

### ধাপে ধাপে ডিভাইস সেটআপ

#### ১. ডিভাইস মেনুতে প্রবেশ

- ডিভাইস স্ক্রিনে **মেনু (Menu)** বাটন চাপুন
- **Admin** পাসওয়ার্ড দিন (ডিফল্ট প্রায়ই `0` বা ম্যানুয়ালে লেখা)

#### ২. Communication / Cloud Server মেনু

মডেল ভিন্ন হলে নাম একটু আলাদা — নিচের যেকোনো পাথ খুঁজুন:

| মডেল সিরিজ | মেনু পাথ (আনুমানিক) |
|------------|---------------------|
| K40, F18, UFace, iFace | `Comm` → `Cloud Server` বা `ADMS` |
| MB, Pro, নতুন টাচ | `System` → `Communication` → `Cloud Server Setting` |
| কিছু ফার্মওয়্যার | `Ethernet` → `Cloud Server` / `Web Server` |

#### ৩. Cloud Server সেটিংস (মূল ফিল্ড)

ডিভাইস স্ক্রিনে এই মানগুলো দিন:

| ফিল্ড | মান | উদাহরণ |
|-------|-----|--------|
| **Enable Cloud Server** | `ON` / `Yes` | — |
| **Server Mode** | `ADMS` বা `Cloud` (থাকলে) | ADMS |
| **Server IP** | Prime Attendance সার্ভার IP | `192.168.1.50` বা VPS IP |
| **Server Port** | `7788` | `7788` |
| **Server Address / URL** | কিছু মডেলে শুধু IP; কিছুতে `http://IP:7788` | `http://192.168.1.50:7788` |
| **HTTPS / SSL** | **OFF** (প্রথমে) | পুরনো ডিভাইসে ON করবেন না |
| **Proxy** | OFF | — |

**সেভ** করুন (OK / Save) — ডিভাইস রিবুট হতে পারে।

#### ৪. ডিভাইস সময় (ঘড়ি) মিলান

ভুল সময়ে ভুল অ্যাটেনডেন্স যাবে:

- `System` → `Date/Time` → তারিখ ও সময় ঠিক করুন
- টাইমজোন: **Bangladesh (UTC+6)** বা `GMT+6`
- সার্ভারেও `TZ=Asia/Dhaka` সেট থাকা উচিত

#### ৫. পুরনো ZKTeco সফটওয়্যার বন্ধ করুন

PC-তে **ZKBio Time / ZKTime** চালু থাকলে ডিভাইস অনেক সময় সার্ভারের বদলে PC-তেই যুক্ত হয়:

- PC সফটওয়্যার বন্ধ করুন, অথবা
- ডিভাইস `Comm` → **PC Connection** / **RS232** অফ রাখুন (শুধু Ethernet + Cloud)

---

### কনফিগারেশন উদাহরণ

**অফিস LAN (সার্ভার একই Wi‑Fi/LAN-এ):**

```
Enable Cloud Server : ON
Server IP           : 192.168.1.50
Server Port         : 7788
HTTPS               : OFF
```

**EasyPanel VPS:**

```
Enable Cloud Server : ON
Server IP           : 103.XX.XX.XX    ← VPS পাবলিক IP
Server Port         : 7788
HTTPS               : OFF
```

VPS-এ অবশ্যই পোর্ট খোলা:

```bash
sudo ufw allow 7788/tcp
```

---

### ঠিকমতো কাজ করছে কিনা যাচাই

#### ক) সার্ভার লগ

ডিভাইস কানেক্ট হলে সার্ভার লগে দেখা যাবে:

```
[iclock] ATTLOG from XXXXXXXXX: inserted=1 ...
```

#### খ) Admin UI

1. ব্রাউজারে UI খুলুন (`http://সার্ভার-IP:7788` বা আপনার ডোমেন)
2. **Settings** → API Key সেট করুন
3. **Devices** — ডিভাইসের Serial Number দেখা যাবে, Status **Online**
4. **Attendance** — টেস্ট পাঞ্চ দিলে নতুন রো আসবে

#### গ) টেস্ট পাঞ্চ

ডিভাইসে আঙুল/কার্ড দিয়ে একবার পাঞ্চ দিন → ১–২ মিনিট অপেক্ষা → Attendance পেজ রিফ্রেশ।

#### ঘ) curl দিয়ে (সার্ভার টেস্ট)

```bash
./scripts/simulate-device.sh http://192.168.1.50:7788 TEST001
```

---

### ZKTeco মেনু স্ক্রিন — দ্রুত রেফারেন্স

```
[Menu] → Comm / Communication
         ├── Cloud Server Setting
         │     ├── Enable          → ON
         │     ├── Server IP       → 192.168.x.x
         │     ├── Port            → 7788
         │     └── Save
         ├── Ethernet (IP ঠিক আছে কিনা)
         └── PC Connection         → OFF (যদি শুধু cloud চান)

[Menu] → System
         └── Date/Time             → Asia/Dhaka / GMT+6
```

---

### সাধারণ সমস্যা (ডিভাইস)

| লক্ষণ | কারণ | সমাধান |
|-------|-------|--------|
| ডিভাইসে “Connect Fail” | ভুল IP/পোর্ট | IP ping করুন; port 7788 খোলা কিনা |
| Online দেখায় না | ফায়ারওয়াল / ভিন্ন নেটওয়ার্ক | একই LAN; VPS-এ `ufw allow 7788` |
| Online কিন্তু পাঞ্চ নেই | পুরনো PC software ধরে রেখেছে | ZKBio Time বন্ধ; Cloud ON |
| HTTPS error | SSL চালু | HTTPS **OFF**, শুধু HTTP |
| সময় ভুল | ডিভাইস ঘড়ি | Date/Time + `TZ=Asia/Dhaka` |
| শুধু LAN কাজ করে, বাইরে না | Router port forward নেই | VPS-এ সরাসরি deploy করুন |

### ডিভাইসে Cloud Server অপশন নেই?

কিছু পুরনো মডেলে **ADMS/Cloud Server** নেই — তখন:

1. ডিভাইসের **মডেল নম্বর** ও **ফার্মওয়্যার ভার্সন** নোট করুন
2. ZKTeco সাপোর্ট থেকে ফার্মওয়্যার আপডেট করুন, অথবা
3. আলাদা ইন্টিগ্রেশন (SDK/pull) লাগতে পারে — সাপোর্টে জানান

---

### ফায়ারওয়াল (Linux VPS / সার্ভার)

```bash
sudo ufw allow 7788/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## API Reference

### ZKTeco (ডিভাইস — অথেন্টিকেশন নেই)

| Method | Path | বিবরণ |
|--------|------|--------|
| GET/POST | `/iclock/cdata` | হ্যান্ডশেক, `ATTLOG` আপলোড |
| GET/POST | `/iclock/getrequest` | ডিভাইস কমান্ড poll |
| GET/POST | `/iclock/devicecmd` | কমান্ড রেসপন্স |
| GET | `/iclock/ping` | Heartbeat |

**ATTLOG ফরম্যাট** (ট্যাব-সেপারেটেড):

```
PIN    DateTime              Status  Verify  InOutMode  WorkCode
101    2026-05-16 09:00:00   0       1       0          0
```

### Auth API

| Method | Path | বিবরণ |
|--------|------|--------|
| POST | `/api/auth/login` | `{ email, password }` → JWT |
| GET | `/api/auth/me` | Bearer token |

### Super Admin API (`Authorization: Bearer <token>`)

| Method | Path | বিবরণ |
|--------|------|--------|
| GET | `/api/admin/stats` | Global dashboard |
| GET/POST | `/api/admin/tenants` | ক্লায়েন্ট তালিকা / তৈরি |
| GET/PATCH | `/api/admin/tenants/:id` | বিস্তারিত / আপডেট |

### Client Portal API (Bearer token, tenant-scoped)

| Method | Path | বিবরণ |
|--------|------|--------|
| GET | `/api/portal/dashboard` | ক্লায়েন্ট dashboard |
| GET/POST | `/api/portal/devices` | ডিভাইস |
| GET | `/api/portal/attendance` | অ্যাটেনডেন্স লগ |
| GET/POST | `/api/portal/employees/mapping` | PIN ম্যাপিং |
| GET | `/api/portal/settings` | Provision key, slug |

---

## টেস্ট

### স্ক্রিপ্ট

```bash
chmod +x scripts/simulate-device.sh
./scripts/simulate-device.sh http://localhost:7788 TEST001
```

### ম্যানুয়াল curl

```bash
# ডিভাইস push সিমুলেশন
curl -X POST "http://localhost:7788/iclock/cdata?SN=TEST001&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d $'101\t2026-05-16 09:00:00\t0\t1\t0\t0'

# API দিয়ে দেখা
# Login first, then use token:
# curl -H "Authorization: Bearer TOKEN" "http://localhost:7788/api/portal/attendance?limit=10"
```

---

## Deploy

### Docker (এক কমান্ডে build — root Dockerfile)

```bash
docker build -t prime-attendance .
docker run -p 7788:7788 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-jwt-secret" \
  prime-attendance
```

### Docker Compose (local dev)

```bash
cp .env.example .env
# .env এ API_KEY সেট করুন
docker compose up -d --build
```

### EasyPanel (VPS)

বিস্তারিত ধাপ-ধাপ গাইড:

**[DEPLOY_EASYPANEL.md](./DEPLOY_EASYPANEL.md)**

সংক্ষেপে:

1. EasyPanel-এ **PostgreSQL** সার্ভিস তৈরি করুন
2. **App** সার্ভিস → GitHub repo → Dockerfile path: `Dockerfile` → Port: `7788`
3. Env: `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_*`, `CLIENT_DIST_PATH=/app/client-dist`
4. Domain + SSL যোগ করুন
5. ZKTeco-তে VPS IP + port `7788` সেট করুন

---

## ERPNext Integration (ঐচ্ছিক)

`.env` এ:

```env
ERPNEXT_ENABLED=true
ERPNEXT_URL=https://erp.yourdomain.com
ERPNEXT_API_KEY=your_key
ERPNEXT_API_SECRET=your_secret
```

UI-তে **Employees** পেজে প্রতিটি PIN-এর জন্য **ERPNext Employee ID** যোগ করুন। নতুন পাঞ্চ ERPNext `Employee Checkin`-এ সিঙ্ক হবে।

---

## UI পেজ

**Super Admin (`/admin`):** Dashboard, Clients (create/suspend), Client detail

**Client Portal (`/portal`):** Dashboard, Attendance, Devices, Employees, Settings (provision key)

---

## সমস্যা সমাধান

| সমস্যা | সম্ভাব্য কারণ | সমাধান |
|--------|---------------|--------|
| ডিভাইস কানেক্ট হয় না | ভুল IP/পোর্ট, ফায়ারওয়াল | LAN/VPS IP, port 7788, `ufw` চেক |
| ডিভাইস আসে, ATTLOG নেই | ফার্মওয়্যার ফরম্যাট | `/api/raw-events` দেখুন |
| UI তে 401 | Token expired | আবার `/login` করুন |
| Build fail (EasyPanel) | Dockerfile path | root `Dockerfile` সিলেক্ট করুন |
| DB error | `DATABASE_URL` ভুল | Internal URL (EasyPanel DB) |
| সময় ভুল | টাইমজোন | `TZ=Asia/Dhaka`, ডিভাইস ঘড়ি মিলান |
| 502 Bad Gateway | Port mismatch | EasyPanel-এ container port `7788` |

---

## Scripts

```bash
# Development
npm run dev:server      # root থেকে
npm run dev:client

# Production build
npm run build           # client + server

# Database
cd server && npx prisma migrate deploy
cd server && npx prisma studio
```

---

## License

Private / internal use — Prime Tech BD


---

## Device Offline কিন্তু ATTLOG আসছে? (Troubleshooting)

এটি একটি সাধারণ সমস্যা যখন device সার্ভারে connect করছে কিন্তু **online status** update হচ্ছে না।

### ডিবাগিং ধাপ:

#### ১. সার্ভার লগ চেক করুন

```bash
npm run dev
# Output-এ এই লাইন আসা উচিত:
# [iclock] Device connected: SN=XXXXX, IP=185.250.37.21, tenant=your-tenant, lastSeen=2026-06-01T...
```

যদি এই লাইন না আসে, device সার্ভারে connect হচ্ছে না।

#### ২. Raw Events দেখুন

- UI → **Raw Events** → Device requests দেখা যাবে
- যদি requests আসছে, device সার্ভারে connect করছে

#### ३. Database সরাসরি চেক করুন

```bash
cd server
npx prisma studio
# Device table খুলুন → lastSeenAt timestamp দেখুন
# যদি পুরনো থাকে, device connect হচ্ছে না
```

#### ४. Device IP ঠিক আছে কিনা

```bash
# সার্ভার থেকে device ping করুন
ping 185.250.37.21

# Device থেকে সার্ভার test করুন:
curl -X GET "http://185.250.37.21:7788/iclock/ping?SN=YOUR_DEVICE_SN"
```

#### ५. Provision Key দিয়ে নতুন device register করুন

**Option A: Portal-এ device add করুন**
1. UI → **Devices** → **Add device**
2. Serial Number দিন
3. **Settings** → Provision Key কপি করুন

**Option B: Device-এ URL-এ provision key যোগ করুন**

Device menu-তে Cloud Server setting-এ:
```
Server Address: http://185.250.37.21:7788/iclock/cdata?tenant=YOUR_TENANT_SLUG&key=YOUR_PROVISION_KEY
```

#### ६. সার্ভার রিস্টার্ট করুন

```bash
npm run dev
# বা EasyPanel-এ app restart করুন
```

#### ७. Online Status Threshold

Device **10 মিনিটের মধ্যে** কোনো request না পাঠালে offline দেখাবে। এটি ঠিক আছে কারণ:
- Device প্রতি ১-২ মিনিটে heartbeat পাঠায়
- যদি ১০ মিনিট কোনো request না আসে, device সত্যিই offline

### সাধারণ কারণ:

| কারণ | সমাধান |
|------|--------|
| Device IP ভুল | Device menu-তে IP ঠিক করুন |
| Port 7788 বন্ধ | VPS-এ `sudo ufw allow 7788/tcp` |
| Device ঘড়ি ভুল | Device Date/Time সেট করুন |
| Provision Key ভুল | Settings-এ সঠিক key দিন |
| Device offline হয়েছে | Device restart করুন |
| Network issue | Device ও সার্ভার একই network-এ আছে কিনা চেক করুন |

