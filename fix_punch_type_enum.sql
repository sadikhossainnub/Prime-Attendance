-- Fix PunchType enum issue
-- First, drop the incorrectly created column and index
DROP INDEX IF EXISTS idx_devices_punch_type;
ALTER TABLE devices DROP COLUMN IF EXISTS punch_type;

-- Create the enum type
CREATE TYPE "PunchType" AS ENUM ('BOTH', 'IN_ONLY', 'OUT_ONLY');

-- Add the column with the enum type
ALTER TABLE devices ADD COLUMN punch_type "PunchType" NOT NULL DEFAULT 'BOTH';

-- Create index with correct name
CREATE INDEX devices_punch_type_idx ON devices(punch_type);
