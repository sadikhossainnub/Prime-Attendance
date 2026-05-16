import { prisma } from "../lib/prisma.js";

export async function resolveTenantForDevice(
  serialNumber: string,
  options?: { tenantSlug?: string; provisionKey?: string }
) {
  const existing = await prisma.device.findFirst({
    where: { serialNumber },
    include: { tenant: true },
  });
  if (existing) {
    if (existing.tenant.status === "SUSPENDED") return null;
    return existing.tenant;
  }

  if (!options?.tenantSlug || !options?.provisionKey) return null;

  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: options.tenantSlug,
      deviceProvisionKey: options.provisionKey,
      status: { not: "SUSPENDED" },
    },
  });
  return tenant;
}

export async function registerDeviceToTenant(
  tenantId: string,
  serialNumber: string,
  ip?: string
) {
  return prisma.device.upsert({
    where: {
      tenantId_serialNumber: { tenantId, serialNumber },
    },
    create: {
      tenantId,
      serialNumber,
      lastSeenAt: new Date(),
      lastIp: ip,
    },
    update: {
      lastSeenAt: new Date(),
      lastIp: ip,
    },
  });
}
