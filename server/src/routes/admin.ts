import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireSuperAdmin,
  type AuthRequest,
} from "../middleware/auth.js";
import { hashPassword, generateProvisionKey } from "../services/auth.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireSuperAdmin);

adminRouter.get("/stats", async (_req, res: Response) => {
  const [tenantCount, deviceCount, punchToday, userCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.device.count(),
    prisma.attendanceLog.count({
      where: {
        punchedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" } } }),
  ]);

  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      _count: { select: { devices: true, users: true, attendanceLogs: true } },
    },
  });

  res.json({
    tenantCount,
    deviceCount,
    punchToday,
    userCount,
    recentTenants: tenants,
  });
});

adminRouter.get("/tenants", async (_req, res: Response) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { devices: true, users: true, attendanceLogs: true } },
    },
  });
  res.json(tenants);
});

adminRouter.post("/tenants", async (req, res: Response) => {
  const {
    name,
    slug,
    plan,
    contactEmail,
    contactPhone,
    adminName,
    adminEmail,
    adminPassword,
  } = req.body as {
    name?: string;
    slug?: string;
    plan?: "STARTER" | "BUSINESS" | "ENTERPRISE";
    contactEmail?: string;
    contactPhone?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  };

  if (!name || !slug || !adminEmail || !adminPassword || !adminName) {
    res.status(400).json({
      error: "name, slug, adminName, adminEmail, adminPassword required",
    });
    return;
  }

  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const existing = await prisma.tenant.findUnique({
    where: { slug: normalizedSlug },
  });
  if (existing) {
    res.status(409).json({ error: "Slug already exists" });
    return;
  }

  const emailExists = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase().trim() },
  });
  if (emailExists) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug: normalizedSlug,
      plan: plan ?? "STARTER",
      status: "TRIAL",
      deviceProvisionKey: generateProvisionKey(),
      contactEmail,
      contactPhone,
      users: {
        create: {
          email: adminEmail.toLowerCase().trim(),
          passwordHash: await hashPassword(adminPassword),
          name: adminName,
          role: "TENANT_ADMIN",
        },
      },
    },
    include: { users: { select: { id: true, email: true, name: true, role: true } } },
  });

  res.status(201).json(tenant);
});

adminRouter.patch("/tenants/:id", async (req, res: Response) => {
  const { id } = req.params;
  const { name, status, plan, contactEmail, contactPhone } = req.body;

  const tenant = await prisma.tenant.update({
    where: { id: String(id) },
    data: {
      ...(name && { name }),
      ...(status && { status }),
      ...(plan && { plan }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(contactPhone !== undefined && { contactPhone }),
    },
  });
  res.json(tenant);
});

adminRouter.post("/tenants/:id/rotate-provision-key", async (req, res: Response) => {
  const { id } = req.params;
  const key = generateProvisionKey();
  const tenant = await prisma.tenant.update({
    where: { id: String(id) },
    data: { deviceProvisionKey: key },
  });
  res.json({ deviceProvisionKey: tenant.deviceProvisionKey });
});

adminRouter.get("/tenants/:id", async (req, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: String(req.params.id) },
    include: {
      users: { select: { id: true, email: true, name: true, role: true, isActive: true } },
      devices: { orderBy: { lastSeenAt: "desc" } },
      _count: { select: { attendanceLogs: true } },
    },
  });
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }
  res.json(tenant);
});

adminRouter.post("/tenants/:id/users", async (req, res: Response) => {
  const { id } = req.params;
  const { email, password, name, role } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    role?: "TENANT_ADMIN" | "TENANT_USER";
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, name required" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      tenantId: String(id),
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      name,
      role: role ?? "TENANT_USER",
    },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});
