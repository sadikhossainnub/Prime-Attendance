# IN/OUT Mode Troubleshooting Guide
# সব Punch IN হিসেবে যাচ্ছে - সমাধান

## 🔍 সমস্যা

সব attendance punch ERPNext-এ "IN" হিসেবে sync হচ্ছে। OUT punch গুলো ঠিকমতো detect হচ্ছে না।

---

## 📋 Debug Steps

### Step 1: Database Check করুন

```bash
# Debug script চালান
./scripts/debug-inout-mode.sh
```

এটা দেখাবে:
- inOutMode distribution (কতগুলো IN, কতগুলো OUT, কতগুলো NULL)
- Recent 20 punches এর mode
- Device configuration
- একজন employee এর punch pattern

**Expected Output:**
```
IN (0):   50%
OUT (1):  50%
```

**Problem Signs:**
```
IN (0):   100%   ❌ All punches are IN
NULL:     100%   ❌ Device not sending inOutMode
OUT (1):   0%    ❌ No OUT punches
```

---

### Step 2: Raw Device Data Check করুন

Server logs-এ নতুন logging যোগ করা হয়েছে:

```bash
docker compose logs -f server | grep '\[ingest\]'
```

**দেখুন:**
```
[ingest] 📥 Processing 2 attendance rows from device SN123
[ingest] 🔍 Sample data (first 2 rows):
  [1] PIN: 101, Time: 2026-06-20T09:00:00Z, inOutMode: 0 (IN)
  [2] PIN: 101, Time: 2026-06-20T18:00:00Z, inOutMode: 1 (OUT)
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 101, inOutMode: 1 (OUT)
```

**If you see:**
```
inOutMode: null (NULL)  ❌ Device not sending status
inOutMode: 0 (IN)       ⚠️ All punches are IN
inOutMode: 15 (NULL)    ❌ Wrong value
```

---

## 🔧 সমাধান (Solutions)

### Solution 1: Device Configuration - IN/OUT Mode Enable করুন

ZKTeco device-এ "Attendance Status" mode enable করতে হবে।

#### Option A: ZKAccess Software দিয়ে
1. ZKAccess/ADMS software খুলুন
2. Device select করুন
3. **Options > Attendance Status** এ যান
4. **"Enable Attendance Status"** check করুন
5. **Mode:** "IN/OUT Mode" select করুন (NOT "State Mode")
6. Apply করুন
7. Device restart করুন

#### Option B: Device LCD Menu দিয়ে
1. Device-এ Super Admin password দিয়ে login করুন
2. **Menu > Options > Attendance Status** এ যান
3. **Enable:** Yes
4. **Mode:** IN/OUT
5. Save করুন
6. Restart করুন

#### Option C: HTTP API দিয়ে
```bash
# Set attendance status mode
curl -X POST "http://DEVICE_IP/~SetOption" \
  -d "option=~AttendanceStatus" \
  -d "value=1"  # 1 = Enable

curl -X POST "http://DEVICE_IP/~SetOption" \
  -d "option=~AttendanceMode" \
  -d "value=0"  # 0 = IN/OUT mode, 1 = State mode
```

---

### Solution 2: Check ATTLOG Format

Device থেকে আসা data এর format check করুন:

**Correct Format (Tab-separated):**
```
PIN\tDateTime\tStatus\tVerify\tInOutMode\tWorkCode
101\t2026-06-20 09:00:00\t1\t1\t0\t0
101\t2026-06-20 18:00:00\t1\t1\t1\t0
```

- **Field 5 (InOutMode):** 0 = IN, 1 = OUT
- **If missing:** Parser will set `inOutMode = null`

**Check raw device data:**
```bash
# Enable raw data logging in iclock.ts
docker compose logs -f server | grep 'ATTLOG.*body'
```

---

### Solution 3: Device Punch Type সঠিক Configure করুন

Database-এ device এর `punch_type` check করুন:

```sql
SELECT sn, name, punch_type FROM devices;
```

**Values:**
- `0` বা `NULL` = **BOTH** (IN এবং OUT দুটোই accept করবে) ✅
- `1` = **IN_ONLY** (শুধু IN punch accept করবে)
- `2` = **OUT_ONLY** (শুধু OUT punch accept করবে)

**Fix:**
```sql
-- Set device to accept both IN and OUT
UPDATE devices 
SET punch_type = 0 
WHERE sn = 'YOUR_DEVICE_SN';
```

অথবা UI থেকে:
1. **Devices** page এ যান
2. Device edit করুন
3. **Punch Type:** "Both IN/OUT" select করুন
4. Save করুন

---

### Solution 4: Test with Simulated Data

Test করার জন্য manual data send করুন:

```bash
# Simulate IN punch
curl -X POST "http://localhost:3001/iclock/cdata?SN=TEST001&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 09:00:00	1	1	0	0"

# Simulate OUT punch
curl -X POST "http://localhost:3001/iclock/cdata?SN=TEST001&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 18:00:00	1	1	1	0"
```

**Check logs:**
```bash
docker compose logs -f server | grep '\[ingest\]'
```

Expected:
```
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 101, inOutMode: 1 (OUT)
```

---

### Solution 5: ERPNext Sync এ Inference Logic

যদি device থেকে `inOutMode` না আসে (NULL), তাহলে system automatically infer করবে last punch থেকে:

**Logic:**
```
Last Punch = IN  → Current Punch = OUT
Last Punch = OUT → Current Punch = IN
No Last Punch    → Current Punch = IN (default)
```

**Check logs:**
```bash
docker compose logs -f server | grep 'inferred'
```

You'll see:
```
[erpnext] ⚠️ inOutMode was null, inferred as OUT (last punch was IN)
[erpnext] ⚠️ inOutMode was null, inferred as IN (default or last was OUT)
```

**⚠️ Warning:** This is a fallback only! সঠিক solution হলো device configuration fix করা।

---

## 🧪 Testing

### Test 1: Device Configuration
```bash
# Check if device is sending inOutMode
./scripts/debug-inout-mode.sh
```

### Test 2: Live Punch Test
1. Device-এ একটি IN punch করুন
2. Logs check করুন: `docker compose logs -f server | grep ingest`
3. দেখুন: `inOutMode: 0 (IN)`
4. আবার একটি OUT punch করুন
5. দেখুন: `inOutMode: 1 (OUT)`

### Test 3: Database Verification
```sql
-- Check last 10 punches
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode,
  raw_line
FROM attendance_logs
ORDER BY punched_at DESC
LIMIT 10;
```

### Test 4: ERPNext Sync Test
1. Attendance page এ যান
2. "Sync ERPNext" button click করুন
3. Server logs check করুন:
```bash
docker compose logs -f server | grep erpnext
```

Expected:
```
[erpnext] ✅ Mapped log_type: IN
[erpnext] ✅ Mapped log_type: OUT
```

If you see:
```
[erpnext] ⚠️ inOutMode was null, inferred as...
```
Then device configuration needs to be fixed!

---

## 📊 Diagnosis Flow

```
1. Run debug script
   └─> All NULL? → Fix device configuration (Solution 1)
   └─> All IN (0)? → Check device mode setting
   └─> Mixed IN/OUT? → ✅ Device OK, check ERPNext logs

2. Check server logs
   └─> inOutMode null in [ingest]? → Device not sending
   └─> inOutMode values mixed? → ✅ Parser OK
   
3. Check ERPNext sync logs
   └─> All "IN" in ERPNext? → Check mapping logic
   └─> Mixed IN/OUT? → ✅ Working correctly

4. Check device punch_type config
   └─> IN_ONLY or OUT_ONLY? → Change to BOTH
   └─> BOTH? → ✅ Config OK
```

---

## 🎯 Root Causes & Solutions Summary

| Problem | Cause | Solution |
|---------|-------|----------|
| All NULL in DB | Device not sending inOutMode | Enable "Attendance Status" in device |
| All IN (0) in DB | Device in wrong mode | Set device to "IN/OUT Mode" not "State Mode" |
| IN/OUT in DB but all IN in ERPNext | Logic error | Check erpnext.ts mapping (should be fixed) |
| Some punches missing | Punch type filtering | Set device punch_type to BOTH (0) |
| Alternating but wrong | Inference logic used | Fix device config so inOutMode comes from device |

---

## 🔍 Manual Database Queries

### Query 1: Distribution
```sql
SELECT 
  in_out_mode,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) || '%' as percentage
FROM attendance_logs
GROUP BY in_out_mode
ORDER BY count DESC;
```

### Query 2: Employee Pattern
```sql
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as punch_type,
  device_sn
FROM attendance_logs
WHERE user_pin = '101'  -- Replace with actual PIN
ORDER BY punched_at DESC
LIMIT 20;
```

### Query 3: Device Stats
```sql
SELECT 
  a.device_sn,
  d.name,
  d.punch_type,
  COUNT(*) as total_punches,
  SUM(CASE WHEN a.in_out_mode = 0 THEN 1 ELSE 0 END) as in_count,
  SUM(CASE WHEN a.in_out_mode = 1 THEN 1 ELSE 0 END) as out_count,
  SUM(CASE WHEN a.in_out_mode IS NULL THEN 1 ELSE 0 END) as null_count
FROM attendance_logs a
LEFT JOIN devices d ON a.device_sn = d.sn
GROUP BY a.device_sn, d.name, d.punch_type;
```

### Query 4: Today's Sync Status
```sql
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode,
  sync_status,
  erpnext_checkin_id IS NOT NULL as synced_to_erpnext
FROM attendance_logs
WHERE DATE(punched_at) = CURRENT_DATE
ORDER BY punched_at DESC;
```

---

## 📚 Additional Resources

- `/scripts/debug-inout-mode.sh` - Automated debug script
- `/TROUBLESHOOT_INOUT_MODE.md` - Original guide
- `/ERPNEXT_SYNC_TROUBLESHOOTING.md` - ERPNext sync guide
- ZKTeco iClock Protocol Documentation
- Device manual for attendance status configuration

---

## ✅ Checklist

Before reporting issue, verify:

- [ ] Ran `./scripts/debug-inout-mode.sh`
- [ ] Checked database inOutMode distribution
- [ ] Checked server logs for `[ingest]` messages
- [ ] Verified device "Attendance Status" is enabled
- [ ] Verified device is in "IN/OUT Mode" not "State Mode"
- [ ] Checked device `punch_type` is set to BOTH (0)
- [ ] Tested with manual curl simulation
- [ ] Checked ERPNext sync logs
- [ ] Verified employee has shift assignment in ERPNext

---

**সমস্যা ঠিক হয়ে গেলে:**

✅ Database-এ IN (0) এবং OUT (1) mix থাকবে  
✅ Server logs-এ mixed inOutMode দেখাবে  
✅ ERPNext-এ IN এবং OUT দুটোই sync হবে  
✅ Attendance automatically create হবে  

🎉 **All working!**
