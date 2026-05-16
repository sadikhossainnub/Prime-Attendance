import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireApiKey } from "../middleware/apiKey.js";
import { isErpnextEnabled } from "../services/erpnext.js";
import { config } from "../lib/config.js";

export const apiRouter = Router();
apiRouter.use(requireApiKey);

function parseDateParam(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

apiRouter.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timezone: config.timezone,
      erpnextEnabled: isErpnextEnabled(),
    });
  } catch {
    res.status(503).json({ status: "degraded", database: false });
  }
});

apiRouter.get("/devices", async (_req: Request, res: Response) => {
  const devices = await prisma.device.findMany({
    orderBy: { lastSeenAt: "desc" },
  });
  const now = Date.now();
  const enriched = devices.map((d) => ({
    ...d,
    online:
      d.lastSeenAt !== null && now - d.lastSeenAt.getTime() < 5 * 60 * 1000,
  }));
  res.json(enriched);
});

apiRouter.get("/attendance", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(
    200,
    Math.max(1, parseInt(String(req.query.limit ?? "50"), 10) || 50)
  );
  const skip = (page - 1) * limit;

  const from = parseDateParam(req.query.from);
  const to = parseDateParam(req.query.to);
  const pin =
    typeof req.query.pin === "string" ? req.query.pin : undefined;
  const deviceSn =
    typeof req.query.deviceSn === "string" ? req.query.deviceSn : undefined;

  const where: {
    punchedAt?: { gte?: Date; lte?: Date };
    userPin?: string;
    deviceSn?: string;
  } = {};

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

  res.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

apiRouter.get("/attendance/stats/today", async (_req: Request, res: Response) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [punchCount, deviceCount] = await Promise.all([
    prisma.attendanceLog.count({
      where: { punchedAt: { gte: start, lte: end } },
    }),
    prisma.device.count({
      where: {
        lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    }),
  ]);

  res.json({ punchCount, onlineDevices: deviceCount });
});

apiRouter.get("/employees/mapping", async (_req: Request, res: Response) => {
  const mappings = await prisma.employeeMapping.findMany({
    orderBy: { userPin: "asc" },
  });
  res.json(mappings);
});

apiRouter.post("/employees/mapping", async (req: Request, res: Response) => {
  const { userPin, employeeName, erpnextEmployeeId } = req.body as {
    userPin?: string;
    employeeName?: string;
    erpnextEmployeeId?: string | null;
  };

  if (!userPin || !employeeName) {
    res.status(400).json({ error: "userPin and employeeName are required" });
    return;
  }

  const mapping = await prisma.employeeMapping.upsert({
    where: { userPin },
    create: {
      userPin,
      employeeName,
      erpnextEmployeeId: erpnextEmployeeId ?? null,
    },
    update: {
      employeeName,
      erpnextEmployeeId: erpnextEmployeeId ?? null,
    },
  });

  res.json(mapping);
});

apiRouter.delete(
  "/employees/mapping/:userPin",
  async (req: Request, res: Response) => {
    const userPin = String(req.params.userPin);
    try {
      await prisma.employeeMapping.delete({ where: { userPin } });
      res.status(204).send();
    } catch {
      res.status(404).json({ error: "Mapping not found" });
    }
  }
);

apiRouter.get("/raw-events", async (req: Request, res: Response) => {
  const limit = Math.min(
    100,
    parseInt(String(req.query.limit ?? "20"), 10) || 20
  );
  const deviceSn =
    typeof req.query.deviceSn === "string" ? req.query.deviceSn : undefined;

  const events = await prisma.deviceRawEvent.findMany({
    where: deviceSn ? { deviceSn } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(events);
});
