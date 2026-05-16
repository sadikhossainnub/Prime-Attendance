import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";
import { hashPassword } from "./auth.js";

export async function seedSuperAdmin() {
  const existing = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });
  if (existing) return;

  const passwordHash = await hashPassword(config.superAdmin.password);
  await prisma.user.create({
    data: {
      email: config.superAdmin.email,
      passwordHash,
      name: config.superAdmin.name,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`[seed] Super admin created: ${config.superAdmin.email}`);
}
