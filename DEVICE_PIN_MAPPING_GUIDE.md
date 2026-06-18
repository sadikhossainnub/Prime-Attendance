# 📱 Device PIN Mapping - Complete Guide

## 🎯 কী এটা?

**Device PIN Mapping** হল একটা system যেখানে আপনি:
1. Device-এ employee register করতে পারেন
2. প্রতিটি employee একটা unique **PIN number** পান
3. Device-এ punch করার সময় PIN দিয়ে identify করা হয়
4. Attendance data automatically employee-এর সাথে link হয়

---

## 🔄 Complete Flow

### Step 1: Device Setup
```
1. Device add করুন (Portal → Devices)
2. Device provision key দিয়ে configure করুন
3. Device online verify করুন
```

### Step 2: Employee Add করুন
```
Portal → Device PIN Mapping
↓
Select Device
↓
Click "Add Mapping"
↓
Fill Form:
  - PIN: 101 (numeric)
  - Employee Name: John Doe
  - Privilege: User/Manager/Admin
  - Create employee mapping ✓
```

### Step 3: Device Sync
```
Device next time connect করলে:
↓
Server sends user data to device
↓
Device stores user in memory
↓
Employee এখন device-এ registered
```

### Step 4: Attendance Punch
```
Employee device-এ যায়
↓
PIN enter করে (101)
↓
Device punch record করে
↓
Server-এ send হয় ATTLOG:
  101	2026-06-17 09:00:00	0	1	0	0
↓
Database-এ save হয়:
  - userPin: 101
  - employeeName: John Doe (auto-mapped)
  - erpnextEmployeeId: EMP-001 (if configured)
```

---

## 📊 Data Flow Diagram

```
┌─────────────────┐
│  Admin Portal   │
│ (Add Mapping)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Database      │
│ DeviceUser +    │
│ EmployeeMapping │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Device Connects │
│ (GET/POST sync) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Device Memory   │
│ (PIN + Name)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Employee Punch  │
│ (Enter PIN 101) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ ATTLOG to Server│
│ (101 + time)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Auto Map to     │
│ Employee & Sync │
│ to ERPNext      │
└─────────────────┘
```

---

## 🔧 Technical Details

### Database Tables:

#### 1. **DeviceUser** (device_users)
Device-এ registered users:
```sql
{
  id: "abc123",
  tenantId: "tenant1",
  deviceSn: "ZKTECO001",
  userPin: "101",
  userName: "John Doe",
  privilege: 0,  // 0=User, 1=Manager, 2=Admin
  enabled: true,
  lastSyncedAt: "2026-06-17T10:00:00Z"
}
```

#### 2. **EmployeeMapping** (employee_mappings)
Employee তথ্য এবং ERPNext link:
```sql
{
  id: "def456",
  tenantId: "tenant1",
  userPin: "101",
  employeeName: "John Doe",
  erpnextEmployeeId: "EMP-001"  // Optional
}
```

#### 3. **AttendanceLog** (attendance_logs)
Punch records:
```sql
{
  id: "ghi789",
  tenantId: "tenant1",
  deviceSn: "ZKTECO001",
  userPin: "101",        // Matched with DeviceUser
  punchedAt: "2026-06-17 09:00:00",
  inOutMode: 0,          // 0=IN, 1=OUT
  syncStatus: "SYNCED"
}
```

---

## 🎯 API Endpoints

### 1. Get All Mappings
```http
GET /api/portal/device-mappings
Query params:
  - deviceSn (optional): Filter by device
  - userPin (optional): Filter by PIN

Response:
[
  {
    "id": "abc123",
    "deviceSn": "ZKTECO001",
    "userPin": "101",
    "userName": "John Doe",
    "privilege": 0,
    "enabled": true,
    "employee": {
      "employeeName": "John Doe",
      "erpnextEmployeeId": "EMP-001"
    }
  }
]
```

### 2. Create Mapping
```http
POST /api/portal/device-mappings
Body:
{
  "deviceSn": "ZKTECO001",
  "userPin": "101",
  "privilege": 0,
  "createEmployeeMapping": true,
  "employeeName": "John Doe"
}

Response:
{
  "id": "abc123",
  "deviceSn": "ZKTECO001",
  "userPin": "101",
  ...
}
```

### 3. Delete Mapping
```http
DELETE /api/portal/device-mappings/{deviceSn}/{userPin}

Response: 204 No Content
```

---

## 💡 Use Cases

### Use Case 1: New Employee Onboarding
```
1. HR adds employee to ERPNext
2. Admin creates device PIN mapping in portal
3. Assigns PIN: 101
4. Employee visits device next day
5. Device already has their info
6. Employee just enters PIN to punch
```

### Use Case 2: Multiple Devices
```
Employee works at multiple locations:

Office Entrance: PIN 101 on Device A
Warehouse Gate: PIN 101 on Device B

Admin creates mappings:
- Device A → PIN 101 → John Doe
- Device B → PIN 101 → John Doe

Both devices recognize employee by same PIN
```

### Use Case 3: Privilege Levels
```
Regular Employee:
- PIN: 101
- Privilege: 0 (User)
- Can: Punch only

Manager:
- PIN: 201
- Privilege: 1 (Manager)
- Can: Punch + View reports on device

Admin:
- PIN: 301
- Privilege: 2 (Admin)
- Can: Punch + Configure device
```

---

## 🔍 How Device Sync Works

### Device Connection Flow:

```
Device → GET /iclock/cdata?SN=ZKTECO001
Server → Returns commands/data

If new users registered:
Server → Sends user data:
  CMD: USER 101,John Doe,0,1

Device → Stores in memory
Device → ACK success

Next punch:
Device → POST /iclock/cdata?SN=ZKTECO001&table=ATTLOG
  Body: 101\t2026-06-17 09:00:00\t0\t1\t0\t0

Server → Receives and processes:
  - Looks up PIN 101
  - Finds employee: John Doe
  - Creates attendance log
  - Syncs to ERPNext
```

---

## 🎨 UI Features

### Main Screen (Portal → Device PIN Mapping)

**Header:**
- Title: "Employee Device PIN Mapping"
- Stats cards: Total Devices, Total Mappings, Online Devices

**Search:**
- Search by PIN
- Search by Device

**Device List:**
Each device shows:
- Device name + serial number
- Online/offline status (🟢/⚫)
- Mapping count
- "Add Mapping" button
- Expandable list of mappings

**Mapping Details:**
For each mapping:
- PIN number (font-mono)
- Employee name
- ERPNext Employee ID (if linked)
- Privilege level badge
- Delete button

**Add Mapping Modal:**
Form fields:
- Device Serial Number (read-only, selected)
- PIN (numeric input) *
- Employee Name *
- Privilege Level (dropdown: User/Manager/Admin)
- Create employee mapping (checkbox)

---

## 🚀 Best Practices

### 1. PIN Number Convention
```
Regular Staff:     100-199
Supervisors:       200-299
Managers:          300-399
Executives:        400-499
```

### 2. Employee Name Format
```
✅ Good: "John Doe"
✅ Good: "মোহাম্মদ রহিম"
❌ Bad: "john" (no last name)
❌ Bad: "JD" (too short)
```

### 3. Privilege Assignment
```
Privilege 0 (User):
- 95% of employees
- Can only punch

Privilege 1 (Manager):
- Department heads
- Can view team reports on device

Privilege 2 (Admin):
- IT/HR only
- Can configure device settings
```

### 4. Sync Verification
After adding mapping:
1. Wait for device to connect (usually 1-2 minutes)
2. Check device display for new user
3. Test punch with new PIN
4. Verify in Attendance page

---

## 🔧 Troubleshooting

### Issue 1: Mapping Created but Device Doesn't Recognize PIN
**Symptoms:** Employee enters PIN, device shows "Invalid User"

**Causes:**
1. Device hasn't synced yet
2. Device memory full
3. Network issue

**Solutions:**
```bash
# Check device last seen time
# Portal → Devices → Check "Last Seen"

# Should be < 5 minutes
If > 5 minutes:
  - Check device network connection
  - Check device provision key
  - Restart device

# Force sync (on device):
# Menu → Comm → Connect Now
```

---

### Issue 2: Multiple Devices Same PIN Not Working
**Symptoms:** PIN works on Device A but not Device B

**Cause:** Mapping not created for Device B

**Solution:**
```
Create separate mappings:
1. Portal → Device PIN Mapping
2. Select Device B
3. Add Mapping: PIN 101 → John Doe
4. Wait for sync
```

---

### Issue 3: Attendance Log Shows PIN but No Employee Name
**Symptoms:** Attendance table shows "101" but no name

**Cause:** EmployeeMapping not created

**Solution:**
```
Option 1: Automatic
- When adding device mapping, check "Create employee mapping" ✓

Option 2: Manual
- Portal → Employees
- Add employee mapping: PIN 101 → John Doe → EMP-001
```

---

### Issue 4: Employee Deleted but Still in Device
**Symptoms:** Deleted mapping but device still accepts PIN

**Cause:** Device hasn't synced deletion yet

**Solution:**
```
Option 1: Wait for sync (1-2 minutes)
Option 2: Force sync on device
Option 3: Manual delete on device:
  Menu → User Management → Delete User → Select PIN
```

---

## 📊 Database Queries

### Check All Mappings for a Device:
```sql
SELECT 
  du.user_pin,
  du.user_name,
  du.privilege,
  em.employee_name,
  em.erpnext_employee_id
FROM device_users du
LEFT JOIN employee_mappings em 
  ON du.tenant_id = em.tenant_id 
  AND du.user_pin = em.user_pin
WHERE du.device_sn = 'ZKTECO001'
ORDER BY du.user_pin;
```

### Check Attendance Logs with Employee Names:
```sql
SELECT 
  al.user_pin,
  em.employee_name,
  al.punched_at,
  al.in_out_mode,
  al.device_sn
FROM attendance_logs al
LEFT JOIN employee_mappings em 
  ON al.tenant_id = em.tenant_id 
  AND al.user_pin = em.user_pin
WHERE al.device_sn = 'ZKTECO001'
ORDER BY al.punched_at DESC
LIMIT 10;
```

### Find Unmapped PINs:
```sql
SELECT DISTINCT al.user_pin
FROM attendance_logs al
LEFT JOIN employee_mappings em 
  ON al.tenant_id = em.tenant_id 
  AND al.user_pin = em.user_pin
WHERE em.id IS NULL;
```

---

## 🎯 Integration with ERPNext

### Flow:
```
Device PIN Mapping Created
↓
Employee Mapping Created (if checked)
  - userPin: 101
  - employeeName: John Doe
  - erpnextEmployeeId: EMP-001
↓
Attendance Punch
  - userPin: 101
  - Device finds mapping: John Doe
↓
ERPNext Sync
  - Looks up erpnextEmployeeId: EMP-001
  - Creates Employee Checkin:
    {
      employee: "EMP-001",
      log_type: "IN",
      time: "2026-06-17 09:00:00"
    }
```

---

## 🔐 Security Notes

1. **PIN Uniqueness:**
   - PIN should be unique within tenant
   - Same PIN can exist on different devices
   - System enforces unique (tenantId, deviceSn, userPin)

2. **Privilege Levels:**
   - Don't give Admin privilege to everyone
   - Only IT/HR should have Admin access
   - Managers for department heads only

3. **Data Privacy:**
   - Employee names visible on device
   - Consider using employee IDs instead of full names
   - GDPR compliance: Allow employee data deletion

---

## 📝 Summary

**Device PIN Mapping allows:**
- ✅ Easy employee registration on devices
- ✅ Centralized management from portal
- ✅ Automatic name mapping
- ✅ ERPNext integration
- ✅ Multiple device support
- ✅ Privilege level control

**Workflow:**
```
Admin → Add Mapping → Device Syncs → Employee Punches → Auto ERPNext Sync
```

**Key Tables:**
- `device_users` - Device registrations
- `employee_mappings` - Employee info + ERPNext link
- `attendance_logs` - Punch records with PIN

**Access:**
Portal → Device PIN Mapping → Manage all mappings

---

Generated: 2026-06-17
