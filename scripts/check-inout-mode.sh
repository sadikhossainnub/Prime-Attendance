#!/usr/bin/env bash
# Check inOutMode distribution in attendance logs

echo "=== Checking inOutMode in Database ==="
echo ""

docker exec prime-attendance-db-1 psql -U primeuser -d prime_attendance -c "
SELECT 
  in_out_mode,
  COUNT(*) as count,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'UNKNOWN'
  END as type
FROM attendance_logs 
GROUP BY in_out_mode 
ORDER BY in_out_mode;
"

echo ""
echo "=== Sample Records with inOutMode ==="
echo ""

docker exec prime-attendance-db-1 psql -U primeuser -d prime_attendance -c "
SELECT 
  user_pin,
  punched_at,
  in_out_mode,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'UNKNOWN'
  END as type,
  sync_status,
  erpnext_checkin_id
FROM attendance_logs 
ORDER BY punched_at DESC 
LIMIT 10;
"

echo ""
echo "=== ERPNext Sync Log Samples ==="
echo ""

docker logs prime-attendance-server-1 2>&1 | grep -A 3 "Syncing Employee Checkin" | tail -30
