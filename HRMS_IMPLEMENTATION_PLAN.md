# Frappe HRMS Complete Features Implementation Plan

## 🎯 Overview

Prime Attendance system-এ Frappe HRMS-এর সব major features implement করা হবে। এটি একটি comprehensive HR management solution হবে।

---

## 📊 Frappe HRMS Features (Complete List)

### 1. 👥 Organization Management
- [x] Employee Management (Already exists)
- [x] Department (Basic support exists)
- [ ] Designation
- [ ] Branch
- [ ] Employment Type
- [ ] Employee Grade
- [ ] Employee Group
- [ ] Organizational Chart

### 2. ⏰ Attendance & Shift Management
- [x] Employee Checkin (Already implemented)
- [x] Attendance (ERPNext integration)
- [x] Shift Type (Verification added)
- [x] Shift Assignment (Verification added)
- [ ] Shift Request
- [ ] Shift Schedule
- [ ] Roster Management
- [ ] Attendance Request
- [ ] Upload Attendance (Bulk)
- [ ] Employee Attendance Tool
- [ ] Late Entry/Early Exit Reports
- [ ] Overtime Tracking

### 3. 🌴 Leave Management
- [ ] Leave Type
- [ ] Leave Period
- [ ] Leave Policy
- [ ] Leave Allocation
- [ ] Leave Application
- [ ] Compensatory Leave Request
- [ ] Leave Encashment
- [ ] Leave Block List
- [ ] Leave Control Panel
- [ ] Leave Balance Report
- [ ] Leave Ledger

### 4. 💰 Payroll Management
- [ ] Salary Component
- [ ] Salary Structure
- [ ] Salary Structure Assignment
- [ ] Payroll Entry
- [ ] Payroll Period
- [ ] Additional Salary
- [ ] Retention Bonus
- [ ] Employee Incentive
- [ ] Salary Slip
- [ ] Income Tax Slab
- [ ] Tax Deduction

### 5. 💸 Travel & Expense
- [ ] Employee Advance
- [ ] Expense Claim
- [ ] Travel Request

### 6. 🎯 Performance Management
- [ ] Appraisal Template
- [ ] Appraisal Cycle
- [ ] Appraisal
- [ ] Goal
- [ ] Employee Performance Feedback

### 7. 🔍 Recruitment
- [ ] Staffing Plan
- [ ] Job Opening
- [ ] Job Applicant
- [ ] Interview
- [ ] Job Offer
- [ ] Appointment Letter

### 8. 📚 Training
- [ ] Training Program
- [ ] Training Event
- [ ] Training Result
- [ ] Training Feedback

### 9. 🔄 Employee Lifecycle
- [ ] Employee Onboarding
- [ ] Employee Promotion
- [ ] Employee Transfer
- [ ] Employee Separation
- [ ] Exit Interview
- [ ] Full and Final Statement

### 10. 🚗 Fleet Management
- [ ] Vehicle
- [ ] Vehicle Log

### 11. 📊 Reports & Analytics
- [ ] Monthly Attendance Sheet
- [ ] Leave Balance Report
- [ ] Salary Register
- [ ] Bank Remittance
- [ ] Employee Birthday
- [ ] Employees working on a holiday
- [ ] Department Analytics

---

## 🚀 Implementation Priority

### Phase 1: Core Attendance & Leave (Week 1-2) ✅ CRITICAL
1. ✅ Shift Management Enhancement
2. ✅ Attendance Verification
3. 🔄 Leave Type Setup
4. 🔄 Leave Allocation
5. 🔄 Leave Application
6. 🔄 Leave Balance Tracking

### Phase 2: Organization & Employee (Week 3-4)
1. 🔄 Department Management
2. 🔄 Designation Management
3. 🔄 Branch Management
4. 🔄 Employment Type
5. 🔄 Employee Grade
6. 🔄 Enhanced Employee Profile

### Phase 3: Payroll (Week 5-6)
1. 🔄 Salary Component
2. 🔄 Salary Structure
3. 🔄 Salary Structure Assignment
4. 🔄 Payroll Entry
5. 🔄 Salary Slip Generation
6. 🔄 Tax Calculation (Bangladesh)

### Phase 4: Advanced Features (Week 7-8)
1. 🔄 Overtime Calculation
2. 🔄 Employee Advance
3. 🔄 Expense Claim
4. 🔄 Performance Appraisal
5. 🔄 Training Management

### Phase 5: Recruitment & Lifecycle (Week 9-10)
1. 🔄 Job Opening
2. 🔄 Job Applicant
3. 🔄 Interview Management
4. 🔄 Employee Onboarding
5. 🔄 Employee Separation

---

## 📋 Database Schema (New Models)

### Phase 1: Attendance & Leave

```prisma
// Leave Types
model LeaveType {
  id                    String   @id @default(cuid())
  tenantId              String   @map("tenant_id")
  name                  String
  maxLeavesAllowed      Float    @default(0) @map("max_leaves_allowed")
  applicableAfter       Int      @default(0) @map("applicable_after") // days
  maxContinuousDays     Int?     @map("max_continuous_days")
  isCarryForward        Boolean  @default(false) @map("is_carry_forward")
  maxCarryForwardDays   Float?   @map("max_carry_forward_days")
  isOptional            Boolean  @default(false) @map("is_optional")
  allowNegative         Boolean  @default(false) @map("allow_negative")
  includeHolidays       Boolean  @default(false) @map("include_holidays")
  isCompensatory        Boolean  @default(false) @map("is_compensatory")
  isPaidLeave           Boolean  @default(true) @map("is_paid_leave")
  fractionalGrant       Boolean  @default(false) @map("fractional_grant")
  encashable            Boolean  @default(false) @map("encashable")
  earnedLeaveFrequency  String?  @map("earned_leave_frequency") // Monthly, Yearly
  roundingMethod        String   @default("0.5") @map("rounding_method")
  color                 String?
  isActive              Boolean  @default(true) @map("is_active")
  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")
  
  tenant          Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  allocations     LeaveAllocation[]
  applications    LeaveApplication[]
  
  @@unique([tenantId, name])
  @@map("leave_types")
}

// Leave Period
model LeavePeriod {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String
  fromDate    DateTime @map("from_date")
  toDate      DateTime @map("to_date")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  tenant       Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  allocations  LeaveAllocation[]
  
  @@unique([tenantId, name])
  @@map("leave_periods")
}

// Leave Allocation
model LeaveAllocation {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  employeePin       String   @map("employee_pin")
  leaveTypeId       String   @map("leave_type_id")
  leavePeriodId     String?  @map("leave_period_id")
  fromDate          DateTime @map("from_date")
  toDate            DateTime @map("to_date")
  newLeavesAllocated Float   @map("new_leaves_allocated")
  carriedForward    Float    @default(0) @map("carried_forward")
  totalLeavesAllocated Float @map("total_leaves_allocated")
  usedLeaves        Float    @default(0) @map("used_leaves")
  expiredLeaves     Float    @default(0) @map("expired_leaves")
  unusedLeaves      Float    @map("unused_leaves")
  description       String?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tenant      Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leaveType   LeaveType       @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)
  leavePeriod LeavePeriod?    @relation(fields: [leavePeriodId], references: [id], onDelete: SetNull)
  
  @@unique([tenantId, employeePin, leaveTypeId, leavePeriodId])
  @@index([tenantId, employeePin])
  @@map("leave_allocations")
}

// Leave Application
enum LeaveStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model LeaveApplication {
  id              String      @id @default(cuid())
  tenantId        String      @map("tenant_id")
  employeePin     String      @map("employee_pin")
  leaveTypeId     String      @map("leave_type_id")
  fromDate        DateTime    @map("from_date")
  toDate          DateTime    @map("to_date")
  halfDay         Boolean     @default(false) @map("half_day")
  halfDayDate     DateTime?   @map("half_day_date")
  totalDays       Float       @map("total_days")
  status          LeaveStatus @default(DRAFT)
  reason          String?
  leaveApprover   String?     @map("leave_approver")
  approvedAt      DateTime?   @map("approved_at")
  rejectionReason String?     @map("rejection_reason")
  followVia       String?     @map("follow_via")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")
  
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  leaveType LeaveType @relation(fields: [leaveTypeId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, employeePin])
  @@index([status])
  @@map("leave_applications")
}

// Holiday List
model HolidayList {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String
  fromDate    DateTime @map("from_date")
  toDate      DateTime @map("to_date")
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  holidays Holiday[]
  
  @@unique([tenantId, name])
  @@map("holiday_lists")
}

model Holiday {
  id             String      @id @default(cuid())
  holidayListId  String      @map("holiday_list_id")
  date           DateTime
  description    String
  isWeekly       Boolean     @default(false) @map("is_weekly")
  createdAt      DateTime    @default(now()) @map("created_at")
  
  holidayList HolidayList @relation(fields: [holidayListId], references: [id], onDelete: Cascade)
  
  @@index([holidayListId, date])
  @@map("holidays")
}

// Shift Enhancement
model ShiftType {
  id                        String    @id @default(cuid())
  tenantId                  String    @map("tenant_id")
  erpnextShiftId            String?   @map("erpnext_shift_id")
  name                      String
  startTime                 String    @map("start_time") // HH:mm:ss
  endTime                   String    @map("end_time")
  holidayListId             String?   @map("holiday_list_id")
  enableAutoAttendance      Boolean   @default(false) @map("enable_auto_attendance")
  determineCheckInOut       Boolean   @default(true) @map("determine_check_in_out")
  beginCheckInBefore        Int       @default(60) @map("begin_check_in_before") // minutes
  allowCheckOutAfter        Int       @default(60) @map("allow_check_out_after")
  processAttendanceAfter    DateTime? @map("process_attendance_after")
  lastSyncOfCheckin         DateTime? @map("last_sync_of_checkin")
  workingHoursThresholdAbsent Float   @default(0) @map("working_hours_threshold_absent")
  workingHoursThresholdHalfDay Float  @default(4) @map("working_hours_threshold_half_day")
  lateEntryGracePeriod      Int       @default(0) @map("late_entry_grace_period")
  earlyExitGracePeriod      Int       @default(0) @map("early_exit_grace_period")
  enableEntryGracePeriod    Boolean   @default(false) @map("enable_entry_grace_period")
  enableExitGracePeriod     Boolean   @default(false) @map("enable_exit_grace_period")
  color                     String?
  isActive                  Boolean   @default(true) @map("is_active")
  createdAt                 DateTime  @default(now()) @map("created_at")
  updatedAt                 DateTime  @updatedAt @map("updated_at")
  
  tenant         Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  holidayList    HolidayList?      @relation(fields: [holidayListId], references: [id], onDelete: SetNull)
  assignments    ShiftAssignment[]
  
  @@unique([tenantId, name])
  @@map("shift_types")
}

model ShiftAssignment {
  id          String    @id @default(cuid())
  tenantId    String    @map("tenant_id")
  employeePin String    @map("employee_pin")
  shiftTypeId String    @map("shift_type_id")
  startDate   DateTime  @map("start_date")
  endDate     DateTime? @map("end_date")
  status      String    @default("Active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  tenant    Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  shiftType ShiftType @relation(fields: [shiftTypeId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, employeePin, startDate])
  @@index([tenantId, employeePin])
  @@map("shift_assignments")
}

// Attendance Request
model AttendanceRequest {
  id          String          @id @default(cuid())
  tenantId    String          @map("tenant_id")
  employeePin String          @map("employee_pin")
  fromDate    DateTime        @map("from_date")
  toDate      DateTime        @map("to_date")
  halfDay     Boolean         @default(false) @map("half_day")
  reason      String
  status      LeaveStatus     @default(DRAFT)
  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, employeePin])
  @@map("attendance_requests")
}
```

### Phase 2: Organization

```prisma
// Department
model Department {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  name              String
  parentDepartment  String?  @map("parent_department")
  company           String?
  isGroup           Boolean  @default(false) @map("is_group")
  disabled          Boolean  @default(false)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("departments")
}

// Designation
model Designation {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("designations")
}

// Branch
model Branch {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String
  address     String?
  city        String?
  state       String?
  country     String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("branches")
}

// Employment Type
model EmploymentType {
  id          String   @id @default(cuid())
  tenantId    String   @map("tenant_id")
  name        String   // Full-time, Part-time, Contract, Intern
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("employment_types")
}

// Employee Grade
model EmployeeGrade {
  id               String   @id @default(cuid())
  tenantId         String   @map("tenant_id")
  name             String
  defaultLeavePolicy String? @map("default_leave_policy")
  defaultSalaryStructure String? @map("default_salary_structure")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("employee_grades")
}
```

### Phase 3: Payroll

```prisma
// Salary Component
enum ComponentType {
  EARNING
  DEDUCTION
}

model SalaryComponent {
  id                    String        @id @default(cuid())
  tenantId              String        @map("tenant_id")
  name                  String
  abbr                  String
  type                  ComponentType
  isPayableOnProvisionalSalary Boolean @default(false) @map("is_payable_on_provisional")
  isFlexibleBenefit     Boolean       @default(false) @map("is_flexible_benefit")
  dependsOnPaymentDays  Boolean       @default(false) @map("depends_on_payment_days")
  isTaxApplicable       Boolean       @default(true) @map("is_tax_applicable")
  deductFullTaxOn       Boolean       @default(false) @map("deduct_full_tax_on")
  roundingMethod        String        @default("Nearest Whole Number") @map("rounding_method")
  statistical Component  Boolean       @default(false) @map("statistical_component")
  doNotIncludeInTotal   Boolean       @default(false) @map("do_not_include_in_total")
  disabled              Boolean       @default(false)
  formula               String?       // Python expression
  amountBasedOnFormula  Boolean       @default(false) @map("amount_based_on_formula")
  condition             String?       // Python expression
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, name])
  @@map("salary_components")
}

// Salary Structure
model SalaryStructure {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  name              String
  company           String?
  letterHead        String?  @map("letter_head")
  isActive          Boolean  @default(true) @map("is_active")
  payrollFrequency  String   @default("Monthly") @map("payroll_frequency")
  hourRate          Float?   @map("hour_rate")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tenant      Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  earnings    SalaryDetail[]          @relation("earnings")
  deductions  SalaryDetail[]          @relation("deductions")
  assignments SalaryStructureAssignment[]
  
  @@unique([tenantId, name])
  @@map("salary_structures")
}

model SalaryDetail {
  id                String   @id @default(cuid())
  salaryStructureId String   @map("salary_structure_id")
  salaryComponentId String   @map("salary_component_id")
  type              ComponentType
  abbr              String
  formula           String?
  condition         String?
  amountBasedOnFormula Boolean @default(false) @map("amount_based_on_formula")
  amount            Float?
  dependsOnPaymentDays Boolean @default(false) @map("depends_on_payment_days")
  createdAt         DateTime @default(now()) @map("created_at")
  
  salaryStructure SalaryStructure @relation("earnings", fields: [salaryStructureId], references: [id], onDelete: Cascade)
  deductionStructure SalaryStructure? @relation("deductions", fields: [salaryStructureId], references: [id], onDelete: Cascade)
  
  @@map("salary_details")
}

// Salary Structure Assignment
model SalaryStructureAssignment {
  id                String   @id @default(cuid())
  tenantId          String   @map("tenant_id")
  employeePin       String   @map("employee_pin")
  salaryStructureId String   @map("salary_structure_id")
  fromDate          DateTime @map("from_date")
  toDate            DateTime? @map("to_date")
  base              Float?
  variableSalary    Float?   @map("variable_salary")
  income            Float?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  salaryStructure SalaryStructure @relation(fields: [salaryStructureId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, employeePin, fromDate])
  @@index([tenantId, employeePin])
  @@map("salary_structure_assignments")
}

// Salary Slip
enum SalarySlipStatus {
  DRAFT
  SUBMITTED
  CANCELLED
}

model SalarySlip {
  id                String           @id @default(cuid())
  tenantId          String           @map("tenant_id")
  employeePin       String           @map("employee_pin")
  employeeName      String           @map("employee_name")
  department        String?
  designation       String?
  month             Int
  year              Int
  startDate         DateTime         @map("start_date")
  endDate           DateTime         @map("end_date")
  paymentDays       Float            @map("payment_days")
  totalWorkingDays  Float            @map("total_working_days")
  leaveWithoutPay   Float            @default(0) @map("leave_without_pay")
  gross             Float
  totalEarning      Float            @map("total_earning")
  totalDeduction    Float            @map("total_deduction")
  netPay            Float            @map("net_pay")
  roundedTotal      Float            @map("rounded_total")
  status            SalarySlipStatus @default(DRAFT)
  postingDate       DateTime?        @map("posting_date")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")
  
  tenant    Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  earnings  SalarySlipEarning[]
  deductions SalarySlipDeduction[]
  
  @@unique([tenantId, employeePin, month, year])
  @@index([tenantId, employeePin])
  @@map("salary_slips")
}

model SalarySlipEarning {
  id            String     @id @default(cuid())
  salarySlipId  String     @map("salary_slip_id")
  componentId   String     @map("component_id")
  amount        Float
  createdAt     DateTime   @default(now()) @map("created_at")
  
  salarySlip SalarySlip @relation(fields: [salarySlipId], references: [id], onDelete: Cascade)
  
  @@map("salary_slip_earnings")
}

model SalarySlipDeduction {
  id            String     @id @default(cuid())
  salarySlipId  String     @map("salary_slip_id")
  componentId   String     @map("component_id")
  amount        Float
  createdAt     DateTime   @default(now()) @map("created_at")
  
  salarySlip SalarySlip @relation(fields: [salarySlipId], references: [id], onDelete: Cascade)
  
  @@map("salary_slip_deductions")
}
```

---

## 🎨 UI Components to Create

### Attendance & Leave Module
1. Leave Type Management
2. Leave Allocation Tool
3. Leave Application Form
4. Leave Approval Dashboard
5. Leave Balance Widget
6. My Leaves Page
7. Team Leaves Calendar

### Organization Module
1. Department Tree View
2. Designation List
3. Branch Management
4. Employment Type Setup
5. Employee Grade Setup
6. Enhanced Employee Profile

### Payroll Module
1. Salary Component Setup
2. Salary Structure Builder
3. Salary Structure Assignment
4. Payroll Entry (Monthly)
5. Salary Slip View
6. Payroll Reports

---

## 🔌 API Endpoints to Create

### Leave Management
```
POST   /api/portal/leave-types
GET    /api/portal/leave-types
PUT    /api/portal/leave-types/:id
DELETE /api/portal/leave-types/:id

POST   /api/portal/leave-allocations
GET    /api/portal/leave-allocations
GET    /api/portal/leave-allocations/balance/:employeePin

POST   /api/portal/leave-applications
GET    /api/portal/leave-applications
GET    /api/portal/leave-applications/my-leaves
PUT    /api/portal/leave-applications/:id/approve
PUT    /api/portal/leave-applications/:id/reject
DELETE /api/portal/leave-applications/:id
```

### Shift Management
```
POST   /api/portal/shift-types
GET    /api/portal/shift-types
PUT    /api/portal/shift-types/:id
DELETE /api/portal/shift-types/:id

POST   /api/portal/shift-assignments
GET    /api/portal/shift-assignments
GET    /api/portal/shift-assignments/employee/:pin
```

### Organization
```
POST   /api/portal/departments
GET    /api/portal/departments
GET    /api/portal/departments/tree

POST   /api/portal/designations
GET    /api/portal/designations

POST   /api/portal/branches
GET    /api/portal/branches
```

### Payroll
```
POST   /api/portal/salary-components
GET    /api/portal/salary-components

POST   /api/portal/salary-structures
GET    /api/portal/salary-structures

POST   /api/portal/salary-structures/:id/assign
GET    /api/portal/salary-structures/assignments/:employeePin

POST   /api/portal/payroll/process
GET    /api/portal/salary-slips
GET    /api/portal/salary-slips/:id
GET    /api/portal/salary-slips/my-slips
```

---

## 📱 Mobile App Features

1. My Attendance
2. Apply Leave
3. My Leave Balance
4. Approve Leaves
5. Salary Slip Download
6. Team Attendance View
7. Push Notifications

---

## 🔄 ERPNext Sync Features

### Bidirectional Sync
1. Employees
2. Departments
3. Designations
4. Leave Types
5. Leave Applications
6. Salary Structures
7. Attendance Records

### Webhook Support
```typescript
POST /api/webhooks/erpnext/employee-created
POST /api/webhooks/erpnext/leave-approved
POST /api/webhooks/erpnext/salary-slip-created
```

---

## 📊 Reports to Implement

### Attendance Reports
1. Monthly Attendance Sheet
2. Late Entry Report
3. Early Exit Report
4. Absent Report
5. Overtime Report
6. Shift-wise Attendance

### Leave Reports
1. Leave Balance Report
2. Leave Application Report
3. Leave Trend Analysis
4. Department-wise Leave Summary

### Payroll Reports
1. Salary Register
2. Bank Remittance Report
3. Tax Deduction Report
4. Component-wise Summary
5. Department-wise Payroll Cost

---

## 🚀 Quick Start Implementation

আমি এখন immediately start করব:

1. ✅ Phase 1 database migration create
2. ✅ Leave management backend API
3. ✅ Leave management frontend UI
4. ✅ Shift management enhancement
5. ✅ Organization management

Let's start coding! 🎯
