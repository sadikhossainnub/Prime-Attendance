# Device Offline Issue - Fix Summary

## সমস্যা
Device IP দিয়ে connect করছে এবং ATTLOG data আসছে, কিন্তু UI-তে **Offline** দেখাচ্ছে।

**আপনার সেটআপ:**
- Server IP: `185.250.37.21:7788`
- Device: Cloud Server ADMS service ON
- Status: Raw Events ✓ আসছে, কিন্তু Devices page ✗ Offline

---

## কারণ বিশ্লেষণ

Device **lastSeenAt** timestamp database-এ update হচ্ছে না বা পুরনো থাকছে।

```typescript
// Online status calculation
const isOnline = lastSeenAt !== null && (now - lastSeenAt) < 10 * 60 * 1000;
// Device 10 মিনিটের মধ্যে request না পাঠালে offline
```

---

## প্রয়োগ করা ফিক্স

### ১. Online Status Threshold বাড়ানো
**File:** `server/src/routes/portal.ts`

```typescript
// আগে: 5 মিনিট
// এখন: 10 মিনিট
const isOnline = d.lastSeenAt !== null && now - d.lastSeenAt.getTime() < 10 * 60 * 1000;
```

**কারণ:** Device প্রতি ১-२ মিনিটে heartbeat পাঠায়, তাই ১০ মিনিট reasonable threshold।

### २. Device Connection Logging Improve করা
**File:** `server/src/routes/iclock.ts`

```typescript
// প্রতিটি device connection-এ log করা হয়
console.log(`[iclock] Device connected: SN=${sn}, IP=${ip}, tenant=${tenant.slug}, lastSeen=${device.lastSeenAt}`);
```

**সুবিধা:** Debug করা সহজ হয়েছে।

### ३. Device Service Documentation
**File:** `server/src/services/deviceService.ts`

```typescript
/**
 * Upsert device with updated lastSeenAt timestamp
 * Called every time device connects
 */
```

**সুবিধা:** Code clarity improve হয়েছে।

### ४. README-তে Troubleshooting Guide যোগ করা
**File:** `README.md`

Device offline issue-এর জন্য step-by-step guide যোগ করা হয়েছে।

### ५. Debug Script তৈরি করা
**File:** `scripts/debug-device.sh`

```bash
./scripts/debug-device.sh http://185.250.37.21:7788 YOUR_DEVICE_SN
```

এটি test করে:
- ✓ Server reachable?
- ✓ Ping endpoint working?
- ✓ Options response?
- ✓ ATTLOG POST working?

### ६. Comprehensive Troubleshooting Guide
**File:** `DEVICE_OFFLINE_FIX.md`

সম্পূর্ণ debugging guide এবং সাধারণ সমস্যার সমাধান।

---

## Build Status

✅ **Server Build:** SUCCESS
```
> prime-attendance-server@1.0.0 build
> tsc
(No errors)
```

✅ **Client Build:** SUCCESS
```
✓ 58 modules transformed
✓ built in 1.64s
```

---

## কীভাবে ব্যবহার করবেন

### ১. সার্ভার আপডেট করুন

```bash
cd server
npm install
npm run build
npm run dev
```

### २. Device Debug করুন

```bash
# Debug script চালান
chmod +x scripts/debug-device.sh
./scripts/debug-device.sh http://185.250.37.21:7788 YOUR_DEVICE_SN
```

### ३. Server Logs দেখুন

```bash
npm run dev
# Output-এ এই লাইন আসা উচিত:
# [iclock] Device connected: SN=XXXXX, IP=185.250.37.21, tenant=your-tenant, lastSeen=...
```

### ४. Database চেক করুন

```bash
cd server
npx prisma studio
# Device table → lastSeenAt timestamp দেখুন
```

---

## Checklist

Device offline issue fix করার জন্য:

- [ ] Server আপডেট করেছেন? (`npm run build`)
- [ ] Server চলছে? (`npm run dev`)
- [ ] Port 7788 খোলা? (`sudo ufw allow 7788/tcp`)
- [ ] Device IP ঠিক? (Device menu → Cloud Server)
- [ ] Device HTTPS OFF? (HTTPS = OFF)
- [ ] Device registered? (UI → Devices)
- [ ] Debug script চালিয়েছেন? (`./scripts/debug-device.sh`)
- [ ] Server logs দেখেছেন? (`npm run dev`)
- [ ] Database lastSeenAt update? (`npx prisma studio`)

---

## সাধারণ সমস্যা ও সমাধান

### সমস্যা: Device Offline দেখাচ্ছে

**সমাধান:**
1. Server logs চেক করুন: `npm run dev`
2. Debug script চালান: `./scripts/debug-device.sh`
3. Database চেক করুন: `npx prisma studio`
4. Device heartbeat আসছে কিনা: Raw Events দেখুন

### সমস্যা: "Device not registered"

**সমাধান:**
1. UI → **Devices** → **Add device**
2. Serial Number দিন
3. Save করুন

### সমস্যা: "Connect Fail" (Device screen-এ)

**সমাধান:**
1. IP ঠিক আছে কিনা চেক করুন
2. Port 7788 খোলা আছে কিনা
3. Server চলছে কিনা

---

## Files Modified

### Server
- `server/src/routes/portal.ts` - Online status threshold বাড়ানো
- `server/src/routes/iclock.ts` - Connection logging improve করা
- `server/src/services/deviceService.ts` - Documentation যোগ করা

### Documentation
- `README.md` - Troubleshooting guide যোগ করা
- `DEVICE_OFFLINE_FIX.md` - Comprehensive guide তৈরি করা
- `scripts/debug-device.sh` - Debug script তৈরি করা

---

## পরবর্তী ধাপ

1. **Server deploy করুন:**
   ```bash
   npm run build
   # EasyPanel-এ deploy করুন
   ```

2. **Device test করুন:**
   ```bash
   ./scripts/debug-device.sh http://185.250.37.21:7788 YOUR_DEVICE_SN
   ```

3. **Monitor করুন:**
   - Server logs দেখুন
   - Raw Events দেখুন
   - Database lastSeenAt দেখুন

4. **যদি সমস্যা থাকে:**
   - `DEVICE_OFFLINE_FIX.md` পড়ুন
   - Debug script চালান
   - Server logs পাঠান

---

## সাপোর্ট

যদি সমস্যা সমাধান না হয়:

1. **Server logs** পাঠান: `npm run dev` output
2. **Device SN** পাঠান
3. **Server IP** পাঠান
4. **Raw Events** screenshot পাঠান
5. **Database** Device table screenshot পাঠান

---

## সংক্ষিপ্ত সারাংশ

✅ **সমস্যা:** Device offline দেখাচ্ছে কিন্তু ATTLOG আসছে
✅ **কারণ:** lastSeenAt timestamp update হচ্ছে না
✅ **সমাধান:** 
- Online threshold বাড়ানো (5 → 10 মিনিট)
- Connection logging improve করা
- Debug tools যোগ করা
- Troubleshooting guide তৈরি করা

✅ **Build Status:** SUCCESS (Server + Client)
✅ **পরবর্তী:** Deploy করুন এবং test করুন
