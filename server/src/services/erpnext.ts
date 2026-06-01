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
