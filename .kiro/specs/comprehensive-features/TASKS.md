# Implementation Tasks

## Phase 1: Foundation & Shift Management

### Task 1.1: Database Schema - Organizational Structure
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `locations` table
- `departments` table (with parent_department_id for hierarchy)
- `designations` table
- `user_details` table (extend users with dept/designation/location)

**Acceptance Criteria:**
- All migrations apply cleanly
- Prisma schema updated
- Indexes on department hierarchy
- User-department relationship working

---

### Task 1.2: Database Schema - Shift Management
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `shifts` table (fixed, rotational, auto, flexible)
- `shift_assignments` table with effective date range
- Update `attendance_logs` to have shiftId reference

**Acceptance Criteria:**
- Shift types properly enum'ed
- Effective date logic sound
- No data loss migration from existing attendance
- Tests for shift lookup by date

---

### Task 1.3: Shift Service Layer
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/shiftService.ts`:
- `getActiveShift(employeeId, date)` - Returns shift for employee on date
- `createShift(tenantId, shiftData)` - Create shift template
- `assignShift(employeeId, shiftId, fromDate)` - Assign shift to employee
- `getShiftAssignmentHistory(employeeId)` - Past assignments
- `validateShiftTiming(startTime, endTime)` - Business logic validation
- Helper: `isWeeklyOff(date, shift)` - Check if date is off day

**Acceptance Criteria:**
- All functions return expected types
- Edge cases: null shift, past dates, overlapping assignments
- Unit tests for each function
- Handles shifts across midnight (e.g., 22:00-06:00)

---

### Task 1.4: Attendance Status Calculation
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/attendanceService.ts`:
- `calculateDailyStatus(employeeId, date)` - Returns P (Present), A (Absent), L (Leave), OT
- `compareWithShift(punchTime, shiftStart, shiftEnd, gracePeriod)` - Calculate late/early
- `detectMissingPunch(employeeId, date)` - Check for incomplete punch
- `markDuplicate(pin, deviceSn, datetime, window=5min)` - Prevent duplicates

**Logic:**
- If no punch: mark Absent (unless leave)
- If punch but incomplete (no out): flag for correction
- If punch after start + grace period: mark Late with minutes
- If punch out before shift end: mark Early with minutes
- If work hours > shift end: calculate OT (handled by OT service)

**Acceptance Criteria:**
- 95%+ accuracy for P/A/L/OT detection
- Handles grace period config
- Logs all decisions for audit
- Handles shift changes mid-day

---

### Task 1.5: Shift API Endpoints
**Status:** todo
**Priority:** P0
**Owner:** Backend

Create `src/routes/shiftRoutes.ts`:
```
POST /api/admin/shifts - Create shift
GET /api/admin/shifts - List shifts
GET /api/admin/shifts/:id - Get shift detail
PUT /api/admin/shifts/:id - Update shift
DELETE /api/admin/shifts/:id - Delete shift

POST /api/admin/shift-assignments - Bulk assign shift to employees
GET /api/admin/shift-assignments?employeeId=X - Get employee shift history
```

**Acceptance Criteria:**
- All CRUD endpoints working
- Proper error handling (not found, validation)
- Multi-tenant filtering
- Proper access control (admin only)

---

### Task 1.6: Shift Frontend - Admin Config Page
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/admin/shifts` page:
- List existing shifts with name, type, timing
- Add/Edit/Delete shift modal
- Show active employees per shift
- Bulk assign modal (select employees/department + shift)

**Acceptance Criteria:**
- All CRUD actions working
- Responsive design
- Loading states
- Error messages
- Confirm before delete

---

### Task 1.7: Integration - Update Attendance Calculation on Device Punch
**Status:** todo
**Priority:** P0
**Owner:** Backend

Modify `src/routes/iclockRoutes.ts` ATTLOG handler:
- After storing punch in AttendanceLog
- Call `attendanceService.calculateDailyStatus(employeeId, date)`
- Update status field in AttendanceLog
- Log calculation result

**Acceptance Criteria:**
- Every punch triggers status calculation
- Status persisted to DB
- No performance regression (<100ms per punch)
- Rollback safe

---

## Phase 2: Leave Management

### Task 2.1: Database Schema - Leave System
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `leave_types` table (Casual, Sick, Annual, etc. with config)
- `leave_requests` table (with approval workflow)
- `leave_balances` table (track per employee/year)

**Acceptance Criteria:**
- Leave type config (days, cumulative, carryover)
- Leave request status enum (PENDING, APPROVED, REJECTED)
- Composite unique (tenantId, employeeId, leaveTypeId, year)
- Proper indexes for queries

---

### Task 2.2: Leave Calculation Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/leaveService.ts`:
- `initializeLeaveBalance(tenantId, year)` - Create balance for all employees
- `getLeaveBalance(employeeId, leaveTypeId, year)` - Current balance
- `requestLeave(employeeId, leaveTypeId, dates, reason)` - Submit leave
- `approveLeave(leaveRequestId, approverUserId, remarks)` - Manager approves
- `rejectLeave(leaveRequestId, remarks)` - Manager rejects
- `calculateLeaveDays(fromDate, toDate)` - Account for weekends

**Logic:**
- On approval, deduct from balance
- On rejection, leave balance unchanged
- Prevent overlapping leaves
- Check balance before creation

**Acceptance Criteria:**
- All functions tested
- Balance never negative
- Audit trail complete
- Email notifications sent

---

### Task 2.3: Leave Type Configuration API
**Status:** todo
**Priority:** P0
**Owner:** Backend

Create `src/routes/leaveRoutes.ts`:
```
POST /api/admin/leave-types - Create leave type
GET /api/admin/leave-types - List
PUT /api/admin/leave-types/:id - Update
DELETE /api/admin/leave-types/:id - Delete

POST /api/admin/leave-balance/initialize - Initialize year
GET /api/admin/leave-balance?year=2026 - Report view
```

**Acceptance Criteria:**
- CRUD working
- Proper validation (max days, cumulative rules)
- Can't delete leave type in use

---

### Task 2.4: ESS Leave Portal
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/ess/leaves` page:
- Display leave balance per type (credited, used, available)
- Apply for leave form (type, date range, reason)
- View submitted leaves with status
- Cancel pending leave request

**Acceptance Criteria:**
- All actions working
- Form validation
- Balance automatically updates on approval
- Confirmation before submit

---

### Task 2.5: Manager Approval Dashboard
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/portal/approvals` page:
- Show pending approvals (Leave, OT, Correction)
- View request details
- Approve/Reject with remarks
- Filter by status, type, date

**Acceptance Criteria:**
- Managers see only their team's requests
- Bulk approve/reject option
- Notifications on action
- Audit trail visible

---

### Task 2.6: Approval Workflow Engine
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/approvalService.ts`:
- `getApprovalConfig(entityType, departmentId)` - Fetch workflow
- `routeForApproval(entityType, entityId, submitterId)` - Find approver
- `approve(approvalLogId, approverId, remarks)` - Process approval
- `reject(approvalLogId, remarks)` - Process rejection
- `escalateIfTimeout()` - Cron job for timeout escalation
- `sendApprovalNotification(userId, entityType, action)` - Email

**Acceptance Criteria:**
- Sequential approval chain working
- Multi-level support (manager → HR → Finance)
- Escalation timeout logic
- Audit logs complete

---

### Task 2.7: Database Schema - Approval Workflows
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `approval_workflows` table (config: entity type, department, steps)
- `approval_logs` table (audit trail)

**Acceptance Criteria:**
- Workflows configurable per department
- Escalation rules stored
- Audit trail immutable

---

## Phase 3: Overtime Management

### Task 3.1: Database Schema - OT System
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `ot_requests` table (with auto/manual calculation)

**Acceptance Criteria:**
- OT status enum (PENDING, APPROVED, REJECTED, PAID)
- Calculation method tracking (AUTO, MANUAL)

---

### Task 3.2: OT Calculation Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/otService.ts`:
- `calculateOT(employeeId, date, punchIn, punchOut, shiftEnd)` - Auto calc
- `createOTRequest(employeeId, date, hours, reason)` - Manual OT claim
- `approveOT(otRequestId, approverUserId)` - Manager approval
- `getWeeklyOT(employeeId, weekStart)` - Aggregate weekly
- `getHolidayMultiplier(date)` - Get rate multiplier for holidays

**Logic:**
- Work after shift end = OT
- 18:00-22:00 = 1.5x, >22:00 = 2x
- Minimum 30 min threshold to count
- Holiday work = 2.5x or 3x multiplier

**Acceptance Criteria:**
- OT calculation accurate
- Configurable rates per organization
- Weekly limits enforced
- Holiday multiplier applied

---

### Task 3.3: OT Request API
**Status:** todo
**Priority:** P0
**Owner:** Backend

Create `src/routes/otRoutes.ts`:
```
GET /api/ess/ot-requests - Employee's OT requests
POST /api/ess/ot-requests - Submit manual OT claim
GET /api/manager/ot-requests/pending - Manager's pending
POST /api/manager/ot-requests/:id/approve - Approve
GET /api/reports/ot?month=X - OT report
```

**Acceptance Criteria:**
- All endpoints working
- Proper filtering
- No duplicate OT entries

---

### Task 3.4: ESS OT Portal
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create OT section in `/ess/dashboard` and `/ess/requests`:
- Show monthly OT hours
- View auto-calculated OT
- Submit manual OT claim
- Track approval status

**Acceptance Criteria:**
- Display working
- Form validation
- Notifications on status change

---

### Task 3.5: Daily OT Auto-Calculation Cron Job
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement cron job (`src/jobs/calculateOTDaily.ts`):
- Runs daily at 23:00
- For each completed attendance log (full In+Out)
- Check if work > shift end
- Auto-create OT request with AUTO status
- Email manager for review

**Acceptance Criteria:**
- Job runs on schedule
- OT calculated accurately
- Idempotent (no duplicates if re-run)
- Error handling & retry logic

---

## Phase 4: Attendance Corrections & Advanced Approvals

### Task 4.1: Database Schema - Attendance Corrections
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `attendance_corrections` table (with evidence tracking)

**Acceptance Criteria:**
- Correction type enum (IN_TIME, OUT_TIME, FULL_DAY)
- Evidence URL support
- Approval workflow integration

---

### Task 4.2: Attendance Correction Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/correctionService.ts`:
- `requestCorrection(employeeId, attendanceLogId, type, correctedTime, reason)` - Submit
- `approveCorrection(correctionId, approverId)` - Manager approves + update AttendanceLog
- `rejectCorrection(correctionId, remarks)` - Reject
- `getEvidenceUploadUrl()` - Generate signed URL for file upload

**Acceptance Criteria:**
- Correction request proper validation
- Original attendance preserved (audit)
- Recalculation of daily status on approval
- Evidence tracking

---

### Task 4.3: ESS Correction Request Portal
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/ess/requests/corrections` page:
- View past attendance with option to request correction
- Submit form: date, type (in/out/full day), corrected time, reason, evidence
- Track submitted corrections with status
- Resubmit if rejected

**Acceptance Criteria:**
- File upload working
- Form validation
- Error messages clear

---

### Task 4.4: Manager Correction Review Dashboard
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Update `/portal/approvals` to include corrections:
- View correction request with original vs corrected
- View evidence attachment
- Approve (updates attendance), Reject, or Request additional info

**Acceptance Criteria:**
- All actions working
- Attendance recalculated on approval
- Audit trail complete

---

### Task 4.5: Database Schema - Advanced Approvals
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- Update `approval_workflows` to support multi-level, parallel approvals

**Acceptance Criteria:**
- Sequential vs parallel support
- Escalation rules flexible
- Timeout handling

---

### Task 4.6: Email Notification Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/emailService.ts`:
- Template-based emails (leave submitted, approved, rejected, OT submitted, etc.)
- `sendLeaveApprovalNotification(employeeId, status, remarks)` 
- `sendOTApprovalNotification(employeeId, status)` 
- `sendCorrectionNotification(employeeId, status)` 
- Batch digest email option

**Configuration:**
- SMTP settings in `.env`
- Template storage (HTML)
- Retry logic for failed sends
- Unsubscribe mechanism

**Acceptance Criteria:**
- All notification types working
- No duplicate emails
- Configurable via admin panel
- Email delivery >98%

---

## Phase 5: Reporting & Payroll Export

### Task 5.1: Database Schema - Reports & Exports
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `payroll_exports` table
- `custom_reports` table
- Update `audit_logs` (for tracking all changes)

**Acceptance Criteria:**
- Export history tracking
- Report templates saved
- Audit immutable

---

### Task 5.2: Report Generation Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/reportService.ts`:
- `getDailyAttendanceReport(fromDate, toDate, departmentId)` - CSV format
- `getMonthlyAttendanceReport(month, departmentId)` - Summary per employee
- `getOTReport(month, departmentId)` - OT hours by employee
- `getLeaveReport(month, departmentId)` - Leave taken vs balance
- `getEmployeeMovementReport(employeeId, fromDate, toDate)` - Punch history
- `exportToCSV(data, filename)` - CSV generation
- `exportToExcel(data, filename)` - Excel with formatting
- `exportToPDF(data, filename)` - PDF report

**Acceptance Criteria:**
- All report types working
- Filters (date, department, employee) working
- Export formats accurate
- Performance: <10s for 1000 employees

---

### Task 5.3: Payroll Export Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/payrollService.ts`:
- `generatePayrollExport(tenantId, month, format)` - Export for payroll
- Format fields: Employee ID, Name, Days Present, Days Absent, Late Count, Early Leave Count, OT Hours
- `generateWPSReport(tenantId, month)` - Middle East WPS format (if applicable)
- `exportToERP(tenantId, month)` - ERPNext API call

**Acceptance Criteria:**
- Export covers all attendance scenarios
- WPS format compliance verified
- ERP API integration working
- No data loss in conversion

---

### Task 5.4: Reports API Endpoints
**Status:** todo
**Priority:** P0
**Owner:** Backend

Create `src/routes/reportRoutes.ts`:
```
GET /api/reports/attendance-daily - Daily report
GET /api/reports/attendance-monthly - Monthly summary
GET /api/reports/ot - OT report
GET /api/reports/leave - Leave report
GET /api/reports/movement?employeeId=X - Employee movement
POST /api/reports/export - Export (CSV/Excel/PDF)
GET /api/reports/payroll?month=X - Payroll export
```

**Acceptance Criteria:**
- All endpoints responding
- Proper access control (admin/manager/employee scope)
- Caching for repeated requests

---

### Task 5.5: Reports Admin Page
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/admin/reports` page:
- Report type selector (Daily, Monthly, OT, Leave, Movement)
- Filters (date range, department, employee)
- Preview report data
- Export button (CSV, Excel, PDF)
- Scheduled report setup (daily/weekly/monthly email)

**Acceptance Criteria:**
- All report types showing
- Export buttons working
- Schedule email functionality
- Responsive & fast

---

### Task 5.6: Nightly Report Aggregation Job
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement cron job (`src/jobs/aggregateReportsDaily.ts`):
- Runs daily at 01:00 (after all punches ingested)
- Pre-calculate daily attendance summary
- Pre-calculate OT summary
- Pre-calculate leave usage
- Store in cache for fast report generation

**Acceptance Criteria:**
- Job completes in <5 min
- Reports generated instantly on first request
- Handles partial days gracefully

---

## Phase 6: Device Management & Multi-Branch

### Task 6.1: Database Schema - Device Commands & Sync
**Status:** todo
**Priority:** P0
**Owner:** Database

Create migrations for:
- `device_commands` table (reboot, time sync, user sync, etc.)
- `device_sync_status` table (biometric, card, user sync tracking)
- Update `devices` with location_id

**Acceptance Criteria:**
- Command status tracking
- Sync status per device
- Result storage for troubleshooting

---

### Task 6.2: Device Command Service
**Status:** todo
**Priority:** P0
**Owner:** Backend

Implement `src/services/deviceCommandService.ts`:
- `queueCommand(deviceId, commandType, parameters)` - Queue command
- `pushCommandToDevice(deviceId)` - Poll-based or direct send
- `executeCommand(deviceSn, commandType)` - Device-side execution
- `trackSyncStatus(deviceId, syncType)` - Biometric/card/user sync

**Command Types:**
- REBOOT - Device reboot
- TIME_SYNC - Sync device clock
- USER_SYNC - Sync employee master
- PARAM_UPDATE - Update IP, gateway, DNS
- FIRMWARE_UPDATE - Push firmware

**Acceptance Criteria:**
- Commands queue & track
- Device receives & executes
- Result callback to server
- Timeout handling

---

### Task 6.3: Device Management API
**Status:** todo
**Priority:** P0
**Owner:** Backend

Create `src/routes/deviceRoutes.ts`:
```
GET /api/admin/devices - List with filters
POST /api/admin/devices/:id/commands - Queue command
GET /api/admin/devices/:id/sync-status - Get sync status
GET /api/admin/devices/:id/commands - View command history
POST /api/admin/devices/bulk-operations - Batch rename, update, etc.
```

**Acceptance Criteria:**
- All endpoints working
- Bulk operations efficient
- Proper error handling

---

### Task 6.4: Device Management Admin Page
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create `/admin/devices` page:
- List devices with status, last seen, user count
- Filters: location, status, online/offline
- Commands modal (Reboot, Time Sync, etc.)
- View sync status (users, biometric, card)
- Bulk operations (rename, relocate, restart all)

**Acceptance Criteria:**
- UI responsive
- Commands execute properly
- Bulk operations progress tracking

---

### Task 6.5: Database Schema - Multi-Branch Structure
**Status:** todo
**Priority:** P0
**Owner:** Database

Ensure migrations complete for:
- `locations` table (company has multiple locations)
- `departments` table with hierarchy
- Update `devices`, `users`, `attendance_logs` with location/department filtering

**Acceptance Criteria:**
- All foreign keys proper
- Cascade delete configured
- Indexes optimized for filtering

---

### Task 6.6: Multi-Branch Filtering
**Status:** todo
**Priority:** P0
**Owner:** Backend & Frontend

Implement branch-aware filtering:
- Admin dashboard shows all branches
- Manager filters to own department/location
- Employee sees only own attendance
- Reports aggregatable by branch

**Acceptance Criteria:**
- Proper access control
- Data isolation maintained
- Performance with 100+ locations

---

## Phase 7: Performance, Testing & Polish

### Task 7.1: Database Optimization
**Status:** todo
**Priority:** P1
**Owner:** Database

- Add indexes for common queries (tenant_id, date, employee_id)
- Analyze slow queries
- Optimize joins for large datasets
- Archive old attendance data (>2 years)

**Acceptance Criteria:**
- Monthly report generation <5s for 1000 employees
- ESS pages load <2s
- No N+1 query problems

---

### Task 7.2: Backend Unit Tests
**Status:** todo
**Priority:** P1
**Owner:** Backend

Write tests for:
- `shiftService.ts` - All functions
- `attendanceService.ts` - Status calculation
- `leaveService.ts` - Leave logic
- `otService.ts` - OT calculation
- `approvalService.ts` - Workflow logic

**Acceptance Criteria:**
- >80% code coverage
- All edge cases tested
- CI/CD integration

---

### Task 7.3: Frontend Component Library
**Status:** todo
**Priority:** P1
**Owner:** Frontend

Create reusable components:
- `DateRangePicker` - Date range selection
- `StatusBadge` - P/A/L/OT badges
- `ApprovalCard` - Request display with buttons
- `ReportTable` - Filterable, sortable table
- `ExportButtons` - CSV, Excel, PDF exports

**Acceptance Criteria:**
- All components documented
- Responsive design
- Accessible (WCAG)

---

### Task 7.4: API Documentation
**Status:** todo
**Priority:** P1
**Owner:** Backend

Create comprehensive API docs:
- Postman collection or OpenAPI/Swagger
- All endpoints documented
- Request/response examples
- Error codes documented

**Acceptance Criteria:**
- Docs complete & up-to-date
- Easy for frontend team to integrate

---

### Task 7.5: User Documentation
**Status:** todo
**Priority:** P1
**Owner:** Product/Docs

Create user guides:
- Admin: Shift setup, leave config, device management
- Manager: Approval workflow, OT review, reports
- Employee: Leave application, OT request, attendance view

**Acceptance Criteria:**
- Screenshots included
- Video tutorials for complex flows
- FAQs section

---

### Task 7.6: End-to-End Testing
**Status:** todo
**Priority:** P1
**Owner:** QA

Test critical workflows:
- Device punch → Attendance calculation → Leave impact
- Leave request → Manager approval → Balance update
- OT request → Approval → Payroll export
- Attendance correction → Approval → Status recalc

**Acceptance Criteria:**
- All workflows tested
- Zero data loss
- Rollback verified

---

### Task 7.7: Security Audit
**Status:** todo
**Priority:** P0
**Owner:** Security

- JWT token validation
- CORS policy review
- SQL injection prevention (Prisma safe)
- Rate limiting on sensitive endpoints
- Data encryption at rest/transit

**Acceptance Criteria:**
- No OWASP top 10 issues
- Penetration test passed

---

## Phase 8: Deployment & Go-Live

### Task 8.1: Production Environment Setup
**Status:** todo
**Priority:** P0
**Owner:** DevOps

- PostgreSQL production DB
- Backup strategy (daily full, hourly incremental)
- Monitoring & alerting (server CPU, DB connections)
- SSL/HTTPS certificate

**Acceptance Criteria:**
- Environment ready
- Backups tested & restorable

---

### Task 8.2: Data Migration (If Existing System)
**Status:** todo
**Priority:** P0
**Owner:** Backend

If migrating from old system:
- Import existing employees
- Import historical attendance (last 1 year)
- Import leave balances
- Verify data integrity

**Acceptance Criteria:**
- All data migrated
- No duplicates
- Consistency checks passed

---

### Task 8.3: Training & Rollout
**Status:** todo
**Priority:** P1
**Owner:** Product/Ops

- Super admin training
- Tenant admin training
- Manager training
- Employee training

**Acceptance Criteria:**
- All users trained
- Support tickets logged and resolved

---

## Summary

**Total Tasks:** ~50
**Estimated Timeline:** 8-10 weeks (dependent on team size & parallelization)
**Key Dependencies:** 
- Phase 1 blocks everything (schema + shift)
- Phase 2 can run parallel with Phase 1 (Leave)
- Phase 3-5 parallel after Phase 1

**Resource Recommendation:**
- Backend: 2 devs (parallel on shift, leave, OT, approvals)
- Frontend: 1-2 devs (ESS portal, reports, admin panels)
- DevOps/DBA: 1 (schema, optimization, deployment)
- QA: 1 (testing, bug fixes)
