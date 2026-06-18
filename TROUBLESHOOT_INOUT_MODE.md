# 🔍 Troubleshooting: IN/OUT Mode Issues

## Problem:
All punches showing as IN in ERPNext, even though device sends different types.

---

## ✅ How It Should Work:

### Device Format (ZKTeco ATTLOG):
```
PIN	DateTime	Status	Verify	InOutMode	WorkCode
101	2026-05-16 09:00:00	0	1	0	0  ← IN punch
102	2026-05-16 17:00:00	0	1	1	0  ← OUT punch
```

### Database Storage:
- `in_out_mode = 0` → IN punch
- `in_out_mode = 1` → OUT punch
- `in_out_mode = NULL` → Unknown

### ERPNext Sync:
- `in_out_mode = 0` → `log_type: "IN"`
- `in_out_mode = 1` → `log_type: "OUT"`

---

## 🔍 Debugging Steps:

### Step 1: Check Database Values

```bash
bash scripts/check-inout-mode.sh
```

This will show:
1. Distribution of IN/OUT punches in database
2. Sample records with inOutMode values
3. Recent sync logs

**Expected Output:**
```
in_out_mode | count | type
-------------+-------+---------
0           | 150   | IN
1           | 145   | OUT
```

**If all records show same inOutMode:**
→ Problem is with device configuration or data parsing

---

### Step 2: Check Docker Logs

```bash
docker logs -f prime-attendance-server-1 | grep "RAW inOutMode"
```

**Expected:**
```
⚠️  RAW inOutMode from DB: 0
✅ Mapped log_type: IN

⚠️  RAW inOutMode from DB: 1
✅ Mapped log_type: OUT
```

**If all show inOutMode: 0:**
→ Device is sending all punches as IN

---

### Step 3: Check Raw Device Data

```bash
docker logs -f prime-attendance-server-1 | grep "ATTLOG"
```

Look for the raw data received from device.

**Expected:**
```
101	2026-05-16 09:00:00	0	1	0	0  ← 5th column = 0 (IN)
102	2026-05-16 17:00:00	0	1	1	0  ← 5th column = 1 (OUT)
```

**If 5th column is always 0:**
→ Device configuration issue

---

### Step 4: Verify ERPNext Payload

```bash
docker logs -f prime-attendance-server-1 | grep -A 10 "Payload:"
```

**Expected:**
```json
{
  "employee": "EMP-001",
  "log_type": "IN",    ← Should be IN or OUT
  "time": "2026-05-16 09:00:00",
  "device_id": "TEST001",
  "skip_auto_attendance": 0
}
```

---

## 🛠️ Common Issues & Solutions:

### Issue 1: Device Not Configured for IN/OUT
**Symptom:** All punches in DB have `in_out_mode = 0` or `NULL`

**Cause:** Device not configured to track IN/OUT separately

**Solution:**
1. Access device settings (via ZKTeco software or web interface)
2. Enable "IN/OUT Mode" or "Attendance State"
3. Configure device to:
   - Track entry/exit separately
   - OR use separate devices for IN/OUT
4. Test by punching IN and OUT on device

---

### Issue 2: Device Sends Wrong Format
**Symptom:** Raw ATTLOG missing 5th column (inOutMode)

**Cause:** Older device firmware or wrong protocol

**Solution:**
1. Update device firmware to latest version
2. Check device documentation for ATTLOG format
3. Alternative: Use device punch type configuration (our system supports this)

---

### Issue 3: Parser Not Reading inOutMode
**Symptom:** DB has NULL for all `in_out_mode`

**Cause:** Tab-separated parsing issue

**Solution:**
Check if device sends proper tab characters:
```bash
# View raw POST data
docker logs prime-attendance-server-1 | grep "POST /iclock/cdata" -A 5
```

Expected: `\t` (tab) separators
If seeing spaces: Device firmware issue

---

### Issue 4: ERPNext Not Accepting log_type
**Symptom:** Sync fails with "Invalid log_type" error

**Cause:** ERPNext expecting different values

**Solution:**
ERPNext Employee Checkin accepts:
- `"IN"` (uppercase)
- `"OUT"` (uppercase)

Our code already sends uppercase. Check ERPNext logs:
```bash
# On ERPNext server
tail -f ~/frappe-bench/logs/web.log | grep "Employee Checkin"
```

---

## 🎯 Device Punch Type Configuration

If your device doesn't support IN/OUT mode, use our **Device Punch Type** feature:

### Option 1: Separate Devices
- Device 1 (at entrance) → Set to `IN_ONLY`
- Device 2 (at exit) → Set to `OUT_ONLY`

### Option 2: Single Device
- Set device to `BOTH`
- User manually selects IN/OUT on device keypad

### Configuration:
1. Go to Portal → Devices
2. Click edit (✏️) on device
3. Select Punch Type:
   - `BOTH` - Accept both IN and OUT
   - `IN_ONLY` - All punches treated as IN
   - `OUT_ONLY` - All punches treated as OUT

---

## 📊 Testing IN/OUT Sync

### Manual Test:

1. **Create Test Punches:**
```bash
curl -X POST "http://localhost:7788/iclock/cdata?SN=TEST001&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d $'101\t2026-06-17 09:00:00\t0\t1\t0\t0
101\t2026-06-17 17:00:00\t0\t1\t1\t0'
```

2. **Check Database:**
```sql
SELECT user_pin, punched_at, in_out_mode, 
  CASE WHEN in_out_mode = 0 THEN 'IN' ELSE 'OUT' END as type
FROM attendance_logs 
WHERE user_pin = '101' 
ORDER BY punched_at DESC LIMIT 2;
```

3. **Check ERPNext:**
```sql
-- On ERPNext database
SELECT employee, log_type, time, device_id 
FROM `tabEmployee Checkin` 
WHERE employee = 'EMP-001' 
ORDER BY time DESC LIMIT 2;
```

**Expected:**
```
employee    | log_type | time
------------|----------|---------------------
EMP-001     | OUT      | 2026-06-17 17:00:00
EMP-001     | IN       | 2026-06-17 09:00:00
```

---

## 🔄 After Fix: Re-sync Data

If you fixed the issue and need to re-sync old data:

1. **Reset Sync Status:**
```sql
-- Mark failed/pending for re-sync
UPDATE attendance_logs 
SET sync_status = 'PENDING', 
    sync_retry_count = 0 
WHERE sync_status IN ('FAILED', 'PERMANENTLY_FAILED');
```

2. **Bulk Re-sync:**
Go to Portal → Sync Status → Bulk Sync → Start

---

## 📝 Summary Checklist:

- [ ] Device configured for IN/OUT mode
- [ ] Device sends tab-separated ATTLOG with 6 columns
- [ ] Database shows both `in_out_mode = 0` and `1`
- [ ] Logs show correct "RAW inOutMode" values
- [ ] Logs show correct "Mapped log_type" (IN/OUT)
- [ ] ERPNext receives correct `log_type` in payload
- [ ] ERPNext Employee Checkin table has both IN and OUT entries

---

## 🆘 Still Not Working?

Check:
1. Device model and firmware version
2. ZKTeco device documentation for ATTLOG format
3. Alternative: Use device punch type configuration (IN_ONLY/OUT_ONLY)
4. Contact device vendor for IN/OUT configuration support

---

Generated: 2026-06-17
