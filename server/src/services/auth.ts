import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { User, UserRole } from "@prisma/client";
import { config } from "../lib/config.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  tenantSlug: string | null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: User, tenantSlug: string | null): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function generateProvisionKey(): string {
  return `pk_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
