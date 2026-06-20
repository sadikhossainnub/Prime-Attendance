# সব Punch IN হিসেবে যাচ্ছে - দ্রুত সমাধান
তারিখ: ২০ জুন ২০২৬

## ⚠️ সমস্যা
সব attendance punch ERPNext-এ শুধু "IN" হিসেবে sync হচ্ছে। OUT punch detect হচ্ছে না।

---

## 🔧 দ্রুত সমাধান (3 Steps)

### Step 1: Debug করুন - সমস্যা কোথায়?

```bash
cd /home/sayed/Documents/Prime\ Attendance
./scripts/debug-inout-mode.sh
```

**দেখুন "inOutMode Distribution":**
- ✅ ভালো: `IN (0): 50%` এবং `OUT (1): 50%`
- ❌ সমস্যা: `IN (0): 100%` বা `NULL: 100%`

---

### Step 2: Device Configuration ঠিক করুন

#### যদি সব NULL দেখেন:

**Device-এ "Attendance Status" enable করুন:**

1. **ZKAccess/ADMS Software দিয়ে:**
   - Device select করুন
   - Options > **Attendance Status** > **Enable** করুন
   - Mode: **"IN/OUT Mode"** select করুন (NOT State Mode)
   - Apply > Device Restart

2. **Device LCD Menu দিয়ে:**
   - Super Admin login করুন
   - Menu > Options > **Attendance Status**
   - Enable: **Yes**
   - Mode: **IN/OUT**
   - Save > Restart

---

#### যদি সব IN (0) দেখেন:

**Device mode check করুন:**

Device "State Mode"-এ আছে কিনা check করুন:
- ❌ State Mode: সব punch IN হয়ে যায়
- ✅ IN/OUT Mode: IN এবং OUT আলাদা হয়

**Fix:** উপরের instruction follow করে "IN/OUT Mode" set করুন

---

### Step 3: Server Logs Check করুন

Enhanced logging যোগ করা হয়েছে:

```bash
docker compose logs -f server | grep '\[ingest\]'
```

**ভালো output দেখতে হবে:**
```
[ingest] 📥 Processing 2 attendance rows from device SN123
[ingest] 🔍 Sample data (first 2 rows):
  [1] PIN: 101, Time: 2026-06-20T09:00:00Z, inOutMode: 0 (IN)
  [2] PIN: 101, Time: 2026-06-20T18:00:00Z, inOutMode: 1 (OUT)
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 101, inOutMode: 1 (OUT)
```

**সমস্যা থাকলে দেখবেন:**
```
inOutMode: null (NULL)  ❌ Device send করছে না
inOutMode: 0 (IN)       ❌ সব IN
```

---

## 🧪 Test করুন

### Test 1: Manual Punch Simulation

Device configuration fix করার পর test করুন:

```bash
# IN punch test
curl -X POST "http://localhost:3001/iclock/cdata?SN=YOUR_DEVICE_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 09:00:00	1	1	0	0"

# OUT punch test
curl -X POST "http://localhost:3001/iclock/cdata?SN=YOUR_DEVICE_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 18:00:00	1	1	1	0"
```

**Logs দেখুন:**
```bash
docker compose logs -f server | grep ingest
```

Expected:
- First: `inOutMode: 0 (IN)`
- Second: `inOutMode: 1 (OUT)`

---

### Test 2: Live Device Punch

1. Device-এ punch করুন (IN)
2. Server logs check করুন
3. আবার punch করুন (OUT)  
4. Logs-এ mode change দেখুন

---

### Test 3: Database Check

```bash
# Database container-এ যান
docker exec -it prime-attendance-db-1 psql -U primeattendance -d primeattendance

# Query চালান
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode
FROM attendance_logs
ORDER BY punched_at DESC
LIMIT 10;
```

**Expected:** IN এবং OUT mixed দেখা যাবে

---

## 🎯 Common Causes এবং Solutions

### Cause 1: Device "Attendance Status" disabled
**লক্ষণ:** Database-এ সব `in_out_mode = NULL`

**Solution:** Device-এ "Attendance Status" enable করুন (Step 2 দেখুন)

---

### Cause 2: Device "State Mode"-এ আছে
**লক্ষণ:** Database-এ সব `in_out_mode = 0` (IN)

**Solution:** Device mode "IN/OUT Mode"-এ change করুন

---

### Cause 3: Punch Type Filtering
**লক্ষণ:** কিছু punch database-এ আসছেই না

**Solution:** Device এর punch_type BOTH করুন:

```sql
UPDATE devices 
SET punch_type = 0  -- 0 = BOTH
WHERE sn = 'YOUR_DEVICE_SN';
```

অথবা UI থেকে: Devices > Edit > Punch Type: "Both IN/OUT"

---

### Cause 4: Wrong ATTLOG Format
**লক্ষণ:** Parser inOutMode extract করতে পারছে না

**Solution:** Device firmware update করুন অথবা iClock protocol verify করুন

**Correct format:**
```
PIN\tDateTime\tStatus\tVerify\tInOutMode\tWorkCode
101\t2026-06-20 09:00:00\t1\t1\t0\t0      (IN)
101\t2026-06-20 18:00:00\t1\t1\t1\t0      (OUT)
                            ↑
                        Field 5: inOutMode
```

---

## 📊 Verification Checklist

সব ঠিক হয়েছে কিনা চেক করুন:

- [ ] `./scripts/debug-inout-mode.sh` চালিয়ে distribution check করেছি
- [ ] Server logs-এ mixed inOutMode (0 এবং 1) দেখছি
- [ ] Device "Attendance Status" enabled আছে
- [ ] Device "IN/OUT Mode"-এ আছে (NOT State Mode)
- [ ] Database-এ IN এবং OUT দুটোই আছে
- [ ] Test punch করে verify করেছি
- [ ] ERPNext sync করে check করেছি

---

## ✅ সফল হলে দেখবেন

### Database-এ:
```
IN (0):  ~50%
OUT (1): ~50%
```

### Server Logs-এ:
```
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 102, inOutMode: 1 (OUT)
[ingest] ✅ Inserted: PIN 103, inOutMode: 0 (IN)
```

### ERPNext-এ:
```
[erpnext] ✅ Mapped log_type: IN
[erpnext] ✅ Mapped log_type: OUT
[erpnext] ✅ Employee Checkin created successfully!
```

### Attendance Report-এ:
- Employee punch pattern: IN → OUT → IN → OUT
- Proper working hours calculated
- Attendance auto-created

---

## 🆘 এখনও সমস্যা?

### Advanced Debugging:

1. **Raw device data দেখুন:**
```bash
docker compose logs -f server | grep 'ATTLOG'
```

2. **Parser test করুন:**
```bash
# Server container-এ যান
docker compose exec server node

# Test parser
> const { parseAttlogLine } = require('./dist/services/attendanceParser.js');
> parseAttlogLine('101\t2026-06-20 09:00:00\t1\t1\t0\t0');
```

3. **Device থেকে data manually fetch করুন:**
```bash
curl "http://DEVICE_IP/cdata?SN=DEVICE_SN&table=ATTLOG"
```

---

## 📚 আরও তথ্যের জন্য

বিস্তারিত documentation:
- `/INOUT_MODE_FIX.md` - Complete English guide
- `/TROUBLESHOOT_INOUT_MODE.md` - Original troubleshooting
- `/scripts/debug-inout-mode.sh` - Automated debug tool

---

## 🔄 Updates Applied

এই fix এ যা করা হয়েছে:

1. ✅ Enhanced logging in `attendanceIngest.ts`
   - Device থেকে আসা প্রতিটি punch এর inOutMode log হবে
   - Sample data দেখাবে

2. ✅ Debug script created
   - `./scripts/debug-inout-mode.sh`
   - Automated database queries
   - Distribution analysis

3. ✅ Comprehensive documentation
   - `/INOUT_MODE_FIX.md` (English)
   - `/INOUT_FIX_BANGLA.md` (Bengali)

4. ✅ Server build successful
   - TypeScript compilation OK
   - Ready to deploy

---

**এখন test করুন এবং device configuration ঠিক করুন!**

Device configuration ঠিক করলেই problem solve হবে। 🎉

---

## Quick Command Reference

```bash
# Debug
./scripts/debug-inout-mode.sh

# Server logs
docker compose logs -f server | grep ingest

# Database query
docker exec -it prime-attendance-db-1 psql -U primeattendance -d primeattendance -c "SELECT in_out_mode, COUNT(*) FROM attendance_logs GROUP BY in_out_mode;"

# Test punch
curl -X POST "http://localhost:3001/iclock/cdata?SN=TEST&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 18:00:00	1	1	1	0"

# Restart server
docker compose restart server

# Check ERPNext sync
docker compose logs -f server | grep erpnext
```

---

**সব ঠিক হয়ে যাবে! 💪**
