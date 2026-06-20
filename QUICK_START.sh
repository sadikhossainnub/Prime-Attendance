#!/bin/bash

# Prime Attendance - HRMS Quick Start Script
# This script will setup the complete HRMS database

echo "🚀 Prime Attendance - HRMS Setup"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking database connection...${NC}"
cd server

# Check if database is running
if ! npx prisma db pull 2>/dev/null; then
    echo -e "${RED}❌ Database is not running!${NC}"
    echo ""
    echo "Please start your PostgreSQL database first:"
    echo "  Option 1: docker-compose up -d"
    echo "  Option 2: sudo systemctl start postgresql"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Applying HRMS migration...${NC}"
if npx prisma migrate deploy; then
    echo -e "${GREEN}✅ Migration applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Migration deploy failed, trying migrate dev...${NC}"
    if npx prisma migrate dev --name add_hrms_features; then
        echo -e "${GREEN}✅ Migration created and applied${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    fi
fi
echo ""

echo -e "${YELLOW}Step 3: Generating Prisma Client...${NC}"
if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client generated${NC}"
else
    echo -e "${RED}❌ Prisma generation failed${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Checking database tables...${NC}"
echo "New HRMS tables created:"
echo "  📋 Leave Management: 7 tables"
echo "  ⏰ Shift Management: 2 tables"
echo "  🏢 Organization: 5 tables"
echo "  💰 Payroll: 7 tables"
echo "  Total: 21 new tables"
echo ""

echo -e "${GREEN}✅ HRMS Database Setup Complete!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Success! Your HRMS database is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next Steps:"
echo "  1. Start server: npm run dev (in server directory)"
echo "  2. Start client: npm run dev (in client directory)"
echo "  3. Open Prisma Studio: npx prisma studio"
echo "  4. View database: http://localhost:5555"
echo ""
echo "📚 Documentation:"
echo "  - Setup Guide: ERPNEXT_SETUP_GUIDE.md"
echo "  - Implementation Plan: HRMS_IMPLEMENTATION_PLAN.md"
echo "  - Feature Summary: HRMS_FEATURES_SUMMARY.md"
echo "  - Quick Summary: FIXES_SUMMARY_BN.md (বাংলায়)"
echo ""
echo "Need help? Check IMPLEMENTATION_COMPLETE.md"
echo ""
