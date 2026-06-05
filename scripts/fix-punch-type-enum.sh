#!/bin/bash

# Fix PunchType enum in database
# Run this from /opt/Prime-Attendance

echo "🔧 Fixing PunchType enum issue..."

# Apply SQL fix
echo "Applying database fix..."
docker compose exec -T postgres psql -U admin -d prime_attendance << 'EOF'
-- Drop the incorrectly created column and index
DROP INDEX IF EXISTS idx_devices_punch_type;
ALTER TABLE devices DROP COLUMN IF EXISTS punch_type;

-- Create the enum type
CREATE TYPE "PunchType" AS ENUM ('BOTH', 'IN_ONLY', 'OUT_ONLY');

-- Add the column with the enum type
ALTER TABLE devices ADD COLUMN punch_type "PunchType" NOT NULL DEFAULT 'BOTH';

-- Create index
CREATE INDEX devices_punch_type_idx ON devices(punch_type);
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database fix applied successfully"
    
    # Regenerate Prisma client
    echo "Regenerating Prisma client..."
    docker compose exec server npx prisma generate
    
    # Restart server
    echo "Restarting server..."
    docker compose restart server
    
    echo "✅ Fix complete! Monitoring logs..."
    echo "Press Ctrl+C to stop watching logs"
    docker compose logs -f server
else
    echo "❌ Failed to apply database fix"
    exit 1
fi
