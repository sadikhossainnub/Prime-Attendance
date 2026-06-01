# .env Configuration Guide

## ফাইল অবস্থান
```
Prime Attendance/
└── server/
    └── .env  ← এখানে
```

---

## সম্পূর্ণ .env Template

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance

# ============================================
# SERVER
# ============================================
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=development

# ============================================
# JWT & AUTH
# ============================================
JWT_SECRET=your-long-random-secret-min-32-chars-here
JWT_EXPIRES_IN=7d

# ============================================
# SUPER ADMIN (প্রথম চালুতে অটো তৈরি)
# ============================================
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin

# ============================================
# ERPNext Integration (ঐচ্ছিক)
# ============================================
ERPNEXT_ENABLED=false
ERPNEXT_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=

# ============================================
# CLIENT (Production)
# ============================================
CLIENT_DIST_PATH=/app/client-dist

# ============================================
# CORS (Production)
# ============================================
CORS_ORIGIN=https://yourdomain.com
```

---

## প্রতিটি Variable বিস্তারিত

### DATABASE_URL
**কী:** PostgreSQL connection string

**Local Development:**
```env
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
```

**Docker Compose:**
```env
DATABASE_URL=postgresql://prime:prime_secret@postgres:5432/prime_attendance
```

**EasyPanel/VPS:**
```env
DATABASE_URL=postgresql://user:password@db-host:5432/database_name
```

**Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME
```

---

### PORT
**কী:** Server port

**Default:**
```env
PORT=7788
```

**Device-এ এই port ব্যবহার করবে:**
```
Device Menu → Comm → Cloud Server → Server Port: 7788
```

---

### TZ (Timezone)
**কী:** Server timezone

**Bangladesh:**
```env
TZ=Asia/Dhaka
```

**অন্যান্য:**
```env
TZ=Asia/Kolkata      # India
TZ=Asia/Bangkok      # Thailand
TZ=UTC               # UTC
```

**গুরুত্বপূর্ণ:** Device-এর সময়ের সাথে মিলান

---

### NODE_ENV
**কী:** Environment mode

**Development:**
```env
NODE_ENV=development
```

**Production:**
```env
NODE_ENV=production
```

**প্রভাব:**
- `development`: Detailed logs, hot reload
- `production`: Optimized, minimal logs

---

### JWT_SECRET
**কী:** JWT signing secret (অত্যন্ত গুরুত্বপূর্ণ!)

**প্রয়োজনীয়তা:**
- ন্যূনতম ৩২ অক্ষর
- Random string
- Strong password

**Generate করুন:**
```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Online (শুধু development)
https://www.random.org/strings/
```

**Example:**
```env
JWT_SECRET=a7f3k9m2x8q1w5e4r6t7y8u9i0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8
```

**⚠️ গুরুত্বপূর্ণ:**
- Production-এ strong secret ব্যবহার করুন
- কখনো default value ব্যবহার করবেন না
- Secret পরিবর্তন করলে সব tokens invalid হবে

---

### JWT_EXPIRES_IN
**কী:** JWT token expiration time

**Default:**
```env
JWT_EXPIRES_IN=7d
```

**Options:**
```env
JWT_EXPIRES_IN=1h      # 1 hour
JWT_EXPIRES_IN=24h     # 24 hours
JWT_EXPIRES_IN=7d      # 7 days
JWT_EXPIRES_IN=30d     # 30 days
```

---

### SUPER_ADMIN_EMAIL
**কী:** প্রথম super admin email

**Default:**
```env
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
```

**পরিবর্তন করুন:**
```env
SUPER_ADMIN_EMAIL=your-email@yourdomain.com
```

**প্রথম চালুতে:**
- এই email দিয়ে super admin account তৈরি হয়
- পরে UI-তে পরিবর্তন করতে পারবেন

---

### SUPER_ADMIN_PASSWORD
**কী:** প্রথম super admin password

**Default:**
```env
SUPER_ADMIN_PASSWORD=Admin@12345
```

**পরিবর্তন করুন (Production):**
```env
SUPER_ADMIN_PASSWORD=YourStrongPassword123!@#
```

**প্রয়োজনীয়তা:**
- ন্যূনতম ৮ অক্ষর
- Strong password recommended
- প্রথম লগইনের পর পরিবর্তন করুন

---

### SUPER_ADMIN_NAME
**কী:** প্রথম super admin নাম

**Default:**
```env
SUPER_ADMIN_NAME=Super Admin
```

**পরিবর্তন করুন:**
```env
SUPER_ADMIN_NAME=আপনার নাম
```

---

### ERPNEXT_ENABLED
**কী:** ERPNext integration চালু/বন্ধ

**Disabled (Default):**
```env
ERPNEXT_ENABLED=false
```

**Enabled:**
```env
ERPNEXT_ENABLED=true
ERPNEXT_URL=https://erp.yourdomain.com
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
```

---

### ERPNEXT_URL
**কী:** ERPNext সাইট URL

**Example:**
```env
ERPNEXT_URL=https://erp.yourdomain.com
```

**নোট:** HTTPS ব্যবহার করুন

---

### ERPNEXT_API_KEY
**কী:** ERPNext API key

**কীভাবে পাবেন:**
1. ERPNext login করুন
2. User settings → API Access
3. Generate API Key
4. Copy করুন

**Example:**
```env
ERPNEXT_API_KEY=abc123def456ghi789
```

---

### ERPNEXT_API_SECRET
**কী:** ERPNext API secret

**কীভাবে পাবেন:**
1. ERPNext login করুন
2. User settings → API Access
3. Generate API Secret
4. Copy করুন

**Example:**
```env
ERPNEXT_API_SECRET=xyz789uvw456rst123
```

---

### CLIENT_DIST_PATH
**কী:** Production-এ client build path

**Local Development:**
```env
# এই variable ছাড়াই ঠিক আছে
# Default: ../../client/dist
```

**EasyPanel/Docker:**
```env
CLIENT_DIST_PATH=/app/client-dist
```

---

### CORS_ORIGIN
**কী:** CORS allowed origin

**Development:**
```env
CORS_ORIGIN=http://localhost:5173
```

**Production:**
```env
CORS_ORIGIN=https://yourdomain.com
```

**Multiple origins (comma-separated):**
```env
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com
```

---

## Environment-wise Configuration

### Local Development

```env
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
CORS_ORIGIN=http://localhost:5173
```

### Docker Compose

```env
DATABASE_URL=postgresql://prime:prime_secret@postgres:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
```

### EasyPanel/VPS (Production)

```env
DATABASE_URL=postgresql://user:password@db-host:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=production
JWT_SECRET=your-long-random-secret-min-32-chars-here
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=YourStrongPassword123!@#
SUPER_ADMIN_NAME=আপনার নাম
ERPNEXT_ENABLED=false
CLIENT_DIST_PATH=/app/client-dist
CORS_ORIGIN=https://yourdomain.com
```

---

## কীভাবে সেট করবেন

### Method 1: File-এ সরাসরি

```bash
cd server
cp .env.example .env
nano .env  # বা আপনার editor
```

Edit করুন এবং save করুন।

### Method 2: EasyPanel-এ

1. EasyPanel → App → Environment
2. প্রতিটি variable add করুন
3. Save করুন

### Method 3: Command line

```bash
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-secret"
npm run dev
```

---

## Validation

### Server চালু করার সময় check করা হয়

```bash
npm run dev
```

যদি error আসে:
```
Configuration validation failed:
DATABASE_URL environment variable is required
JWT_SECRET must be at least 32 characters
```

তাহলে `.env` ফাইল ঠিক করুন।

---

## Security Checklist

Production-এ deploy করার আগে:

- [ ] `JWT_SECRET` strong আছে? (min 32 chars)
- [ ] `SUPER_ADMIN_PASSWORD` strong আছে?
- [ ] `DATABASE_URL` সঠিক?
- [ ] `NODE_ENV=production`?
- [ ] `CORS_ORIGIN` সঠিক domain?
- [ ] `.env` file `.gitignore`-এ আছে?
- [ ] `.env` file public-এ expose হয়নি?

---

## Common Issues

### Issue: "DATABASE_URL is required"

**সমাধান:**
```bash
# .env file আছে কিনা check করুন
ls -la server/.env

# DATABASE_URL set করুন
echo "DATABASE_URL=postgresql://..." >> server/.env
```

### Issue: "JWT_SECRET must be at least 32 characters"

**সমাধান:**
```bash
# Strong secret generate করুন
openssl rand -base64 32

# .env-এ set করুন
JWT_SECRET=your-generated-secret
```

### Issue: "Cannot connect to database"

**সমাধান:**
```bash
# DATABASE_URL check করুন
cat server/.env | grep DATABASE_URL

# PostgreSQL চলছে কিনা
psql -U prime -d prime_attendance -c "SELECT 1"
```

### Issue: "Port already in use"

**সমাধান:**
```bash
# অন্য port ব্যবহার করুন
PORT=7789 npm run dev

# অথবা existing process kill করুন
lsof -i :7788
kill -9 <PID>
```

---

## Example .env Files

### Minimal (Local)

```env
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
```

### Complete (Local)

```env
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
CORS_ORIGIN=http://localhost:5173
```

### Production (EasyPanel)

```env
DATABASE_URL=postgresql://user:password@db.internal:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=production
JWT_SECRET=a7f3k9m2x8q1w5e4r6t7y8u9i0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=YourStrongPassword123!@#
SUPER_ADMIN_NAME=আপনার নাম
ERPNEXT_ENABLED=false
CLIENT_DIST_PATH=/app/client-dist
CORS_ORIGIN=https://yourdomain.com
```

---

## Device Configuration

Device-এ এই settings ব্যবহার করবে:

```
Device Menu → Comm → Cloud Server
├── Enable Cloud Server    : ON
├── Server IP              : YOUR_SERVER_IP
├── Server Port            : 7788  ← PORT variable থেকে
├── HTTPS                  : OFF
└── Save
```

---

## Troubleshooting

### Device offline দেখাচ্ছে?

1. `.env` check করুন:
   ```bash
   cat server/.env | grep PORT
   # Output: PORT=7788
   ```

2. Device-এ port ঠিক আছে কিনা check করুন

3. Server চলছে কিনা:
   ```bash
   npm run dev
   ```

### Login fail হচ্ছে?

1. `SUPER_ADMIN_EMAIL` check করুন
2. `SUPER_ADMIN_PASSWORD` check করুন
3. Database reset করুন:
   ```bash
   npx prisma migrate reset
   ```

---

## Summary

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| DATABASE_URL | ✅ | - | postgresql://... |
| PORT | ❌ | 7788 | 7788 |
| TZ | ❌ | Asia/Dhaka | Asia/Dhaka |
| NODE_ENV | ❌ | development | production |
| JWT_SECRET | ✅ | - | random-32-chars |
| JWT_EXPIRES_IN | ❌ | 7d | 7d |
| SUPER_ADMIN_EMAIL | ❌ | admin@... | your-email |
| SUPER_ADMIN_PASSWORD | ❌ | Admin@... | strong-pass |
| SUPER_ADMIN_NAME | ❌ | Super Admin | Your Name |
| ERPNEXT_ENABLED | ❌ | false | false |
| CLIENT_DIST_PATH | ❌ | - | /app/client-dist |
| CORS_ORIGIN | ❌ | - | https://domain |

---

## Next Steps

1. `.env` file তৈরি করুন
2. সব variables fill করুন
3. Server চালু করুন: `npm run dev`
4. UI open করুন: `http://localhost:7788`
5. Login করুন super admin দিয়ে
