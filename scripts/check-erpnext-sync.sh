#!/bin/bash

# ERPNext Sync Status Checker
# Usage: ./check-erpnext-sync.sh [option]

CONTAINER_NAME="prime-attendance-server-1"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  ERPNext Sync Log Checker"
echo "=========================================="
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Container $CONTAINER_NAME is not running!${NC}"
    exit 1
fi

case "${1:-summary}" in
    live|watch)
        echo -e "${BLUE}📡 Live monitoring ERPNext sync logs...${NC}"
        echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
        echo ""
        docker logs -f "$CONTAINER_NAME" 2>&1 | grep --line-buffered -i erpnext
        ;;
    
    errors)
        echo -e "${RED}❌ Showing ERPNext Errors:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -i "erpnext.*error" | tail -20
        ;;
    
    success)
        echo -e "${GREEN}✅ Showing Successful Syncs:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -i "Employee Checkin created successfully" | tail -20
        ;;
    
    today)
        echo -e "${BLUE}📅 Today's ERPNext Logs:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --since $(date +%Y-%m-%d) 2>&1 | grep -i erpnext | tail -50
        ;;
    
    last)
        LINES=${2:-50}
        echo -e "${BLUE}📋 Last $LINES ERPNext Logs:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --tail 500 2>&1 | grep -i erpnext | tail -"$LINES"
        ;;
    
    summary)
        echo -e "${BLUE}📊 ERPNext Sync Summary:${NC}"
        echo ""
        
        TOTAL=$(docker logs "$CONTAINER_NAME" --since 24h 2>&1 | grep -c "Syncing Employee Checkin")
        SUCCESS=$(docker logs "$CONTAINER_NAME" --since 24h 2>&1 | grep -c "Employee Checkin created successfully")
        ERRORS=$(docker logs "$CONTAINER_NAME" --since 24h 2>&1 | grep -c "ERPNext API error")
        
        echo -e "  ${BLUE}Total Sync Attempts (24h):${NC} $TOTAL"
        echo -e "  ${GREEN}Successful Syncs:${NC} $SUCCESS"
        echo -e "  ${RED}Failed Syncs:${NC} $ERRORS"
        echo ""
        
        if [ "$ERRORS" -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Recent Errors:${NC}"
            docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -i "ERPNext API error" | tail -5
            echo ""
        fi
        
        if [ "$SUCCESS" -gt 0 ]; then
            echo -e "${GREEN}✅ Recent Successful Syncs:${NC}"
            docker logs "$CONTAINER_NAME" --tail 100 2>&1 | grep -i "Employee Checkin created successfully" | tail -3
        fi
        ;;
    
    payload)
        echo -e "${BLUE}📦 Recent Sync Payloads:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -A 5 "Syncing Employee Checkin" | tail -30
        ;;
    
    response)
        echo -e "${BLUE}📥 Recent API Responses:${NC}"
        echo ""
        docker logs "$CONTAINER_NAME" --tail 200 2>&1 | grep -A 3 "Response:" | tail -30
        ;;
    
    help|*)
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  summary     - Show sync statistics (default)"
        echo "  live        - Live monitoring of ERPNext logs"
        echo "  errors      - Show only error logs"
        echo "  success     - Show only successful syncs"
        echo "  today       - Show today's logs"
        echo "  last [N]    - Show last N logs (default 50)"
        echo "  payload     - Show sync request payloads"
        echo "  response    - Show API responses"
        echo "  help        - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0                 # Show summary"
        echo "  $0 live           # Live monitoring"
        echo "  $0 errors         # Show errors only"
        echo "  $0 last 100       # Show last 100 logs"
        ;;
esac

echo ""
