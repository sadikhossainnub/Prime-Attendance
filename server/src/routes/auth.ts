import { Router, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyPassword, signToken, hashPassword, generateProvisionKey } from "../services/auth.js";
import {
  requireAuth,
  type AuthRequest,
} from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { tenant: true },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.tenant?.status === "SUSPENDED") {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  const token = signToken(user, user.tenant?.slug ?? null);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            slug: user.tenant.slug,
            plan: user.tenant.plan,
            status: user.tenant.status,
          }
        : null,
    },
  });
});

authRouter.post("/signup", async (req, res) => {
  try {
    const {
      companyName,
      slug,
      adminName,
      adminEmail,
      adminPassword,
      plan,
      contactEmail,
    } = req.body as {
      companyName?: string;
      slug?: string;
      adminName?: string;
      adminEmail?: string;
      adminPassword?: string;
      plan?: string;
      contactEmail?: string;
    };

    // Validation
    if (!companyName || !slug || !adminName || !adminEmail || !adminPassword || !plan) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (adminPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    if (!slug.match(/^[a-z0-9-]+$/)) {
      res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and hyphens" });
      return;
    }

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      res.status(409).json({ error: "Slug already taken" });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Create tenant and admin user
    const passwordHash = await hashPassword(adminPassword);
    const deviceProvisionKey = generateProvisionKey();

    const tenant = await prisma.tenant.create({
      data: {
        name: companyName,
        slug,
        plan: (plan as any) || "STARTER",
        status: "ACTIVE",
        contactEmail: contactEmail || null,
        deviceProvisionKey,
        users: {
          create: {
            email: adminEmail.toLowerCase().trim(),
            name: adminName,
            passwordHash,
            role: "TENANT_ADMIN",
            isActive: true,
          },
        },
      },
      include: {
        users: true,
      },
    });

    const adminUser = tenant.users[0];
    const token = signToken(adminUser, tenant.slug);

    console.log(`[auth] New signup: tenant=${tenant.slug}, admin=${adminEmail}, plan=${plan}`);

    res.status(201).json({
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        tenantId: tenant.id,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
        },
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    include: { tenant: true },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenant: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          plan: user.tenant.plan,
          status: user.tenant.status,
          deviceProvisionKey: user.tenant.deviceProvisionKey,
        }
      : null,
  });
});
