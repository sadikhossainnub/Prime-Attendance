import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { SyncStatus } from "@prisma/client";
import {
  requireAuth,
  requireTenantUser,
  type AuthRequest,
} from "../middleware/auth.js";
import { 
  isErpnextEnabledForTenant, 
  queueAttendanceSync, 
  batchSyncAttendance,
  fetchEmployeesFromErpnext,
  fetchEmployeeFromErpnext,
  type ErpnextEmployeeDetails
} from "../services/erpnext.js";
import {
  fetchShiftTypesFromErpnext,
  fetchEmployeeShiftAssignments,
  verifyShiftConfiguration,
  verifyEmployeeShiftAssignment,
  fetchAttendanceFromErpnext,
  verifyAttendanceCreated,
  markAttendanceInErpnext,
} from "../services/shiftSync.js";

export const portalRouter = Router();
portalRouter.use(requireAuth, requireTenantUser);

function tenantId(req: AuthRequest): string {
  const tid = req.user?.tenantId;
  if (!tid) {
    throw new Error("Tenant ID not found in request");
  }
  return tid;
}

function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Validates PIN format (numeric string)
 */
function isValidPin(pin: unknown): boolean {
  return typeof pin === "string" && /^\d+$/.test(pin) && pin.length > 0;
}

/**
 * Validates serial number format
 */
function isValidSerialNumber(sn: unknown): boolean {
  return typeof sn === "string" && sn.trim().length > 0;
}

portalRouter.get("/dashboard", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [punchToday, onlineDevices, totalDevices, totalEmployees, erpnextEnabled] =
      await Promise.all([
        prisma.attendanceLog.count({
          where: { tenantId: tid, punchedAt: { gte: start, lte: end } },
        }),
        prisma.device.count({
          where: { tenantId: tid, lastSeenAt: { gte: fiveMinAgo } },
        }),
        prisma.device.count({ where: { tenantId: tid } }),
        prisma.employeeMapping.count({ where: { tenantId: tid } }),
        isErpnextEnabledForTenant(tid),
      ]);

    const recentPunches = await prisma.attendanceLog.findMany({
      where: { tenantId: tid },
      orderBy: { punchedAt: "desc" },
      take: 10,
    });

    res.json({
      punchToday,
      onlineDevices,
      totalDevices,
      totalEmployees,
      erpnextEnabled,
      recentPunches,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

portalRouter.get("/devices", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const devices = await prisma.device.findMany({
      where: { tenantId: tid },
      orderBy: { lastSeenAt: "desc" },
    });
    const now = Date.now();
    res.json(
      devices.map((d) => {
        // Device online if seen within last 10 minutes (increased from 5)
        const isOnline = d.lastSeenAt !== null && now - d.lastSeenAt.getTime() < 10 * 60 * 1000;
        return {
          ...d,
          online: isOnline,
          lastSeenAtFormatted: d.lastSeenAt ? new Date(d.lastSeenAt).toISOString() : null,
        };
      })
    );
  } catch (err) {
    console.error("Devices error:", err);
    res.status(500).json({ error: "Failed to load devices" });
  }
});

portalRouter.post("/devices", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { serialNumber, name } = req.body as {
      serialNumber?: unknown;
      name?: unknown;
    };

    if (!isValidSerialNumber(serialNumber)) {
      res.status(400).json({ error: "serialNumber must be a non-empty string" });
      return;
    }

    const device = await prisma.device.upsert({
      where: {
        tenantId_serialNumber: { tenantId: tid, serialNumber: serialNumber as string },
      },
      create: { tenantId: tid, serialNumber: serialNumber as string, name: (typeof name === "string" ? name : null) },
      update: { name: (typeof name === "string" ? name : null) },
    });
    res.status(201).json(device);
  } catch (err) {
    console.error("Add device error:", err);
    res.status(500).json({ error: "Failed to add device" });
  }
});

portalRouter.delete("/devices/:serialNumber", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const serial = decodeURIComponent(String(req.params.serialNumber));

    if (!isValidSerialNumber(serial)) {
      res.status(400).json({ error: "Invalid serial number" });
      return;
    }

    await prisma.device.delete({
      where: { tenantId_serialNumber: { tenantId: tid, serialNumber: serial } },
    });
    res.status(204).send();
  } catch (err) {
    console.error("Delete device error:", err);
    res.status(500).json({ error: "Failed to delete device" });
  }
});

portalRouter.patch("/devices/:deviceId", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { deviceId } = req.params;
    const { punchType, name } = req.body as {
      punchType?: string;
      name?: string;
    };

    // Validate punchType if provided
    if (punchType && !["BOTH", "IN_ONLY", "OUT_ONLY"].includes(punchType)) {
      res.status(400).json({ error: "Invalid punchType. Must be BOTH, IN_ONLY, or OUT_ONLY" });
      return;
    }

    // Verify device belongs to this tenant
    const device = await prisma.device.findFirst({
      where: { id: deviceId, tenantId: tid },
    });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Build update data - only include fields that are provided
    const updatePayload: any = {};
    
    if (punchType) {
      updatePayload.punchType = punchType;
    }
    if (name) {
      updatePayload.name = name;
    }

    // Update device
    const updated = await prisma.device.update({
      where: { id: deviceId },
      data: updatePayload,
    });

    console.log(`[portal] Device updated: tenant=${tid}, device=${deviceId}, punchType=${punchType}`);
    res.json(updated);
  } catch (err) {
    console.error("Update device error:", err);
    res.status(500).json({ error: "Failed to update device" });
  }
});

/**
 * Get all device users across all devices
 */
portalRouter.get("/device-users", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const deviceSn = typeof req.query.deviceSn === "string" ? req.query.deviceSn : undefined;

    const where: { tenantId: string; deviceSn?: string } = { tenantId: tid };
    if (deviceSn) where.deviceSn = deviceSn;

    const users = await prisma.deviceUser.findMany({
      where,
      orderBy: [{ deviceSn: "asc" }, { userPin: "asc" }],
    });

    // Group by device
    const groupedByDevice = new Map<string, typeof users>();
    for (const user of users) {
      if (!groupedByDevice.has(user.deviceSn)) {
        groupedByDevice.set(user.deviceSn, []);
      }
      groupedByDevice.get(user.deviceSn)?.push(user);
    }

    // Get device info for grouping
    const devices = await prisma.device.findMany({
      where: { tenantId: tid },
    });
    const deviceMap = new Map(devices.map(d => [d.serialNumber, d]));

    const result = Array.from(groupedByDevice.entries()).map(([sn, userList]) => {
      const device = deviceMap.get(sn);
      return {
        device: {
          serialNumber: sn,
          name: device?.name || sn,
          online: device?.lastSeenAt !== null && Date.now() - (device?.lastSeenAt?.getTime() ?? 0) < 10 * 60 * 1000,
        },
        users: userList.map(u => ({
          id: u.id,
          userPin: u.userPin,
          userName: u.userName,
          privilege: u.privilege,
          enabled: u.enabled,
          lastSyncedAt: u.lastSyncedAt,
        })),
        count: userList.length,
      };
    });

    res.json({
      devices: result,
      total: users.length,
    });
  } catch (err) {
    console.error("Device users list error:", err);
    res.status(500).json({ error: "Failed to load device users" });
  }
});

/**
 * Get users for a specific device
 */
portalRouter.get("/devices/:sn/users", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { sn } = req.params;

    if (!isValidSerialNumber(sn)) {
      res.status(400).json({ error: "Invalid device serial number" });
      return;
    }

    // Verify device belongs to this tenant
    const device = await prisma.device.findUnique({
      where: { tenantId_serialNumber: { tenantId: tid, serialNumber: sn } },
    });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Fetch all users registered on this device
    const deviceUsers = await prisma.deviceUser.findMany({
      where: {
        tenantId: tid,
        deviceSn: sn,
      },
      orderBy: { userPin: "asc" },
    });

    res.json({
      device: {
        id: device.id,
        serialNumber: device.serialNumber,
        name: device.name,
        online: device.lastSeenAt !== null && Date.now() - device.lastSeenAt.getTime() < 10 * 60 * 1000,
      },
      users: deviceUsers.map(u => ({
        id: u.id,
        userPin: u.userPin,
        userName: u.userName,
        privilege: u.privilege,
        enabled: u.enabled,
        lastSyncedAt: u.lastSyncedAt,
        createdAt: u.createdAt,
      })),
      total: deviceUsers.length,
    });
  } catch (err) {
    console.error("Device users error:", err);
    res.status(500).json({ error: "Failed to load device users" });
  }
});

portalRouter.get("/attendance", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50)
    );
    const skip = (page - 1) * limit;

    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const pin = typeof req.query.pin === "string" ? req.query.pin : undefined;
    const deviceSn =
      typeof req.query.deviceSn === "string" ? req.query.deviceSn : undefined;

    const where: {
      tenantId: string;
      punchedAt?: { gte?: Date; lte?: Date };
      userPin?: string;
      deviceSn?: string;
    } = { tenantId: tid };

    if (from || to) {
      where.punchedAt = {};
      if (from) where.punchedAt.gte = from;
      if (to) where.punchedAt.lte = to;
    }
    if (pin) where.userPin = pin;
    if (deviceSn) where.deviceSn = deviceSn;

    // First get all items with pagination
    const allItems = await prisma.attendanceLog.findMany({
      where,
      orderBy: { punchedAt: "desc" },
    });

    // Get device information to check punch type
    const uniqueDeviceSns = [...new Set(allItems.map(item => item.deviceSn))];
    const devices = await prisma.device.findMany({
      where: {
        tenantId: tid,
        serialNumber: { in: uniqueDeviceSns },
      },
      select: { serialNumber: true, punchType: true },
    });

    const deviceMap = new Map(devices.map(d => [d.serialNumber, d.punchType]));

    // Filter items based on device punch type
    const filteredItems = allItems.filter(item => {
      const punchType = deviceMap.get(item.deviceSn);
      
      // If punchType not found, include it (backward compatibility)
      if (!punchType) return true;
      
      // Check if punch matches device configuration
      if (punchType === "BOTH") return true; // Accept all
      if (punchType === "IN_ONLY" && item.inOutMode === 0) return true; // Accept only IN (0)
      if (punchType === "OUT_ONLY" && item.inOutMode === 1) return true; // Accept only OUT (1)
      
      return false;
    });

    // Apply pagination after filtering
    const paginatedItems = filteredItems.slice(skip, skip + limit);

    // Get all unique PINs from paginated items
    const uniquePins = [...new Set(paginatedItems.map(item => item.userPin))];

    // Fetch all mappings in one query
    const mappings = await prisma.employeeMapping.findMany({
      where: {
        tenantId: tid,
        userPin: { in: uniquePins },
      },
      select: { userPin: true, employeeName: true },
    });

    // Create a map for quick lookup
    const mappingMap = new Map(mappings.map(m => [m.userPin, m.employeeName]));

    // Enrich items with employee names
    const enrichedItems = paginatedItems.map(item => ({
      ...item,
      employeeName: mappingMap.get(item.userPin) ?? null,
    }));

    res.json({
      items: enrichedItems,
      total: filteredItems.length,
      page,
      limit,
      totalPages: Math.ceil(filteredItems.length / limit),
    });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ error: "Failed to load attendance" });
  }
});

portalRouter.get("/employees/mapping", async (req: AuthRequest, res: Response) => {
  try {
    const mappings = await prisma.employeeMapping.findMany({
      where: { tenantId: tenantId(req) },
      orderBy: { userPin: "asc" },
    });
    res.json(mappings);
  } catch (err) {
    console.error("Mappings error:", err);
    res.status(500).json({ error: "Failed to load mappings" });
  }
});

portalRouter.post("/employees/mapping", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { userPin, employeeName, erpnextEmployeeId } = req.body as {
      userPin?: unknown;
      employeeName?: unknown;
      erpnextEmployeeId?: unknown;
    };

    if (!isValidPin(userPin)) {
      res.status(400).json({ error: "userPin must be a numeric string" });
      return;
    }

    if (typeof employeeName !== "string" || employeeName.trim().length === 0) {
      res.status(400).json({ error: "employeeName must be a non-empty string" });
      return;
    }

    const mapping = await prisma.employeeMapping.upsert({
      where: { tenantId_userPin: { tenantId: tid, userPin: userPin as string } },
      create: {
        tenantId: tid,
        userPin: userPin as string,
        employeeName,
        erpnextEmployeeId: (typeof erpnextEmployeeId === "string" ? erpnextEmployeeId : null),
      },
      update: {
        employeeName,
        erpnextEmployeeId: (typeof erpnextEmployeeId === "string" ? erpnextEmployeeId : null),
      },
    });
    res.json(mapping);
  } catch (err) {
    console.error("Save mapping error:", err);
    res.status(500).json({ error: "Failed to save mapping" });
  }
});

portalRouter.delete(
  "/employees/mapping/:userPin",
  async (req: AuthRequest, res: Response) => {
    try {
      const tid = tenantId(req);
      const userPin = String(req.params.userPin);

      if (!isValidPin(userPin)) {
        res.status(400).json({ error: "Invalid PIN format" });
        return;
      }

      await prisma.employeeMapping.delete({
        where: { tenantId_userPin: { tenantId: tid, userPin } },
      });
      res.status(204).send();
    } catch (err) {
      console.error("Delete mapping error:", err);
      res.status(404).json({ error: "Mapping not found" });
    }
  }
);

/**
 * Fetch all employees from ERPNext with detailed information
 * GET /api/portal/employees/erpnext
 */
portalRouter.get("/employees/erpnext", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    
    // Check if ERPNext is enabled
    const erpnextEnabled = await isErpnextEnabledForTenant(tid);
    if (!erpnextEnabled) {
      res.status(400).json({ error: "ERPNext integration is not enabled for this tenant" });
      return;
    }

    // Fetch employees from ERPNext
    const employees = await fetchEmployeesFromErpnext(tid);
    
    res.json({ 
      success: true, 
      count: employees.length,
      employees 
    });
  } catch (err) {
    console.error("Fetch ERPNext employees error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch employees from ERPNext";
    res.status(500).json({ error: message });
  }
});

/**
 * Sync employees from ERPNext to local mappings
 * POST /api/portal/employees/sync
 */
portalRouter.post("/employees/sync", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    
    // Check if ERPNext is enabled
    const erpnextEnabled = await isErpnextEnabledForTenant(tid);
    if (!erpnextEnabled) {
      res.status(400).json({ error: "ERPNext integration is not enabled for this tenant" });
      return;
    }

    const { syncEmployeesFromErpnext } = await import("../services/erpnext.js");
    const result = await syncEmployeesFromErpnext(tid);
    
    res.json({ 
      success: true, 
      message: "Employee sync completed",
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors
    });
  } catch (err) {
    console.error("Sync ERPNext employees error:", err);
    const message = err instanceof Error ? err.message : "Failed to sync employees from ERPNext";
    res.status(500).json({ error: message });
  }
});


/**
 * Fetch single employee from ERPNext by ID
 * GET /api/portal/employees/erpnext/:employeeId
 */
portalRouter.get("/employees/erpnext/:employeeId", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const employeeId = String(req.params.employeeId);

    if (!employeeId || employeeId.trim().length === 0) {
      res.status(400).json({ error: "Employee ID is required" });
      return;
    }

    // Check if ERPNext is enabled
    const erpnextEnabled = await isErpnextEnabledForTenant(tid);
    if (!erpnextEnabled) {
      res.status(400).json({ error: "ERPNext integration is not enabled for this tenant" });
      return;
    }

    // Fetch employee from ERPNext
    const employee = await fetchEmployeeFromErpnext(tid, employeeId);
    
    if (!employee) {
      res.status(404).json({ error: "Employee not found in ERPNext" });
      return;
    }

    res.json({ 
      success: true, 
      employee 
    });
  } catch (err) {
    console.error("Fetch ERPNext employee error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch employee from ERPNext";
    res.status(500).json({ error: message });
  }
});

portalRouter.get("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId(req) },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        deviceProvisionKey: true,
        contactEmail: true,
        erpnextEnabled: true,
        erpnextUrl: true,
        erpnextApiKey: true,
        erpnextApiSecret: true,
      },
    });
    res.json(tenant);
  } catch (err) {
    console.error("Settings error:", err);
    res.status(500).json({ error: "Failed to load settings" });
  }
});

/**
 * Update ERPNext configuration for tenant
 * Only tenant admin can update
 */
portalRouter.patch("/settings/erpnext", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { enabled, url, apiKey, apiSecret } = req.body as {
      enabled?: boolean;
      url?: string;
      apiKey?: string;
      apiSecret?: string;
    };

    // Validate ERPNext URL if enabled
    if (enabled && url) {
      try {
        new URL(url);
      } catch {
        res.status(400).json({ error: "Invalid ERPNext URL" });
        return;
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id: tid },
      data: {
        erpnextEnabled: enabled ?? false,
        erpnextUrl: url || null,
        erpnextApiKey: apiKey || null,
        erpnextApiSecret: apiSecret || null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        deviceProvisionKey: true,
        contactEmail: true,
        erpnextEnabled: true,
        erpnextUrl: true,
        erpnextApiKey: true,
        erpnextApiSecret: true,
      },
    });

    console.log(`[portal] ERPNext config updated for tenant=${tenant.slug}, enabled=${enabled}`);
    res.json(tenant);
  } catch (err) {
    console.error("ERPNext config error:", err);
    res.status(500).json({ error: "Failed to update ERPNext configuration" });
  }
});

portalRouter.get("/raw-events", async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(
      100,
      parseInt(String(req.query.limit ?? "20"), 10) || 20
    );
    const events = await prisma.deviceRawEvent.findMany({
      where: { tenantId: tenantId(req) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json(events);
  } catch (err) {
    console.error("Raw events error:", err);
    res.status(500).json({ error: "Failed to load raw events" });
  }
});

portalRouter.post("/sync-retry", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const erpnextEnabled = await isErpnextEnabledForTenant(tid);
    
    if (!erpnextEnabled) {
      res.status(400).json({ error: "ERPNext sync is not enabled for this tenant" });
      return;
    }

    // Find FAILED or PENDING logs only (NOT permanently failed)
    // PERMANENTLY_FAILED logs should not be retried automatically
    const logs = await prisma.attendanceLog.findMany({
      where: {
        tenantId: tid,
        syncStatus: { in: ["FAILED", "PENDING"] },
      },
      select: { id: true },
      take: 100, // Limit to 100 at a time
    });

    // Trigger sync in background
    for (const log of logs) {
      void queueAttendanceSync(log.id);
    }

    console.log(`[portal] Sync retry triggered (excluding permanently failed): tenant=${tid}, count=${logs.length}`);
    res.json({
      message: `Triggered sync retry for ${logs.length} logs (excluding permanently failed)`,
      count: logs.length,
    });
  } catch (err) {
    console.error("Sync retry error:", err);
    res.status(500).json({ error: "Failed to trigger sync retry" });
  }
});

portalRouter.get("/sync-status", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);

    // Get sync status counts including permanently failed
    const [totalLogs, synced, pending, failed, skipped, permanentlyFailed] = await Promise.all([
      prisma.attendanceLog.count({ where: { tenantId: tid } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "SYNCED" } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "PENDING" } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "FAILED" } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "SKIPPED" } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "PERMANENTLY_FAILED" } }),
    ]);

    // Get recent logs with employee names and retry count
    const recentLogs = await prisma.attendanceLog.findMany({
      where: { tenantId: tid },
      orderBy: { punchedAt: "desc" },
      take: 50,
      select: {
        id: true,
        userPin: true,
        punchedAt: true,
        deviceSn: true,
        inOutMode: true,
        syncStatus: true,
        syncRetryCount: true,
        erpnextCheckinId: true,
        syncError: true,
        syncedAt: true,
      },
    });

    // Fetch employee names
    const uniquePins = [...new Set(recentLogs.map(log => log.userPin))];
    const employeeMappings = await prisma.employeeMapping.findMany({
      where: {
        tenantId: tid,
        userPin: { in: uniquePins },
      },
      select: { userPin: true, employeeName: true },
    });

    const employeeMap = new Map(employeeMappings.map(m => [m.userPin, m.employeeName]));

    const enrichedLogs = recentLogs.map(log => ({
      ...log,
      employeeName: employeeMap.get(log.userPin) ?? null,
    }));

    res.json({
      totalLogs,
      synced,
      pending,
      failed,
      skipped,
      permanentlyFailed,
      recentLogs: enrichedLogs,
    });
  } catch (err) {
    console.error("Sync status error:", err);
    res.status(500).json({ error: "Failed to load sync status" });
  }
});

/**
 * Bulk sync all historical data to ERPNext with batch processing
 * POST /api/portal/sync-bulk
 */
portalRouter.post("/sync-bulk", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { fromDate, toDate, limit, batchSize } = req.body as {
      fromDate?: string;
      toDate?: string;
      limit?: number;
      batchSize?: number;
    };

    // Check if ERPNext is enabled
    const erpnextEnabled = await isErpnextEnabledForTenant(tid);
    if (!erpnextEnabled) {
      res.status(400).json({ error: "ERPNext sync is not enabled for this tenant" });
      return;
    }

    // Build date filter
    const where: {
      tenantId: string;
      syncStatus?: { in: SyncStatus[] };
      punchedAt?: { gte?: Date; lte?: Date };
    } = {
      tenantId: tid,
      syncStatus: { in: [SyncStatus.FAILED, SyncStatus.SKIPPED, SyncStatus.PENDING] },
    };

    if (fromDate || toDate) {
      where.punchedAt = {};
      if (fromDate) where.punchedAt.gte = new Date(fromDate);
      if (toDate) where.punchedAt.lte = new Date(toDate);
    }

    // Get unsynced logs
    const logs = await prisma.attendanceLog.findMany({
      where,
      orderBy: { punchedAt: "asc" },
      take: limit || 1000, // Default 1000, max can be adjusted
      select: { id: true, punchedAt: true },
    });

    if (logs.length === 0) {
      res.json({
        success: true,
        message: "কোনো unsynced log পাওয়া যায়নি",
        synced: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        dateRange: { from: fromDate || null, to: toDate || null },
      });
      return;
    }

    const logIds = logs.map(l => l.id);
    const effectiveBatchSize = batchSize || 20; // Default 20 concurrent requests

    console.log(`[portal] 🚀 Batch sync started: tenant=${tid}, count=${logs.length}, batchSize=${effectiveBatchSize}, from=${fromDate || "all"}, to=${toDate || "now"}`);
    
    // Start batch sync in background - don't await to return response quickly
    void (async () => {
      try {
        await batchSyncAttendance(logIds, effectiveBatchSize);
        console.log(`[portal] ✅ Batch sync completed: tenant=${tid}, count=${logs.length}`);
      } catch (err) {
        console.error(`[portal] ❌ Batch sync failed: tenant=${tid}`, err);
      }
    })();

    // Return immediately with queued status
    res.json({
      success: true,
      message: `${logs.length}টি attendance log batch sync এর জন্য queued করা হয়েছে। ${effectiveBatchSize}টি করে parallel processing হচ্ছে।`,
      queued: logs.length,
      batchSize: effectiveBatchSize,
      dateRange: {
        from: logs[0].punchedAt.toISOString(),
        to: logs[logs.length - 1].punchedAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Bulk sync error:", err);
    res.status(500).json({ error: "Failed to start bulk sync" });
  }
});

/**
 * Get last synced timestamp from local DB
 * GET /api/portal/sync-last-timestamp
 */
portalRouter.get("/sync-last-timestamp", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);

    // Get the latest successfully synced log
    const lastSynced = await prisma.attendanceLog.findFirst({
      where: {
        tenantId: tid,
        syncStatus: "SYNCED",
        erpnextCheckinId: { not: null },
      },
      orderBy: { syncedAt: "desc" },
      select: {
        syncedAt: true,
        punchedAt: true,
        erpnextCheckinId: true,
        userPin: true,
      },
    });

    // Get counts
    const [totalLogs, syncedCount, unsyncedCount] = await Promise.all([
      prisma.attendanceLog.count({ where: { tenantId: tid } }),
      prisma.attendanceLog.count({ where: { tenantId: tid, syncStatus: "SYNCED" } }),
      prisma.attendanceLog.count({ 
        where: { 
          tenantId: tid, 
          syncStatus: { in: ["PENDING", "FAILED", "SKIPPED"] },
        },
      }),
    ]);

    res.json({
      lastSyncedAt: lastSynced?.syncedAt || null,
      lastPunchedAt: lastSynced?.punchedAt || null,
      lastCheckinId: lastSynced?.erpnextCheckinId || null,
      stats: {
        total: totalLogs,
        synced: syncedCount,
        unsynced: unsyncedCount,
      },
    });
  } catch (err) {
    console.error("Last timestamp error:", err);
    res.status(500).json({ error: "Failed to get last sync timestamp" });
  }
});

/**
 * Create a new user on a device
 * Sends user data to device in iClock protocol format
 */
portalRouter.post("/devices/:sn/users", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { sn } = req.params;
    const { userPin, userName, privilege } = req.body as {
      userPin?: unknown;
      userName?: unknown;
      privilege?: unknown;
    };

    // Validate inputs
    if (!isValidSerialNumber(sn)) {
      res.status(400).json({ error: "Invalid device serial number" });
      return;
    }

    if (!isValidPin(userPin)) {
      res.status(400).json({ error: "userPin must be a numeric string" });
      return;
    }

    if (typeof userName !== "string" || userName.trim().length === 0) {
      res.status(400).json({ error: "userName must be a non-empty string" });
      return;
    }

    const privLevel = typeof privilege === "number" ? privilege : 0;
    if (privLevel < 0 || privLevel > 2) {
      res.status(400).json({ error: "privilege must be 0 (User), 1 (Manager), or 2 (Admin)" });
      return;
    }

    // Verify device belongs to this tenant
    const device = await prisma.device.findUnique({
      where: { tenantId_serialNumber: { tenantId: tid, serialNumber: sn } },
    });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Check if user already exists on device
    const existingUser = await prisma.deviceUser.findUnique({
      where: { tenantId_deviceSn_userPin: { tenantId: tid, deviceSn: sn, userPin: userPin as string } },
    });

    if (existingUser) {
      res.status(409).json({ error: "User already exists on this device" });
      return;
    }

    // Create user record in database with lastSyncedAt=null (pending sync to device)
    const deviceUser = await prisma.deviceUser.create({
      data: {
        tenantId: tid,
        deviceSn: sn,
        userPin: userPin as string,
        userName,
        privilege: privLevel,
        enabled: true,
        lastSyncedAt: null, // Will be set when device syncs
      },
    });

    // Format user data for device in iClock CSV format
    // Format: PIN,Name,Privilege,Enabled(1=true,0=false)
    const userData = `${userPin},${userName.replace(/,/g, " ")},${privLevel},1`;

    console.log(`[portal] User created on device: tenant=${tid}, device=${sn}, pin=${userPin}, name=${userName}, privilege=${privLevel}`);

    res.status(201).json({
      ...deviceUser,
      message: "User created successfully. Device will sync on next connection.",
      deviceCommand: userData, // For logging/debugging
    });
  } catch (err) {
    console.error("Create device user error:", err);
    res.status(500).json({ error: "Failed to create user on device" });
  }
});

/**
 * Get device-employee PIN mappings
 * GET /api/portal/device-mappings
 */
portalRouter.get("/device-mappings", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const deviceSn = typeof req.query.deviceSn === "string" ? req.query.deviceSn : undefined;
    const userPin = typeof req.query.userPin === "string" ? req.query.userPin : undefined;

    const where: { tenantId: string; deviceSn?: string; userPin?: string } = { tenantId: tid };
    if (deviceSn) where.deviceSn = deviceSn;
    if (userPin) where.userPin = userPin;

    const mappings = await prisma.deviceUser.findMany({
      where,
      orderBy: [{ deviceSn: "asc" }, { userPin: "asc" }],
    });

    // Fetch associated employee mappings for enrichment
    const uniquePins = [...new Set(mappings.map(m => m.userPin))];
    const employeeMappings = await prisma.employeeMapping.findMany({
      where: {
        tenantId: tid,
        userPin: { in: uniquePins },
      },
      select: { userPin: true, employeeName: true, erpnextEmployeeId: true },
    });

    const employeeMap = new Map(
      employeeMappings.map(em => [em.userPin, em])
    );

    const enriched = mappings.map(m => ({
      ...m,
      employee: employeeMap.get(m.userPin) || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Device mappings error:", err);
    res.status(500).json({ error: "Failed to load device mappings" });
  }
});

/**
 * Create or update device-employee PIN mapping
 * POST /api/portal/device-mappings
 */
portalRouter.post("/device-mappings", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { deviceSn, userPin, privilege, createEmployeeMapping, employeeName } = req.body as {
      deviceSn?: unknown;
      userPin?: unknown;
      privilege?: unknown;
      createEmployeeMapping?: boolean;
      employeeName?: unknown;
    };

    if (!isValidSerialNumber(deviceSn)) {
      res.status(400).json({ error: "Invalid device serial number" });
      return;
    }

    if (!isValidPin(userPin)) {
      res.status(400).json({ error: "userPin must be a numeric string" });
      return;
    }

    const privLevel = typeof privilege === "number" ? privilege : 0;
    if (privLevel < 0 || privLevel > 2) {
      res.status(400).json({ error: "privilege must be 0, 1, or 2" });
      return;
    }

    // Verify device exists and belongs to tenant
    const device = await prisma.device.findUnique({
      where: { tenantId_serialNumber: { tenantId: tid, serialNumber: deviceSn as string } },
    });

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Create or update the device user mapping
    const mapping = await prisma.deviceUser.upsert({
      where: { tenantId_deviceSn_userPin: { tenantId: tid, deviceSn: deviceSn as string, userPin: userPin as string } },
      create: {
        tenantId: tid,
        deviceSn: deviceSn as string,
        userPin: userPin as string,
        userName: typeof employeeName === "string" ? employeeName : null,
        privilege: privLevel,
        enabled: true,
        lastSyncedAt: new Date(),
      },
      update: {
        privilege: privLevel,
        enabled: true,
        lastSyncedAt: new Date(),
      },
    });

    // Optionally create employee mapping
    if (createEmployeeMapping && typeof employeeName === "string" && employeeName.trim()) {
      await prisma.employeeMapping.upsert({
        where: { tenantId_userPin: { tenantId: tid, userPin: userPin as string } },
        create: {
          tenantId: tid,
          userPin: userPin as string,
          employeeName: employeeName.trim(),
        },
        update: {
          employeeName: employeeName.trim(),
        },
      });
    }

    console.log(`[portal] Device mapping created: tenant=${tid}, device=${deviceSn}, pin=${userPin}`);

    res.status(201).json(mapping);
  } catch (err) {
    console.error("Create device mapping error:", err);
    res.status(500).json({ error: "Failed to create device mapping" });
  }
});

/**
 * Delete device-employee PIN mapping
 * DELETE /api/portal/device-mappings/:deviceSn/:userPin
 */
portalRouter.delete("/device-mappings/:deviceSn/:userPin", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const deviceSn = decodeURIComponent(String(req.params.deviceSn));
    const userPin = String(req.params.userPin);

    if (!isValidSerialNumber(deviceSn)) {
      res.status(400).json({ error: "Invalid device serial number" });
      return;
    }

    if (!isValidPin(userPin)) {
      res.status(400).json({ error: "Invalid PIN format" });
      return;
    }

    await prisma.deviceUser.delete({
      where: { tenantId_deviceSn_userPin: { tenantId: tid, deviceSn, userPin } },
    });

    res.status(204).send();
  } catch (err) {
    console.error("Delete device mapping error:", err);
    res.status(404).json({ error: "Mapping not found" });
  }
});


// ===================================
// Shift Management & Verification
// ===================================

/**
 * GET /api/portal/shift-types
 * Fetch all shift types from ERPNext
 */
portalRouter.get("/shift-types", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const shiftTypes = await fetchShiftTypesFromErpnext(tid);
    res.json({ shiftTypes });
  } catch (err) {
    console.error("Shift types fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch shift types";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/portal/shift-types/:shiftTypeName/verify
 * Verify shift type configuration for auto-attendance
 */
portalRouter.get("/shift-types/:shiftTypeName/verify", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { shiftTypeName } = req.params;
    const verification = await verifyShiftConfiguration(tid, shiftTypeName);
    res.json(verification);
  } catch (err) {
    console.error("Shift verification error:", err);
    const message = err instanceof Error ? err.message : "Failed to verify shift configuration";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/portal/employees/:employeeId/shift-assignments
 * Fetch shift assignments for an employee
 */
portalRouter.get("/employees/:employeeId/shift-assignments", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { employeeId } = req.params;
    const assignments = await fetchEmployeeShiftAssignments(tid, employeeId);
    res.json({ assignments });
  } catch (err) {
    console.error("Shift assignments fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch shift assignments";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/portal/employees/:employeeId/verify-shift
 * Verify if employee has active shift assignment for a date
 */
portalRouter.post("/employees/:employeeId/verify-shift", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { employeeId } = req.params;
    const { date } = req.body as { date?: string };

    if (!date) {
      res.status(400).json({ error: "Date parameter required (YYYY-MM-DD)" });
      return;
    }

    const verification = await verifyEmployeeShiftAssignment(tid, employeeId, new Date(date));
    res.json(verification);
  } catch (err) {
    console.error("Employee shift verification error:", err);
    const message = err instanceof Error ? err.message : "Failed to verify employee shift assignment";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/portal/attendance/:employeeId/:date
 * Fetch attendance record from ERPNext
 */
portalRouter.get("/attendance/:employeeId/:date", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { employeeId, date } = req.params;

    const attendance = await fetchAttendanceFromErpnext(tid, employeeId, date);

    if (!attendance) {
      res.status(404).json({ error: "Attendance not found" });
      return;
    }

    res.json({ attendance });
  } catch (err) {
    console.error("Attendance fetch error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch attendance";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/portal/attendance/verify
 * Verify if attendance was created for a checkin
 */
portalRouter.post("/attendance/verify", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { employeeId, checkinDate } = req.body as {
      employeeId?: string;
      checkinDate?: string;
    };

    if (!employeeId || !checkinDate) {
      res.status(400).json({ error: "employeeId and checkinDate required" });
      return;
    }

    const verification = await verifyAttendanceCreated(tid, employeeId, new Date(checkinDate));
    res.json(verification);
  } catch (err) {
    console.error("Attendance verification error:", err);
    const message = err instanceof Error ? err.message : "Failed to verify attendance";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/portal/attendance/mark
 * Manually mark attendance in ERPNext
 */
portalRouter.post("/attendance/mark", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { employeeId, date, status, inTime, outTime } = req.body as {
      employeeId?: string;
      date?: string;
      status?: "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";
      inTime?: string;
      outTime?: string;
    };

    if (!employeeId || !date || !status) {
      res.status(400).json({ error: "employeeId, date, and status required" });
      return;
    }

    const validStatuses = ["Present", "Absent", "Half Day", "On Leave", "Work From Home"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const result = await markAttendanceInErpnext(tid, employeeId, date, status, inTime, outTime);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({
      success: true,
      message: "Attendance marked successfully",
      attendanceId: result.attendanceId,
    });
  } catch (err) {
    console.error("Manual attendance marking error:", err);
    const message = err instanceof Error ? err.message : "Failed to mark attendance";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/portal/attendance-verification-report
 * Get comprehensive verification report for attendance
 */
portalRouter.get("/attendance-verification-report", async (req: AuthRequest, res: Response) => {
  try {
    const tid = tenantId(req);
    const { fromDate, toDate } = req.query as { fromDate?: string; toDate?: string };

    if (!fromDate || !toDate) {
      res.status(400).json({ error: "fromDate and toDate query parameters required (YYYY-MM-DD)" });
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Fetch all synced checkins in date range
    const checkins = await prisma.attendanceLog.findMany({
      where: {
        tenantId: tid,
        syncStatus: "SYNCED",
        punchedAt: { gte: from, lte: to },
      },
      orderBy: { punchedAt: "asc" },
    });

    // Get employee mappings
    const mappings = await prisma.employeeMapping.findMany({
      where: { tenantId: tid },
    });

    const mappingMap = new Map(mappings.map((m) => [m.userPin, m.erpnextEmployeeId]));

    // Group by employee and date
    const report: Array<{
      employeeId: string;
      employeeName: string;
      date: string;
      checkinCount: number;
      attendanceCreated: boolean;
      attendanceStatus?: string;
      issues: string[];
    }> = [];

    const groupedByEmployeeDate = new Map<string, typeof checkins>();

    for (const checkin of checkins) {
      const employeeId = mappingMap.get(checkin.userPin);
      if (!employeeId) continue;

      const dateStr = checkin.punchedAt.toISOString().split("T")[0];
      const key = `${employeeId}-${dateStr}`;

      if (!groupedByEmployeeDate.has(key)) {
        groupedByEmployeeDate.set(key, []);
      }
      groupedByEmployeeDate.get(key)!.push(checkin);
    }

    // Check attendance for each group
    for (const [key, checkinsForDay] of groupedByEmployeeDate) {
      const [employeeId, dateStr] = key.split("-");
      const mapping = mappings.find((m) => m.erpnextEmployeeId === employeeId);

      if (!employeeId || !dateStr) continue;

      const issues: string[] = [];

      try {
        const attendance = await fetchAttendanceFromErpnext(tid, employeeId, dateStr);

        report.push({
          employeeId,
          employeeName: mapping?.employeeName || "Unknown",
          date: dateStr,
          checkinCount: checkinsForDay.length,
          attendanceCreated: !!attendance,
          attendanceStatus: attendance?.status,
          issues: attendance ? [] : ["Attendance not created despite successful checkin sync"],
        });
      } catch (err) {
        report.push({
          employeeId,
          employeeName: mapping?.employeeName || "Unknown",
          date: dateStr,
          checkinCount: checkinsForDay.length,
          attendanceCreated: false,
          issues: [`Error checking attendance: ${err}`],
        });
      }
    }

    const summary = {
      totalDays: report.length,
      attendanceCreated: report.filter((r) => r.attendanceCreated).length,
      attendanceMissing: report.filter((r) => !r.attendanceCreated).length,
      withIssues: report.filter((r) => r.issues.length > 0).length,
    };

    res.json({ summary, report });
  } catch (err) {
    console.error("Attendance verification report error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate verification report";
    res.status(500).json({ error: message });
  }
});
