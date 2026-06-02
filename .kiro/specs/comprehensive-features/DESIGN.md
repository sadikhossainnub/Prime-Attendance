# Prime Attendance: System Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │  Admin Panel │ Client Portal│  ESS Portal  │             │
│  └──────────────┴──────────────┴──────────────┘             │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (JWT Auth)
┌────────────────────────▼────────────────────────────────────┐
│                 Express API Server (Node.js)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Auth Service      │  Device Handler (ZKTeco)         │  │
│  │  Attendance Engine │  Shift Calc Service              │  │
│  │  Leave Processor   │  OT Calculator                   │  │
│  │  Approval Engine   │  Report Generator                │  │
│  │  Payroll Exporter  │  Notification Service            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ SQL (Prisma ORM)
┌────────────────────────▼────────────────────────────────────┐
│              PostgreSQL Database                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Users │ Tenants │ Devices │ Attendance │ Leaves    │   │
│  │ Shifts│ Rosters │ OT Reqs │ Approvals  │ Depts    │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Extended)

### Core Tables (Existing)
- **users** - Authentication & authorization
- **tenants** - Multi-tenant isolation
- **devices** - ZKTeco device registry
- **attendance_logs** - Raw punch data
- **employee_mappings** - PIN to employee mapping
- **device_users** - Employee-device enrollment

### New Tables to Add

```sql
-- Organizational Structure
departments (
  id, tenantId, parentDepartmentId (nullable), 
  name, code, managerId (foreign: users.id), 
  createdAt, updatedAt
)

locations (
  id, tenantId, name, city, state, country,
  contactPerson, phone, email, createdAt, updatedAt
)

designations (
  id, tenantId, name, level (1-5), createdAt, updatedAt
)

-- User Extensions
user_details (
  id, userId (fk), departmentId (fk), designationId (fk),
  locationId (fk), managerId (fk), joinDate, activeStatus,
  costCenter, createdAt, updatedAt
)

-- Shift Management
shifts (
  id, tenantId, name, shiftType (FIXED/ROTATIONAL/AUTO/FLEXIBLE),
  startTime, endTime, breakDuration, 
  weeklyOff (JSON: [0-6]), effectiveFrom, effectiveTill,
  createdAt, updatedAt
)

shift_assignments (
  id, tenantId, employeeId (fk: user), shiftId (fk),
  effectiveFrom, effectiveTill, createdAt, updatedAt
)

-- Leave Management
leave_types (
  id, tenantId, name, defaultDays, isCumulative, 
  carryoverLimit, maxDays, createdAt, updatedAt
)

leave_requests (
  id, tenantId, employeeId (fk: user), leaveTypeId (fk),
  fromDate, toDate, reason, status (PENDING/APPROVED/REJECTED),
  approvedBy (fk: user), approvedAt, createdAt, updatedAt
)

leave_balances (
  id, tenantId, employeeId (fk), leaveTypeId (fk), year,
  credited, used, available, lastUpdated, updatedAt
)

-- Overtime Management
ot_requests (
  id, tenantId, employeeId (fk), requestDate, otHours,
  reason, calculationMethod (AUTO/MANUAL), status,
  approvedBy (fk), approvedAt, remarks, createdAt, updatedAt
)

-- Attendance Corrections
attendance_corrections (
  id, tenantId, employeeId (fk), attendanceLogId (fk),
  correctType (IN_TIME/OUT_TIME/FULL_DAY), 
  originalTime, correctedTime, reason, 
  evidenceUrl, status (PENDING/APPROVED/REJECTED),
  approvedBy (fk), approvedAt, createdAt, updatedAt
)

-- Approval Workflows
approval_workflows (
  id, tenantId, entityType (LEAVE/OT/CORRECTION),
  departmentId (nullable), sequence (1/2/3),
  approverRole, escalateAfterDays, createdAt, updatedAt
)

approval_logs (
  id, tenantId, entityType, entityId, step, 
  approver (fk: user), action (PENDING/APPROVED/REJECTED),
  remarks, createdAt, updatedAt
)

-- Device Commands
device_commands (
  id, tenantId, deviceId (fk), commandType 
  (REBOOT/TIME_SYNC/USER_SYNC/PARAM_UPDATE),
  parameters (JSON), status (PENDING/EXECUTED/FAILED),
  result, executedAt, createdAt, updatedAt
)

-- Device Sync Tracking
device_sync_status (
  id, deviceId (fk), syncType (USER/BIOMETRIC/CARD),
  totalCount, syncedCount, failedCount, lastSyncedAt,
  nextScheduledSync, status, updatedAt
)

-- Reports & Exports
payroll_exports (
  id, tenantId, periodStart, periodEnd, employeeCount,
  format (CSV/EXCEL/JSON), exportedBy (fk), 
  fileUrl, createdAt
)

custom_reports (
  id, tenantId, name, reportType, filters (JSON),
  schedule (MANUAL/DAILY/WEEKLY/MONTHLY),
  lastRun, nextRun, createdAt, updatedAt
)

-- Audit Trail
audit_logs (
  id, tenantId, userId (fk), entityType, entityId,
  action (CREATE/UPDATE/DELETE), changeLog (JSON),
  timestamp
)
```

---

## Business Logic Flow

### 1. Attendance Calculation Pipeline

```
Device ATTLOG Push
    ↓
Parse & Extract (PIN, DateTime, DeviceSN)
    ↓
Find EmployeeMapping (PIN → Employee)
    ↓
Fetch Employee's Shift for Date
    ↓
Get Shift Rules (grace period, etc.)
    ↓
Determine Status:
  • Compare punch vs shift timing
  • Calculate late minutes, early leave
  • Check for duplicate punch (5-min window)
  • Flag missing in/out
    ↓
Update AttendanceLog with Status
    ↓
[Daily Job] Aggregate Daily Status (P/A/L)
    ↓
[Monthly Job] Generate Monthly Summary
```

### 2. Leave Application & Approval

```
Employee Submit Leave Request
    ↓
System validates:
  • Check leave balance
  • Check shift on date (is work day?)
  • Check no overlapping approved leaves
    ↓
Auto-deduct from balance (or PENDING if balance low)
    ↓
Route to Manager (Approver Chain)
    ↓
Manager Approves/Rejects
    ↓
[If Rejected] Restore balance
    ↓
Generate Approval Log & Email Notification
    ↓
[If Approved] Mark attendance as Leave for date
```

### 3. OT Calculation & Approval

```
[On Daily Job] After Attendance Calculated
    ↓
For each employee with work hours > shift end
    ↓
Calculate OT hours:
  • 18:00-22:00 = 1.5x multiplier
  • >22:00 = 2x multiplier
    ↓
Create OT_REQUEST with AUTO status
    ↓
Manager Reviews (can approve/adjust/reject)
    ↓
On Approval, flag for payroll inclusion
    ↓
Monthly OT summary for finance
```

### 4. Approval Workflow Engine

```
Request Submitted (Leave/OT/Correction)
    ↓
Fetch ApprovalWorkflow config for entity type + department
    ↓
Identify Approver #1 (e.g., Immediate Manager)
    ↓
Notify & Wait for Approval
    ↓
If Approved & More Steps → Route to Next Approver
    ↓
If Rejected → Notify Submitter, Revert State
    ↓
If No Response After N Days → Escalate (notify HR)
    ↓
Mark Complete in Approval Log
```

### 5. Shift Assignment & Roster

```
Admin Creates Shift (Fixed/Flexible/Rotational)
    ↓
Admin Bulk Assigns Shift to Department/Employees
    ↓
ShiftAssignment created with effectiveFrom date
    ↓
[Automatic] On each day, fetch employee's active shift
    ↓
Use shift timing for attendance calculation
    ↓
Employees can view shift roster (1 month ahead)
    ↓
Employee requests shift change → Manager approves
    ↓
New ShiftAssignment created effective from date
```

### 6. Report Generation

```
User Selects Report Type (Daily/Monthly/OT)
    ↓
Provide Filters (Date range, Department, Employee)
    ↓
Execute Query:
  • Group by date/employee
  • Aggregate attendance status
  • Calculate summary metrics
    ↓
Format Output (CSV/Excel/PDF)
    ↓
Return File or Email Link
```

---

## API Endpoint Design

### Authentication
```
POST /api/auth/login
  → { email, password }
  ← { token, user, role, tenant }

GET /api/auth/me
  (Bearer token required)
  ← { user, permissions }
```

### ESS Portal
```
GET /api/ess/dashboard
  ← { presentDays, absentDays, lateDays, otHours, leaveBalance }

GET /api/ess/attendance?month=2026-06
  ← [ { date, status, inTime, outTime, shiftStart, shiftEnd, lateMinutes } ]

GET /api/ess/leave-balance
  ← [ { leaveType, credited, used, available, carryover } ]

POST /api/ess/leave-request
  { leaveTypeId, fromDate, toDate, reason }
  ← { requestId, status: PENDING }

GET /api/ess/leave-requests
  ← [ { id, type, dates, status, approvedAt, remarks } ]

POST /api/ess/ot-request
  { otDate, hours, reason }
  ← { requestId, status: AUTO }

POST /api/ess/attendance-correction
  { attendanceLogId, correctType, correctedTime, reason, evidence }
  ← { correctionId, status: PENDING }
```

### Manager Approvals
```
GET /api/manager/approvals/pending
  ← [ { id, type, employeeId, submittedAt, requestData } ]

POST /api/manager/approvals/:id/approve
  { remarks }
  ← { status: APPROVED }

POST /api/manager/approvals/:id/reject
  { remarks }
  ← { status: REJECTED }
```

### Reports
```
GET /api/reports/attendance-daily?fromDate=2026-06-01&toDate=2026-06-30
  ← [ CSV/PDF data ]

GET /api/reports/attendance-monthly?month=2026-06&departmentId=X
  ← [ { employee, presentDays, absentDays, lateDays } ]

GET /api/reports/ot?month=2026-06
  ← [ { employee, totalOT, approved, pending, amount } ]

GET /api/reports/leave?month=2026-06
  ← [ { employee, leaveType, taken, balance, carryover } ]

POST /api/reports/export
  { reportType, filters, format: CSV/EXCEL/PDF }
  ← { fileUrl, expiresIn }
```

### Device Management
```
GET /api/devices?locationId=X&status=online
  ← [ { id, sn, name, lastSeen, status, userCount } ]

POST /api/devices/:id/commands
  { commandType: REBOOT|TIME_SYNC|USER_SYNC, parameters }
  ← { commandId, status: PENDING }

GET /api/devices/:id/sync-status
  ← { userSync: { total, synced, failed }, biometricSync, cardSync }

GET /api/devices/:id/commands?status=executed
  ← [ { id, type, result, executedAt } ]
```

### Admin Configuration
```
GET /api/admin/config/shifts
  ← [ { id, name, type, timing } ]

POST /api/admin/config/shifts
  { name, type, startTime, endTime, weeklyOff }
  ← { shiftId }

GET /api/admin/config/leave-types
  ← [ { id, name, days, cumulative } ]

GET /api/admin/config/departments?parentId=X
  ← [ { id, name, managerId, managerName } ]

POST /api/admin/config/approval-workflows
  { entityType, department, approverRole, escalateAfterDays }
  ← { workflowId }
```

---

## Key Design Decisions

### 1. Multi-Tenancy
- All queries filtered by `tenantId`
- Database-level isolation (no row-level security, but careful filtering)
- Tenant context passed in JWT token

### 2. Attendance Status Calculation
- Status determined at punch time, not post-processed
- Nightly job for missing punch detection
- Weekly job for leave balance updates

### 3. Shift Flexibility
- Fixed: Hard times (09:00-17:30)
- Flexible: Range (09:00-11:00 start, 17:00-19:00 end)
- Rotational: Week-based rotation pattern
- Auto: AI-calculated from historical punches

### 4. Approval Chain
- Configurable by Entity Type + Department
- Sequential steps (Step 1 → Step 2 → Complete)
- Escalation on timeout (auto-notify HR)
- Audit trail in `approval_logs` table

### 5. Performance Optimization
- Index on `tenantId, punchedAt` for monthly reports
- Paginated ESS portal (20 items per page)
- Report aggregation jobs run nightly
- Device status update cached (5-min TTL)

### 6. Email Notifications
- Integration with SMTP (via `.env` config)
- Template-based (leave submitted, approved, rejected, etc.)
- Batch notifications (digest email once/day)
- Retry logic for failed sends

---

## Frontend Structure

### Pages to Add

**Admin Portal**
- `/admin/shifts` - Shift management
- `/admin/leave-types` - Leave configuration
- `/admin/departments` - Org hierarchy
- `/admin/approvals` - Approval workflow config
- `/admin/devices` - Device commands & sync
- `/admin/reports` - Report templates

**Client Portal (Tenant Admin)**
- `/portal/shifts` - Assign shifts to employees
- `/portal/employees` - Bulk import, sync to devices
- `/portal/approvals/pending` - Review submissions
- `/portal/reports` - View & export reports

**ESS Portal (Employee)**
- `/ess/dashboard` - Summary (present, absent, OT, leave balance)
- `/ess/attendance` - Attendance history & monthly view
- `/ess/leaves` - Leave balance & apply
- `/ess/requests` - My submissions (Leave, OT, Correction)
- `/ess/roster` - Shift schedule view

---

## Dependencies to Add

### Backend
- `node-cron` - Scheduled jobs (nightly aggregation)
- `nodemailer` - Email notifications
- `bcrypt` - Already installed
- `date-fns` or `dayjs` - Date manipulation
- `uuid` - For report IDs

### Frontend
- `recharts` - Charts for dashboards
- `date-fns` - Date picker, formatting
- `csv-parser`, `xlsx` - Export handling
- `react-hot-toast` - Notifications (if not already)

---

## Implementation Approach

### Database Migration Strategy
1. Create new tables using Prisma migrations
2. No breaking changes to existing tables
3. Gradual feature rollout (Shift → Leave → OT)

### API Development
1. Build service layer (shift calc, OT calc, approval logic)
2. Create REST endpoints
3. Add middleware for role-based access

### Frontend Development
1. Component library (Form, Card, Table, Modal)
2. ESS portal first (simpler, user-facing)
3. Manager dashboard second
4. Admin config last

### Testing Strategy
1. Unit tests for business logic (shift calc, OT calc)
2. Integration tests for API endpoints
3. E2E tests for approval workflows

---

## Success Metrics

- ✅ All endpoints respond in <500ms (p95)
- ✅ Attendance calculation <5s for 1000 employees
- ✅ Report generation <10s
- ✅ 99.9% uptime during business hours
- ✅ Email delivery rate >98%
- ✅ Zero data loss on punch ingestion
