import type { AttendanceLog } from "@prisma/client";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

/**
 * ERPNext sync stub — Phase 2.
 * When ERPNEXT_ENABLED=true, this will push Employee Checkin records.
 */
export async function queueAttendanceSync(logId: string): Promise<void> {
  if (!config.erpnext.enabled) {
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: { syncStatus: "SKIPPED" },
    });
    return;
  }

  const log = await prisma.attendanceLog.findUnique({ where: { id: logId } });
  if (!log) return;

  try {
    await syncAttendanceToErpnext(log);
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: "SYNCED",
        syncedAt: new Date(),
        syncError: null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await prisma.attendanceLog.update({
      where: { id: logId },
      data: {
        syncStatus: "FAILED",
        syncError: message,
      },
    });
  }
}

async function syncAttendanceToErpnext(log: AttendanceLog): Promise<void> {
  const { url, apiKey, apiSecret } = config.erpnext;
  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  const mapping = await prisma.employeeMapping.findUnique({
    where: { userPin: log.userPin },
  });

  if (!mapping?.erpnextEmployeeId) {
    throw new Error(`No ERPNext employee mapping for PIN ${log.userPin}`);
  }

  const logType = log.inOutMode === 1 ? "OUT" : "IN";
  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee Checkin`;

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
  }
}

export function isErpnextEnabled(): boolean {
  return config.erpnext.enabled;
}
