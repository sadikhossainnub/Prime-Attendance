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

// Validate plan enum
function isValidPlan(plan: unknown): plan is "STARTER" | "BUSINESS" | "ENTERPRISE" {
  return plan === "STARTER" || plan === "BUSINESS" || plan === "ENTERPRISE";
}

// Validate tenant status enum
function isValidStatus(status: unknown): status is "ACTIVE" | "SUSPENDED" | "TRIAL" {
  return status === "ACTIVE" || status === "SUSPENDED" || status === "TRIAL";
}

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

adminRouter.get("/tenants", async (req, res: Response) => {
  // Pagination support
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10) || 20));
  const skip = (page - 1) * limit;

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { devices: true, users: true, attendanceLogs: true } },
      },
    }),
    prisma.tenant.count(),
  ]);

  res.json({
    items: tenants,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
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
    plan?: unknown;
    contactEmail?: string;
    contactPhone?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
  };

  // Input validation
  if (!name || !slug || !adminEmail || !adminPassword || !adminName) {
    res.status(400).json({
      error: "name, slug, adminName, adminEmail, adminPassword required",
    });
    return;
  }

  if (typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name must be a non-empty string" });
    return;
  }

  if (typeof slug !== "string" || slug.trim().length === 0) {
    res.status(400).json({ error: "slug must be a non-empty string" });
    return;
  }

  // Validate plan if provided
  if (plan !== undefined && !isValidPlan(plan)) {
    res.status(400).json({ error: "plan must be STARTER, BUSINESS, or ENTERPRISE" });
    return;
  }

  // Validate password strength (minimum 8 characters)
  if (typeof adminPassword !== "string" || adminPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
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
      plan: (plan as "STARTER" | "BUSINESS" | "ENTERPRISE") ?? "STARTER",
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
  const { name, status, plan, contactEmail, contactPhone } = req.body as {
    name?: unknown;
    status?: unknown;
    plan?: unknown;
    contactEmail?: unknown;
    contactPhone?: unknown;
  };

  // Validate status if provided
  if (status !== undefined && !isValidStatus(status)) {
    res.status(400).json({ error: "status must be ACTIVE, SUSPENDED, or TRIAL" });
    return;
  }

  // Validate plan if provided
  if (plan !== undefined && !isValidPlan(plan)) {
    res.status(400).json({ error: "plan must be STARTER, BUSINESS, or ENTERPRISE" });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (name && typeof name === "string") updateData.name = name;
  if (status && isValidStatus(status)) updateData.status = status;
  if (plan && isValidPlan(plan)) updateData.plan = plan;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail || null;
  if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;

  const tenant = await prisma.tenant.update({
    where: { id: String(id) },
    data: updateData,
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
    role?: unknown;
  };

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, name required" });
    return;
  }

  // Validate password strength
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Validate role if provided
  if (role !== undefined && role !== "TENANT_ADMIN" && role !== "TENANT_USER") {
    res.status(400).json({ error: "role must be TENANT_ADMIN or TENANT_USER" });
    return;
  }

  const user = await prisma.user.create({
    data: {
      tenantId: String(id),
      email: email.toLowerCase().trim(),
      passwordHash: await hashPassword(password),
      name,
      role: (role as "TENANT_ADMIN" | "TENANT_USER") ?? "TENANT_USER",
    },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

/**
 * Sync employees from ERPNext
 */
adminRouter.post("/tenants/:id/sync-employees", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: String(id) },
      select: { id: true, slug: true, erpnextEnabled: true },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    if (!tenant.erpnextEnabled) {
      res.status(400).json({ error: "ERPNext not enabled for this tenant" });
      return;
    }

    const { syncEmployeesFromErpnext } = await import("../services/erpnext.js");
    const result = await syncEmployeesFromErpnext(id);

    console.log(`[admin] Employee sync initiated: tenant=${tenant.slug}, result=${JSON.stringify(result)}`);

    res.json({
      message: "Employee sync completed",
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync employees";
    console.error(`[admin] Employee sync error: ${message}`);
    res.status(500).json({ error: message });
  }
});

/**
 * Get access token to login as a tenant (impersonation for admins)
 */
adminRouter.post("/tenants/:id/access-token", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId?: string };

    // Get tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: String(id) },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Get a tenant user (use provided userId or get first admin)
    let user;
    if (userId) {
      user = await prisma.user.findFirst({
        where: {
          id: userId,
          tenantId: tenant.id,
        },
      });
    } else {
      user = await prisma.user.findFirst({
        where: {
          tenantId: tenant.id,
          role: "TENANT_ADMIN",
        },
      });
    }

    if (!user) {
      res.status(404).json({ error: "No tenant users found" });
      return;
    }

    // Generate JWT token for the tenant user
    const { signToken } = await import("../services/auth.js");
    const token = signToken(user, tenant.slug);

    console.log(`[admin] Impersonation token generated: admin=${req.user?.email}, tenant=${tenant.slug}, user=${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
      },
      message: `Access token generated for ${user.name} (${user.email})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate access token";
    console.error(`[admin] Access token error: ${message}`);
    res.status(500).json({ error: message });
  }
});
