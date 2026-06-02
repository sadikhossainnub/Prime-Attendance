import type { AttendanceLog } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/**
 * ERPNext sync service — Tenant-level integration.
 * Fetches tenant-specific ERPNext config and syncs attendance logs.
 */
export async function queueAttendanceSync(logId: string): Promise<void> {
  const log = await prisma.attendanceLog.findUnique({ where: { id: logId } });
  if (!log) return;

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
      },
    });
    console.log(`[erpnext] Sync successful: tenant=${tenant.slug}, log=${logId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: "FAILED",
        syncError: message,
      },
    });
    console.error(`[erpnext] Sync failed: tenant=${tenant.slug}, log=${logId}, error=${message}`);
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
  const logType = log.inOutMode === 1 ? "OUT" : "IN";
  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee Checkin`;

  console.log(`[erpnext] Syncing: tenant=${tenant.slug}, pin=${log.userPin}, type=${logType}, endpoint=${endpoint}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${apiKey}:${apiSecret}`,
    },
    body: JSON.stringify({
      employee: mapping.erpnextEmployeeId,
      time: log.punchedAt.toISOString(),
      log_type: logType,
      device_id: log.deviceSn,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ERPNext API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { data?: { name?: string } };
  const checkinId = data?.data?.name;

  if (checkinId) {
    await prisma.attendanceLog.update({
      where: { id: log.id },
      data: { erpnextCheckinId: checkinId },
    });
    console.log(`[erpnext] Checkin created: tenant=${tenant.slug}, checkinId=${checkinId}`);
  }
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

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee`;

  console.log(`[erpnext] Fetching employees: tenant=${tenant.slug}, endpoint=${endpoint}`);

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
  }

  interface ErpnextResponse {
    data: ErpnextEmployee[];
  }

  const data = (await response.json()) as ErpnextResponse;
  const employees = Array.isArray(data.data) ? data.data : [];

  console.log(`[erpnext] Fetched ${employees.length} employees from ERPNext for tenant=${tenant.slug}`);

  const result = { synced: 0, skipped: 0, errors: [] as string[] };

  for (const emp of employees) {
    try {
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
        // Create new mapping - generate a simple numeric PIN
        let pin = "";
        let attempt = 0;

        // Try to generate a unique numeric PIN (starting from 10000)
        while (attempt < 1000) {
          const candidatePin = String(10000 + attempt);
          const exists = await prisma.employeeMapping.findUnique({
            where: { tenantId_userPin: { tenantId, userPin: candidatePin } },
          });
          if (!exists) {
            pin = candidatePin;
            break;
          }
          attempt++;
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

