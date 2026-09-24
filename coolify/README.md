# Coolify Deployment Guide for Prime Attendance & ZKTeco Devices

## 🚀 Coolify-তে সেটআপ করার নিয়ম

### ১. Dockerfile Location
Coolify-তে অ্যাপ কনফিগারেশনে:
- **Build Pack:** Dockerfile
- **Dockerfile Location:** `coolify/Dockerfile` (অথবা root `Dockerfile`)

### ২. Port Expose (ZKTeco F18 কানেকশনের জন্য অতি জরুরি)
Coolify UI-তে:
- **Port Exposes:** `7788:7788`
- **Ports Mapping:** `7788:7788`

*(ZKTeco F18 ডিভাইস Domain/HTTPS বোঝে না। এটি সরাসরি IP:7788 পোর্টে HTTP মাধ্যমে ডেটা পাঠায়।)*

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
