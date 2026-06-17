import type { AttendanceLog } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * ERPNext sync service — Tenant-level integration.
 * Fetches tenant-specific ERPNext config and syncs attendance logs.
 * Implements retry limit to prevent infinite retry loops.
 */
export async function queueAttendanceSync(logId: string, maxRetries: number = 3): Promise<void> {
  const log = await prisma.attendanceLog.findUnique({ where: { id: logId } });
  if (!log) return;

  // Check if already permanently failed (exceeded retry limit)
  if (log.syncStatus === "PERMANENTLY_FAILED") {
    console.log(`[erpnext] Sync skipped: log=${logId} already marked as PERMANENTLY_FAILED`);
    return;
  }

  // Check retry count - stop if exceeded max retries
  if (log.syncRetryCount >= maxRetries) {
    console.warn(`[erpnext] Max retries exceeded: log=${logId}, retries=${log.syncRetryCount}/${maxRetries}`);
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: "PERMANENTLY_FAILED",
        syncError: `Max retry limit exceeded (${maxRetries} attempts). Last error: ${log.syncError || "Unknown"}`,
      },
    });
    return;
  }

  // Fetch tenant's ERPNext config
  const tenant = await prisma.tenant.findUnique({
    where: { id: log.tenantId },
    select: {
      id: true,
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    console.log(`[erpnext] Sync skipped for tenant=${tenant?.slug}, log=${logId}: ERPNext disabled`);
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: { syncStatus: "SKIPPED" },
    });
    return;
  }

  try {
    await syncAttendanceToErpnext(log, tenant);
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: "SYNCED",
        syncedAt: new Date(),
        syncError: null,
        syncRetryCount: 0, // Reset retry count on success
      },
    });
    console.log(`[erpnext] ✅ Sync successful: tenant=${tenant.slug}, log=${logId}, attempt=${log.syncRetryCount + 1}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    const newRetryCount = log.syncRetryCount + 1;
    
    // Determine if this should be permanently failed
    const newStatus = newRetryCount >= maxRetries ? "PERMANENTLY_FAILED" : "FAILED";
    
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: newStatus,
        syncError: message,
        syncRetryCount: newRetryCount,
      },
    });
    
    if (newStatus === "PERMANENTLY_FAILED") {
      console.error(`[erpnext] ❌ PERMANENTLY FAILED: tenant=${tenant.slug}, log=${logId}, retries=${newRetryCount}/${maxRetries}, error=${message}`);
    } else {
      console.error(`[erpnext] ⚠️ Sync failed (will retry): tenant=${tenant.slug}, log=${logId}, retry=${newRetryCount}/${maxRetries}, error=${message}`);
    }
  }
}

interface TenantErpnextConfig {
  id: string;
  slug: string;
  erpnextEnabled: boolean;
  erpnextUrl: string | null;
  erpnextApiKey: string | null;
  erpnextApiSecret: string | null;
}

async function syncAttendanceToErpnext(
  log: AttendanceLog,
  tenant: TenantErpnextConfig
): Promise<void> {
  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured for tenant");
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid ERPNext URL: ${url}`);
  }

  // Find employee mapping
  const mapping = await prisma.employeeMapping.findUnique({
    where: {
      tenantId_userPin: { tenantId: log.tenantId, userPin: log.userPin },
    },
  });

  if (!mapping?.erpnextEmployeeId) {
    throw new Error(`No ERPNext employee mapping for PIN ${log.userPin}`);
  }

  // Determine log type (IN/OUT)
  // inOutMode: 0 = IN, 1 = OUT, null = unknown
  const logType = log.inOutMode === 1 ? "OUT" : log.inOutMode === 0 ? "IN" : null;
  
  if (!logType) {
    throw new Error(`Invalid inOutMode ${log.inOutMode} for PIN ${log.userPin}`);
  }

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee Checkin`;

  // Format time properly for ERPNext - remove timezone info
  // ERPNext needs "YYYY-MM-DD HH:mm:ss" format without timezone
  // The server's timezone setting will be applied by ERPNext
  const date = new Date(log.punchedAt);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const formattedTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  // Build ERPNext Employee Checkin payload
  // Reference: https://github.com/frappe/hrms/blob/develop/hrms/hr/doctype/employee_checkin/employee_checkin.json
  const payload = {
    employee: mapping.erpnextEmployeeId,
    log_type: logType,
    time: formattedTime,
    device_id: log.deviceSn || undefined,
    skip_auto_attendance: 0, // Let ERPNext auto-create attendance
  };

  console.log(`[erpnext] 🔄 Syncing Employee Checkin:`);
  console.log(`  Tenant: ${tenant.slug}`);
  console.log(`  Employee: ${mapping.erpnextEmployeeId} (PIN: ${log.userPin})`);
  console.log(`  Type: ${logType}`);
  console.log(`  Time: ${log.punchedAt.toISOString()}`);
  console.log(`  Device: ${log.deviceSn}`);
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Payload:`, JSON.stringify(payload, null, 2));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `token ${apiKey}:${apiSecret}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  
  console.log(`[erpnext] 📥 Response:`);
  console.log(`  Status: ${response.status} ${response.statusText}`);
  console.log(`  Body:`, responseText);

  if (!response.ok) {
    throw new Error(`ERPNext API error ${response.status}: ${responseText}`);
  }

  let data: { data?: { name?: string } };
  try {
    data = JSON.parse(responseText) as { data?: { name?: string } };
  } catch {
    throw new Error(`Invalid JSON response from ERPNext: ${responseText}`);
  }

  const checkinId = data?.data?.name;

  if (checkinId) {
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: { erpnextCheckinId: checkinId },
    });
    console.log(`[erpnext] ✅ Employee Checkin created successfully!`);
    console.log(`  Checkin ID: ${checkinId}`);
    console.log(`  Employee: ${mapping.erpnextEmployeeId}`);
    console.log(`  Type: ${logType}`);
  } else {
    console.warn(`[erpnext] ⚠️ No checkin ID returned in response`);
  }
}

/**
 * Batch sync multiple attendance logs in parallel
 * Much faster than sequential sync - processes multiple logs concurrently
 */
export async function batchSyncAttendance(
  logIds: string[],
  batchSize: number = 20
): Promise<{ synced: number; failed: number; skipped: number; errors: string[] }> {
  const result = { synced: 0, failed: 0, skipped: 0, errors: [] as string[] };

  console.log(`[erpnext] 🚀 Starting batch sync: total=${logIds.length}, batchSize=${batchSize}`);

  // Process in batches to avoid overwhelming ERPNext API
  for (let i = 0; i < logIds.length; i += batchSize) {
    const batch = logIds.slice(i, i + batchSize);
    console.log(`[erpnext] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(logIds.length / batchSize)} (${batch.length} logs)`);

    // Process batch in parallel using Promise.allSettled
    const promises = batch.map(async (logId) => {
      try {
        await queueAttendanceSync(logId);
        return { status: "success" as const, logId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return { status: "error" as const, logId, message };
      }
    });

    const results = await Promise.allSettled(promises);

    // Count results
    for (const res of results) {
      if (res.status === "fulfilled") {
        if (res.value.status === "success") {
          result.synced++;
        } else {
          result.failed++;
          result.errors.push(`Log ${res.value.logId}: ${res.value.message}`);
        }
      } else {
        result.failed++;
        result.errors.push(`Batch processing error: ${res.reason}`);
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < logIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`[erpnext] ✅ Batch sync complete: synced=${result.synced}, failed=${result.failed}, skipped=${result.skipped}`);

  return result;
}

/**
 * Check if ERPNext is enabled for a specific tenant
 */
export async function isErpnextEnabledForTenant(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { erpnextEnabled: true },
  });
  return tenant?.erpnextEnabled ?? false;
}

/**
 * Fetch employees from ERPNext and sync to employee mappings
 */
export async function syncEmployeesFromErpnext(tenantId: string): Promise<{ synced: number; skipped: number; errors: string[] }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid ERPNext URL: ${url}`);
  }

  // Test connection first
  const testEndpoint = `${url.replace(/\/$/, "")}/api/resource/Employee?fields=["name"]&limit_page_length=1`;

  console.log(`[erpnext] Testing connection: tenant=${tenant.slug}, endpoint=${testEndpoint}`);

  try {
    const testResponse = await fetch(testEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!testResponse.ok) {
      const text = await testResponse.text();
      throw new Error(`ERPNext API error ${testResponse.status}: ${text}`);
    }

    console.log(`[erpnext] Connection test successful: tenant=${tenant.slug}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection test failed";
    console.error(`[erpnext] Connection test failed: ${message}`);
    throw new Error(`Failed to connect to ERPNext: ${message}`);
  }

  // Fetch all employees with pagination
  const allEmployees: Array<{ name: string; employee_name?: string; attendance_device_id?: string | null }> = [];
  let pageStart = 0;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee?fields=["name","employee_name","attendance_device_id"]&limit_page_length=${pageSize}&limit_start=${pageStart}`;

    console.log(`[erpnext] Fetching employees page: tenant=${tenant.slug}, offset=${pageStart}`);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${apiKey}:${apiSecret}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`ERPNext API error ${response.status}: ${text}`);
      }

      interface ErpnextEmployee {
        name: string;
        employee_name?: string;
        attendance_device_id?: string | null;
      }

      interface ErpnextResponse {
        data?: ErpnextEmployee[];
      }

      const data = (await response.json()) as ErpnextResponse;
      const employees = Array.isArray(data?.data) ? data.data : [];

      console.log(`[erpnext] Fetched ${employees.length} employees in this page: tenant=${tenant.slug}`);

      if (employees.length === 0) {
        hasMore = false;
      } else {
        allEmployees.push(...employees);
        pageStart += pageSize;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch employee page";
      console.error(`[erpnext] Error fetching employees page: ${message}`);
      throw new Error(`Failed to fetch employees from ERPNext: ${message}`);
    }
  }

  console.log(`[erpnext] Total employees fetched: ${allEmployees.length} for tenant=${tenant.slug}`);

  if (allEmployees.length === 0) {
    console.warn(`[erpnext] No employees found in ERPNext for tenant=${tenant.slug}`);
    return { synced: 0, skipped: 0, errors: ["No employees found in ERPNext"] };
  }

  const result = { synced: 0, skipped: 0, errors: [] as string[] };

  for (const emp of allEmployees) {
    try {
      // Validate employee data
      if (!emp.name) {
        result.errors.push("Employee record missing name field");
        continue;
      }

      const empId = emp.name;
      const empName = emp.employee_name || emp.name;

      // Check if employee mapping already exists with same ERPNext ID
      const existing = await prisma.employeeMapping.findFirst({
        where: {
          tenantId,
          erpnextEmployeeId: empId,
        },
      });

      if (existing) {
        // Update only the name if it changed
        if (existing.employeeName !== empName) {
          await prisma.employeeMapping.update({
            where: { id: existing.id },
            data: { employeeName: empName },
          });
          console.log(`[erpnext] Updated employee: tenant=${tenant.slug}, erpnextId=${empId}, name=${empName}`);
        }
        result.skipped++;
      } else {
        // Create new mapping - check attendance_device_id first
        let pin = "";

        if (emp.attendance_device_id) {
          const cleanedPin = String(emp.attendance_device_id).trim();
          const isNumeric = /^\d+$/.test(cleanedPin);
          if (isNumeric) {
            const existingPin = await prisma.employeeMapping.findUnique({
              where: { tenantId_userPin: { tenantId, userPin: cleanedPin } },
            });
            if (!existingPin) {
              pin = cleanedPin;
            } else {
              console.warn(`[erpnext] attendance_device_id ${cleanedPin} already in use, falling back to auto-generated PIN.`);
            }
          } else {
            console.warn(`[erpnext] attendance_device_id ${cleanedPin} is not numeric, falling back to auto-generated PIN.`);
          }
        }

        // Fallback to auto-generated PIN
        if (!pin) {
          let attempt = 0;
          while (attempt < 1000) {
            const candidatePin = String(10000 + attempt);
            const existingPin = await prisma.employeeMapping.findUnique({
              where: { tenantId_userPin: { tenantId, userPin: candidatePin } },
            });
            if (!existingPin) {
              pin = candidatePin;
              break;
            }
            attempt++;
          }
        }

        if (!pin) {
          throw new Error(`Could not generate unique PIN after 1000 attempts for employee ${empId}`);
        }

        await prisma.employeeMapping.create({
          data: {
            tenantId,
            userPin: pin,
            employeeName: empName,
            erpnextEmployeeId: empId,
          },
        });

        console.log(`[erpnext] Created employee mapping: tenant=${tenant.slug}, erpnextId=${empId}, name=${empName}, pin=${pin}`);
        result.synced++;
      }
    } catch (err) {
      const errMsg = `Failed to sync employee ${emp.name}: ${err instanceof Error ? err.message : "Unknown error"}`;
      console.error(`[erpnext] ${errMsg}`);
      result.errors.push(errMsg);
    }
  }

  console.log(`[erpnext] Sync complete: tenant=${tenant.slug}, synced=${result.synced}, skipped=${result.skipped}, errors=${result.errors.length}`);

  return result;
}

/**
 * ERPNext Employee interface with all fields
 */
export interface ErpnextEmployeeDetails {
  name: string; // Employee ID (EMP-001)
  employee_name: string; // Full Name
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
  attendance_device_id?: string; // Biometric/RF tag ID
}

/**
 * Fetch all employees from ERPNext with detailed information
 */
export async function fetchEmployeesFromErpnext(tenantId: string): Promise<ErpnextEmployeeDetails[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid ERPNext URL: ${url}`);
  }

  // Fields to fetch from ERPNext Employee DocType
  const fields = [
    "name",
    "employee_name",
    "first_name",
    "middle_name",
    "last_name",
    "gender",
    "date_of_birth",
    "date_of_joining",
    "status",
    "company",
    "department",
    "designation",
    "employment_type",
    "cell_number",
    "personal_email",
    "company_email",
    "current_address",
    "permanent_address",
    "attendance_device_id"
  ];

  const allEmployees: ErpnextEmployeeDetails[] = [];
  let pageStart = 0;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const fieldsParam = JSON.stringify(fields);
    const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee?fields=${encodeURIComponent(fieldsParam)}&limit_page_length=${pageSize}&limit_start=${pageStart}`;

    console.log(`[erpnext] Fetching detailed employees page: tenant=${tenant.slug}, offset=${pageStart}`);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${apiKey}:${apiSecret}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`ERPNext API error ${response.status}: ${text}`);
      }

      interface ErpnextResponse {
        data?: ErpnextEmployeeDetails[];
      }

      const data = (await response.json()) as ErpnextResponse;
      const employees = Array.isArray(data?.data) ? data.data : [];

      console.log(`[erpnext] Fetched ${employees.length} detailed employees in this page: tenant=${tenant.slug}`);

      if (employees.length === 0) {
        hasMore = false;
      } else {
        allEmployees.push(...employees);
        pageStart += pageSize;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch employee page";
      console.error(`[erpnext] Error fetching employees page: ${message}`);
      throw new Error(`Failed to fetch employees from ERPNext: ${message}`);
    }
  }

  console.log(`[erpnext] Total detailed employees fetched: ${allEmployees.length} for tenant=${tenant.slug}`);

  return allEmployees;
}

/**
 * Fetch single employee details from ERPNext by employee ID
 */
export async function fetchEmployeeFromErpnext(tenantId: string, employeeId: string): Promise<ErpnextEmployeeDetails | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid ERPNext URL: ${url}`);
  }

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee/${employeeId}`;

  console.log(`[erpnext] Fetching employee: tenant=${tenant.slug}, employeeId=${employeeId}`);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (response.status === 404) {
      console.log(`[erpnext] Employee not found: tenant=${tenant.slug}, employeeId=${employeeId}`);
      return null;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ERPNext API error ${response.status}: ${text}`);
    }

    interface ErpnextResponse {
      data?: ErpnextEmployeeDetails;
    }

    const data = (await response.json()) as ErpnextResponse;

    if (!data.data) {
      return null;
    }

    console.log(`[erpnext] Employee fetched: tenant=${tenant.slug}, employeeId=${employeeId}`);

    return data.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch employee";
    console.error(`[erpnext] Error fetching employee: ${message}`);
    throw new Error(`Failed to fetch employee from ERPNext: ${message}`);
  }
}

