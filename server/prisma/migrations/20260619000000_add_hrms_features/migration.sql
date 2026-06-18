-- CreateEnum for Leave Status
CREATE TYPE "LeaveStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum for Salary Component Type
CREATE TYPE "ComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum for Salary Slip Status
CREATE TYPE "SalarySlipStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');

-- =====================================================
-- LEAVE MANAGEMENT TABLES
-- =====================================================

-- Leave Types
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_leaves_allowed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "applicable_after" INTEGER NOT NULL DEFAULT 0,
    "max_continuous_days" INTEGER,
    "is_carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward_days" DOUBLE PRECISION,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "allow_negative" BOOLEAN NOT NULL DEFAULT false,
    "include_holidays" BOOLEAN NOT NULL DEFAULT false,
    "is_compensatory" BOOLEAN NOT NULL DEFAULT false,
    "is_paid_leave" BOOLEAN NOT NULL DEFAULT true,
    "fractional_grant" BOOLEAN NOT NULL DEFAULT false,
    "encashable" BOOLEAN NOT NULL DEFAULT false,
    "earned_leave_frequency" TEXT,
    "rounding_method" TEXT NOT NULL DEFAULT '0.5',
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- Leave Periods
CREATE TABLE "leave_periods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_periods_pkey" PRIMARY KEY ("id")
);

-- Leave Allocations
CREATE TABLE "leave_allocations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "leave_period_id" TEXT,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "new_leaves_allocated" DOUBLE PRECISION NOT NULL,
    "carried_forward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_leaves_allocated" DOUBLE PRECISION NOT NULL,
    "used_leaves" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expired_leaves" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unused_leaves" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_allocations_pkey" PRIMARY KEY ("id")
);

-- Leave Applications
CREATE TABLE "leave_applications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "leave_type_id" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_date" TIMESTAMP(3),
    "total_days" DOUBLE PRECISION NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT,
    "leave_approver" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "follow_via" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_applications_pkey" PRIMARY KEY ("id")
);

-- Holiday Lists
CREATE TABLE "holiday_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_lists_pkey" PRIMARY KEY ("id")
);

-- Holidays
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "holiday_list_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "is_weekly" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- SHIFT MANAGEMENT ENHANCEMENT
-- =====================================================

-- Shift Types
CREATE TABLE "shift_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "erpnext_shift_id" TEXT,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "holiday_list_id" TEXT,
    "enable_auto_attendance" BOOLEAN NOT NULL DEFAULT false,
    "determine_check_in_out" BOOLEAN NOT NULL DEFAULT true,
    "begin_check_in_before" INTEGER NOT NULL DEFAULT 60,
    "allow_check_out_after" INTEGER NOT NULL DEFAULT 60,
    "process_attendance_after" TIMESTAMP(3),
    "last_sync_of_checkin" TIMESTAMP(3),
    "working_hours_threshold_absent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "working_hours_threshold_half_day" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "late_entry_grace_period" INTEGER NOT NULL DEFAULT 0,
    "early_exit_grace_period" INTEGER NOT NULL DEFAULT 0,
    "enable_entry_grace_period" BOOLEAN NOT NULL DEFAULT false,
    "enable_exit_grace_period" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_types_pkey" PRIMARY KEY ("id")
);

-- Shift Assignments
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "shift_type_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- Attendance Requests
CREATE TABLE "attendance_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "half_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_requests_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- ORGANIZATION MANAGEMENT
-- =====================================================

-- Departments
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_department" TEXT,
    "company" TEXT,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- Designations
CREATE TABLE "designations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- Branches
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- Employment Types
CREATE TABLE "employment_types" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);

-- Employee Grades
CREATE TABLE "employee_grades" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_leave_policy" TEXT,
    "default_salary_structure" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_grades_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- PAYROLL MANAGEMENT
-- =====================================================

-- Salary Components
CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "is_payable_on_provisional" BOOLEAN NOT NULL DEFAULT false,
    "is_flexible_benefit" BOOLEAN NOT NULL DEFAULT false,
    "depends_on_payment_days" BOOLEAN NOT NULL DEFAULT false,
    "is_tax_applicable" BOOLEAN NOT NULL DEFAULT true,
    "deduct_full_tax_on" BOOLEAN NOT NULL DEFAULT false,
    "rounding_method" TEXT NOT NULL DEFAULT 'Nearest Whole Number',
    "statistical_component" BOOLEAN NOT NULL DEFAULT false,
    "do_not_include_in_total" BOOLEAN NOT NULL DEFAULT false,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "formula" TEXT,
    "amount_based_on_formula" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- Salary Structures
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "letter_head" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "payroll_frequency" TEXT NOT NULL DEFAULT 'Monthly',
    "hour_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- Salary Details
CREATE TABLE "salary_details" (
    "id" TEXT NOT NULL,
    "salary_structure_id" TEXT NOT NULL,
    "salary_component_id" TEXT NOT NULL,
    "type" "ComponentType" NOT NULL,
    "abbr" TEXT NOT NULL,
    "formula" TEXT,
    "condition" TEXT,
    "amount_based_on_formula" BOOLEAN NOT NULL DEFAULT false,
    "amount" DOUBLE PRECISION,
    "depends_on_payment_days" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_details_pkey" PRIMARY KEY ("id")
);

-- Salary Structure Assignments
CREATE TABLE "salary_structure_assignments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "salary_structure_id" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3),
    "base" DOUBLE PRECISION,
    "variable_salary" DOUBLE PRECISION,
    "income" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structure_assignments_pkey" PRIMARY KEY ("id")
);

-- Salary Slips
CREATE TABLE "salary_slips" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_pin" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "payment_days" DOUBLE PRECISION NOT NULL,
    "total_working_days" DOUBLE PRECISION NOT NULL,
    "leave_without_pay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross" DOUBLE PRECISION NOT NULL,
    "total_earning" DOUBLE PRECISION NOT NULL,
    "total_deduction" DOUBLE PRECISION NOT NULL,
    "net_pay" DOUBLE PRECISION NOT NULL,
    "rounded_total" DOUBLE PRECISION NOT NULL,
    "status" "SalarySlipStatus" NOT NULL DEFAULT 'DRAFT',
    "posting_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_slips_pkey" PRIMARY KEY ("id")
);

-- Salary Slip Earnings
CREATE TABLE "salary_slip_earnings" (
    "id" TEXT NOT NULL,
    "salary_slip_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_slip_earnings_pkey" PRIMARY KEY ("id")
);

-- Salary Slip Deductions
CREATE TABLE "salary_slip_deductions" (
    "id" TEXT NOT NULL,
    "salary_slip_id" TEXT NOT NULL,
    "component_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_slip_deductions_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- UNIQUE CONSTRAINTS & INDEXES
-- =====================================================

-- Leave Types
CREATE UNIQUE INDEX "leave_types_tenant_id_name_key" ON "leave_types"("tenant_id", "name");

-- Leave Periods
CREATE UNIQUE INDEX "leave_periods_tenant_id_name_key" ON "leave_periods"("tenant_id", "name");

-- Leave Allocations
CREATE UNIQUE INDEX "leave_allocations_tenant_id_employee_pin_leave_type_id_leave_period_id_key" 
ON "leave_allocations"("tenant_id", "employee_pin", "leave_type_id", "leave_period_id");
CREATE INDEX "leave_allocations_tenant_id_employee_pin_idx" ON "leave_allocations"("tenant_id", "employee_pin");

-- Leave Applications
CREATE INDEX "leave_applications_tenant_id_employee_pin_idx" ON "leave_applications"("tenant_id", "employee_pin");
CREATE INDEX "leave_applications_status_idx" ON "leave_applications"("status");

-- Holiday Lists
CREATE UNIQUE INDEX "holiday_lists_tenant_id_name_key" ON "holiday_lists"("tenant_id", "name");

-- Holidays
CREATE INDEX "holidays_holiday_list_id_date_idx" ON "holidays"("holiday_list_id", "date");

-- Shift Types
CREATE UNIQUE INDEX "shift_types_tenant_id_name_key" ON "shift_types"("tenant_id", "name");

-- Shift Assignments
CREATE UNIQUE INDEX "shift_assignments_tenant_id_employee_pin_start_date_key" 
ON "shift_assignments"("tenant_id", "employee_pin", "start_date");
CREATE INDEX "shift_assignments_tenant_id_employee_pin_idx" ON "shift_assignments"("tenant_id", "employee_pin");

-- Attendance Requests
CREATE INDEX "attendance_requests_tenant_id_employee_pin_idx" ON "attendance_requests"("tenant_id", "employee_pin");

-- Departments
CREATE UNIQUE INDEX "departments_tenant_id_name_key" ON "departments"("tenant_id", "name");

-- Designations
CREATE UNIQUE INDEX "designations_tenant_id_name_key" ON "designations"("tenant_id", "name");

-- Branches
CREATE UNIQUE INDEX "branches_tenant_id_name_key" ON "branches"("tenant_id", "name");

-- Employment Types
CREATE UNIQUE INDEX "employment_types_tenant_id_name_key" ON "employment_types"("tenant_id", "name");

-- Employee Grades
CREATE UNIQUE INDEX "employee_grades_tenant_id_name_key" ON "employee_grades"("tenant_id", "name");

-- Salary Components
CREATE UNIQUE INDEX "salary_components_tenant_id_name_key" ON "salary_components"("tenant_id", "name");

-- Salary Structures
CREATE UNIQUE INDEX "salary_structures_tenant_id_name_key" ON "salary_structures"("tenant_id", "name");

-- Salary Structure Assignments
CREATE UNIQUE INDEX "salary_structure_assignments_tenant_id_employee_pin_from_date_key" 
ON "salary_structure_assignments"("tenant_id", "employee_pin", "from_date");
CREATE INDEX "salary_structure_assignments_tenant_id_employee_pin_idx" 
ON "salary_structure_assignments"("tenant_id", "employee_pin");

-- Salary Slips
CREATE UNIQUE INDEX "salary_slips_tenant_id_employee_pin_month_year_key" 
ON "salary_slips"("tenant_id", "employee_pin", "month", "year");
CREATE INDEX "salary_slips_tenant_id_employee_pin_idx" ON "salary_slips"("tenant_id", "employee_pin");

-- =====================================================
-- FOREIGN KEY CONSTRAINTS
-- =====================================================

-- Leave Types
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Leave Periods
ALTER TABLE "leave_periods" ADD CONSTRAINT "leave_periods_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Leave Allocations
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_leave_type_id_fkey" 
FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_allocations" ADD CONSTRAINT "leave_allocations_leave_period_id_fkey" 
FOREIGN KEY ("leave_period_id") REFERENCES "leave_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Leave Applications
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_applications" ADD CONSTRAINT "leave_applications_leave_type_id_fkey" 
FOREIGN KEY ("leave_type_id") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Holiday Lists
ALTER TABLE "holiday_lists" ADD CONSTRAINT "holiday_lists_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Holidays
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_holiday_list_id_fkey" 
FOREIGN KEY ("holiday_list_id") REFERENCES "holiday_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Shift Types
ALTER TABLE "shift_types" ADD CONSTRAINT "shift_types_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_types" ADD CONSTRAINT "shift_types_holiday_list_id_fkey" 
FOREIGN KEY ("holiday_list_id") REFERENCES "holiday_lists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Shift Assignments
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_type_id_fkey" 
FOREIGN KEY ("shift_type_id") REFERENCES "shift_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Attendance Requests
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Departments
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Designations
ALTER TABLE "designations" ADD CONSTRAINT "designations_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Branches
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Employment Types
ALTER TABLE "employment_types" ADD CONSTRAINT "employment_types_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Employee Grades
ALTER TABLE "employee_grades" ADD CONSTRAINT "employee_grades_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Components
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Structures
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Details
ALTER TABLE "salary_details" ADD CONSTRAINT "salary_details_salary_structure_id_fkey" 
FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Structure Assignments
ALTER TABLE "salary_structure_assignments" ADD CONSTRAINT "salary_structure_assignments_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_structure_assignments" ADD CONSTRAINT "salary_structure_assignments_salary_structure_id_fkey" 
FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Slips
ALTER TABLE "salary_slips" ADD CONSTRAINT "salary_slips_tenant_id_fkey" 
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Slip Earnings
ALTER TABLE "salary_slip_earnings" ADD CONSTRAINT "salary_slip_earnings_salary_slip_id_fkey" 
FOREIGN KEY ("salary_slip_id") REFERENCES "salary_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Salary Slip Deductions
ALTER TABLE "salary_slip_deductions" ADD CONSTRAINT "salary_slip_deductions_salary_slip_id_fkey" 
FOREIGN KEY ("salary_slip_id") REFERENCES "salary_slips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
