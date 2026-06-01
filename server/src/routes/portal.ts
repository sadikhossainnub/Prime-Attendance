import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireTenantUser,
  type AuthRequest,
} from "../middleware/auth.js";
import { isErpnextEnabled, queueAttendanceSync } from "../services/erpnext.js";

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

    const [punchToday, onlineDevices, totalDevices, totalEmployees] =
      await Promise.all([
        prisma.attendanceLog.count({
          where: { tenantId: tid, punchedAt: { gte: start, lte: end } },
        }),
        prisma.device.count({
          where: { tenantId: tid, lastSeenAt: { gte: fiveMinAgo } },
        }),
        prisma.device.count({ where: { tenantId: tid } }),
        prisma.employeeMapping.count({ where: { tenantId: tid } }),
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
      erpnextEnabled: isErpnextEnabled(),
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
    res.status(404).json({ error: "Device not found" });
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

    const [items, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        orderBy: { punchedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
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
      },
    });
    res.json(tenant);
  } catch (err) {
    console.error("Settings error:", err);
    res.status(500).json({ error: "Failed to load settings" });
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
    if (!isErpnextEnabled()) {
      res.status(400).json({ error: "ERPNext sync is not enabled" });
      return;
    }

    // Find failed or skipped logs for this tenant
    const logs = await prisma.attendanceLog.findMany({
      where: {
        tenantId: tid,
        syncStatus: { in: ["FAILED", "SKIPPED", "PENDING"] },
      },
      select: { id: true },
      take: 100, // Limit to 100 at a time
    });

    // Trigger sync in background
    for (const log of logs) {
      void queueAttendanceSync(log.id);
    }

    res.json({
      message: `Triggered sync retry for ${logs.length} logs`,
      count: logs.length,
    });
  } catch (err) {
    console.error("Sync retry error:", err);
    res.status(500).json({ error: "Failed to trigger sync retry" });
  }
});
