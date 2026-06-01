#!/bin/bash

# Device Connectivity Debugging Script
# Usage: ./scripts/debug-device.sh <server-url> <device-sn> [tenant-slug] [provision-key]

set -e

SERVER_URL="${1:-http://localhost:7788}"
DEVICE_SN="${2:-TEST001}"
TENANT_SLUG="${3:-}"
PROVISION_KEY="${4:-}"

echo "=========================================="
echo "Device Connectivity Debug"
echo "=========================================="
echo "Server URL: $SERVER_URL"
echo "Device SN: $DEVICE_SN"
echo ""

# Test 1: Server connectivity
echo "[1/5] Testing server connectivity..."
if curl -s -m 5 "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "✓ Server is reachable"
else
    echo "✗ Server is NOT reachable"
    echo "  Check: Is server running? Is port 7788 open?"
    exit 1
fi

# Test 2: Ping endpoint
echo ""
echo "[2/5] Testing /iclock/ping endpoint..."
PING_URL="$SERVER_URL/iclock/ping?SN=$DEVICE_SN"
if curl -s -m 5 "$PING_URL" | grep -q "OK"; then
    echo "✓ Ping successful"
else
    echo "✗ Ping failed"
    echo "  URL: $PING_URL"
fi

# Test 3: cdata GET (options)
echo ""
echo "[3/5] Testing /iclock/cdata GET (options)..."
CDATA_URL="$SERVER_URL/iclock/cdata?SN=$DEVICE_SN&table=options"
RESPONSE=$(curl -s -m 5 "$CDATA_URL")
if echo "$RESPONSE" | grep -q "PrimeAttendance"; then
    echo "✓ Options response received"
    echo "  Response preview:"
    echo "$RESPONSE" | head -3
else
    echo "✗ Options response failed"
    echo "  Response: $RESPONSE"
fi

# Test 4: cdata POST (simulate ATTLOG)
echo ""
echo "[4/5] Testing /iclock/cdata POST (ATTLOG simulation)..."
ATTLOG_DATA=$'101\t2026-06-01 10:00:00\t0\t1\t0\t0'

if [ -n "$TENANT_SLUG" ] && [ -n "$PROVISION_KEY" ]; then
    ATTLOG_URL="$SERVER_URL/iclock/cdata?SN=$DEVICE_SN&table=ATTLOG&tenant=$TENANT_SLUG&key=$PROVISION_KEY"
else
    ATTLOG_URL="$SERVER_URL/iclock/cdata?SN=$DEVICE_SN&table=ATTLOG"
fi

RESPONSE=$(curl -s -m 5 -X POST "$ATTLOG_URL" \
    -H "Content-Type: text/plain" \
    -d "$ATTLOG_DATA")

if echo "$RESPONSE" | grep -q "OK"; then
    echo "✓ ATTLOG POST successful"
    echo "  Response: $RESPONSE"
else
    echo "✗ ATTLOG POST failed"
    echo "  Response: $RESPONSE"
    if echo "$RESPONSE" | grep -q "ERROR: Device not registered"; then
        echo ""
        echo "  Device not registered! Options:"
        echo "  1. Add device in portal first"
        echo "  2. Use provision key: ?tenant=$TENANT_SLUG&key=$PROVISION_KEY"
    fi
fi

# Test 5: Raw events check
echo ""
echo "[5/5] Checking raw events..."
echo "  Note: Raw events require authentication"
echo "  Check in UI: Raw Events page"

echo ""
echo "=========================================="
echo "Debug Summary"
echo "=========================================="
echo "If all tests passed:"
echo "  ✓ Device can connect to server"
echo "  ✓ Server is responding correctly"
echo "  ✓ ATTLOG data is being received"
echo ""
echo "Next steps:"
echo "  1. Check UI → Raw Events (should show requests)"
echo "  2. Check UI → Devices (should show device as Online)"
echo "  3. Check database: npx prisma studio → Device table"
echo ""
echo "If device shows offline:"
echo "  - Check lastSeenAt timestamp in database"
echo "  - Ensure device is sending requests regularly"
echo "  - Check server logs: npm run dev"
echo ""
