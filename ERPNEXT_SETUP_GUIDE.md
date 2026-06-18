# ERPNext Auto-Attendance Setup Guide

## 📋 Complete Setup Checklist

এই guide অনুসরণ করে আপনি ERPNext-এ automatic attendance marking সঠিকভাবে configure করতে পারবেন।

---

## 🔧 Step 1: ERPNext User Setup

### 1.1 Create API User

1. ERPNext-এ login করুন
2. যান: **User List** → **Add User**
3. User details fill করুন:
   ```
   Email: attendance_api@yourcompany.com
   First Name: Attendance API
   Role Profile: [Select appropriate profile]
   ```

### 1.2 Set Permissions

API User-কে এই permissions দিতে হবে:

#### Employee Checkin DocType
- ✅ Create
- ✅ Read
- ✅ Write

#### Shift Type DocType
- ✅ Read
- ✅ Write (Last Sync of Checkin update করার জন্য)

#### Employee DocType
- ✅ Read

#### Shift Assignment DocType
- ✅ Read

#### Attendance DocType
- ✅ Read
- ✅ Write (manual marking এর জন্য)

### 1.3 Generate API Keys

1. User record open করুন
2. **API Access** section-এ যান
3. **Generate Keys** button click করুন
4. **API Key** এবং **API Secret** copy করে রাখুন

---

## 🏢 Step 2: Company & Branch Setup

### 2.1 Verify Company

1. যান: **Company List**
2. আপনার company verify করুন
3. Ensure: **Default Currency** এবং **Country** সঠিক আছে

### 2.2 Setup Departments

1. যান: **Department List**
2. প্রয়োজনীয় departments তৈরি করুন:
   ```
   - IT Department
   - HR Department
   - Sales Department
   - etc.
   ```

---

## 👥 Step 3: Employee Setup

### 3.1 Create/Import Employees

1. যান: **Employee List** → **Add Employee**
2. Fill করুন:
   ```
   Employee Name: [Full Name]
   Company: [Your Company]
   Department: [Select Department]
   Designation: [Job Title]
   Employment Type: [Full-time/Part-time/Contract]
   Status: Active
   Date of Joining: [YYYY-MM-DD]
   ```

### 3.2 Set Attendance Device ID (Critical!)

প্রতিটি employee-এর জন্য:

1. Employee record open করুন
2. **Attendance and Leave Details** section scroll করুন
3. **Attendance Device ID (Biometric/RF tag ID)** field-এ device PIN enter করুন
   ```
   Example: 101, 102, 103, etc.
   ```

⚠️ **Important**: এই field-টা **MUST match** করতে হবে biometric device-এ stored PIN-এর সাথে!

### 3.3 Bulk Import (Optional)

যদি অনেক employees থাকে:

1. যান: **Data Import**
2. Select DocType: **Employee**
3. Download template
4. Excel-এ employee data fill করুন
5. Upload করুন

Template format:
```csv
Employee Name,Company,Department,Designation,Attendance Device ID,Date of Joining,Status
John Doe,ABC Ltd,IT Department,Developer,101,2026-01-01,Active
Jane Smith,ABC Ltd,HR Department,Manager,102,2026-01-01,Active
```

---

## ⏰ Step 4: Shift Type Configuration (Most Critical!)

### 4.1 Create Shift Type

1. যান: **Shift Type List** → **Add Shift Type**
2. Basic details:
   ```
   Shift Type Name: Morning Shift
   Start Time: 09:00:00
   End Time: 17:00:00
   ```

### 4.2 Enable Auto Attendance

এটি সবচেয়ে **important section**:

1. **Enable Auto Attendance**: ✅ Check করুন
2. **Process Attendance After**: 
   - আজকের date বা past date set করুন
   - Example: `2026-01-01`
   - মানে: এই date-এর পরের সব checkins process হবে

3. **Last Sync of Checkin**:
   - **CRITICAL**: এই field-টা regularly update করতে হবে
   - Current date/time set করুন
   - Example: `2026-06-18 10:00:00`
   - মানে: এই time-এর আগের সব checkins process হয়ে যাবে

### 4.3 Configure Grace Periods

1. **Begin check-in before shift start time**: `60` minutes
   - মানে: shift start এর 60 minutes আগে check-in করা যাবে

2. **Allow check-out after shift end time**: `60` minutes
   - মানে: shift end এর 60 minutes পরে check-out করা যাবে

3. **Enable Entry Grace Period**: ✅ Check করুন
4. **Late Entry Grace Period**: `15` minutes
   - মানে: 15 minutes late হলেও "Present" mark হবে

5. **Enable Exit Grace Period**: ✅ Check করুন
6. **Early Exit Grace Period**: `15` minutes

### 4.4 Working Hours Threshold

1. **Working Hours Threshold for Absent**: `0` hours
   - কোনো checkin না থাকলে "Absent"

2. **Working Hours Threshold for Half Day**: `4` hours
   - 4 hours-এর কম কাজ করলে "Half Day"

### 4.5 Complete Configuration Example

```
Shift Type: Morning Shift
─────────────────────────────────────────
Start Time: 09:00:00
End Time: 17:00:00

Auto Attendance Settings:
✅ Enable Auto Attendance: Yes
📅 Process Attendance After: 2026-01-01
⏰ Last Sync of Checkin: 2026-06-18 10:00:00

Grace Periods:
⬅️ Begin check-in before: 60 mins
➡️ Allow check-out after: 60 mins
✅ Late Entry Grace: 15 mins
✅ Early Exit Grace: 15 mins

Thresholds:
❌ Absent threshold: 0 hours
📗 Half Day threshold: 4 hours
```

### 4.6 Save Shift Type

**Save** button click করুন

---

## 🔗 Step 5: Shift Assignment

### 5.1 Assign Employee to Shift

প্রতিটি employee-কে shift assign করতে হবে:

1. যান: **Shift Assignment List** → **Add Shift Assignment**
2. Fill করুন:
   ```
   Employee: [Select Employee]
   Shift Type: Morning Shift
   Start Date: 2026-01-01
   End Date: [Leave blank for ongoing]
   Status: Active
   ```

3. **Save** এবং **Submit**

### 5.2 Default Shift (Alternative Method)

Employee record থেকে:

1. Employee open করুন
2. **Attendance and Leave Details** section
3. **Default Shift**: Select shift type
4. **Save**

### 5.3 Bulk Assignment

Multiple employees-কে same shift assign করার জন্য:

1. যান: **Shift Assignment Tool**
2. Filters:
   ```
   Company: [Your Company]
   Department: [Optional]
   Employee: [Optional - leave blank for all]
   ```
3. Select:
   ```
   Shift Type: Morning Shift
   Start Date: 2026-01-01
   ```
4. **Assign Shift** button click করুন

---

## 🔌 Step 6: Prime Attendance Integration

### 6.1 Configure in Prime Attendance

1. Prime Attendance portal-এ login করুন
2. যান: **Settings** → **ERPNext Integration**
3. Fill করুন:
   ```
   ERPNext URL: https://erp.yourcompany.com
   API Key: [From Step 1.3]
   API Secret: [From Step 1.3]
   Enable Integration: ✅
   ```
4. **Test Connection** button click করুন
5. **Save Settings**

### 6.2 Sync Employees

1. যান: **Employees** page
2. **Sync from ERPNext** button click করুন
3. Wait for sync to complete
4. Verify: Employee mappings created

### 6.3 Verify Device Configuration

1. যান: **Devices** page
2. প্রতিটি device verify করুন:
   ```
   Device Name: [Your Device]
   Serial Number: [Device SN]
   Status: Online
   Last Seen: [Recent timestamp]
   ```

---

## ✅ Step 7: Testing & Verification

### 7.1 Test Employee Checkin

1. Device থেকে একটি attendance punch করুন
2. Prime Attendance portal-এ **Attendance Logs** check করুন
3. Verify:
   ```
   User PIN: ✅ Correct
   Punched At: ✅ Correct time
   In/Out Mode: ✅ 0 (IN) or 1 (OUT)
   Sync Status: ✅ SYNCED
   ERPNext Checkin ID: ✅ CHK-XXXXX
   ```

### 7.2 Check ERPNext Employee Checkin

1. ERPNext-এ login করুন
2. যান: **Employee Checkin List**
3. Filter by employee
4. Verify checkin record exists:
   ```
   Employee: ✅ Correct
   Log Type: ✅ IN or OUT
   Time: ✅ Correct
   Device ID: ✅ Correct
   ```

### 7.3 Wait for Auto Attendance

⏰ **Important**: ERPNext runs auto-attendance scheduler **every hour**

Option 1 - Wait for Scheduler:
- Wait up to 1 hour
- Check **Attendance List**

Option 2 - Manual Trigger:
1. যান: **Shift Type** record
2. Scroll to bottom
3. **Process Auto Attendance** button click করুন
4. Wait for processing

### 7.4 Verify Attendance Created

1. যান: **Attendance List**
2. Filter:
   ```
   Employee: [Your test employee]
   Attendance Date: [Today's date]
   ```
3. Verify record exists:
   ```
   Status: Present / Half Day / Absent
   In Time: ✅ Correct
   Out Time: ✅ Correct (if checked out)
   Shift: Morning Shift
   ```

---

## 🐛 Troubleshooting

### Issue 1: Checkin Created but No Attendance

**Diagnosis:**
```bash
# Check shift configuration
Shift Type → Last Sync of Checkin → Is it recent?
```

**Solutions:**
1. Update **Last Sync of Checkin** to current time
2. Manually trigger: **Process Auto Attendance**
3. Verify employee has active shift assignment
4. Check ERPNext logs for errors

### Issue 2: "No ERPNext employee mapping"

**Solution:**
1. Prime Attendance → Employees → Sync from ERPNext
2. Or manually create mapping:
   ```
   PIN: 101
   Employee Name: John Doe
   ERPNext Employee ID: EMP-001
   ```

### Issue 3: Wrong Time Zone

**Check:**
```python
# In ERPNext console
from frappe.utils import now_datetime
print(now_datetime())
```

**Solution:**
1. যান: **System Settings**
2. **Time Zone**: Set correct timezone
3. Restart ERPNext

### Issue 4: Device Not Sending Data

**Diagnosis:**
1. Prime Attendance → Raw Events → Check device requests
2. Device → Settings → Server URL verify করুন

**Solution:**
```
Server URL: http://your-server:7788/iclock/cdata
Device SN: [Correct serial number]
```

### Issue 5: API Permission Denied

**Solution:**
1. User → Role → Verify permissions
2. Re-generate API keys
3. Update in Prime Attendance settings

---

## 📊 Monitoring & Maintenance

### Daily Checks

1. **Sync Status Dashboard**:
   - Prime Attendance → Dashboard
   - Check sync success rate

2. **Failed Syncs**:
   - Prime Attendance → Sync Status
   - Retry failed items

3. **Device Status**:
   - Verify all devices online
   - Check last seen timestamps

### Weekly Tasks

1. **Verification Report**:
   - Run attendance verification report
   - Check for checkins without attendance
   - Manually mark if needed

2. **Update Last Sync of Checkin**:
   - ERPNext → Shift Type
   - Update to current time
   - Prevents re-processing old checkins

### Monthly Tasks

1. **Employee Sync**:
   - Sync new employees from ERPNext
   - Verify attendance device IDs
   - Update mappings

2. **Audit Logs**:
   - Review attendance patterns
   - Check for anomalies
   - Generate reports

---

## 🔐 Security Best Practices

1. **API Credentials**:
   - Use dedicated API user
   - Rotate keys quarterly
   - Never commit keys to git

2. **Network Security**:
   - Use HTTPS for ERPNext
   - Firewall rules for device access
   - VPN for remote devices

3. **Access Control**:
   - Limit who can modify shift settings
   - Audit trail for attendance changes
   - Role-based permissions

---

## 📚 Reference Documentation

1. **Frappe HRMS Docs**: https://docs.frappe.io/hr
2. **Employee Checkin**: https://docs.frappe.io/hr/employee-checkin
3. **Auto Attendance**: https://docs.frappe.io/hr/using-auto-attendance
4. **API Documentation**: https://frappeframework.com/docs/user/en/api
5. **Prime Attendance**: Your internal documentation

---

## 📞 Support

### Common Commands

```bash
# Check ERPNext version
bench version

# Restart ERPNext
sudo supervisorctl restart all

# View logs
tail -f logs/web.error.log

# Database console
bench --site sitename console
```

### ERPNext Console Commands

```python
# Check shift type
frappe.get_doc("Shift Type", "Morning Shift")

# Process auto attendance manually
from hrms.hr.doctype.shift_type.shift_type import process_auto_attendance_for_all_shifts
process_auto_attendance_for_all_shifts()

# Check employee checkins
frappe.get_all("Employee Checkin", filters={"employee": "EMP-001"}, limit=10)
```

---

## ✅ Final Checklist

Before going live:

- [ ] API user created with correct permissions
- [ ] All employees added with Attendance Device ID
- [ ] Shift type configured with auto-attendance enabled
- [ ] "Last Sync of Checkin" updated
- [ ] All employees assigned to shifts
- [ ] Prime Attendance configured and tested
- [ ] Test checkin → attendance flow working
- [ ] Monitoring dashboard setup
- [ ] Team trained on troubleshooting
- [ ] Documentation shared with team

---

**Setup Date**: 2026-06-18
**Last Updated**: 2026-06-18
**Version**: 1.0
