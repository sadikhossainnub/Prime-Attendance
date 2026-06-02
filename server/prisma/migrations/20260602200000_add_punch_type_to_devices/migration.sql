-- Add punch_type column to devices table
ALTER TABLE devices ADD COLUMN punch_type VARCHAR(10) DEFAULT 'BOTH';

-- Add comment for clarity
COMMENT ON COLUMN devices.punch_type IS 'BOTH: accepts all punches, IN_ONLY: accepts only in punches, OUT_ONLY: accepts only out punches';

-- Create index for filtering
CREATE INDEX idx_devices_punch_type ON devices(punch_type);
