# Prime Attendance: Comprehensive Features Implementation

## Overview
Expand Prime Attendance with all features from ZKBio Time including Attendance Management, Shift & Roster Management, Overtime, Employee Self Service, Leave Management, Payroll Integration, Device Management, Approval Workflows, Reporting, and Multi-Branch Support.

---

## Feature Requirements

### 1. ATTENDANCE MANAGEMENT
- **Real-time Attendance Collection** - Direct punch from ZKTeco devices
  - Automatic ingestion from ATTLOG
  - Multi-device simultaneous support
  - Duplicate punch detection (within 5 minutes)

- **Check-In / Check-Out Tracking**
  - Record punch time with device SN
  - Verify attendance status (In/Out)
  - Track sequence to prevent invalid patterns

- **Late/Early Leave/Absent Calculation**
  - Compare punch against scheduled shift
  - Calculate minutes late/early
  - Mark as absent if no punch on shift day
  - Configurable grace period (default: 5 min)

- **Missing Punch Detection**
  - Identify employees with incomplete In or Out
  - Alert managers for correction

- **Multiple Attendance Rules Setup**
  - Different rules per department/employee level
  - Rule priority: Employee > Department > Organization
  - Rule types: Grace period, minimum punch hours, etc.

- **Attendance Regularization Request**
  - Employees request corrections for missed punches
  - Managers approve/reject with comments
  - Audit trail of all changes

---

### 2. SHIFT & ROSTER MANAGEMENT

- **Shift Types**
  - Fixed Shift - Same time daily (e.g., 09:00-17:30)
  - Rotational Shift - Weekly rotation pattern
  - Auto Shift - AI-calculated based on historical patterns
  - Flexible Shift - Employee chooses within range (09:00-11:00 start)

- **Weekly Off Schedule**
  - Set per employee/department (e.g., Saturday-Sunday)
  - Holidays calendar
  - Override for specific dates

- **Shift Assignment**
  - Bulk assignment by Department/Designation
  - Individual override
  - Effective date tracking
  - Shift change history

- **Roster Management**
  - Monthly shift roster view
  - Shift change requests by employees
  - Approve/reject by managers
  - Auto-advance roster to next period

---

### 3. OVERTIME (OT) MANAGEMENT

- **Auto OT Calculation**
  - Calculate OT hours beyond shift end time
  - Rules: Work after 18:00 = 1.5x rate, Post-22:00 = 2x rate
  - Configurable per organization

- **Approval-based OT**
  - Employee submits OT claim with reason
  - Manager approves (triggers payroll adjustment)
  - Finance audits all approved OT

- **OT Rules Engine**
  - Per department/organization configuration
  - Threshold: min 30 min to count as OT
  - Max OT per day/week limits

- **Weekly OT Calculation**
  - Aggregate weekly OT (5-day work week)
  - Show cumulative against limit

- **Holiday OT Calculation**
  - Different multiplier on holidays (2.5x or 3x)
  - Separate tracking from regular OT

---

### 4. EMPLOYEE SELF SERVICE (ESS)

- **Attendance Viewing**
  - Employee portal shows own attendance log
  - Monthly summary with stats (days present, absent, late)
  - Filter by date range

- **Leave Application**
  - Apply for leave with type (Casual/Sick/Annual)
  - Select date range and reason
  - Auto-calculate impact on leave balance
  - View status (Pending/Approved/Rejected)

- **OT Request**
  - Submit OT claim with date/hours/reason
  - Automatic calculation based on punch
  - Manager approval workflow

- **Attendance Correction Request**
  - Request punch adjustment with reason
  - Evidence upload (photo/document)
  - Manager review and approval

- **Mobile Punch** (Phase 2)
  - Biometric punch via mobile app
  - GPS location capture
  - Offline punch queue sync

---

### 5. LEAVE MANAGEMENT

- **Leave Types**
  - Casual Leave (default 12/year, non-cumulative)
  - Sick Leave (default 10/year, non-cumulative)
  - Annual Leave (default 20/year, cumulative up to 5 days)
  - Special/Festival Leaves
  - Unpaid/Half-Day options

- **Leave Balance**
  - Auto-credit on month/year start
  - Deduct on approval
  - Cumulative/non-cumulative tracking
  - Carry-over rules

- **Leave Approval Workflow**
  - Employee submits leave (date range, type, reason)
  - Manager approves/rejects (1st level)
  - HR reviews (2nd level if configured)
  - System blocks overlapping approvals

- **Leave Calendar**
  - Visual monthly/yearly calendar
  - Color-coded by status (Pending/Approved/Rejected)
  - Show approved & leave balance

- **Leave Encroachment**
  - Alert if employee applies beyond balance
  - Escalate to HR for unpaid leave approval

---

### 6. PAYROLL INTEGRATION

- **Payroll Data Export**
  - Export attendance summary to CSV/Excel
  - Format: Date, Present Days, Absent Days, Late (qty), Early (qty), OT Hours
  - Compatible with ERP (ERPNext, SAP, etc.)

- **Salary Calculation Support**
  - Provide attendance-derived inputs to payroll engine
  - Daily rate calculation: (Monthly Salary / 30) * Present Days
  - OT calculation: (Hourly Rate * OT Hours * Multiplier)

- **WPS Report** (Middle East focus)
  - Generate WPS (Wage Protection System) compliant reports
  - Required fields: ID, Days Worked, OT, Deductions
  - Export to Ministry-approved format

- **ERP Integration**
  - REST API to ERPNext Employee Checkin
  - Sync Attendance → ERPNext automatically
  - API endpoints for external HRMSs

---

### 7. DEVICE MANAGEMENT

- **Remote Device Monitoring**
  - Dashboard showing all devices with status
  - Device health: CPU, memory, disk space
  - Firmware version tracking
  - Last communication timestamp

- **Device Online/Offline Status**
  - Real-time heartbeat monitoring
  - Auto-offline after 10-min inactivity
  - Notification on status change
  - Historical online/offline log

- **User Sync to Device**
  - Push employee master to device
  - Sync privilege levels (0=User, 1=Manager, 2=Admin)
  - Enable/disable user on device remotely
  - Sync job status tracking

- **Fingerprint/Biometric Sync**
  - Queue biometric templates from device
  - Sync priority user list (first N employees)
  - Template update when employee changes
  - Sync history with success/failure count

- **Card Number Sync**
  - Update RFID/card mapping on device
  - Revoke card assignment remotely
  - Bulk card enable/disable

- **Device Command Push**
  - Remote reboot/restart
  - Time sync (set device time to server)
  - Parameter update (IP, gateway, DNS)
  - Command queue and result tracking

---

### 8. APPROVAL WORKFLOW

- **Leave Approval**
  - Step 1: Manager approves/rejects
  - Step 2: HR/Finance optional approval
  - Email notifications at each step
  - Manager dashboard showing pending approvals

- **OT Approval**
  - Manager reviews OT claim with punch details
  - Approve (triggers payroll flag), reject, or escalate to Finance
  - Finance can override/adjust OT amount
  - Monthly OT approval summary

- **Attendance Correction Approval**
  - Manager reviews correction request with reason
  - Evidence attachment support (photo, document)
  - Approve (update attendance), reject, or request resubmit
  - Audit trail of all corrections

- **Multi-level Approval**
  - Configurable approval chain per document type
  - Parallel vs sequential approvals
  - Escalation on timeout (e.g., 3 days)
  - Delegation to substitute (manager on leave)

- **Email Notifications**
  - Submitter: Confirm submission, Approved, Rejected, Escalated
  - Approver: New request, Reminder (after 2 days)
  - Delegate: Escalated item waiting approval
  - HR: Monthly summary of all approvals

---

### 9. REPORTING

- **Daily Attendance Report**
  - Date, Employee ID, Employee Name, Shift, In Time, Out Time, Total Hours, Status (P/A/L)
  - Filters: Department, Designation, Date range
  - Export to Excel/PDF

- **Monthly Attendance Report**
  - Summary by employee: Present (count), Absent (count), Late (count), Early Leave (count)
  - Compare against shift allocation
  - Trend visualization (present % over time)

- **Late Report**
  - List of employees late in period
  - Minutes late, frequency
  - Department-wise comparison

- **Absent Report**
  - Employees absent with date, reason (if marked)
  - Unauthorized vs approved leave
  - Frequency per employee

- **OT Report**
  - Employee, OT Hours, Rate, Amount, Status (Pending/Approved)
  - Department-wise OT summary
  - Monthly OT trend chart

- **Leave Report**
  - Leave balance per employee (used/available)
  - Leave taken (type, dates, duration)
  - Leave approval status

- **Employee Movement Report**
  - In-time, Out-time, Location if applicable
  - Hourly movement for specific employee
  - Detailed punch log with device

- **Custom Report Export**
  - CSV, Excel (with formatting), PDF (with headers)
  - Scheduled report email (daily/weekly/monthly)
  - Report template customization

---

### 10. MULTI-BRANCH SUPPORT

- **Multiple Company Hierarchy**
  - Super Admin sees all companies
  - Company Admin limited to their company
  - Data isolation at database level

- **Multiple Location Support**
  - Each company has locations (Head Office, Branch A, Branch B)
  - Device assigned to location
  - Attendance report by location

- **Multiple Department Support**
  - Organizational hierarchy: Company > Location > Department > Team
  - Attendance rules per department
  - Shift assignment by department
  - Manager assigned to department(s)

- **Hundreds of Devices Support**
  - Device dashboard with filters (location, status, model)
  - Batch device operations (rename, reset, firmware update)
  - Device grouping by location/function

- **Thousands of Employees Support**
  - Pagination and search optimization
  - Bulk employee import (CSV)
  - Employee master sync to all devices
  - Attendance performance (index on tenant, date range)

---

## Data Models Required

### New Models to Add
1. **Shift** - Define shift timings
2. **ShiftAssignment** - Link employee to shift, effective date
3. **LeaveType** - Casual, Sick, Annual, etc.
4. **LeaveRequest** - Leave application with approval status
5. **OTRequest** - OT claim with auto/manual calculation
6. **AttendanceCorrection** - Correction requests with approval
7. **ApprovalWorkflow** - Workflow configuration per tenant
8. **ApprovalLog** - Track approval history
9. **Department** - Organizational hierarchy
10. **Location** - Geographical offices
11. **Designation** - Job titles
12. **Roster** - Shift assignment bulk view
13. **DeviceCommand** - Remote commands to devices
14. **PayrollExport** - Generated payroll data exports
15. **ReportTemplate** - Custom report definitions

### Existing Models to Extend
- **Tenant** - Add organization structure config
- **User** - Add department, designation, manager assignment
- **Device** - Add location, command queue tracking
- **AttendanceLog** - Add shift reference, status (P/A/L/OT), correction flag

---

## API Endpoints Summary

### ESS (Employee Self Service)
- `GET /api/ess/attendance` - Own attendance history
- `GET /api/ess/leaves` - Own leave balance and history
- `POST /api/ess/leaves` - Apply for leave
- `GET /api/ess/ot-requests` - Own OT requests
- `POST /api/ess/ot-requests` - Submit OT claim
- `POST /api/ess/attendance-corrections` - Request correction
- `GET /api/ess/dashboard` - ESS dashboard (summary)

### Manager Approvals
- `GET /api/manager/approvals/pending` - All pending approvals
- `POST /api/manager/approvals/:id/approve` - Approve request
- `POST /api/manager/approvals/:id/reject` - Reject with comment

### Reports
- `GET /api/reports/attendance-daily` - Daily report
- `GET /api/reports/attendance-monthly` - Monthly summary
- `GET /api/reports/ot` - OT report
- `GET /api/reports/leave` - Leave summary
- `GET /api/reports/export` - Export (CSV/PDF)

### Device Management
- `GET /api/devices` - List devices with status
- `POST /api/devices/:id/commands` - Push command to device
- `GET /api/devices/:id/sync-status` - Biometric/card sync status
- `POST /api/devices/:id/user-sync` - Sync employee master to device

### Configuration
- `GET /api/config/shifts` - Shift list
- `POST /api/config/shifts` - Create shift
- `GET /api/config/leave-types` - Leave types
- `GET /api/config/departments` - Department hierarchy

---

## Implementation Phases

### Phase 1 (Weeks 1-2)
- Shift Management (Fixed/Flexible shifts)
- Attendance Status Calculation (P/A/L/OT)
- Basic Leave Management (CRUD, balance tracking)

### Phase 2 (Weeks 3-4)
- Attendance Regularization Requests
- Leave Approval Workflow
- OT Request & Calculation
- ESS Portal Basics

### Phase 3 (Weeks 5-6)
- Comprehensive Reporting (Daily, Monthly, OT, Leave)
- Report Export (CSV, PDF, Excel)
- Payroll Integration (Data export)

### Phase 4 (Weeks 7-8)
- Device Command Management (Reboot, Time Sync, etc.)
- Biometric/Card Sync Tracking
- Multi-level Approval Workflow
- Email Notifications

### Phase 5 (Weeks 9-10)
- Multi-Branch Support (Location, Department hierarchy)
- Bulk Operations (Import, device batch update)
- Performance Optimization (Large dataset handling)
- Admin Dashboards

### Phase 6 (Later)
- Mobile ESS App
- Advanced Analytics
- Predictive attendance patterns
- WPS Report generation

---

## Success Criteria

- ✅ All 10 feature categories operational
- ✅ 1000+ employees performance tested
- ✅ 100+ devices simultaneous support
- ✅ Zero data loss on punch ingestion
- ✅ Approval workflow audit trail complete
- ✅ All reports exportable in CSV/PDF
- ✅ Multi-tenant data isolation verified
- ✅ Email notification delivery 100%
