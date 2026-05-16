#!/usr/bin/env bash
# Simulate ZKTeco device pushing ATTLOG to local server
BASE_URL="${1:-http://localhost:7788}"
SN="${2:-TEST001}"

echo "GET handshake..."
curl -s "${BASE_URL}/iclock/cdata?SN=${SN}&options=all"

echo -e "\n\nPOST ATTLOG..."
curl -s -X POST "${BASE_URL}/iclock/cdata?SN=${SN}&table=ATTLOG" \
  -H "Content-Type: text/plain" \
  -d $'101\t2026-05-16 09:00:00\t0\t1\t0\t0
102\t2026-05-16 09:05:00\t0\t1\t1\t0'

echo -e "\n\nGET attendance (API)..."
curl -s -H "X-API-Key: change-me" "${BASE_URL}/api/attendance?limit=5"
