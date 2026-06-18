# 🔄 Device Sync Improvements

## Problems Solved:

### ❌ Problem 1: No Employee Selection Dropdown
আগে Device PIN Mapping-এ শুধু manual name entry ছিল। Existing employee select করা যেত না।

### ❌ Problem 2: Device থেকে User Details আসত না
Device-এ user register করার পর device থেকে user list automatically pull হত না।

---

## ✅ Solutions Implemented:

### Solution 1: Employee Dropdown Added

#### Frontend Changes (`client/src/pages/DevicePinMapping.tsx`):

**Added:**
- ✅ Employee list loading from API
- ✅ Dropdown selector: "Select Existing Employee"
- ✅ Auto-fill PIN and Name when employee selected
- ✅ Option to still manually enter new employee
- ✅ Bengali helper text

**New Flow:**
```
Open Add Mapping Modal
↓
See dropdown with existing employees:
  - John Doe (PIN: 101) - EMP-001
  - Jane Smith (PIN: 102) - EMP-002
↓
Select Employee → Auto-fills PIN + Name
↓
OR manually enter new employee details
↓
Submit → Creates device mapping
```

**UI Changes:**
```jsx
<select>
  <option>-- Select Employee or Enter New --</option>
  {employees.map(emp => (
    <option value={emp.userPin}>
      {emp.employeeName} (PIN: {emp.userPin})
      {emp.erpnextEmployeeId && ` - ${emp.erpnextEmployeeId}`}
    </option>
  ))}
</select>
<p>অথবা নিচে নতুন employee তথ্য দিন</p>
```

---

### Solution 2: Automatic Device User Sync

#### Backend Changes:

**1. Schema Update (`server/prisma/schema.prisma`):**
```prisma
model DeviceUser {
  lastSyncedAt  DateTime? @map("last_synced_at")  // Now nullable
}
```

**Why nullable?**
- `lastSyncedAt = null` → User created, pending device sync
- `lastSyncedAt = timestamp` → User synced to device successfully

---

**2. iClock Protocol Enhancement (`server/src/routes/iclock.ts`):**

#### `/getrequest` Endpoint (Device Pulls Commands):

Device calls this endpoint to check for pending commands.

**New Logic:**
```typescript
GET /iclock/getrequest?SN=DEVICE001

Server checks:
1. Find all DeviceUser where:
   - tenantId = this tenant
   - deviceSn = DEVICE001
   - lastSyncedAt = NULL (not synced yet)

2. For each pending user:
   - Build USER command
   - Send to device
   - Mark lastSyncedAt = NOW

Response to device:
DATA USER PIN=101\tName=John Doe\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000
DATA USER PIN=102\tName=Jane Smith\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000
```

**Command Format:**
```
DATA USER PIN={pin}\tName={name}\tPri={privilege}\tPasswd=\tCard=[cardno]\tGrp=1\tTZ=0000000000
```

Fields:
- `PIN`: User PIN number
- `Name`: Employee name
- `Pri`: Privilege (0=User, 1=Manager, 2=Admin)
- `Passwd`: Password (empty for fingerprint-only)
- `Card`: Card number (empty if no card)
- `Grp`: User group (default 1)
- `TZ`: Timezone (default 0000000000)

---

#### `/cdata` Endpoint (Device Pushes Data):

Device can also send its user list to server.

**New Table Support: USERINFO**
```typescript
POST /iclock/cdata?SN=DEVICE001&table=USERINFO

Body (tab-separated):
101	John Doe	0		123456	1	0000000000
102	Jane Smith	0		234567	1	0000000000

Server:
1. Parse each line
2. Extract PIN, Name, Privilege
3. Upsert DeviceUser:
   - Create if not exists
   - Update if exists
   - Mark lastSyncedAt = NOW

Response: OK
```

---

## 🔄 Complete Sync Flow:

### Scenario 1: Admin Creates New User

```
Step 1: Admin Portal
Portal → Device PIN Mapping
→ Select Device: DEVICE001
→ Add Mapping:
  - PIN: 103
  - Name: Bob Wilson
  - Privilege: User
→ Submit

Step 2: Database
DeviceUser created:
{
  deviceSn: "DEVICE001",
  userPin: "103",
  userName: "Bob Wilson",
  privilege: 0,
  lastSyncedAt: null  ← Pending sync
}

Step 3: Device Connection
Device connects (every 1-2 minutes):
GET /iclock/getrequest?SN=DEVICE001

Server responds:
DATA USER PIN=103\tName=Bob Wilson\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000000

Step 4: Device Receives
Device stores user in memory:
- PIN: 103
- Name: Bob Wilson
- Can now punch

Step 5: Database Update
Server marks:
lastSyncedAt: "2026-06-17 16:00:00"

Step 6: Employee Punches
Employee enters PIN 103
Device recognizes → Creates punch record
Sends to server → Attendance log created
```

---

### Scenario 2: Device Sends Existing Users

```
Step 1: Admin Request
(Manual trigger or device reset)

Step 2: Device Sends
POST /iclock/cdata?SN=DEVICE001&table=USERINFO

Body:
101	John Doe	0		123456	1	0000000000
102	Jane Smith	0		234567	1	0000000000
150	Old Employee	0		999999	1	0000000000

Step 3: Server Imports
For each user:
- Check if exists in DeviceUser table
- Create if new
- Update if exists
- Mark lastSyncedAt = NOW

Result:
- 3 users imported
- All synced to database
- Can view in Portal → Device PIN Mapping
```

---

## 📊 Database Changes:

### Migration: `20260617160000_device_user_sync_nullable`
```sql
ALTER TABLE "device_users" 
ALTER COLUMN "last_synced_at" DROP NOT NULL;
```

### Before:
```sql
lastSyncedAt  DateTime  @map("last_synced_at")
```

### After:
```sql
lastSyncedAt  DateTime? @map("last_synced_at")  -- Nullable
```

---

## 🎯 Benefits:

### 1. Better UX
- ✅ Select existing employees (no re-typing)
- ✅ Dropdown shows PIN, Name, ERPNext ID
- ✅ Auto-fill form fields
- ✅ Faster workflow

### 2. Automatic Sync
- ✅ Users auto-sync to device within 1-2 minutes
- ✅ No manual intervention needed
- ✅ Device always has latest user list
- ✅ Bidirectional sync (server ↔ device)

### 3. Visibility
- ✅ `lastSyncedAt = null` → Pending sync
- ✅ `lastSyncedAt = timestamp` → Synced
- ✅ Can track which users are synced

### 4. Import from Device
- ✅ Can pull user list from device
- ✅ Useful for:
  - Device with pre-configured users
  - Migration from another system
  - Backup/recovery

---

## 🔍 Monitoring Sync Status:

### Check Pending Syncs:
```sql
SELECT device_sn, user_pin, user_name, created_at
FROM device_users
WHERE last_synced_at IS NULL
ORDER BY created_at DESC;
```

### Check Recently Synced:
```sql
SELECT device_sn, user_pin, user_name, last_synced_at
FROM device_users
WHERE last_synced_at IS NOT NULL
ORDER BY last_synced_at DESC
LIMIT 10;
```

### Check Device Sync Logs:
```bash
docker logs -f prime-attendance-server-1 | grep "USER commands"
```

Expected output:
```
[iclock] Sending 3 USER commands to device SN=DEVICE001
```

---

## 🧪 Testing:

### Test 1: Create New Mapping
```
1. Portal → Device PIN Mapping
2. Select Device
3. Click "Add Mapping"
4. Select existing employee from dropdown
   OR enter new employee
5. Submit
6. Wait 1-2 minutes
7. Check logs: docker logs -f prime-attendance-server-1 | grep "USER commands"
8. Device should show new user
```

### Test 2: Import from Device
```
1. Device Menu → User Management → View Users
2. Note existing users on device
3. Server: POST /iclock/cdata?SN=DEVICE001&table=USERINFO
   (Device does this automatically on some models)
4. Portal → Device PIN Mapping → Expand device
5. Should see imported users
```

### Test 3: Multiple Pending Users
```
1. Add 3-5 mappings quickly
2. All will have lastSyncedAt = null
3. Wait for device connection
4. Server sends all pending users in one batch
5. All marked as synced
6. Verify on device
```

---

## 🚨 Troubleshooting:

### Issue 1: Users Not Syncing to Device
**Symptoms:** Created mapping but device doesn't recognize PIN

**Check:**
```bash
# Check pending syncs
docker exec prime-attendance-db-1 psql -U primeuser -d prime_attendance -c "
SELECT device_sn, user_pin, user_name, last_synced_at 
FROM device_users 
WHERE last_synced_at IS NULL;
"
```

**If pending users found:**
1. Wait for device to connect (1-2 min)
2. Check device last seen time (Portal → Devices)
3. Force device connection (device menu → Comm → Connect)

**If no pending users but still not working:**
1. Device memory might be full
2. Device firmware issue
3. Check device logs

---

### Issue 2: Dropdown Empty
**Symptoms:** "Select Employee" dropdown shows no options

**Cause:** No employees in EmployeeMapping table

**Solution:**
```
Option 1: Create employee mappings first
  Portal → Employees → Add Employee Mapping

Option 2: Sync from ERPNext
  Portal → Employees → Sync from ERPNext

Option 3: Manual entry still works
  Just type PIN and Name manually
```

---

### Issue 3: Duplicate Users
**Symptoms:** Same user appears multiple times

**Cause:** Created on device manually + via portal

**Solution:**
```sql
-- Find duplicates
SELECT user_pin, COUNT(*) 
FROM device_users 
WHERE device_sn = 'DEVICE001'
GROUP BY user_pin 
HAVING COUNT(*) > 1;

-- Keep latest, delete old
DELETE FROM device_users 
WHERE id IN (
  SELECT id FROM device_users 
  WHERE device_sn = 'DEVICE001' 
    AND user_pin = '101'
  ORDER BY created_at DESC 
  OFFSET 1
);
```

---

## 📝 Summary:

**Two Major Improvements:**

1. **Employee Selection Dropdown** ✅
   - No more re-typing employee names
   - Select from existing employees
   - Auto-fill PIN and details
   - Faster workflow

2. **Automatic Device Sync** ✅
   - Users auto-push to device
   - Device auto-pull from server
   - Bidirectional sync
   - Tracking via `lastSyncedAt`

**New Fields:**
- `lastSyncedAt: DateTime?` (nullable)

**New Protocol Support:**
- `/getrequest` → Send USER commands
- `/cdata?table=USERINFO` → Receive user list

**Workflow:**
```
Admin creates mapping → Pending (lastSyncedAt=null)
↓
Device connects → Server sends USER command
↓
Device receives → Stores in memory
↓
Server updates → Synced (lastSyncedAt=NOW)
↓
Employee punches → Works immediately
```

---

Generated: 2026-06-17
