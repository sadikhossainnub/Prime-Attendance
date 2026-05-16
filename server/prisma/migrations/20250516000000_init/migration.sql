-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "name" TEXT,
    "last_seen_at" TIMESTAMP(3),
    "last_ip" TEXT,
    "firmware" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_logs" (
    "id" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "employee_mappings" (
    "id" TEXT NOT NULL,
    "user_pin" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "erpnext_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_raw_events" (
    "id" TEXT NOT NULL,
    "device_sn" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" TEXT,
    "body_preview" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_raw_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE INDEX "attendance_logs_punched_at_idx" ON "attendance_logs"("punched_at");

-- CreateIndex
CREATE INDEX "attendance_logs_device_sn_idx" ON "attendance_logs"("device_sn");

-- CreateIndex
CREATE INDEX "attendance_logs_user_pin_idx" ON "attendance_logs"("user_pin");

-- CreateIndex
CREATE INDEX "attendance_logs_sync_status_idx" ON "attendance_logs"("sync_status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_device_sn_user_pin_punched_at_key" ON "attendance_logs"("device_sn", "user_pin", "punched_at");

-- CreateIndex
CREATE UNIQUE INDEX "employee_mappings_user_pin_key" ON "employee_mappings"("user_pin");

-- CreateIndex
CREATE INDEX "device_raw_events_device_sn_idx" ON "device_raw_events"("device_sn");

-- CreateIndex
CREATE INDEX "device_raw_events_created_at_idx" ON "device_raw_events"("created_at");
