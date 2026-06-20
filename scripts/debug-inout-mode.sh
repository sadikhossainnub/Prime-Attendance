#!/bin/bash
# Debug inOutMode values in attendance_logs
# সমস্যা: সব punch IN হিসেবে যাচ্ছে

echo "🔍 Debugging inOutMode Values"
echo "=============================="
echo ""

# Check if database is accessible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Try to find the correct container name
# Common patterns: postgres, db, prime-attendance-postgres, etc.
CONTAINER_NAME=""

# Method 1: Check docker-compose service name
if docker compose ps postgres &> /dev/null; then
    CONTAINER_NAME=$(docker compose ps postgres -q | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER_NAME" --format "{{.Names}}")
        echo "✅ Found container via docker compose: $CONTAINER_NAME"
    fi
fi

# Method 2: Search by postgres image
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --filter "ancestor=postgres:16-alpine" --format "{{.Names}}" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "✅ Found postgres:16-alpine container: $CONTAINER_NAME"
    fi
fi

# Method 3: Search by any postgres
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps | grep postgres | awk '{print $NF}' | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "✅ Found postgres container: $CONTAINER_NAME"
    fi
fi

# Method 4: Check by service name pattern
if [ -z "$CONTAINER_NAME" ]; then
    CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "postgres|db" | head -1)
    if [ -n "$CONTAINER_NAME" ]; then
        echo "✅ Found container by name pattern: $CONTAINER_NAME"
    fi
fi

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ No postgres container found"
    echo ""
    echo "Available containers:"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    echo ""
    echo "Run: docker compose up -d"
    exit 1
fi

# Database credentials from docker-compose.yml
DB_USER="prime"
DB_NAME="prime_attendance"

echo ""
echo "Using:"
echo "  Container: $CONTAINER_NAME"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Query 1: Check inOutMode distribution
echo "📊 Query 1: inOutMode Distribution"
echo "-----------------------------------"
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
  CASE 
    WHEN in_out_mode = 0 THEN 'IN (0)'
    WHEN in_out_mode = 1 THEN 'OUT (1)'
    WHEN in_out_mode IS NULL THEN 'NULL'
    ELSE 'OTHER (' || in_out_mode || ')'
  END as punch_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM attendance_logs
GROUP BY in_out_mode
ORDER BY count DESC;
EOF

echo ""
echo "📋 Query 2: Recent 20 Punches with inOutMode"
echo "-----------------------------------"
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    WHEN in_out_mode IS NULL THEN 'NULL'
    ELSE 'OTHER'
  END as mode,
  in_out_mode as raw_value,
  sync_status,
  erpnext_checkin_id
FROM attendance_logs
ORDER BY punched_at DESC
LIMIT 20;
EOF

echo ""
echo "🔍 Query 3: Check Device Punch Type Configuration"
echo "-----------------------------------"
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
  sn,
  name,
  CASE 
    WHEN punch_type = 0 THEN 'BOTH (0)'
    WHEN punch_type = 1 THEN 'IN_ONLY (1)'
    WHEN punch_type = 2 THEN 'OUT_ONLY (2)'
    WHEN punch_type IS NULL THEN 'NULL (default BOTH)'
    ELSE 'OTHER (' || punch_type || ')'
  END as configured_type,
  punch_type as raw_value
FROM devices
ORDER BY created_at DESC;
EOF

echo ""
echo "💡 Query 4: Sample Punch Pattern for One Employee"
echo "-----------------------------------"
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME << 'EOF'
WITH sample_pin AS (
  SELECT user_pin 
  FROM attendance_logs 
  GROUP BY user_pin 
  HAVING COUNT(*) > 5 
  LIMIT 1
)
SELECT 
  a.user_pin,
  a.punched_at,
  CASE 
    WHEN a.in_out_mode = 0 THEN 'IN'
    WHEN a.in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode,
  a.in_out_mode as raw_value
FROM attendance_logs a
WHERE a.user_pin = (SELECT user_pin FROM sample_pin)
ORDER BY a.punched_at DESC
LIMIT 15;
EOF

echo ""
echo "=============================="
echo "🎯 Analysis Tips:"
echo ""
echo "1. Check 'inOutMode Distribution':"
echo "   - Should have mix of IN (0) and OUT (1)"
echo "   - If all NULL or all 0, there's a problem"
echo ""
echo "2. Check 'Device Punch Type Configuration':"
echo "   - BOTH (0) = Device handles IN/OUT alternating"
echo "   - IN_ONLY (1) = Only IN punches"
echo "   - OUT_ONLY (2) = Only OUT punches"
echo ""
echo "3. Check 'Sample Punch Pattern':"
echo "   - Should alternate: IN → OUT → IN → OUT"
echo "   - If all same, device or parsing issue"
echo ""
echo "4. Common Causes:"
echo "   - Device not configured for IN/OUT mode"
echo "   - Device in 'State' mode instead of 'IN/OUT' mode"
echo "   - iClock parser not extracting status field"
echo "   - Punch type filtering removing OUT punches"
echo ""
echo "📚 See: /TROUBLESHOOT_INOUT_MODE.md for solutions"
echo ""
