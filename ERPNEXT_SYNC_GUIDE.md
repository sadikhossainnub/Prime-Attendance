# ERPNext Employee Sync Guide

## Overview

The auto-sync feature fetches employees from your ERPNext instance and automatically creates employee mappings with numeric IDs (10000, 10001, etc.) for use in the attendance system.

## Prerequisites

1. **ERPNext Instance**: Must be accessible from the Prime Attendance server
2. **API Credentials**: ERPNext user with access to Employee doctype
3. **HTTPS**: ERPNext should be accessible via HTTPS (HTTP may have CORS issues)
4. **API Token**: Generate an API Token in ERPNext for the user

## Setup Steps

### Step 1: Generate ERPNext API Token

1. Log in to your ERPNext instance
2. Go to **Home > Settings > User** (or search for "User")
3. Select your user account
4. Scroll to "API Tokens" section
5. Click "Add Row"
6. Give it a name like "Prime Attendance Sync"
7. Click "Generate Token"
8. Copy the **API Token** and **API Secret** (you won't see the secret again!)

### Step 2: Configure ERPNext in Prime Attendance

1. Log in to Prime Attendance as a **Client Admin**
2. Go to **Settings** page
3. Scroll to **ERPNext Integration** section
4. Enable ERPNext toggle
5. Enter:
   - **ERPNext URL**: Your ERPNext instance URL (e.g., `https://erp.yourdomain.com`)
   - **API Key**: The API Token from Step 1
   - **API Secret**: The API Secret from Step 1
6. Click **Save**

### Step 3: Test Connection (via Admin Panel)

1. Go to **Admin Panel** (Super Admin only)
2. Navigate to **Clients** → Select your client
3. Go to **Settings** tab
4. If ERPNext is enabled, you'll see a **"Sync Employees from ERPNext"** button
5. Click it and check the results:
   - ✓ Shows how many employees were synced
   - ✓ Shows how many were skipped (already existed)
   - ✓ Shows any errors

### Step 4: Verify Employee Sync

1. After successful sync, go to **Employees** page
2. You should see all employees from ERPNext listed with:
   - **ID**: Auto-generated numeric ID (10000, 10001, etc.)
   - **Name**: Employee name from ERPNext
   - **ERPNext ID**: Original ERPNext employee ID

## Troubleshooting

### Issue: "Failed to connect to ERPNext"

**Causes**:
- ERPNext URL is incorrect or unreachable
- API credentials (key/secret) are wrong
- ERPNext server is down

**Solutions**:
1. Verify ERPNext URL is correct and accessible from your server
2. Test connection by visiting the URL in a browser
3. Regenerate API Token and verify key/secret are correct
4. Check if ERPNext has firewall rules blocking access

### Issue: "ERPNext API error 403" or "Unauthorized"

**Causes**:
- API credentials are incorrect
- User doesn't have permission to access Employee doctype
- API Token is expired or revoked

**Solutions**:
1. Regenerate API Token in ERPNext user settings
2. Verify the user has role "HR-USER" or "Employee" permission
3. Check that the API Token hasn't been disabled

### Issue: "No employees found in ERPNext"

**Causes**:
- ERPNext doesn't have any employees created
- API credentials don't have access to Employee records

**Solutions**:
1. Log into ERPNext and check if employees exist (HR → Employee)
2. Verify user has access to Employee doctype
3. Try creating a test employee in ERPNext and retry sync

### Issue: Only partial employees synced (e.g., 5 out of 100)

**Causes**:
- Connection timeout during pagination
- Some employee records have invalid data
- Individual employee sync errors

**Solutions**:
1. Check the sync results for specific error messages
2. Verify the problematic employee in ERPNext has name field
3. Check server logs for detailed error information:
   ```bash
   docker logs <container-name> | grep erpnext
   ```

### Issue: Sync works but employees don't show in Attendance

**Causes**:
- Devices are sending old PIN numbers (before sync)
- Employee mappings created but devices haven't punched yet
- Filter in Attendance page is hiding them

**Solutions**:
1. Have employees punch in/out again after sync
2. Remove any ID filter in Attendance page
3. Check date range filter in Attendance page
4. Verify Employee Mappings page shows the synced employees

## Debugging Commands

### Check Sync Logs

```bash
# Docker
docker logs prime-attendance-server | grep erpnext

# Or search for specific tenant
docker logs prime-attendance-server | grep "erpnext.*your-tenant-name"
```

### Verify Employee Mappings

1. Go to **Employees** page
2. Check the Employee Mappings table
3. Should show: ID, Name, ERPNext ID

### Manual ERPNext API Test

Test if your ERPNext API is working:

```bash
curl -X GET "https://your-erp.com/api/resource/Employee?fields=[\"name\",\"employee_name\"]&limit_page_length=5" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "data": [
    {
      "name": "HR-EMP-00001",
      "employee_name": "John Doe"
    },
    {
      "name": "HR-EMP-00002",
      "employee_name": "Jane Smith"
    }
  ]
}
```

## How Auto-Sync Works

1. **Admin clicks "Sync Employees"** in TenantDetail Settings tab
2. **System tests ERPNext connection** with a simple test query
3. **System fetches all employees** from ERPNext with pagination (100 per request)
4. **For each employee**:
   - Check if already mapped to this tenant
   - If new: Generate unique numeric ID (10000, 10001, etc.)
   - If existing: Update name if changed
5. **Returns results**: synced count, skipped count, error list

## Sync Limits

- **Maximum employees per sync**: 10,000 (tested)
- **Sync timeout**: 5 minutes (adjust in server config if needed)
- **Generated PIN range**: 10000-19999 (supports 10,000 employees)

## Important Notes

1. **Employees are created once**: After first sync, manual edits won't be overwritten by future syncs (name updates only)
2. **IDs are permanent**: Don't change the generated ID once created - devices will reference it
3. **ERPNext ID required**: Each employee must have a "Name" field in ERPNext
4. **Tenant isolation**: Each tenant has its own employee mappings
5. **No deletion**: Synced employees are not deleted if removed from ERPNext

## Next Steps

1. **Device Setup**: Register your biometric devices
2. **Test Punch**: Have an employee punch in/out
3. **Verify Attendance**: Check Attendance page shows employee name

## Support

If sync still doesn't work:

1. Check server logs for error messages
2. Verify ERPNext URL and credentials are correct
3. Test ERPNext API connectivity manually (see curl command above)
4. Contact your ERPNext administrator to verify API access

---

**Version**: 1.0  
**Last Updated**: June 2, 2026
