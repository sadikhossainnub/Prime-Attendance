# ERPNext Sync Troubleshooting Guide
# ERPNext সিঙ্ক সমস্যা সমাধান গাইড

## সমস্যা ঠিক করা হয়েছে ✅

### 1. setSuccess is not defined Error
**সমস্যা:** Attendance page-এ "Sync ERPNext" বাটনে ক্লিক করলে `setSuccess is not defined` error দেখাচ্ছিল।

**সমাধান:** 
- `success` state variable যোগ করা হয়েছে
- Success message এর জন্য UI component যোগ করা হয়েছে
- এখন sync retry সফলভাবে কাজ করবে

**ফাইল:** `/client/src/pages/Attendance.tsx`

---

## ERPNext Sync Checklist

যদি ERPNext sync কাজ না করে, নিচের পয়েন্টগুলো চেক করুন:

### ✅ 1. ERPNext Configuration
```bash
# Check tenant settings
SELECT id, slug, erpnext_enabled, erpnext_url 
FROM tenants 
WHERE slug = 'your-tenant-slug';
```

**Requirements:**
- ✓ `erpnext_enabled` = true
- ✓ `erpnext_url` শুধুমাত্র valid URL (https://your-erpnext.com)
- ✓ `erpnext_api_key` সঠিক API key
- ✓ `erpnext_api_secret` সঠিক API secret

### ✅ 2. Employee Mapping
```bash
# Check employee mappings
SELECT user_pin, employee_name, erpnext_employee_id 
FROM employee_mappings 
WHERE tenant_id = 'your-tenant-id';
```

**Requirements:**
- ✓ প্রতিটি user PIN এর জন্য mapping থাকতে হবে
- ✓ `erpnext_employee_id` ঠিকমতো set করতে হবে
- ✓ ERPNext-এ employee exist করতে হবে

### ✅ 3. Shift Assignment (Important!)
```bash
# ERPNext-এ shift assignment চেক করুন
# HR > Shift Management > Shift Assignment
```

**Requirements:**
- ✓ প্রতিটি employee এর shift assignment থাকতে হবে
- ✓ Shift active থাকতে হবে
- ✓ "Attendance marking from checkin" enable করতে হবে

**Without shift assignment, attendance will NOT be auto-created!**

### ✅ 4. Sync Status চেক করুন

**UI থেকে:**
1. Attendance page খুলুন
2. "Sync ERPNext" বাটনে ক্লিক করুন
3. Success message দেখুন: "🔄 Sync retry triggered for X logs"

**Database থেকে:**
```sql
-- Sync status summary
SELECT 
  sync_status, 
  COUNT(*) as count 
FROM attendance_logs 
WHERE tenant_id = 'your-tenant-id'
GROUP BY sync_status;

-- Failed logs check
SELECT 
  id, user_pin, punched_at, sync_status, 
  sync_error, sync_retry_count
FROM attendance_logs 
WHERE sync_status IN ('FAILED', 'PERMANENTLY_FAILED')
ORDER BY punched_at DESC 
LIMIT 20;
```

### ✅ 5. Logs চেক করুন

**Server logs:**
```bash
# Docker logs
docker compose logs -f server | grep erpnext

# Look for:
# ✅ [erpnext] ✅ Employee Checkin created successfully!
# ⚠️ [erpnext] ⚠️ No ERPNext employee mapping for PIN X
# ❌ [erpnext] ❌ Sync failed: reason
```

**Important log patterns:**
- `🔍 Checking for duplicate checkin` - Duplicate check করছে
- `🔍 Verifying employee shift assignment` - Shift check করছে
- `📊 Attendance verification` - Attendance created কিনা verify করছে
- `✅ Employee Checkin created successfully!` - Sync successful
- `⚠️ Attendance may not be auto-created without shift assignment` - Shift নেই

---

## Common Issues & Solutions

### Issue 1: "No ERPNext employee mapping for PIN X"
**Cause:** Employee mapping নেই

**Solution:**
```sql
-- Add mapping
INSERT INTO employee_mappings (id, tenant_id, user_pin, employee_name, erpnext_employee_id)
VALUES ('cuid_here', 'tenant_id', '101', 'John Doe', 'HR-EMP-00001');
```

Or use the UI: **Employees > Device Pin Mapping**

---

### Issue 2: "Checkin created but attendance not created"
**Cause:** Shift assignment নেই বা shift configuration ভুল

**Solution:**
1. ERPNext-এ যান: **HR > Shift Management > Shift Assignment**
2. Employee এর জন্য shift assignment তৈরি করুন
3. Shift-এ "Mark attendance from checkin" enable করুন
4. Shift start/end time সঠিক দিন

**Verify shift:**
```bash
# API থেকে চেক করুন
curl -X POST http://localhost:3001/api/portal/verify-shift \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "HR-EMP-00001", "date": "2026-06-20"}'
```

---

### Issue 3: "Duplicate checkin already exists"
**Cause:** Same time-এ duplicate checkin হতে চাচ্ছে

**Solution:** 
- This is normal behavior - system automatically prevents duplicates
- syncStatus = "SKIPPED" হবে
- No action needed

---

### Issue 4: "PERMANENTLY_FAILED status"
**Cause:** 5 বার retry করার পরও failed

**Solution:**
```sql
-- Check error message
SELECT id, user_pin, punched_at, sync_error, sync_retry_count
FROM attendance_logs 
WHERE sync_status = 'PERMANENTLY_FAILED';

-- Fix underlying issue (mapping, shift, etc) then reset:
UPDATE attendance_logs 
SET sync_status = 'PENDING', sync_retry_count = 0, sync_error = NULL
WHERE id = 'log_id_here';

-- Then trigger sync retry
```

---

### Issue 5: "Invalid ERPNext URL"
**Cause:** URL format ভুল

**Solution:**
```sql
-- Correct format (NO trailing slash, NO /api)
UPDATE tenants 
SET erpnext_url = 'https://your-erpnext-instance.com'
WHERE slug = 'your-tenant';

-- ❌ Wrong:
-- https://your-erpnext-instance.com/
-- https://your-erpnext-instance.com/api
-- http://your-erpnext-instance.com (must be HTTPS)
```

---

## Manual Sync Steps

যদি automatic sync কাজ না করে, manually sync করুন:

### Step 1: Enable ERPNext
```sql
UPDATE tenants 
SET 
  erpnext_enabled = TRUE,
  erpnext_url = 'https://your-erpnext.com',
  erpnext_api_key = 'your_api_key',
  erpnext_api_secret = 'your_api_secret'
WHERE slug = 'your-tenant';
```

### Step 2: Add Employee Mappings
Go to: **Employees > Device Pin Mapping**
- Add each employee's PIN to ERPNext ID mapping

### Step 3: Configure Shifts in ERPNext
1. Go to: **HR > Shift Type**
2. Create/Edit shift
3. Enable "Mark attendance from checkin"
4. Set proper start/end times

### Step 4: Create Shift Assignments
1. Go to: **HR > Shift Assignment**
2. Assign shift to each employee
3. Set start date (today or earlier)

### Step 5: Trigger Sync
1. Go to **Attendance** page
2. Click "🔄 Sync ERPNext" button
3. Wait for success message

---

## Verification Tools

### API Endpoints

#### 1. Check Sync Status
```bash
GET /api/portal/sync-status
Authorization: Bearer YOUR_TOKEN
```

**Response:**
```json
{
  "totalLogs": 150,
  "synced": 120,
  "pending": 10,
  "failed": 15,
  "skipped": 5,
  "permanentlyFailed": 0,
  "recentLogs": [...]
}
```

#### 2. Verify Shift Assignment
```bash
POST /api/portal/verify-shift
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "employeeId": "HR-EMP-00001",
  "date": "2026-06-20"
}
```

**Response:**
```json
{
  "hasShift": true,
  "message": "Employee has shift assignment",
  "shiftAssignment": {
    "name": "...",
    "shift_type": "General Shift",
    "start_date": "2024-01-01",
    "status": "Active"
  }
}
```

#### 3. Verify Attendance Creation
```bash
POST /api/portal/verify-attendance
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "employeeId": "HR-EMP-00001",
  "date": "2026-06-20"
}
```

**Response:**
```json
{
  "exists": true,
  "message": "Attendance record found",
  "attendance": {
    "name": "...",
    "status": "Present",
    "in_time": "09:00:00",
    "out_time": "18:00:00"
  }
}
```

#### 4. Trigger Sync Retry
```bash
POST /api/portal/sync-retry
Authorization: Bearer YOUR_TOKEN
```

---

## Advanced Troubleshooting

### Enable Debug Logging

Server logs-এ ERPNext sync এর সব details দেখতে:

```bash
# Docker environment
docker compose logs -f server | grep '\[erpnext\]'

# Direct node
npm run dev | grep '\[erpnext\]'
```

### Network Issues

ERPNext instance থেকে connection check করুন:

```bash
# From server container
docker compose exec server sh
curl -v https://your-erpnext-instance.com/api/method/ping
```

### API Key Test

ERPNext API credentials test করুন:

```bash
curl -X GET "https://your-erpnext.com/api/resource/Employee" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET"
```

Expected: List of employees (or authentication error if wrong credentials)

---

## Best Practices

### 1. Initial Setup
1. ✅ Configure ERPNext settings first
2. ✅ Add all employee mappings
3. ✅ Create shifts in ERPNext
4. ✅ Assign shifts to employees
5. ✅ Test with one employee first

### 2. Daily Operations
- Monitor sync status daily
- Check for PERMANENTLY_FAILED logs weekly
- Review sync errors and fix root causes

### 3. Troubleshooting Flow
```
Sync Failed?
├─ Check employee mapping exists
├─ Check ERPNext credentials valid
├─ Check shift assignment exists
├─ Check shift has "Mark attendance from checkin" enabled
├─ Check network connectivity
├─ Check server logs for specific error
└─ Check sync_error field in database
```

---

## Contact & Support

যদি এখনও সমস্যা থাকে:

1. **Check logs:** Server logs সবসময় detailed error দেখায়
2. **Database check:** `attendance_logs` table-এ `sync_error` column check করুন
3. **ERPNext logs:** ERPNext server logs-ও check করুন
4. **API test:** Manual API call করে test করুন

---

## Update History

- **2026-06-20:** Fixed `setSuccess is not defined` error in Attendance.tsx
- **2026-06-19:** Added comprehensive HRMS features
- **2026-06-02:** Added shift verification and duplicate checking
- **2026-06-01:** Initial ERPNext integration

---

**সব ঠিক থাকলে, এখন ERPNext sync smoothly কাজ করবে! 🎉**
