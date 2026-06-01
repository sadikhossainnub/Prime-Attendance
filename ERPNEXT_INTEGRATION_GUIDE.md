# ERPNext Integration Guide

## Overview

**Tenant-level ERPNext integration** যা client portal-এর Settings tab-এ configure করা যায়।

- **Default:** Disabled (ERPNEXT_ENABLED=false)
- **Configuration:** Per-tenant (প্রতিটি client আলাদা ERPNext account ব্যবহার করতে পারে)
- **Data Sync:** Attendance logs automatically sync হয় ERPNext-এ

---

## Architecture

```
Device → Prime Attendance → ERPNext
  ↓           ↓              ↓
Punch    Attendance Log   Employee Checkin
         (with sync status)
```

### Data Flow

1. **Device** পাঞ্চ পাঠায় → Prime Attendance
2. **Attendance Log** তৈরি হয় (syncStatus: PENDING)
3. **ERPNext enabled** থাকলে → Background job sync করে
4. **Employee Checkin** তৈরি হয় ERPNext-এ
5. **syncStatus** update হয় (SYNCED/FAILED)

---

## Setup Steps

### Step 1: ERPNext Account প্রস্তুত করুন

1. ERPNext login করুন
2. **User Settings** → **API Access**
3. **Generate API Key** ক্লিক করুন
4. **API Key** এবং **API Secret** copy করুন

### Step 2: Client Portal-এ Configure করুন

1. Client login করুন
2. **Settings** tab খুলুন
3. **ERPNext Integration** section-এ:
   - ✓ **Enable ERPNext Integration** checkbox
   - **ERPNext URL:** `https://erp.yourdomain.com`
   - **API Key:** Paste করুন
   - **API Secret:** Paste করুন
4. **Save ERPNext Configuration** ক্লিক করুন

### Step 3: Employee Mapping করুন

1. **Employees** page খুলুন
2. প্রতিটি employee-র জন্য:
   - **PIN:** Device-এ যে PIN আছে
   - **Name:** Employee name
   - **ERPNext Employee ID:** ERPNext-এ employee ID
3. Save করুন

### Step 4: Test করুন

1. Device-এ পাঞ্চ দিন
2. **Attendance** page-এ দেখুন
3. **Sync Status** দেখুন:
   - ✓ SYNCED = ERPNext-এ গেছে
   - ✗ FAILED = Error আছে
   - ⏳ PENDING = Sync হচ্ছে

---

## Configuration Details

### ERPNext URL

**Format:**
```
https://erp.yourdomain.com
```

**গুরুত্বপূর্ণ:**
- HTTPS ব্যবহার করুন
- Trailing slash নেই
- Valid domain হতে হবে

### API Key & Secret

**কীভাবে পাবেন:**

1. ERPNext login করুন
2. User icon → **Set User Permissions**
3. **API Access** section
4. **Generate API Key** ক্লিক করুন
5. Key এবং Secret copy করুন

**নিরাপত্তা:**
- Secret গোপন রাখুন
- Production-এ strong credentials ব্যবহার করুন
- Regular basis-এ rotate করুন

---

## Employee Mapping

### কেন প্রয়োজন?

Device-এ PIN থাকে, কিন্তু ERPNext-এ Employee ID থাকে। Mapping দিয়ে দুটো connect করি।

### কীভাবে করবেন?

1. **Employees** page খুলুন
2. **PIN:** Device-এ যে PIN আছে (যেমন: 101)
3. **Name:** Employee name (যেমন: আহমেদ)
4. **ERPNext Employee ID:** ERPNext-এ employee ID (যেমন: EMP-001)
5. Save করুন

### Example

```
PIN: 101
Name: আহমেদ আলী
ERPNext Employee ID: EMP-001
```

---

## Sync Status

### PENDING
- Attendance log তৈরি হয়েছে
- ERPNext-এ sync হওয়ার জন্য অপেক্ষা করছে
- Background job sync করবে

### SYNCED
- ✓ ERPNext-এ Employee Checkin তৈরি হয়েছে
- সফল sync

### FAILED
- ✗ ERPNext-এ sync হতে পারেনি
- Error message দেখুন
- **Sync Retry** ক্লিক করুন

### SKIPPED
- Employee mapping নেই
- ERPNext Employee ID set করুন

---

## Troubleshooting

### Issue: "Invalid ERPNext URL"

**সমাধান:**
- URL check করুন: `https://erp.yourdomain.com`
- Trailing slash নেই
- HTTPS ব্যবহার করুন

### Issue: "API Key/Secret invalid"

**সমাধান:**
- ERPNext-এ API Key regenerate করুন
- সঠিক key/secret paste করুন
- Copy-paste error check করুন

### Issue: "Employee not found"

**সমাধান:**
- ERPNext Employee ID ঠিক আছে কিনা check করুন
- Employee mapping করুন
- ERPNext-এ employee exist করে কিনা check করুন

### Issue: Sync fail হচ্ছে

**সমাধান:**
1. **Sync Status** দেখুন
2. Error message পড়ুন
3. **Sync Retry** ক্লিক করুন
4. Server logs দেখুন

---

## API Endpoints

### Get Settings (with ERPNext config)

```
GET /api/portal/settings
Authorization: Bearer <token>

Response:
{
  "id": "...",
  "slug": "...",
  "name": "...",
  "erpnextEnabled": true,
  "erpnextUrl": "https://erp.yourdomain.com",
  "erpnextApiKey": "...",
  "erpnextApiSecret": "..."
}
```

### Update ERPNext Config

```
PATCH /api/portal/settings/erpnext
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "enabled": true,
  "url": "https://erp.yourdomain.com",
  "apiKey": "your_api_key",
  "apiSecret": "your_api_secret"
}

Response:
{
  "id": "...",
  "erpnextEnabled": true,
  "erpnextUrl": "https://erp.yourdomain.com",
  ...
}
```

---

## Database Schema

### Tenant Table (New Fields)

```sql
ALTER TABLE tenants ADD COLUMN erpnext_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN erpnext_url TEXT;
ALTER TABLE tenants ADD COLUMN erpnext_api_key TEXT;
ALTER TABLE tenants ADD COLUMN erpnext_api_secret TEXT;
```

### AttendanceLog Table (Existing Fields)

```sql
erpnextCheckinId  -- ERPNext Checkin ID
syncStatus        -- PENDING, SYNCED, FAILED, SKIPPED
syncedAt          -- Last sync timestamp
syncError         -- Error message if failed
```

---

## Environment Variables

### Server-level (Optional)

```env
# Global ERPNext settings (if not using tenant-level)
ERPNEXT_ENABLED=false
ERPNEXT_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
```

**নোট:** Tenant-level config override করে server-level config।

---

## Features

### ✅ Implemented

- [x] Tenant-level ERPNext configuration
- [x] Settings UI for ERPNext setup
- [x] Employee mapping (PIN ↔ ERPNext Employee ID)
- [x] Attendance sync to ERPNext
- [x] Sync status tracking (PENDING, SYNCED, FAILED, SKIPPED)
- [x] Sync retry functionality
- [x] Error logging

### 🔄 Future Enhancements

- [ ] Bulk sync retry
- [ ] Sync history/logs
- [ ] Webhook for real-time sync
- [ ] Multiple ERPNext instances per tenant
- [ ] Custom field mapping
- [ ] Attendance approval workflow

---

## Security

### Best Practices

1. **API Credentials:**
   - Never share API Key/Secret
   - Use strong credentials
   - Rotate regularly

2. **HTTPS Only:**
   - Always use HTTPS for ERPNext URL
   - Never use HTTP in production

3. **Access Control:**
   - Only tenant admin can configure ERPNext
   - Credentials stored encrypted in database

4. **Audit Trail:**
   - All sync attempts logged
   - Error messages recorded
   - Sync status tracked

---

## Monitoring

### Check Sync Status

```bash
# Database query
SELECT 
  id, 
  userPin, 
  punchedAt, 
  syncStatus, 
  syncError 
FROM attendance_logs 
WHERE tenantId = 'YOUR_TENANT_ID' 
ORDER BY punchedAt DESC 
LIMIT 10;
```

### Server Logs

```bash
npm run dev

# Look for:
# [erpnext] Syncing attendance log...
# [erpnext] Sync successful: checkinId=...
# [erpnext] Sync failed: error=...
```

---

## Example Workflow

### Scenario: New Employee Joins

1. **ERPNext-এ Employee তৈরি করুন**
   - Employee ID: EMP-001
   - Name: আহমেদ আলী

2. **Device-এ PIN set করুন**
   - PIN: 101

3. **Prime Attendance-এ Mapping করুন**
   - PIN: 101
   - Name: আহমেদ আলী
   - ERPNext Employee ID: EMP-001

4. **Device-এ পাঞ্চ দিন**
   - Device PIN 101 দিয়ে পাঞ্চ করুন

5. **Verify করুন**
   - Attendance page-এ দেখুন
   - Sync Status: SYNCED
   - ERPNext-এ Employee Checkin তৈরি হয়েছে

---

## FAQ

### Q: ERPNext ছাড়াই কাজ করবে?
**A:** হ্যাঁ, ERPNext optional। Disabled রাখলে শুধু Prime Attendance-এ attendance থাকবে।

### Q: Multiple ERPNext instances ব্যবহার করতে পারি?
**A:** এখন না, কিন্তু future version-এ থাকবে।

### Q: Sync fail হলে কী হবে?
**A:** Attendance log থাকবে, কিন্তু ERPNext-এ যাবে না। Sync Retry করুন।

### Q: API Key compromise হলে?
**A:** ERPNext-এ API Key regenerate করুন এবং Prime Attendance-এ update করুন।

### Q: Sync কত সময় লাগে?
**A:** সাধারণত ১-২ মিনিট। Network speed-এর উপর নির্ভর করে।

---

## Support

### Troubleshooting Checklist

- [ ] ERPNext URL valid?
- [ ] API Key/Secret correct?
- [ ] Employee mapping done?
- [ ] Network connectivity OK?
- [ ] ERPNext server running?
- [ ] Credentials not expired?

### Debug Mode

```bash
# Server logs দেখুন
npm run dev

# Database check করুন
npx prisma studio

# Raw events দেখুন
# UI → Raw Events
```

---

## Next Steps

1. ERPNext account প্রস্তুত করুন
2. Client portal-এ configure করুন
3. Employee mapping করুন
4. Test করুন
5. Monitor করুন

---

## References

- [ERPNext API Documentation](https://frappeframework.com/docs/user/en/api)
- [Employee Checkin DocType](https://erpnext.com/docs/user/manual/en/human-resources/employee-checkin)
- [Prime Attendance README](./README.md)
