import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@prisma/client";
import { verifyToken, type JwtPayload } from "../services/auth.js";
import { prisma } from "../lib/prisma.js";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Super admin only" });
    return;
  }
  next();
}

/**
 * Middleware to check tenant access and status
 * Ensures user has a valid tenantId and tenant is not suspended
 */
export async function requireTenantUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.tenantId) {
    res.status(403).json({ error: "Tenant access required" });
    return;
  }

  try {
    // Check if tenant exists and is not suspended
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { id: true, status: true },
    });

    if (!tenant) {
      res.status(403).json({ error: "Tenant not found" });
      return;
    }

    if (tenant.status === "SUSPENDED") {
      res.status(403).json({ error: "Tenant account is suspended" });
      return;
    }

    next();
  } catch (err) {
    console.error("Error checking tenant status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
