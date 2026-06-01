# Device Offline কিন্তু ATTLOG আসছে - সমাধান

## সমস্যা

Device IP দিয়ে connect করছে এবং ATTLOG data আসছে, কিন্তু UI-তে **Offline** দেখাচ্ছে।

**উদাহরণ:**
- Server IP: `185.250.37.21:7788`
- Device: Cloud Server ADMS service ON
- Raw Events: ✓ Data আসছে
- Devices page: ✗ Offline দেখাচ্ছে

---

## কারণ

Device **lastSeenAt** timestamp database-এ update হচ্ছে না বা পুরনো থাকছে।

Online status calculation:
```typescript
const isOnline = lastSeenAt !== null && (now - lastSeenAt) < 10 * 60 * 1000;
// Device 10 মিনিটের মধ্যে request না পাঠালে offline
```

---

## সমাধান

### ১. সার্ভার লগ চেক করুন

```bash
npm run dev
```

Output-এ এই লাইন আসা উচিত:
```
[iclock] Device connected: SN=XXXXX, IP=185.250.37.21, tenant=your-tenant, lastSeen=2026-06-01T10:00:00.000Z
```

**যদি এই লাইন না আসে:**
- Device সার্ভারে connect হচ্ছে না
- IP/Port ভুল হতে পারে
- Firewall block করছে

### २. Debug Script চালান

```bash
chmod +x scripts/debug-device.sh
./scripts/debug-device.sh http://185.250.37.21:7788 YOUR_DEVICE_SN
```

এটি test করবে:
- ✓ Server reachable?
- ✓ Ping endpoint working?
- ✓ Options response?
- ✓ ATTLOG POST working?

### ३. Database চেক করুন

```bash
cd server
npx prisma studio
```

**Device table খুলুন:**
- `lastSeenAt` timestamp দেখুন
- যদি পুরনো থাকে (১০ মিনিটের আগে), device connect হচ্ছে না

### ४. Device Registration চেক করুন

**Option A: Portal-এ device add করুন**

1. UI → **Devices** → **Add device**
2. Serial Number দিন (যেমন: `XXXXX`)
3. Save করুন

**Option B: Provision Key দিয়ে register করুন**

1. UI → **Settings** → Provision Key কপি করুন
2. Device menu → Cloud Server → Server Address:
   ```
   http://185.250.37.21:7788/iclock/cdata?tenant=YOUR_TENANT_SLUG&key=YOUR_PROVISION_KEY
   ```

### ५. Device Settings চেক করুন

Device menu-তে:

```
Comm → Cloud Server
├── Enable Cloud Server    : ON
├── Server IP              : 185.250.37.21
├── Server Port            : 7788
├── HTTPS                  : OFF
└── Save
```

**গুরুত্বপূর্ণ:**
- HTTPS **OFF** রাখুন (পুরনো device সাপোর্ট করে না)
- Port **7788** ঠিক আছে কিনা চেক করুন
- IP সঠিক আছে কিনা চেক করুন

### ६. Device Heartbeat চেক করুন

Device প্রতি ১-२ মিনিটে heartbeat পাঠায়। যদি ১০ মিনিট কোনো request না আসে, offline দেখাবে।

**Raw Events-এ দেখুন:**
- UI → **Raw Events**
- Device requests দেখা যাবে
- Timestamp দেখুন (কত সময় আগে?)

### ७. সার্ভার রিস্টার্ট করুন

```bash
# Development
npm run dev

# EasyPanel
# App → Restart
```

---

## Step-by-Step Troubleshooting

### Step 1: Server Connectivity

```bash
# Server-এ ping করুন
ping 185.250.37.21

# Port 7788 খোলা আছে কিনা
nc -zv 185.250.37.21 7788

# VPS-এ firewall check
sudo ufw status
sudo ufw allow 7788/tcp
```

### Step 2: Device Configuration

Device menu-তে:
1. **Comm** → **Cloud Server** খুলুন
2. **Enable** = ON
3. **Server IP** = 185.250.37.21
4. **Port** = 7788
5. **HTTPS** = OFF
6. **Save** করুন
7. Device **Reboot** করুন

### Step 3: Test Connection

```bash
# curl দিয়ে test করুন
curl -X GET "http://185.250.37.21:7788/iclock/ping?SN=YOUR_DEVICE_SN"
# Response: OK

# ATTLOG test
curl -X POST "http://185.250.37.21:7788/iclock/cdata?SN=YOUR_DEVICE_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d $'101\t2026-06-01 10:00:00\t0\t1\t0\t0'
# Response: OK
```

### Step 4: Check Database

```bash
cd server
npx prisma studio

# Device table খুলুন
# lastSeenAt timestamp দেখুন
# যদি এখনকার সময়ের কাছাকাছি, device online আছে
```

### Step 5: Check UI

- **Raw Events** → Device requests দেখা যাবে?
- **Devices** → Device online দেখাচ্ছে?
- **Attendance** → নতুন পাঞ্চ আসছে?

---

## সাধারণ সমস্যা ও সমাধান

### সমস্যা: "Device not registered"

**কারণ:** Device portal-এ add করা নেই

**সমাধান:**
1. UI → **Devices** → **Add device**
2. Serial Number দিন
3. Save করুন

অথবা provision key দিয়ে:
```
http://185.250.37.21:7788/iclock/cdata?tenant=SLUG&key=KEY
```

### সমস্যা: "Connect Fail" (Device screen-এ)

**কারণ:** IP/Port ভুল বা server down

**সমাধান:**
1. IP ঠিক আছে কিনা চেক করুন
2. Port 7788 খোলা আছে কিনা
3. Server চলছে কিনা: `npm run dev`

### সমস্যা: Online কিন্তু পাঞ্চ নেই

**কারণ:** Device পাঞ্চ পাঠাচ্ছে না

**সমাধান:**
1. Device-এ আঙুল/কার্ড দিয়ে পাঞ্চ দিন
2. ১-२ মিনিট অপেক্ষা করুন
3. UI রিফ্রেশ করুন

### সমস্যা: Offline কিন্তু ATTLOG আসছে

**কারণ:** lastSeenAt update হচ্ছে না

**সমাধান:**
1. সার্ভার লগ চেক করুন: `npm run dev`
2. Database চেক করুন: `npx prisma studio`
3. সার্ভার রিস্টার্ট করুন

---

## Advanced Debugging

### Server Logs দেখুন

```bash
npm run dev 2>&1 | grep -i "iclock\|device"
```

Output-এ দেখা যাবে:
```
[iclock] Device connected: SN=XXXXX, IP=185.250.37.21, tenant=your-tenant, lastSeen=...
[iclock] ATTLOG tenant=your-tenant sn=XXXXX: inserted=1 dup=0
```

### Database Query

```bash
cd server
npx prisma studio

# Device table
SELECT * FROM "Device" WHERE "serialNumber" = 'YOUR_SN';

# Raw Events
SELECT * FROM "DeviceRawEvent" WHERE "deviceSn" = 'YOUR_SN' ORDER BY "createdAt" DESC LIMIT 10;
```

### Network Trace

```bash
# Device থেকে server-এ যাচ্ছে কিনা
tcpdump -i any -n port 7788

# Server-এ request আসছে কিনা
netstat -an | grep 7788
```

---

## Checklist

Device offline issue fix করার জন্য:

- [ ] Server চলছে? (`npm run dev`)
- [ ] Port 7788 খোলা? (`sudo ufw allow 7788/tcp`)
- [ ] Device IP ঠিক? (Device menu → Cloud Server)
- [ ] Device HTTPS OFF? (HTTPS = OFF)
- [ ] Device registered? (UI → Devices)
- [ ] Device heartbeat আসছে? (Raw Events দেখুন)
- [ ] Database lastSeenAt update? (`npx prisma studio`)
- [ ] Server logs দেখেছেন? (`npm run dev`)

---

## যোগাযোগ

যদি সমস্যা সমাধান না হয়:

1. **Server logs** পাঠান: `npm run dev` output
2. **Device SN** পাঠান
3. **Server IP** পাঠান
4. **Raw Events** screenshot পাঠান
5. **Database** Device table screenshot পাঠান

---

## আপডেট (এই ফিক্স-এ)

- ✅ Online status threshold বাড়ানো হয়েছে: 5 মিনিট → 10 মিনিট
- ✅ Device connection logging improve করা হয়েছে
- ✅ Debug script যোগ করা হয়েছে
- ✅ Troubleshooting guide যোগ করা হয়েছে
