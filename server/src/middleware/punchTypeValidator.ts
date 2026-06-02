import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import DevicePunchTypeService from "../services/devicePunchTypeService";

/**
 * Middleware to validate punch against device's punch_type configuration
 * Should be used in ATTLOG and punch processing endpoints
 */
export async function validatePunchType(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get device SN from query or body
    const deviceSn = req.query.SN as string || req.body.SN;
    const punchData = req.body;

    if (!deviceSn || !punchData) {
      return next(); // No validation data, let it through
    }

    // Get device from database
    const device = await prisma.device.findFirst({
      where: { serialNumber: deviceSn },
    });

    if (!device) {
      return next(); // Device not found, let iclock handler deal with it
    }

    // Extract inOutMode from punch data
    // Format: PIN\tDateTime\tStatus\tVerifyType\tInOutMode\tWorkCode
    const lines = punchData.toString().split("\n");
    const punchLine = lines[0];
    const parts = punchLine.split("\t");

    if (parts.length < 5) {
      return next(); // Invalid format, let it through
    }

    const inOutMode = parseInt(parts[4], 10); // 0 = IN, 1 = OUT

    // Validate against device punch_type
    const isAccepted = DevicePunchTypeService.shouldAcceptPunch(
      device.punchType,
      inOutMode
    );

    if (!isAccepted) {
      // Log rejection
      const reason = DevicePunchTypeService.getRejectionReason(
        device.punchType,
        inOutMode
      );
      const direction = DevicePunchTypeService.getPunchDirectionLabel(
        inOutMode
      );

      console.log(
        `[PUNCH_TYPE_REJECT] Device ${deviceSn} (${device.punchType}): ${direction} punch rejected - ${reason}`
      );

      // Store in raw events for debugging
      await prisma.deviceRawEvent.create({
        data: {
          tenantId: device.tenantId,
          deviceSn: deviceSn,
          method: "POST",
          path: "/iclock/cdata",
          query: `SN=${deviceSn}&table=ATTLOG`,
          bodyPreview: `REJECTED_${device.punchType}_${direction}_PUNCH`,
        },
      });

      // Return rejection response to device
      return res.status(403).json({
        success: false,
        error: reason,
      });
    }

    // Punch is accepted, continue
    next();
  } catch (error) {
    console.error("[PUNCH_TYPE_VALIDATOR] Error:", error);
    next(); // On error, let it through (fail open)
  }
}
