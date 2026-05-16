import { prisma } from "../lib/prisma.js";

export async function upsertDevice(
  serialNumber: string,
  ip: string | undefined,
  firmware?: string
) {
  return prisma.device.upsert({
    where: { serialNumber },
    create: {
      serialNumber,
      lastSeenAt: new Date(),
      lastIp: ip,
      firmware,
    },
    update: {
      lastSeenAt: new Date(),
      lastIp: ip,
      ...(firmware ? { firmware } : {}),
    },
  });
}

export async function logRawEvent(params: {
  deviceSn?: string;
  method: string;
  path: string;
  query?: string;
  bodyPreview?: string;
}) {
  const preview = params.bodyPreview?.slice(0, 4000) ?? null;
  return prisma.deviceRawEvent.create({
    data: {
      deviceSn: params.deviceSn,
      method: params.method,
      path: params.path,
      query: params.query,
      bodyPreview: preview,
    },
  });
}
