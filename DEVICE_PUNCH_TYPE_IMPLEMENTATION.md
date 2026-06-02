# Device Punch Type Implementation - Complete

## Overview
Two different devices for IN/OUT punches - Device A only accepts IN, Device B only accepts OUT.

## Files Created

### 1. Database Migration
```
server/prisma/migrations/20260602200000_add_punch_type_to_devices/migration.sql
```
- Adds `punch_type` column to devices table
- PunchType options: BOTH, IN_ONLY, OUT_ONLY
- Default: BOTH (existing behavior)

### 2. Schema Update
```
server/prisma/schema.prisma
```
- Added `PunchType` enum
- Updated Device model with `punchType` field
- Added index on punch_type for filtering

### 3. Service Layer
```
server/src/services/devicePunchTypeService.ts
```
Functions:
- `shouldAcceptPunch()` - Validates if punch should be accepted
- `getRejectionReason()` - Human-readable rejection message
- `getPunchTypeLabel()` - UI label for punch type
- `getPunchDirectionLabel()` - IN/OUT label

### 4. Middleware
```
server/src/middleware/punchTypeValidator.ts
```
- Validates punch against device configuration
- Rejects incompatible punches (e.g., OUT punch on IN-only device)
- Logs rejections to database for debugging
- Returns 403 with reason to device

### 5. API Routes
```
server/src/routes/deviceManagementRoutes.ts
```
Endpoints:
- GET `/api/admin/devices` - List all devices
- GET `/api/admin/devices/:id` - Device details
- PUT `/api/admin/devices/:id` - Update device (including punch_type)
- GET `/api/admin/devices/by-punch-type/:type` - Filter by type
- POST `/api/admin/devices/bulk-update-punch-type` - Bulk update multiple devices

### 6. Frontend Component
```
client/src/components/DevicePunchTypeSelector.tsx
```
Components:
- `DevicePunchTypeSelector` - Radio button selector
- `DevicePunchTypeBadge` - Visual badge (🔓 IN Only, 🚪 OUT Only, etc.)

### 7. Admin Page
```
client/src/pages/admin/Devices.tsx
```
Features:
- List all devices with punch type
- Filter by punch type (ALL, IN_ONLY, OUT_ONLY, BOTH)
- Edit punch type for individual devices
- Bulk update multiple devices
- View online/offline status
- Statistics dashboard

## How It Works

### Setup Example

**Device A (Gate Entrance):**
```
Serial: ABC123
Name: Main Gate IN
Punch Type: IN_ONLY
```
✅ Accepts: IN punches only
❌ Rejects: OUT punches (will log error)

**Device B (Gate Exit):**
```
Serial: XYZ789
Name: Exit Gate OUT
Punch Type: OUT_ONLY
```
✅ Accepts: OUT punches only
❌ Rejects: IN punches (will log error)

### Punch Flow

1. **Employee enters → Punches on Device A (IN_ONLY)**
   ```
   Device A receives punch with inOutMode=0 (IN)
   → Validates: Device A is IN_ONLY and punch is IN ✓
   → Saves to database
   ```

2. **Employee exits → Punches on Device B (OUT_ONLY)**
   ```
   Device B receives punch with inOutMode=1 (OUT)
   → Validates: Device B is OUT_ONLY and punch is OUT ✓
   → Saves to database
   ```

3. **System calculates daily attendance**
   ```
   Gets both IN and OUT punches from different devices
   Merges them for a complete attendance record
   Status: Present (has IN), Duration calculated
   ```

### Attendance Calculation

```typescript
const inPunches = attendance.filter(p => p.inOutMode === 0);
const outPunches = attendance.filter(p => p.inOutMode === 1);

// Present = has at least one IN punch
if (inPunches.length > 0) {
  status = 'PRESENT';
}

// Complete punch = has both IN and OUT
if (inPunches.length > 0 && outPunches.length > 0) {
  duration = lastOut - firstIn;
}

// OT = OUT after shift end
if (lastOut > shiftEnd) {
  otHours = calculateOT(lastOut, shiftEnd);
}
```

## API Usage Examples

### Update Single Device
```bash
curl -X PUT http://localhost:7788/api/admin/devices/device-id \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Gate IN",
    "punchType": "IN_ONLY"
  }'
```

### Get IN-Only Devices
```bash
curl http://localhost:7788/api/admin/devices/by-punch-type/IN_ONLY \
  -H "Authorization: Bearer TOKEN"
```

### Bulk Update Multiple Devices
```bash
curl -X POST http://localhost:7788/api/admin/devices/bulk-update-punch-type \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIds": ["device-1", "device-2", "device-3"],
    "punchType": "IN_ONLY"
  }'
```

## Admin UI

### Device Management Page
- List view with inline editing
- Filter by punch type
- Visual badges for quick identification
- Statistics showing device distribution
- Online/offline status indicator

## Logging & Debugging

Rejected punches are logged:
```
[PUNCH_TYPE_REJECT] Device ABC123 (IN_ONLY): OUT punch rejected - This device is configured for IN punches only
```

Stored in `device_raw_events` table for debugging.

## Implementation Checklist

- ✅ Database migration created
- ✅ Prisma schema updated
- ✅ Service layer implemented
- ✅ Validation middleware created
- ✅ API routes implemented
- ✅ Frontend component created
- ✅ Admin page created
- ✅ Error handling added
- ✅ Logging implemented
- ✅ Documentation created

## Next Steps

1. Run migration:
   ```bash
   cd server && npx prisma migrate deploy
   ```

2. Register middleware in Express app:
   ```typescript
   app.post('/iclock/cdata', validatePunchType, iclockHandler);
   ```

3. Register API routes:
   ```typescript
   app.use('/api/admin/devices', deviceManagementRoutes);
   ```

4. Add admin page to routing:
   ```typescript
   <Route path="/admin/devices" element={<AdminDevicesPage />} />
   ```

5. Test with two devices:
   - Device 1: Set to IN_ONLY
   - Device 2: Set to OUT_ONLY
   - Employee punches at both gates
   - Verify attendance shows both IN and OUT times

## Advantages

✅ **Clear Separation** - Know which gate is IN, which is OUT
✅ **Data Integrity** - No confusion about punch direction
✅ **Traffic Control** - Employees use designated IN/OUT gates
✅ **Error Prevention** - Device rejects wrong punch type
✅ **Flexible** - Can set all devices to BOTH if needed
✅ **Scalable** - Support multiple IN and multiple OUT devices

## Status

🟢 Implementation Complete
Ready to deploy and test!
