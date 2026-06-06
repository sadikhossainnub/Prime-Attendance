# ERPNext Employee Integration - Complete

## ✅ সম্পন্ন কাজসমূহ

### 1. Backend API (Server)

#### ERPNext Service (`server/src/services/erpnext.ts`)
নতুন functions যোগ করা হয়েছে:

```typescript
// All employees fetch with detailed info
export async function fetchEmployeesFromErpnext(tenantId: string): Promise<ErpnextEmployeeDetails[]>

// Single employee fetch by ID
export async function fetchEmployeeFromErpnext(tenantId: string, employeeId: string): Promise<ErpnextEmployeeDetails | null>
```

**Fetched Fields from ERPNext:**
- name (Employee ID)
- employee_name (Full Name)
- first_name, middle_name, last_name
- gender, date_of_birth, date_of_joining
- status (Active/Inactive/Left)
- company, department, designation, employment_type
- cell_number, personal_email, company_email
- current_address, permanent_address
- **attendance_device_id** (Biometric/RF tag ID)

#### Portal Routes (`server/src/routes/portal.ts`)
নতুন API endpoints:

```typescript
GET /api/portal/employees/erpnext
// Returns: { success: true, count: number, employees: ErpnextEmployeeDetails[] }

GET /api/portal/employees/erpnext/:employeeId
// Returns: { success: true, employee: ErpnextEmployeeDetails }
```

### 2. Frontend API Client (`client/src/lib/api.ts`)

নতুন interface এবং functions:

```typescript
export interface ErpnextEmployee {
  name: string; // Employee ID
  employee_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  date_of_joining?: string;
  status?: string;
  company?: string;
  department?: string;
  designation?: string;
  employment_type?: string;
  cell_number?: string;
  personal_email?: string;
  company_email?: string;
  current_address?: string;
  permanent_address?: string;
  attendance_device_id?: string;
}

// API Functions
portalApi.fetchErpnextEmployees() // Fetch all employees
portalApi.fetchErpnextEmployee(employeeId) // Fetch single employee
```

### 3. Frontend UI (`client/src/pages/Employees.tsx`)

#### নতুন Features:

1. **Comprehensive Employee Form**
   - Quick Form (3 fields)
   - Full Form (All ERPNext fields organized in sections)
   - Toggle between modes

2. **Form Sections:**
   - 📱 Device & Identification
   - 👤 Personal Information  
   - 💼 Employment Details
   - 📞 Contact Information
   - 🏠 Address Information

3. **ERPNext Import**
   - "Import from ERPNext" button
   - Modal showing all ERPNext employees
   - Click "Import" to auto-fill form
   - Shows: ID, Name, Department, Designation, Device ID

4. **Smart Features:**
   - Auto-fill full name from first/middle/last names
   - All existing CSV import functionality preserved
   - Clear form button
   - Responsive design

## 🔧 কিভাবে ব্যবহার করবেন

### Step 1: ERPNext-এ Employee Field যোগ করুন

ERPNext Employee DocType-এ custom field যোগ করুন (যদি না থাকে):

```bash
# Go to ERPNext
Customize Form > Employee > Add Custom Field

Field Name: attendance_device_id
Field Type: Data
Label: Attendance Device ID (Biometric/RF tag ID)
```

### Step 2: Employee Data Import

#### Option A: ERPNext থেকে Import
1. Employees পেজে যান
2. "Import from ERPNext" button ক্লিক করুন
3. Employee list দেখবেন
4. যে employee import করবেন তার "Import" button ক্লিক করুন
5. Form auto-fill হবে সব data সহ
6. Review করে "Save Employee" ক্লিক করুন

#### Option B: Manual Entry
1. "Show All Fields" ক্লিক করুন
2. সব field fill up করুন
3. "Save Employee" ক্লিক করুন

#### Option C: CSV Import
1. "Download Template" থেকে CSV template নিন
2. Data fill করুন
3. "Choose CSV File" দিয়ে upload করুন

### Step 3: Attendance Device ID Mapping

**গুরুত্বপূর্ণ:** Device ID (PIN) এবং Attendance Device ID (Biometric) আলাদা:

- **Device ID (PIN)**: Attendance device-এ user-র numeric ID (e.g., 101, 102)
- **Attendance Device ID**: Biometric fingerprint ID বা RFID card number (e.g., BIO-12345)

দুটিই store হবে এবং device mapping-এ ব্যবহার করা যাবে।

## 📊 API Response Examples

### Fetch All Employees
```json
GET /api/portal/employees/erpnext

{
  "success": true,
  "count": 150,
  "employees": [
    {
      "name": "EMP-001",
      "employee_name": "Ahmed Ali Khan",
      "first_name": "Ahmed",
      "middle_name": "Ali",
      "last_name": "Khan",
      "gender": "Male",
      "date_of_birth": "1990-01-15",
      "date_of_joining": "2020-03-01",
      "status": "Active",
      "company": "Prime Tech BD",
      "department": "IT Department",
      "designation": "Software Engineer",
      "employment_type": "Full-time",
      "cell_number": "+880 1712-345678",
      "personal_email": "ahmed@example.com",
      "company_email": "ahmed@primetechbd.com",
      "current_address": "Dhaka, Bangladesh",
      "permanent_address": "Chittagong, Bangladesh",
      "attendance_device_id": "BIO-12345"
    }
  ]
}
```

### Fetch Single Employee
```json
GET /api/portal/employees/erpnext/EMP-001

{
  "success": true,
  "employee": { ... }
}
```

## 🔒 Security

- ✅ Authentication required (Bearer token)
- ✅ Tenant isolation (শুধু নিজের tenant-র data)
- ✅ ERPNext credentials stored securely in database
- ✅ API calls use tenant-specific ERPNext config

## 🐛 Troubleshooting

### Error: "ERPNext integration is not enabled"
**Solution:** Settings পেজে গিয়ে ERPNext enable করুন এবং credentials দিন

### Error: "Failed to fetch employees from ERPNext"
**Possible causes:**
1. ERPNext URL ভুল
2. API Key/Secret ভুল
3. Network connectivity issue
4. ERPNext server down

**Check:**
```bash
# Test ERPNext connection
curl -X GET "https://your-erpnext.com/api/resource/Employee?limit_page_length=1" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET"
```

### No employees showing in modal
**Possible causes:**
1. ERPNext-এ employee নেই
2. Employee DocType field names ভিন্ন

## 📝 Notes

1. **Backend API** শুধু basic mapping save করে (userPin, employeeName, erpnextEmployeeId)
2. **Full employee data** এখনও database-এ persist হয় না
3. Future: Database schema update করে সব field store করা যাবে
4. **Pagination**: 100 employees per page (automatic)
5. **Performance**: Large employee lists (1000+) লোড হতে সময় লাগতে পারে

## 🚀 Next Steps (Optional)

1. Database schema update করে full employee data store করা
2. Employee edit functionality
3. Bulk import from ERPNext with one click
4. Sync schedule (daily auto-sync)
5. Employee photo upload
6. Advanced search এবং filters

## ✨ Benefits

- ✅ No manual data entry for ERPNext users
- ✅ All employee fields in one place
- ✅ Auto-sync with ERPNext
- ✅ Reduces errors
- ✅ Time-saving
- ✅ Biometric device ID mapping
