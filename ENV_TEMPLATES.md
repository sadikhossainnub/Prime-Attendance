# .env Templates - Copy & Paste Ready

## 🔧 Local Development (সবচেয়ে সহজ)

```env
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
```

**কীভাবে ব্যবহার করবেন:**
```bash
cd server
cat > .env << 'EOF'
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
EOF
```

---

## 🐳 Docker Compose

```env
DATABASE_URL=postgresql://prime:prime_secret@postgres:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
```

**কীভাবে ব্যবহার করবেন:**
```bash
cd server
cat > .env << 'EOF'
DATABASE_URL=postgresql://prime:prime_secret@postgres:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
EOF
```

---

## 🚀 EasyPanel/VPS (Production)

```env
DATABASE_URL=postgresql://user:password@db-host:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
NODE_ENV=production
JWT_SECRET=GENERATE_STRONG_SECRET_HERE_MIN_32_CHARS
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@yourdomain.com
SUPER_ADMIN_PASSWORD=STRONG_PASSWORD_HERE
SUPER_ADMIN_NAME=আপনার নাম
ERPNEXT_ENABLED=false
CLIENT_DIST_PATH=/app/client-dist
CORS_ORIGIN=https://yourdomain.com
```

**কীভাবে ব্যবহার করবেন:**

1. **EasyPanel-এ:**
   - App → Environment
   - প্রতিটি variable add করুন
   - Save করুন

2. **অথবা SSH-তে:**
   ```bash
   cat > /app/server/.env << 'EOF'
   DATABASE_URL=postgresql://user:password@db-host:5432/prime_attendance
   PORT=7788
   TZ=Asia/Dhaka
   NODE_ENV=production
   JWT_SECRET=GENERATE_STRONG_SECRET_HERE_MIN_32_CHARS
   JWT_EXPIRES_IN=7d
   SUPER_ADMIN_EMAIL=admin@yourdomain.com
   SUPER_ADMIN_PASSWORD=STRONG_PASSWORD_HERE
   SUPER_ADMIN_NAME=আপনার নাম
   ERPNEXT_ENABLED=false
   CLIENT_DIST_PATH=/app/client-dist
   CORS_ORIGIN=https://yourdomain.com
   EOF
   ```

---

## 🔐 Strong JWT_SECRET Generate করুন

### Linux/Mac:
```bash
openssl rand -base64 32
```

### Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Output Example:
```
a7f3k9m2x8q1w5e4r6t7y8u9i0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8
```

---

## 📋 Checklist

### Local Development
- [ ] DATABASE_URL সঠিক?
- [ ] PORT 7788?
- [ ] TZ Asia/Dhaka?
- [ ] JWT_SECRET set?

### Production
- [ ] DATABASE_URL production database?
- [ ] NODE_ENV=production?
- [ ] JWT_SECRET strong (32+ chars)?
- [ ] SUPER_ADMIN_PASSWORD strong?
- [ ] CORS_ORIGIN সঠিক domain?
- [ ] CLIENT_DIST_PATH সঠিক?

---

## 🔍 Verify করুন

```bash
# .env file আছে কিনা
ls -la server/.env

# Variables check করুন
cat server/.env

# Server চালু করুন
cd server
npm run dev

# Output-এ এই লাইন আসা উচিত:
# Prime Attendance on port 7788
# Super admin: admin@primetechbd.xyz
```

---

## 🆘 Common Issues

### Issue: DATABASE_URL is required
```bash
# .env file আছে কিনা check করুন
ls server/.env

# না থাকলে তৈরি করুন
cat > server/.env << 'EOF'
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
EOF
```

### Issue: JWT_SECRET must be at least 32 characters
```bash
# Strong secret generate করুন
openssl rand -base64 32

# .env-এ update করুন
JWT_SECRET=your-generated-secret
```

### Issue: Cannot connect to database
```bash
# PostgreSQL চলছে কিনা check করুন
psql -U prime -d prime_attendance -c "SELECT 1"

# না থাকলে start করুন
docker compose up -d postgres
```

---

## 📱 Device Configuration

Device-এ এই settings ব্যবহার করবে:

```
Device Menu → Comm → Cloud Server
├── Enable Cloud Server    : ON
├── Server IP              : YOUR_SERVER_IP
├── Server Port            : 7788
├── HTTPS                  : OFF
└── Save
```

---

## 🎯 Quick Start

### 1. Local Development (সবচেয়ে দ্রুত)

```bash
cd server

# .env তৈরি করুন
cat > .env << 'EOF'
DATABASE_URL=postgresql://prime:prime_secret@localhost:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
EOF

# PostgreSQL start করুন (Docker)
docker compose up -d postgres

# Server চালু করুন
npm install
npm run dev

# UI open করুন
# http://localhost:7788
# Login: admin@primetechbd.xyz / Admin@12345
```

### 2. Docker Compose

```bash
cd server

# .env তৈরি করুন
cat > .env << 'EOF'
DATABASE_URL=postgresql://prime:prime_secret@postgres:5432/prime_attendance
PORT=7788
TZ=Asia/Dhaka
JWT_SECRET=dev-jwt-secret-change-in-production-min-32
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
SUPER_ADMIN_NAME=Super Admin
ERPNEXT_ENABLED=false
EOF

# Docker compose চালু করুন
docker compose up -d

# UI open করুন
# http://localhost:7788
```

### 3. EasyPanel/VPS

1. EasyPanel → App → Environment
2. এই variables add করুন:
   ```
   DATABASE_URL=postgresql://user:password@db-host:5432/prime_attendance
   PORT=7788
   TZ=Asia/Dhaka
   NODE_ENV=production
   JWT_SECRET=your-strong-secret
   SUPER_ADMIN_EMAIL=admin@yourdomain.com
   SUPER_ADMIN_PASSWORD=strong-password
   SUPER_ADMIN_NAME=Your Name
   CLIENT_DIST_PATH=/app/client-dist
   CORS_ORIGIN=https://yourdomain.com
   ```
3. Save করুন
4. App restart করুন

---

## 📚 More Info

বিস্তারিত জানতে: `ENV_CONFIGURATION_GUIDE.md` পড়ুন
