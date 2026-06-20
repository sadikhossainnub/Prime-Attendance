# Device-Based IN/OUT Mode Override
## সমাধান: Device Configuration দিয়ে IN/OUT Control

তারিখ: ২০ জুন ২০২৬

---

## 🎯 সমস্যা যা ছিল:

আপনি device আলাদা করেছেন:
- **Device A:** শুধু IN punch এর জন্য
- **Device B:** শুধু OUT punch এর জন্য

কিন্তু সব punch database-এ `inOutMode = 0` (IN) হিসেবে store হচ্ছিল।

**কারণ:** Device hardware সব সময় `inOutMode = 0` send করছিল, device configuration ignore হচ্ছিল।

---

## ✅ সমাধান: Software-Level Override

এখন system **device punch_type configuration** অনুযায়ী automatically `inOutMode` override করবে:

### Logic:
```
Device punch_type = IN_ONLY   → সব punch force করবে inOutMode = 0 (IN)
Device punch_type = OUT_ONLY  → সব punch force করবে inOutMode = 1 (OUT)
Device punch_type = BOTH      → Device থেকে আসা raw inOutMode ব্যবহার করবে
```

---

## 🔧 কিভাবে Configure করবেন

### Step 1: Device Settings Check করুন

```bash
cd /opt/Prime-Attendance
docker compose exec postgres psql -U prime -d prime_attendance -c "SELECT serial_number, name, punch_type FROM devices;"
```

**Output দেখবেন:**
```
 serial_number |   name   | punch_type
---------------+----------+------------
 DEV001       | Entry    | IN_ONLY
 DEV002       | Exit     | OUT_ONLY
 DEV003       | Both     | BOTH
```

### Step 2: Device Configuration Update করুন (যদি প্রয়োজন হয়)

#### Option A: UI থেকে
1. **Devices** page এ যান
2. Device edit করুন
3. **Punch Type** select করুন:
   - **IN ONLY** - শুধু IN punch
   - **OUT ONLY** - শুধু OUT punch
   - **BOTH** - IN এবং OUT দুটোই
4. Save করুন

#### Option B: Database থেকে
```bash
# IN_ONLY set করুন
docker compose exec postgres psql -U prime -d prime_attendance -c "UPDATE devices SET punch_type = 'IN_ONLY' WHERE serial_number = 'DEV001';"

# OUT_ONLY set করুন
docker compose exec postgres psql -U prime -d prime_attendance -c "UPDATE devices SET punch_type = 'OUT_ONLY' WHERE serial_number = 'DEV002';"

# BOTH set করুন (default)
docker compose exec postgres psql -U prime -d prime_attendance -c "UPDATE devices SET punch_type = 'BOTH' WHERE serial_number = 'DEV003';"
```

---

## 🧪 Testing

### Step 1: Server Restart করুন (new code deploy এর জন্য)
```bash
cd /opt/Prime-Attendance
docker compose restart server
```

### Step 2: Logs Monitor করুন
```bash
docker compose logs -f server | grep '\[ingest\]'
```

### Step 3: Device-এ Punch করুন

**IN_ONLY Device-এ punch করলে দেখবেন:**
```
[ingest] 📥 Processing 1 attendance rows from device DEV001
[ingest] 🔧 Device "Entry" punch_type: IN_ONLY
[ingest] 🔍 Sample data (first 1 rows):
  [1] PIN: 101, Time: 2026-06-20T14:00:00Z, RAW inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
```

**OUT_ONLY Device-এ punch করলে দেখবেন:**
```
[ingest] 📥 Processing 1 attendance rows from device DEV002
[ingest] 🔧 Device "Exit" punch_type: OUT_ONLY
[ingest] 🔍 Sample data (first 1 rows):
  [1] PIN: 101, Time: 2026-06-20T18:00:00Z, RAW inOutMode: 0 (IN)
[ingest] 🔄 Override: Device is OUT_ONLY, forcing inOutMode from 0 to 1 (OUT)
[ingest] ✅ Inserted: PIN 101, inOutMode: 1 (OUT)
```

👆 **দেখুন!** Device raw data-তে `inOutMode: 0` থাকলেও, system এটাকে `1 (OUT)` করে দিচ্ছে!

---

## 📊 Verification

### Check Database Distribution:
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  CASE 
    WHEN in_out_mode = 0 THEN 'IN (0)'
    WHEN in_out_mode = 1 THEN 'OUT (1)'
    ELSE 'NULL'
  END as punch_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM attendance_logs
WHERE punched_at > NOW() - INTERVAL '1 hour'  -- Last 1 hour only
GROUP BY in_out_mode
ORDER BY count DESC;
EOF
```

**Expected Result (after configuration):**
```
 punch_type | count | percentage
------------+-------+------------
 IN (0)     |   50  |      50.00
 OUT (1)    |   50  |      50.00
```

### Check by Device:
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  a.device_sn,
  d.name as device_name,
  d.punch_type,
  COUNT(*) as total_punches,
  SUM(CASE WHEN a.in_out_mode = 0 THEN 1 ELSE 0 END) as in_count,
  SUM(CASE WHEN a.in_out_mode = 1 THEN 1 ELSE 0 END) as out_count
FROM attendance_logs a
LEFT JOIN devices d ON a.device_sn = d.serial_number
WHERE a.punched_at > NOW() - INTERVAL '24 hours'
GROUP BY a.device_sn, d.name, d.punch_type
ORDER BY total_punches DESC;
EOF
```

**Expected Result:**
```
 device_sn | device_name | punch_type | total_punches | in_count | out_count
-----------+-------------+------------+---------------+----------+-----------
 DEV001    | Entry       | IN_ONLY    |           100 |      100 |         0  ✅
 DEV002    | Exit        | OUT_ONLY   |            95 |        0 |        95  ✅
 DEV003    | Both        | BOTH       |            80 |       40 |        40  ✅
```

---

## 🎯 Use Cases

### Use Case 1: Entry/Exit Gates
```
Gate 1 (Entry)  → Device: IN_ONLY   → সব punch IN হবে
Gate 2 (Exit)   → Device: OUT_ONLY  → সব punch OUT হবে
```

**Setup:**
```sql
UPDATE devices SET punch_type = 'IN_ONLY' WHERE name = 'Gate 1 - Entry';
UPDATE devices SET punch_type = 'OUT_ONLY' WHERE name = 'Gate 2 - Exit';
```

### Use Case 2: Floor-based Tracking
```
Ground Floor → IN_ONLY  → Entry punch
1st Floor    → BOTH     → IN/OUT both
Roof         → OUT_ONLY → Exit punch
```

### Use Case 3: Department-specific
```
Reception   → IN_ONLY  → Morning entry
Office Area → BOTH     → IN/OUT for lunch
Parking     → OUT_ONLY → Evening exit
```

---

## 🔍 Debug Commands

### Check Current Configuration:
```bash
docker compose exec postgres psql -U prime -d prime_attendance -c "SELECT serial_number, name, punch_type, last_seen_at FROM devices ORDER BY name;"
```

### Check Recent Punches with Device Info:
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  a.user_pin,
  a.punched_at,
  a.device_sn,
  d.name as device_name,
  d.punch_type as device_config,
  CASE 
    WHEN a.in_out_mode = 0 THEN 'IN'
    WHEN a.in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as stored_mode
FROM attendance_logs a
LEFT JOIN devices d ON a.device_sn = d.serial_number
ORDER BY a.punched_at DESC
LIMIT 20;
EOF
```

### Watch Real-time (Terminal 1):
```bash
docker compose logs -f server | grep -E '\[ingest\].*Override|punch_type'
```

### Watch Database Changes (Terminal 2):
```bash
watch -n 3 'docker compose exec postgres psql -U prime -d prime_attendance -t -c "SELECT COUNT(*) as total, SUM(CASE WHEN in_out_mode=0 THEN 1 ELSE 0 END) as in_punches, SUM(CASE WHEN in_out_mode=1 THEN 1 ELSE 0 END) as out_punches FROM attendance_logs WHERE punched_at > NOW() - INTERVAL '\''1 hour'\'';"'
```

---

## ⚠️ Important Notes

### 1. Override শুধু নতুন punches এ কাজ করবে
- পুরানো data automatically update হবে না
- নতুন punch আসলে থেকে কাজ করবে

### 2. Device সঠিকভাবে register করা থাকতে হবে
- Device database-এ exist করতে হবে
- Tenant এর সাথে linked থাকতে হবে

### 3. BOTH mode সবচেয়ে flexible
- Device নিজে IN/OUT send করে তাহলে BOTH ব্যবহার করুন
- Override দরকার নেই

---

## 🚀 Deployment

### Production Server এ Deploy:

```bash
# 1. Code pull করুন
cd /opt/Prime-Attendance
git pull origin main

# 2. Server build করুন
cd server
npm run build

# 3. Server restart করুন
cd /opt/Prime-Attendance
docker compose restart server

# 4. Logs check করুন
docker compose logs -f server | grep ingest
```

### Verify Deployment:
```bash
# Check if override logic is working
docker compose logs --tail=50 server | grep "punch_type"
```

You should see:
```
[ingest] 🔧 Device "Entry" punch_type: IN_ONLY
[ingest] 🔧 Device "Exit" punch_type: OUT_ONLY
```

---

## 📚 Technical Details

### Code Changes:
- **File:** `/server/src/services/attendanceIngest.ts`
- **Logic:** Device configuration query করে `punch_type` check করে
- **Override:** IN_ONLY → force 0, OUT_ONLY → force 1, BOTH → raw value

### Database Schema:
```sql
-- devices table
CREATE TABLE devices (
  ...
  punch_type VARCHAR(10) DEFAULT 'BOTH',  -- 'BOTH', 'IN_ONLY', 'OUT_ONLY'
  ...
);

-- attendance_logs table
CREATE TABLE attendance_logs (
  ...
  in_out_mode INTEGER,  -- 0 = IN, 1 = OUT, NULL = unknown
  ...
);
```

### Enum Values:
```typescript
enum PunchType {
  BOTH      // Accept IN and OUT (use raw device data)
  IN_ONLY   // Force all to IN (0)
  OUT_ONLY  // Force all to OUT (1)
}
```

---

## ✅ Success Checklist

Before marking as complete:

- [ ] Server restarted with new code
- [ ] Device configuration checked (IN_ONLY/OUT_ONLY/BOTH)
- [ ] Test punch করা হয়েছে
- [ ] Logs-এ override message দেখা গেছে
- [ ] Database-এ correct inOutMode store হয়েছে
- [ ] ERPNext sync test করা হয়েছে
- [ ] Distribution ratio check করা হয়েছে (IN/OUT mix)

---

## 🎉 Result

**Before Fix:**
```
IN (0):  100%  ❌ সব IN
OUT (1):   0%  ❌ কোনো OUT নেই
```

**After Fix:**
```
IN (0):   ~50%  ✅ Entry device punches
OUT (1):  ~50%  ✅ Exit device punches
```

---

**এখন আপনার device configuration অনুযায়ী automatic IN/OUT হবে!** 🎉

**Deploy করুন এবং test করুন!**
