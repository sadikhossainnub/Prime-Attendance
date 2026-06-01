# ERPNext Integration - Quick Start Guide

**For Developers & System Administrators**

---

## 5-Minute Setup

### 1. Database Migration
```bash
cd server
npx prisma migrate deploy
```

### 2. Start Server
```bash
npm run dev
```

### 3. Start Client
```bash
cd ../client
npm run dev
```

### 4. Login to Client Portal
- URL: `http://localhost:5173`
- Go to Settings tab
- Configure ERPNext

---

## Key Files

| File | Purpose |
|------|---------|
| `server/src/services/erpnext.ts` | Sync logic (tenant-level) |
| `server/src/routes/portal.ts` | API endpoints |
| `client/src/pages/Settings.tsx` | Configuration UI |
| `server/prisma/schema.prisma` | Database schema |
| `ERPNEXT_INTEGRATION_GUIDE.md` | User guide |

---

## API Endpoints

```bash
# Get settings
GET /api/portal/settings

# Update ERPNext config
PATCH /api/portal/settings/erpnext
{
  "enabled": true,
  "url": "https://erp.yourdomain.com",
  "apiKey": "key",
  "apiSecret": "secret"
}

# Retry failed syncs
POST /api/portal/sync-retry
```

---

## Data Flow

```
Device Punch
    ↓
POST /iclock/cdata (ATTLOG)
    ↓
ingestAttlog() → Create AttendanceLog
    ↓
queueAttendanceSync(logId)
    ↓
Fetch tenant's ERPNext config
    ↓
POST to ERPNext API
    ↓
Update syncStatus (SYNCED/FAILED)
```

---

## Debugging

### Check Sync Status
```bash
# Database
npx prisma studio
# Navigate to AttendanceLog
# Filter by syncStatus
```

### View Logs
```bash
npm run dev
# Look for [erpnext] messages
```

### Test Sync Manually
```bash
# Create test attendance log
# Check database for syncStatus
# Check ERPNext for Employee Checkin
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| Sync not happening | Check if ERPNext enabled in Settings |
| "Employee not found" | Verify employee mapping exists |
| "Invalid URL" | Ensure HTTPS, no trailing slash |
| "API error 401" | Regenerate API Key in ERPNext |

---

## Environment Variables

```env
# Optional - server-level defaults
ERPNEXT_ENABLED=false
ERPNEXT_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=
```

**Note:** Tenant config in database overrides these.

---

## Testing Checklist

- [ ] Database migrated
- [ ] Server builds
- [ ] Client builds
- [ ] Settings page loads
- [ ] ERPNext form displays
- [ ] Can save configuration
- [ ] Device punch creates attendance log
- [ ] Sync status updates
- [ ] Check ERPNext for Employee Checkin

---

## Useful Commands

```bash
# Regenerate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database
npx prisma studio

# Build server
npm run build

# Build client
cd ../client && npm run build

# Type check
npm run type-check
```

---

## Key Functions

### Backend

**queueAttendanceSync(logId)**
- Queues attendance for ERPNext sync
- Fetches tenant config from database
- Handles errors gracefully

**isErpnextEnabledForTenant(tenantId)**
- Checks if ERPNext enabled for tenant
- Returns boolean

### Frontend

**portalApi.updateErpnextConfig(config)**
- Sends PATCH request to backend
- Updates tenant's ERPNext settings

**portalApi.settings()**
- Gets current tenant settings
- Includes ERPNext config

---

## Database Schema

```sql
-- Tenant table (new columns)
erpnext_enabled BOOLEAN DEFAULT false
erpnext_url TEXT
erpnext_api_key TEXT
erpnext_api_secret TEXT

-- AttendanceLog table (existing)
sync_status ENUM (PENDING, SYNCED, FAILED, SKIPPED)
erpnext_checkin_id TEXT
synced_at TIMESTAMP
sync_error TEXT
```

---

## Sync Status Flow

```
PENDING → (sync attempt)
  ├─ Success → SYNCED
  └─ Error → FAILED

SKIPPED (ERPNext disabled or no mapping)
```

---

## Security Notes

- API credentials stored in database
- HTTPS required for ERPNext URL
- Only tenant admin can configure
- All sync attempts logged
- Error messages don't expose sensitive data

---

## Performance

- Sync is **asynchronous** (non-blocking)
- Batch retry: up to 100 logs
- Database indexes optimized
- Minimal overhead on device punch

---

## Monitoring

```bash
# Check sync status
SELECT syncStatus, COUNT(*) 
FROM attendance_logs 
GROUP BY syncStatus;

# Check failed syncs
SELECT id, syncError 
FROM attendance_logs 
WHERE syncStatus = 'FAILED' 
ORDER BY createdAt DESC;

# Check sync times
SELECT 
  punchedAt, 
  syncedAt, 
  EXTRACT(EPOCH FROM (syncedAt - punchedAt)) as sync_seconds
FROM attendance_logs 
WHERE syncStatus = 'SYNCED'
ORDER BY punchedAt DESC 
LIMIT 10;
```

---

## Deployment

1. Run migrations: `npx prisma migrate deploy`
2. Build server: `npm run build`
3. Build client: `npm run build`
4. Deploy to production
5. Verify ERPNext connectivity
6. Test with sample punch

---

## Support Resources

- `ERPNEXT_INTEGRATION_GUIDE.md` - Full user guide
- `ERPNEXT_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `README.md` - Project overview
- Server logs - Debug information

---

## Quick Reference

**Enable ERPNext for tenant:**
1. Settings tab
2. Check "Enable ERPNext Integration"
3. Enter URL, API Key, API Secret
4. Click Save

**Map employees:**
1. Employees page
2. Enter PIN, Name, ERPNext Employee ID
3. Save

**Test sync:**
1. Device punch
2. Check Attendance page
3. Verify Sync Status: SYNCED

**Retry failed syncs:**
1. Attendance page
2. Click "Sync Retry" button
3. Check status updates

---

**Last Updated:** June 1, 2026  
**Status:** Production Ready ✅

