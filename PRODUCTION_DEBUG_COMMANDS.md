# Production Server Debug Commands
## Docker Compose Setup with Correct Credentials

Based on your `docker-compose.yml`:
- **Service:** postgres
- **Database:** prime_attendance
- **User:** prime
- **Password:** prime_secret

---

## 🚀 Quick Commands (Copy-Paste Ready)

### 1. Check Running Containers
```bash
cd /opt/Prime-Attendance
docker compose ps
```

### 2. Check inOutMode Distribution
```bash
cd /opt/Prime-Attendance
docker compose exec postgres psql -U prime -d prime_attendance -c "SELECT CASE WHEN in_out_mode = 0 THEN 'IN' WHEN in_out_mode = 1 THEN 'OUT' ELSE 'NULL' END as mode, COUNT(*) FROM attendance_logs GROUP BY in_out_mode;"
```

### 3. See Last 10 Punches
```bash
docker compose exec postgres psql -U prime -d prime_attendance -c "SELECT user_pin, punched_at, CASE WHEN in_out_mode = 0 THEN 'IN' WHEN in_out_mode = 1 THEN 'OUT' ELSE 'NULL' END as mode FROM attendance_logs ORDER BY punched_at DESC LIMIT 10;"
```

### 4. Interactive Database Access
```bash
docker compose exec postgres psql -U prime -d prime_attendance
```

Then inside psql:
```sql
-- Check distribution
SELECT 
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode,
  COUNT(*)
FROM attendance_logs
GROUP BY in_out_mode;

-- Exit
\q
```

### 5. Server Logs (Real-time)
```bash
cd /opt/Prime-Attendance

# All logs
docker compose logs -f

# Only ingest logs
docker compose logs -f | grep '\[ingest\]'

# Only erpnext logs
docker compose logs -f | grep '\[erpnext\]'

# Last 100 lines
docker compose logs --tail=100 server
```

### 6. Run Debug Script
```bash
cd /opt/Prime-Attendance/scripts
./debug-inout-mode.sh
```

### 7. Test Manual Punch
```bash
# Get your server IP/domain
SERVER_URL="http://localhost:7788"  # Change if different

# Test IN punch
curl -X POST "${SERVER_URL}/iclock/cdata?SN=YOUR_DEVICE_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 09:00:00	1	1	0	0"

# Test OUT punch
curl -X POST "${SERVER_URL}/iclock/cdata?SN=YOUR_DEVICE_SN&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d "101	2026-06-20 18:00:00	1	1	1	0"

# Check logs
docker compose logs --tail=20 server | grep ingest
```

---

## 🔍 Detailed Queries

### Check Today's Punches
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  user_pin,
  TO_CHAR(punched_at, 'HH24:MI:SS') as time,
  CASE 
    WHEN in_out_mode = 0 THEN '→ IN'
    WHEN in_out_mode = 1 THEN '← OUT'
    ELSE '? NULL'
  END as punch
FROM attendance_logs
WHERE DATE(punched_at) = CURRENT_DATE
ORDER BY punched_at DESC;
EOF
```

### Check Employee Punch Pattern
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  user_pin,
  punched_at,
  CASE 
    WHEN in_out_mode = 0 THEN 'IN'
    WHEN in_out_mode = 1 THEN 'OUT'
    ELSE 'NULL'
  END as mode
FROM attendance_logs
WHERE user_pin = '101'  -- Change PIN
ORDER BY punched_at DESC
LIMIT 20;
EOF
```

### Check Device Configuration
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  sn,
  name,
  CASE 
    WHEN punch_type = 0 THEN 'BOTH'
    WHEN punch_type = 1 THEN 'IN_ONLY'
    WHEN punch_type = 2 THEN 'OUT_ONLY'
    ELSE 'BOTH (default)'
  END as type,
  online,
  last_activity
FROM devices;
EOF
```

### Check Sync Status
```bash
docker compose exec postgres psql -U prime -d prime_attendance << 'EOF'
SELECT 
  sync_status,
  COUNT(*) as count
FROM attendance_logs
GROUP BY sync_status
ORDER BY count DESC;
EOF
```

---

## 🛠️ Common Tasks

### Restart Server
```bash
cd /opt/Prime-Attendance
docker compose restart server
```

### View All Logs
```bash
docker compose logs --tail=200
```

### Check Server Status
```bash
docker compose ps
docker compose top
```

### Database Backup
```bash
docker compose exec postgres pg_dump -U prime prime_attendance > backup_$(date +%Y%m%d).sql
```

### Database Restore
```bash
cat backup_20260620.sql | docker compose exec -T postgres psql -U prime -d prime_attendance
```

---

## 📊 Monitoring (Real-time)

### Watch Database Changes (every 2 seconds)
```bash
watch -n 2 'docker compose exec postgres psql -U prime -d prime_attendance -t -c "SELECT COUNT(*) as total, SUM(CASE WHEN in_out_mode=0 THEN 1 ELSE 0 END) as in_punches, SUM(CASE WHEN in_out_mode=1 THEN 1 ELSE 0 END) as out_punches FROM attendance_logs;"'
```

### Monitor Logs in Real-time
```bash
# Terminal 1: Server logs
docker compose logs -f server | grep --line-buffered -E '\[ingest\]|\[erpnext\]'

# Terminal 2: Database stats
watch -n 5 'docker compose exec postgres psql -U prime -d prime_attendance -t -c "SELECT CASE WHEN in_out_mode = 0 THEN '\''IN'\'' WHEN in_out_mode = 1 THEN '\''OUT'\'' ELSE '\''NULL'\'' END as mode, COUNT(*) FROM attendance_logs GROUP BY in_out_mode;"'
```

---

## 🔧 Troubleshooting

### If Container Not Found
```bash
# Check all containers
docker ps -a

# Check compose services
cd /opt/Prime-Attendance
docker compose ps -a

# Start containers
docker compose up -d

# Check logs for errors
docker compose logs
```

### If Database Connection Failed
```bash
# Check postgres health
docker compose exec postgres pg_isready -U prime -d prime_attendance

# Check connection from server
docker compose exec server sh -c 'psql $DATABASE_URL -c "SELECT 1;"'
```

### If Script Fails
```bash
# Make script executable
chmod +x /opt/Prime-Attendance/scripts/debug-inout-mode.sh

# Run with bash explicitly
bash /opt/Prime-Attendance/scripts/debug-inout-mode.sh

# Check script errors
bash -x /opt/Prime-Attendance/scripts/debug-inout-mode.sh
```

---

## 🎯 One-Liner Commands

```bash
# Quick health check
cd /opt/Prime-Attendance && docker compose ps && docker compose exec postgres psql -U prime -d prime_attendance -c "SELECT CASE WHEN in_out_mode = 0 THEN 'IN' WHEN in_out_mode = 1 THEN 'OUT' ELSE 'NULL' END as mode, COUNT(*) FROM attendance_logs GROUP BY in_out_mode;"

# Check if server is processing punches
docker compose logs --tail=50 server | grep -E 'ingest|erpnext'

# Count today's punches
docker compose exec postgres psql -U prime -d prime_attendance -t -c "SELECT COUNT(*) FROM attendance_logs WHERE DATE(punched_at) = CURRENT_DATE;"

# Check last punch time
docker compose exec postgres psql -U prime -d prime_attendance -t -c "SELECT MAX(punched_at) FROM attendance_logs;"
```

---

## 📝 Environment Variables

Check current configuration:
```bash
cd /opt/Prime-Attendance

# View environment
docker compose exec server env | grep -E 'DATABASE|JWT|ADMIN|ERPNEXT'

# Check .env file if exists
cat .env
```

---

## 🚨 Emergency Commands

### Stop Everything
```bash
cd /opt/Prime-Attendance
docker compose down
```

### Start Fresh
```bash
docker compose down
docker compose up -d
docker compose logs -f
```

### Reset Database (⚠️ DESTRUCTIVE)
```bash
docker compose down -v  # Removes volumes!
docker compose up -d
# Then run migrations
docker compose exec server npx prisma migrate deploy
```

---

## ✅ Success Indicators

**Good output from distribution query:**
```
 mode  | count
-------+-------
 IN    |  245
 OUT   |  238
```

**Good server logs:**
```
[ingest] ✅ Inserted: PIN 101, inOutMode: 0 (IN)
[ingest] ✅ Inserted: PIN 102, inOutMode: 1 (OUT)
[erpnext] ✅ Mapped log_type: IN
[erpnext] ✅ Mapped log_type: OUT
```

**Problem signs:**
```
 mode  | count
-------+-------
 NULL  |  500     ❌ Device not sending inOutMode
 IN    |  500     ❌ All punches are IN
```

---

## 📚 Additional Help

- `/INOUT_FIX_BANGLA.md` - Device configuration guide (Bengali)
- `/INOUT_MODE_FIX.md` - Complete troubleshooting (English)
- `/ERPNEXT_SYNC_TROUBLESHOOTING.md` - ERPNext sync issues

---

**Updated script now works with production server! 🎉**

Run: `cd /opt/Prime-Attendance/scripts && ./debug-inout-mode.sh`
