#!/bin/bash
# ERPNext Sync Test Script
# তারিখ: ২০ জুন ২০২৬

set -e

echo "🧪 ERPNext Sync Test Starting..."
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
AUTH_TOKEN="${AUTH_TOKEN:-your_token_here}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check if AUTH_TOKEN is set
if [ "$AUTH_TOKEN" = "your_token_here" ]; then
    print_error "Please set AUTH_TOKEN environment variable"
    echo ""
    echo "Example:"
    echo "  export AUTH_TOKEN='eyJhbGc...'"
    echo "  ./scripts/test-erpnext-sync.sh"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Check Sync Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  "$API_URL/api/portal/sync-status")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    print_success "Sync status API working"
    
    # Parse JSON (requires jq)
    if command -v jq &> /dev/null; then
        echo ""
        echo "📊 Statistics:"
        echo "$BODY" | jq -r '"  Total Logs: \(.totalLogs)
  Synced: \(.synced)
  Pending: \(.pending)
  Failed: \(.failed)
  Skipped: \(.skipped)
  Permanently Failed: \(.permanentlyFailed)"'
    else
        print_warning "Install 'jq' to see formatted statistics"
        echo "$BODY"
    fi
else
    print_error "Sync status API failed (HTTP $HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Trigger Sync Retry"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Do you want to trigger sync retry? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL/api/portal/sync-retry")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Sync retry triggered"
        
        if command -v jq &> /dev/null; then
            echo ""
            MESSAGE=$(echo "$BODY" | jq -r '.message')
            COUNT=$(echo "$BODY" | jq -r '.count')
            echo "  Message: $MESSAGE"
            echo "  Count: $COUNT logs"
        else
            echo "$BODY"
        fi
    else
        print_error "Sync retry failed (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
else
    print_info "Skipped sync retry"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Verify Shift (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Enter ERPNext Employee ID to check (or press Enter to skip): " EMPLOYEE_ID
if [ -n "$EMPLOYEE_ID" ]; then
    TODAY=$(date +%Y-%m-%d)
    
    RESPONSE=$(curl -s -w "\n%{http_code}" \
      -X POST \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"employeeId\": \"$EMPLOYEE_ID\", \"date\": \"$TODAY\"}" \
      "$API_URL/api/portal/verify-shift")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Shift verification completed"
        
        if command -v jq &> /dev/null; then
            echo ""
            HAS_SHIFT=$(echo "$BODY" | jq -r '.hasShift')
            MESSAGE=$(echo "$BODY" | jq -r '.message')
            
            if [ "$HAS_SHIFT" = "true" ]; then
                print_success "Employee has shift assignment"
                echo "  $MESSAGE"
                
                SHIFT_TYPE=$(echo "$BODY" | jq -r '.shiftAssignment.shift_type // "N/A"')
                echo "  Shift: $SHIFT_TYPE"
            else
                print_warning "No shift assignment found"
                echo "  $MESSAGE"
            fi
        else
            echo "$BODY"
        fi
    else
        print_error "Shift verification failed (HTTP $HTTP_CODE)"
        echo "$BODY"
    fi
else
    print_info "Skipped shift verification"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Check Recent Logs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v jq &> /dev/null; then
    # Get recent logs from sync status
    RESPONSE=$(curl -s \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      "$API_URL/api/portal/sync-status")
    
    RECENT_COUNT=$(echo "$RESPONSE" | jq '.recentLogs | length')
    print_info "Found $RECENT_COUNT recent logs"
    
    echo ""
    echo "Recent sync errors (if any):"
    echo "$RESPONSE" | jq -r '.recentLogs[] | select(.syncStatus == "FAILED" or .syncStatus == "PERMANENTLY_FAILED") | "  [\(.syncStatus)] PIN: \(.userPin) | Error: \(.syncError // "N/A")"' | head -5
    
    if [ $? -ne 0 ]; then
        print_success "No recent sync errors found"
    fi
else
    print_warning "Install 'jq' to see recent logs"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "All tests completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 For more troubleshooting, see:"
echo "  - ERPNEXT_SYNC_TROUBLESHOOTING.md"
echo "  - SYNC_FIX_BN.md"
echo ""
