-- Multi-tenant migration (fresh deploy; drops old single-tenant tables)

DROP TABLE IF EXISTS "device_raw_events" CASCADE;
DROP TABLE IF EXISTS "employee_mappings" CASCADE;
DROP TABLE IF EXISTS "attendance_logs" CASCADE;
DROP TABLE IF EXISTS "devices" CASCADE;

DROP TYPE IF EXISTS "SyncStatus";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER');
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'BUSINESS', 'ENTERPRISE');
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "plan" "TenantPlan" NOT NULL DEFAULT 'STARTER',
    "device_provision_key" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tenant_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "name" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "last_ip" TEXT,
    "firmware" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "device_sn" TEXT NOT NULL,
    "user_pin" TEXT NOT NULL,
    "punched_at" TIMESTAMP(3) NOT NULL,
    "status" INTEGER,
    "verify_type" INTEGER,
    "in_out_mode" INTEGER,
    "work_code" INTEGER,
    "raw_line" TEXT,
    "sync_status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "erpnext_checkin_id" TEXT,
    "synced_at" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_mappings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_pin" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "erpnext_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employee_mappings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "device_raw_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "device_sn" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" TEXT,
    "body_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_raw_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "devices_tenant_id_serial_number_key" ON "devices"("tenant_id", "serial_number");
CREATE UNIQUE INDEX "attendance_logs_tenant_id_device_sn_user_pin_punched_at_key" ON "attendance_logs"("tenant_id", "device_sn", "user_pin", "punched_at");
CREATE UNIQUE INDEX "employee_mappings_tenant_id_user_pin_key" ON "employee_mappings"("tenant_id", "user_pin");

CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");
CREATE INDEX "devices_tenant_id_idx" ON "devices"("tenant_id");
CREATE INDEX "attendance_logs_tenant_id_punched_at_idx" ON "attendance_logs"("tenant_id", "punched_at");
CREATE INDEX "attendance_logs_device_sn_idx" ON "attendance_logs"("device_sn");
CREATE INDEX "attendance_logs_user_pin_idx" ON "attendance_logs"("user_pin");
CREATE INDEX "attendance_logs_sync_status_idx" ON "attendance_logs"("sync_status");
CREATE INDEX "device_raw_events_tenant_id_idx" ON "device_raw_events"("tenant_id");
CREATE INDEX "device_raw_events_device_sn_idx" ON "device_raw_events"("device_sn");
CREATE INDEX "device_raw_events_created_at_idx" ON "device_raw_events"("created_at");

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_mappings" ADD CONSTRAINT "employee_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_raw_events" ADD CONSTRAINT "device_raw_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
