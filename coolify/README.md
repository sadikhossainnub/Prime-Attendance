# Coolify Deployment Guide for Prime Attendance & ZKTeco Devices

## 🚀 Coolify-তে বিল্ড ও ডিপ্লয়মেন্ট কনফিগারেশন

### ১. General Configuration (বিল্ড ফেইলিউর এড়াতে)
Coolify Dashboard -> Application Settings:
- **Build Pack:** `Dockerfile`
- **Base Directory:** `/` *(অবশ্যই Root Directory `/` রাখবেন, `/coolify` করবেন না!)*
- **Dockerfile Location:** `/Dockerfile` *(অথবা `/coolify/Dockerfile`)*

### ২. Port Expose (ZKTeco F18 কানেকশনের জন্য অতি জরুরি)
Coolify UI -> Ports Exposes:
- **Ports Exposes:** `7788:7788`

*(ZKTeco F18 ডিভাইস Domain/HTTPS বোঝে না। এটি সরাসরি HTTP IP:7788 পোর্টে ডেটা পাঠায়।)*

### ৩. Environment Variables
Coolify-এর Environment Variables ট্যাবে নিচের ফিল্ডগুলো সেট করুন:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
PORT=7788
JWT_SECRET=b45034769124ac4e01f3e0b28b044128a0c67d35af909c0fd9abfa9122138a37
SUPER_ADMIN_EMAIL=admin@primetechbd.xyz
SUPER_ADMIN_PASSWORD=Admin@12345
TZ=Asia/Dhaka
```

### ৪. AWS Security Group Rule
AWS EC2 Console -> Security Groups -> Inbound Rules:
- **Custom TCP** | Port: `7788` | Source: `0.0.0.0/0`
