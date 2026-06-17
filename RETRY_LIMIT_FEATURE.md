# 🚫 Retry Limit Feature - No Infinite Retries

## Problem Solved:
আগে যদি একবার data push failed হত, তাহলে বারবার retry হত। এটা সময় নষ্ট এবং server load বাড়াত।

## Solution:
**Maximum 3 retry attempts per log**
- 1st attempt fails → status: FAILED (retry #1)
- 2nd attempt fails → status: FAILED (retry #2)
- 3rd attempt fails → status: **PERMANENTLY_FAILED** (no more retries)

---

## 🔧 Technical Implementation

### 1. Database Changes

#### New Enum Value:
```sql
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'PERMANENTLY_FAILED';
```

#### New Field:
```sql
ALTER TABLE "attendance_logs" ADD COLUMN "sync_retry_count" INTEGER NOT NULL DEFAULT 0;
```

**Status Flow:**
```
PENDING → FAILED (retry 1) → FAILED (retry 2) → PERMANENTLY_FAILED (stop)
         ↘ SYNCED (success - reset retry count to 0)
```

---

### 2. Backend Logic (`server/src/services/erpnext.ts`)

```typescript
export async function queueAttendanceSync(logId: string, maxRetries: number = 3)
```

**Features:**
- ✅ Checks retry count before attempting sync
- ✅ Auto-marks as PERMANENTLY_FAILED after 3 failures
- ✅ Resets retry count to 0 on successful sync
- ✅ Detailed logging with retry attempt number
- ✅ Different log messages for FAILED vs PERMANENTLY_FAILED

**Behavior:**
```typescript
if (log.syncRetryCount >= 3) {
  // Stop retrying
  syncStatus = "PERMANENTLY_FAILED"
  syncError = "Max retry limit exceeded (3 attempts)"
}
```

---

### 3. API Updates

#### Sync Status Endpoint (`GET /api/portal/sync-status`)
Added new field:
```json
{
  "totalLogs": 1000,
  "synced": 950,
  "pending": 10,
  "failed": 30,
  "permanentlyFailed": 10,  // ← NEW
  "skipped": 0,
  "recentLogs": [
    {
      "syncStatus": "PERMANENTLY_FAILED",
      "syncRetryCount": 3,  // ← NEW
      "syncError": "Max retry limit exceeded..."
    }
  ]
}
```

#### Retry Endpoint (`POST /api/portal/sync-retry`)
Updated behavior:
- ✅ Retries only **FAILED** and **PENDING** logs
- ❌ Does NOT retry **PERMANENTLY_FAILED** logs
- ℹ️ Message: "Excluding permanently failed"

---

### 4. Frontend UI (`client/src/pages/SyncStatus.tsx`)

#### New Stats Card:
```
🚫 Permanent Fail
   10
   Max retries (3×)
```

#### Updated Table:
Added **Retries** column showing retry count:
- `0/3` - No retries yet
- `1/3` - First retry (orange)
- `2/3` - Second retry (orange)
- `3/3` - Permanently failed (gray)

#### New Badge:
```
🚫 Permanent Fail (gray badge)
```

#### Updated Help Section:
Explains retry logic in Bengali with clear examples.

---

## 📊 User Experience

### Before (Old Behavior):
```
Log fails → Retry → Fails again → Retry → Fails again → Retry → ...
∞ infinite loop ❌
```

### After (New Behavior):
```
Log fails → Retry #1 → Fails → Retry #2 → Fails → Retry #3 → STOP ✅
Permanently failed - manual intervention needed
```

---

## 🎯 Use Cases

### Case 1: Temporary Network Issue
```
Attempt 1: FAILED (network timeout)
Attempt 2: SYNCED ✅ (network recovered)
Retry count reset to 0
```

### Case 2: Wrong Employee Mapping
```
Attempt 1: FAILED (employee not found)
Attempt 2: FAILED (employee not found)
Attempt 3: FAILED (employee not found)
Status: PERMANENTLY_FAILED 🚫
→ Admin needs to fix employee mapping
```

### Case 3: ERPNext Server Down
```
Attempt 1: FAILED (connection refused)
Attempt 2: FAILED (connection refused)
Attempt 3: FAILED (connection refused)
Status: PERMANENTLY_FAILED 🚫
→ Admin needs to check ERPNext server
```

---

## 🔍 Monitoring

### Stats Overview:
- **Total Logs**: All attendance logs
- **Synced**: Successfully synced (✅ green)
- **Pending**: Waiting for sync (⏳ yellow)
- **Failed**: Will retry (❌ red) - max 3 attempts
- **Permanent Fail**: Stopped retrying (🚫 gray)
- **Skipped**: ERPNext disabled (⊘ slate)

### Retry All Button:
- Only retries **FAILED** logs (not permanently failed)
- Shows count: "Triggered sync retry for X logs (excluding permanently failed)"

---

## 🛠️ Manual Fix Process

### For Permanently Failed Logs:

1. **Check Error Message:**
   - Click on log in table to see full error
   - Common errors:
     - "No ERPNext employee mapping for PIN xxx"
     - "ERPNext API error 404: Employee not found"
     - "Connection refused"

2. **Fix Root Cause:**
   - **Employee mapping issue**: Add mapping in Employees page
   - **ERPNext config issue**: Check Settings → ERPNext configuration
   - **Network issue**: Check ERPNext server connectivity

3. **Reset and Retry:**
   Currently, permanently failed logs cannot be auto-retried.
   
   **Options:**
   a) Manual database update (advanced):
   ```sql
   UPDATE attendance_logs 
   SET sync_status = 'FAILED', 
       sync_retry_count = 0 
   WHERE sync_status = 'PERMANENTLY_FAILED';
   ```
   
   b) Delete and re-sync (if data is re-ingestable)
   
   c) Manual ERPNext entry (last resort)

---

## 📈 Benefits

1. **No Infinite Loops** ✅
   - Fixed maximum 3 retries
   - Prevents server overload

2. **Clear Status** ✅
   - Easy to identify permanently failed logs
   - Retry count visible in UI

3. **Resource Efficient** ✅
   - Stops wasting CPU on hopeless retries
   - Focuses resources on fixable issues

4. **Better UX** ✅
   - Admin knows what needs manual attention
   - Clear separation: auto-retry vs manual fix

5. **Faster Bulk Sync** ✅
   - Doesn't waste time on permanently failed logs
   - Combined with batch processing = super fast

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Admin button to reset permanently failed logs
- [ ] Configurable max retry count (default 3)
- [ ] Email notification for permanently failed logs
- [ ] Automatic reset after admin fixes issue
- [ ] Bulk reset permanently failed logs
- [ ] Export permanently failed logs to CSV

---

## 📝 Migration

### Run Migration:
```bash
# Migration will run automatically on Docker restart
docker compose up -d
```

### Manual Migration (if needed):
```bash
cd server
npx prisma migrate deploy
```

The migration adds:
1. `PERMANENTLY_FAILED` enum value to `SyncStatus`
2. `sync_retry_count` integer field (default 0)

**Backward Compatible:** ✅
- Existing logs get `sync_retry_count = 0`
- Old statuses remain unchanged
- No data loss

---

## 🎉 Summary

**Before:**
- ❌ Infinite retries
- ❌ Server overload
- ❌ No way to identify hopeless failures

**After:**
- ✅ Maximum 3 retries
- ✅ Clear PERMANENTLY_FAILED status
- ✅ Retry count visible
- ✅ "Retry All" excludes permanently failed
- ✅ Better resource usage

**Combined with Batch Processing:**
- 🚀 20x faster bulk sync
- 🚫 No infinite retry loops
- 💪 Production-ready ERPNext integration

---

Generated: 2026-06-17
