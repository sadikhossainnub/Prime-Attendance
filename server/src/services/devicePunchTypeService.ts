import { PunchType } from "@prisma/client";

/**
 * Validates punch against device's punch_type configuration
 * - BOTH: Accepts all punches (IN and OUT)
 * - IN_ONLY: Accepts only IN punches (inOutMode = 0)
 * - OUT_ONLY: Accepts only OUT punches (inOutMode = 1)
 */
export class DevicePunchTypeService {
  /**
   * Check if device should accept this punch
   * @param devicePunchType The device's configured punch type
   * @param inOutMode 0 = IN, 1 = OUT
   * @returns true if punch should be accepted, false otherwise
   */
  static shouldAcceptPunch(
    devicePunchType: PunchType,
    inOutMode: number
  ): boolean {
    if (devicePunchType === "BOTH") {
      return true; // Accept all punches
    }

    if (devicePunchType === "IN_ONLY") {
      return inOutMode === 0; // Accept only IN punches
    }

    if (devicePunchType === "OUT_ONLY") {
      return inOutMode === 1; // Accept only OUT punches
    }

    return false; // Default: reject
  }

  /**
   * Get human-readable rejection reason
   */
  static getRejectionReason(
    devicePunchType: PunchType,
    inOutMode: number
  ): string {
    if (devicePunchType === "IN_ONLY" && inOutMode === 1) {
      return "This device is configured for IN punches only";
    }

    if (devicePunchType === "OUT_ONLY" && inOutMode === 0) {
      return "This device is configured for OUT punches only";
    }

    return "Punch type not accepted by this device";
  }

  /**
   * Get punch type label for UI
   */
  static getPunchTypeLabel(punchType: PunchType): string {
    const labels: Record<PunchType, string> = {
      BOTH: "Both IN & OUT",
      IN_ONLY: "IN Only",
      OUT_ONLY: "OUT Only",
    };
    return labels[punchType];
  }

  /**
   * Get punch direction label
   */
  static getPunchDirectionLabel(inOutMode: number): string {
    return inOutMode === 0 ? "IN" : "OUT";
  }
}

export default DevicePunchTypeService;
