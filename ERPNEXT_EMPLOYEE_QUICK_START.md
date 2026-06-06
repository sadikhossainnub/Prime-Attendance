# ERPNext Employee Integration - Quick Start

## 🎉 সম্পন্ন!

ERPNext Employee integration সম্পূর্ণ হয়েছে। এখন আপনি:

### ✅ যা করতে পারবেন:

1. **ERPNext থেকে employee data fetch** করতে পারবেন
2. **All employee fields** একসাথে দেখতে এবং add করতে পারবেন
3. **Biometric/RFID device ID** mapping করতে পারবেন
4. **Auto-fill form** ERPNext data দিয়ে

## 🚀 দ্রুত শুরু করুন

### 1. ERPNext Configure করুন (যদি আগে না করে থাকেন)

```bash
# Go to Settings page in app
Settings > ERPNext Integration
- Enable ERPNext: ✓
- ERPNext URL: https://your-erpnext-site.com
- API Key: your_api_key
- API Secret: your_api_secret
- Save
```

### 2. ERPNext-এ Custom Field যোগ করুন

```
Customize Form > Employee
Add Custom Field:
- Field Name: attendance_device_id
- Field Type: Data
- Label: Attendance Device ID
```

### 3. Employee Import করুন

#### Method 1: ERPNext Import (সবচেয়ে সহজ)
```
Employees Page > "Import from ERPNext" button > Select Employee > Import
```

#### Method 2: Manual Entry
```
Employees Page > Show All Fields > Fill Form > Save
```

#### Method 3: CSV Import
```
Employees Page > Choose CSV File > Upload
```

## 📂 পরিবর্তিত Files

### Backend:
- ✅ `server/src/services/erpnext.ts` - ERPNext employee fetch functions
- ✅ `server/src/routes/portal.ts` - New API endpoints

### Frontend:
- ✅ `client/src/lib/api.ts` - API client functions
- ✅ `client/src/pages/Employees.tsx` - Full form UI + ERPNext import

### Documentation:
- ✅ `ERPNEXT_EMPLOYEE_INTEGRATION.md` - Complete guide
- ✅ `ERPNEXT_EMPLOYEE_QUICK_START.md` - This file

## 🔌 API Endpoints

```typescript
// Fetch all employees from ERPNext
GET /api/portal/employees/erpnext
Response: { success: true, count: number, employees: ErpnextEmployee[] }

// Fetch single employee
GET /api/portal/employees/erpnext/:employeeId
Response: { success: true, employee: ErpnextEmployee }
```

## 📋 Employee Fields

**Device & ID:**
- Device ID (PIN) - numeric ID on device
- Biometric/RF Tag ID - fingerprint/card ID
- ERPNext Employee ID

**Personal:**
- First/Middle/Last Name
- Gender
- Date of Birth
- Date of Joining
- Status

**Employment:**
- Company
- Department
- Designation
- Employment Type

**Contact:**
- Cell Number
- Personal Email
- Company Email

**Address:**
- Current Address
- Permanent Address

## 🎨 UI Features

### Quick Form Mode
- 3 basic fields (Device ID, Name, ERPNext ID)
- Fast entry

### Full Form Mode
- All fields organized in 5 sections
- Auto-fill name from first/middle/last
- Clear form button

### ERPNext Import
- Load employees modal
- See all employees in table
- Import with one click
- Auto-fills entire form

## 🔄 Build & Deploy

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build

# Deploy (if using Docker)
docker compose up -d --build
```

## ✅ সব ঠিক আছে কিনা চেক করুন

```bash
# Server build check
cd server && npm run build
# ✓ Should complete without errors

# Client build check
cd client && npm run build
# ✓ Should complete without errors

# Run locally (optional)
cd server && npm run dev
cd client && npm run dev
```

## 💡 Tips

1. **ERPNext field names** exactly match করতে হবে
2. **attendance_device_id** custom field না থাকলে যোগ করুন
3. **API credentials** সঠিক দিন
4. **Network access** ensure করুন ERPNext server-এ

## 🐛 Common Issues

**"ERPNext not enabled"**
→ Settings থেকে enable করুন

**"Failed to fetch employees"**  
→ API credentials check করুন

**Empty list**
→ ERPNext-এ employee আছে কিনা check করুন

## 📞 Support

Issues বা questions থাকলে:
- Check `ERPNEXT_EMPLOYEE_INTEGRATION.md` for details
- Check server logs: `docker compose logs -f server`
- Check browser console for frontend errors

---

**Ready to use! 🚀**
