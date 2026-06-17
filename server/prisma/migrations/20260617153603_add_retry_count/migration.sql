-- Add PERMANENTLY_FAILED to SyncStatus enum
ALTER TYPE "SyncStatus" ADD VALUE IF NOT EXISTS 'PERMANENTLY_FAILED';

-- Add sync_retry_count field to attendance_logs table
ALTER TABLE "attendance_logs" ADD COLUMN "sync_retry_count" INTEGER NOT NULL DEFAULT 0;
