import { prisma } from "../lib/prisma.js";

/**
 * Shift Type interface matching ERPNext HRMS schema
 * Reference: https://github.com/frappe/hrms/blob/develop/hrms/hr/doctype/shift_type/shift_type.json
 */
export interface ErpnextShiftType {
  name: string;
  shift_name?: string;
  start_time: string; // "09:00:00"
  end_time: string; // "17:00:00"
  enable_auto_attendance?: number; // 0 or 1
  process_attendance_after?: string; // "2026-01-01"
  last_sync_of_checkin?: string; // "2026-06-18 10:00:00"
  begin_check_in_before_shift_start_time?: number; // minutes
  allow_check_out_after_shift_end_time?: number; // minutes
  working_hours_threshold_for_absent?: number;
  working_hours_threshold_for_half_day?: number;
  enable_entry_grace_period?: number;
  enable_exit_grace_period?: number;
  late_entry_grace_period?: number;
  early_exit_grace_period?: number;
}

/**
 * Employee Shift Assignment interface
 */
export interface ErpnextShiftAssignment {
  name: string;
  employee: string;
  shift_type: string;
  start_date: string;
  end_date?: string | null;
  status?: string;
}

/**
 * Attendance document interface
 */
export interface ErpnextAttendance {
  name: string;
  employee: string;
  attendance_date: string;
  status: "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home";
  in_time?: string;
  out_time?: string;
  working_hours?: number;
  shift?: string;
}

/**
 * Fetch shift types from ERPNext
 */
export async function fetchShiftTypesFromErpnext(tenantId: string): Promise<ErpnextShiftType[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  const fields = [
    "name",
    "shift_name",
    "start_time",
    "end_time",
    "enable_auto_attendance",
    "process_attendance_after",
    "last_sync_of_checkin",
    "begin_check_in_before_shift_start_time",
    "allow_check_out_after_shift_end_time",
    "working_hours_threshold_for_absent",
    "working_hours_threshold_for_half_day",
    "enable_entry_grace_period",
    "enable_exit_grace_period",
    "late_entry_grace_period",
    "early_exit_grace_period",
  ];

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Shift Type?fields=${encodeURIComponent(JSON.stringify(fields))}`;

  console.log(`[shift-sync] Fetching shift types: tenant=${tenant.slug}`);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ERPNext API error ${response.status}: ${text}`);
    }

    interface ErpnextResponse {
      data?: ErpnextShiftType[];
    }

    const data = (await response.json()) as ErpnextResponse;
    const shiftTypes = Array.isArray(data?.data) ? data.data : [];

    console.log(`[shift-sync] Fetched ${shiftTypes.length} shift types: tenant=${tenant.slug}`);

    return shiftTypes;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch shift types";
    console.error(`[shift-sync] Error: ${message}`);
    throw new Error(`Failed to fetch shift types from ERPNext: ${message}`);
  }
}

/**
 * Fetch shift assignments for an employee from ERPNext
 */
export async function fetchEmployeeShiftAssignments(
  tenantId: string,
  employeeId: string
): Promise<ErpnextShiftAssignment[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  const fields = ["name", "employee", "shift_type", "start_date", "end_date", "status"];
  const filters = JSON.stringify([["employee", "=", employeeId]]);

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Shift Assignment?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(filters)}`;

  console.log(`[shift-sync] Fetching shift assignments: tenant=${tenant.slug}, employee=${employeeId}`);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ERPNext API error ${response.status}: ${text}`);
    }

    interface ErpnextResponse {
      data?: ErpnextShiftAssignment[];
    }

    const data = (await response.json()) as ErpnextResponse;
    const assignments = Array.isArray(data?.data) ? data.data : [];

    console.log(`[shift-sync] Fetched ${assignments.length} shift assignments: tenant=${tenant.slug}, employee=${employeeId}`);

    return assignments;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch shift assignments";
    console.error(`[shift-sync] Error: ${message}`);
    throw new Error(`Failed to fetch shift assignments from ERPNext: ${message}`);
  }
}

/**
 * Verify if an employee has an active shift assignment for a given date
 */
export async function verifyEmployeeShiftAssignment(
  tenantId: string,
  employeeId: string,
  date: Date
): Promise<{ hasShift: boolean; shiftType?: string; message: string }> {
  try {
    const assignments = await fetchEmployeeShiftAssignments(tenantId, employeeId);

    if (assignments.length === 0) {
      return {
        hasShift: false,
        message: `No shift assignment found for employee ${employeeId}`,
      };
    }

    // Check if any assignment is active for the given date
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const activeAssignment = assignments.find((assignment) => {
      const startDate = assignment.start_date;
      const endDate = assignment.end_date;

      // Check if date is within range
      if (dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;

      return true;
    });

    if (activeAssignment) {
      return {
        hasShift: true,
        shiftType: activeAssignment.shift_type,
        message: `Employee has active shift assignment: ${activeAssignment.shift_type}`,
      };
    } else {
      return {
        hasShift: false,
        message: `No active shift assignment for employee ${employeeId} on ${dateStr}`,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      hasShift: false,
      message: `Error verifying shift assignment: ${message}`,
    };
  }
}

/**
 * Verify shift type configuration for auto-attendance
 */
export async function verifyShiftConfiguration(
  tenantId: string,
  shiftTypeName: string
): Promise<{
  isConfigured: boolean;
  issues: string[];
  shiftType?: ErpnextShiftType;
}> {
  try {
    const shiftTypes = await fetchShiftTypesFromErpnext(tenantId);
    const shiftType = shiftTypes.find((st) => st.name === shiftTypeName);

    if (!shiftType) {
      return {
        isConfigured: false,
        issues: [`Shift type "${shiftTypeName}" not found in ERPNext`],
      };
    }

    const issues: string[] = [];

    // Check critical settings
    if (!shiftType.enable_auto_attendance) {
      issues.push("Auto Attendance is not enabled for this shift type");
    }

    if (!shiftType.process_attendance_after) {
      issues.push("'Process Attendance After' date is not set");
    }

    if (!shiftType.last_sync_of_checkin) {
      issues.push("'Last Sync of Checkin' is not set - auto-attendance won't process");
    }

    // Check time configuration
    if (!shiftType.start_time || !shiftType.end_time) {
      issues.push("Shift start time or end time is not configured");
    }

    // Check grace periods
    if (!shiftType.begin_check_in_before_shift_start_time) {
      issues.push("Warning: No check-in buffer time set before shift start");
    }

    if (!shiftType.allow_check_out_after_shift_end_time) {
      issues.push("Warning: No check-out buffer time set after shift end");
    }

    return {
      isConfigured: issues.length === 0,
      issues,
      shiftType,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      isConfigured: false,
      issues: [`Error verifying shift configuration: ${message}`],
    };
  }
}

/**
 * Fetch attendance record from ERPNext for verification
 */
export async function fetchAttendanceFromErpnext(
  tenantId: string,
  employeeId: string,
  date: string // YYYY-MM-DD
): Promise<ErpnextAttendance | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  const fields = [
    "name",
    "employee",
    "attendance_date",
    "status",
    "in_time",
    "out_time",
    "working_hours",
    "shift",
  ];
  const filters = JSON.stringify([
    ["employee", "=", employeeId],
    ["attendance_date", "=", date],
  ]);

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Attendance?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(filters)}`;

  console.log(`[shift-sync] Fetching attendance: tenant=${tenant.slug}, employee=${employeeId}, date=${date}`);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`ERPNext API error ${response.status}: ${text}`);
    }

    interface ErpnextResponse {
      data?: ErpnextAttendance[];
    }

    const data = (await response.json()) as ErpnextResponse;
    const attendances = Array.isArray(data?.data) ? data.data : [];

    if (attendances.length === 0) {
      console.log(`[shift-sync] No attendance found: tenant=${tenant.slug}, employee=${employeeId}, date=${date}`);
      return null;
    }

    console.log(`[shift-sync] Attendance found: tenant=${tenant.slug}, employee=${employeeId}, date=${date}, status=${attendances[0]?.status}`);
    return attendances[0] || null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch attendance";
    console.error(`[shift-sync] Error: ${message}`);
    throw new Error(`Failed to fetch attendance from ERPNext: ${message}`);
  }
}

/**
 * Verify if attendance was created for a given employee checkin
 */
export async function verifyAttendanceCreated(
  tenantId: string,
  employeeId: string,
  checkinDate: Date
): Promise<{
  attendanceCreated: boolean;
  attendance?: ErpnextAttendance;
  message: string;
}> {
  try {
    const dateStr = checkinDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const attendance = await fetchAttendanceFromErpnext(tenantId, employeeId, dateStr);

    if (attendance) {
      return {
        attendanceCreated: true,
        attendance,
        message: `Attendance marked as ${attendance.status} for ${dateStr}`,
      };
    } else {
      return {
        attendanceCreated: false,
        message: `Attendance not yet created for ${dateStr}. Check shift configuration or wait for scheduler.`,
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      attendanceCreated: false,
      message: `Error verifying attendance: ${message}`,
    };
  }
}

/**
 * Check if an employee checkin already exists in ERPNext
 */
export async function checkDuplicateCheckin(
  tenantId: string,
  employeeId: string,
  time: string // YYYY-MM-DD HH:mm:ss
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    throw new Error("ERPNext not enabled for this tenant");
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("ERPNext credentials not configured");
  }

  const filters = JSON.stringify([
    ["employee", "=", employeeId],
    ["time", "=", time],
  ]);

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Employee Checkin?fields=["name"]&filters=${encodeURIComponent(filters)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
    });

    if (!response.ok) {
      return null; // If error, assume not duplicate
    }

    interface ErpnextResponse {
      data?: Array<{ name: string }>;
    }

    const data = (await response.json()) as ErpnextResponse;
    const checkins = Array.isArray(data?.data) ? data.data : [];

    if (checkins.length > 0) {
      console.log(`[shift-sync] Duplicate checkin found: ${checkins[0]?.name}`);
      return checkins[0]?.name || null;
    }

    return null;
  } catch (err) {
    console.error(`[shift-sync] Error checking duplicate: ${err}`);
    return null; // On error, allow sync to proceed
  }
}

/**
 * Manually mark attendance in ERPNext
 */
export async function markAttendanceInErpnext(
  tenantId: string,
  employeeId: string,
  date: string, // YYYY-MM-DD
  status: "Present" | "Absent" | "Half Day" | "On Leave" | "Work From Home",
  inTime?: string, // HH:mm:ss
  outTime?: string // HH:mm:ss
): Promise<{ success: boolean; attendanceId?: string; error?: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      erpnextEnabled: true,
      erpnextUrl: true,
      erpnextApiKey: true,
      erpnextApiSecret: true,
    },
  });

  if (!tenant?.erpnextEnabled) {
    return { success: false, error: "ERPNext not enabled for this tenant" };
  }

  const { erpnextUrl: url, erpnextApiKey: apiKey, erpnextApiSecret: apiSecret } = tenant;

  if (!url || !apiKey || !apiSecret) {
    return { success: false, error: "ERPNext credentials not configured" };
  }

  // Check if attendance already exists
  const existing = await fetchAttendanceFromErpnext(tenantId, employeeId, date);
  if (existing) {
    return {
      success: false,
      error: `Attendance already marked for ${date} with status: ${existing.status}`,
    };
  }

  const endpoint = `${url.replace(/\/$/, "")}/api/resource/Attendance`;

  const payload: Record<string, unknown> = {
    doctype: "Attendance",
    employee: employeeId,
    attendance_date: date,
    status,
  };

  if (inTime) payload.in_time = inTime;
  if (outTime) payload.out_time = outTime;

  console.log(`[shift-sync] Manually marking attendance: employee=${employeeId}, date=${date}, status=${status}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `token ${apiKey}:${apiSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[shift-sync] Failed to mark attendance: ${responseText}`);
      return { success: false, error: `ERPNext API error ${response.status}: ${responseText}` };
    }

    interface ErpnextResponse {
      data?: { name?: string };
    }

    const data = JSON.parse(responseText) as ErpnextResponse;
    const attendanceId = data?.data?.name;

    console.log(`[shift-sync] Attendance marked successfully: ${attendanceId}`);

    return { success: true, attendanceId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[shift-sync] Error marking attendance: ${message}`);
    return { success: false, error: message };
  }
}
