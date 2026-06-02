import express, { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { PunchType } from "@prisma/client";
import DevicePunchTypeService from "../services/devicePunchTypeService";

const router = express.Router();

/**
 * GET /api/admin/devices
 * List all devices with optional filters
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user as any;
    const { punchType, status } = req.query;

    const where: any = { tenantId };

    if (punchType && punchType !== "ALL") {
      where.punchType = punchType;
    }

    const devices = await prisma.device.findMany({
      where,
      select: {
        id: true,
        serialNumber: true,
        name: true,
        punchType: true,
        lastSeenAt: true,
        lastIp: true,
        firmware: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Add computed fields
    const devicesWithStatus = devices.map((device) => ({
      ...device,
      punchTypeLabel: DevicePunchTypeService.getPunchTypeLabel(device.punchType),
      isOnline:
        device.lastSeenAt &&
        new Date().getTime() - device.lastSeenAt.getTime() < 10 * 60 * 1000, // 10 min
    }));

    res.json({
      success: true,
      data: devicesWithStatus,
    });
  } catch (error) {
    console.error("[DEVICE_GET] Error:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

/**
 * GET /api/admin/devices/:id
 * Get device details
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user as any;
    const { id } = req.params;

    const device = await prisma.device.findFirst({
      where: { id, tenantId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      success: true,
      data: {
        ...device,
        punchTypeLabel: DevicePunchTypeService.getPunchTypeLabel(
          device.punchType
        ),
      },
    });
  } catch (error) {
    console.error("[DEVICE_GET_DETAIL] Error:", error);
    res.status(500).json({ error: "Failed to fetch device" });
  }
});

/**
 * PUT /api/admin/devices/:id
 * Update device (including punch_type)
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user as any;
    const { id } = req.params;
    const { name, punchType } = req.body;

    // Validate punchType if provided
    if (punchType && !["BOTH", "IN_ONLY", "OUT_ONLY"].includes(punchType)) {
      return res.status(400).json({
        error: "Invalid punch_type. Must be BOTH, IN_ONLY, or OUT_ONLY",
      });
    }

    const device = await prisma.device.findFirst({
      where: { id, tenantId },
    });

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    const updated = await prisma.device.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(punchType && { punchType: punchType as PunchType }),
      },
    });

    console.log(`[DEVICE_UPDATE] ${id}: punchType=${punchType}`);

    res.json({
      success: true,
      data: {
        ...updated,
        punchTypeLabel: DevicePunchTypeService.getPunchTypeLabel(
          updated.punchType
        ),
      },
    });
  } catch (error) {
    console.error("[DEVICE_UPDATE] Error:", error);
    res.status(500).json({ error: "Failed to update device" });
  }
});

/**
 * GET /api/admin/devices/by-punch-type/:type
 * Get all devices filtered by punch type
 */
router.get("/by-punch-type/:type", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user as any;
    const { type } = req.params;

    if (!["BOTH", "IN_ONLY", "OUT_ONLY"].includes(type)) {
      return res.status(400).json({
        error: "Invalid punch type",
      });
    }

    const devices = await prisma.device.findMany({
      where: {
        tenantId,
        punchType: type as PunchType,
      },
      select: {
        id: true,
        serialNumber: true,
        name: true,
        punchType: true,
        lastSeenAt: true,
      },
    });

    res.json({
      success: true,
      data: devices,
      count: devices.length,
    });
  } catch (error) {
    console.error("[DEVICE_BY_TYPE] Error:", error);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});

/**
 * POST /api/admin/devices/bulk-update-punch-type
 * Bulk update punch type for multiple devices
 */
router.post(
  "/bulk-update-punch-type",
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user as any;
      const { deviceIds, punchType } = req.body;

      if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
        return res.status(400).json({ error: "Invalid deviceIds" });
      }

      if (!["BOTH", "IN_ONLY", "OUT_ONLY"].includes(punchType)) {
        return res.status(400).json({
          error: "Invalid punch_type. Must be BOTH, IN_ONLY, or OUT_ONLY",
        });
      }

      // Update all devices
      const result = await prisma.device.updateMany({
        where: {
          id: { in: deviceIds },
          tenantId,
        },
        data: {
          punchType: punchType as PunchType,
        },
      });

      console.log(
        `[DEVICE_BULK_UPDATE] Updated ${result.count} devices to ${punchType}`
      );

      res.json({
        success: true,
        message: `Updated ${result.count} devices to ${punchType}`,
        updatedCount: result.count,
      });
    } catch (error) {
      console.error("[DEVICE_BULK_UPDATE] Error:", error);
      res.status(500).json({ error: "Failed to update devices" });
    }
  }
);

export default router;
