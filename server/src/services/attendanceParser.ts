export interface ParsedAttendanceRow {
  userPin: string;
  punchedAt: Date;
  status: number | null;
  verifyType: number | null;
  inOutMode: number | null;
  workCode: number | null;
  rawLine: string;
}

function parseIntOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

/** Parse ZKTeco ATTLOG tab-separated line: PIN, DateTime, Status, Verify, InOutMode, WorkCode */
export function parseAttlogLine(line: string): ParsedAttendanceRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("\t");
  if (parts.length < 2) return null;

  const [userPin, dateTimeStr, statusStr, verifyStr, inOutStr, workCodeStr] = parts;
  if (!userPin || !dateTimeStr) return null;

  const punchedAt = parseDeviceDateTime(dateTimeStr);
  if (!punchedAt) return null;

  return {
    userPin,
    punchedAt,
    status: parseIntOrNull(statusStr),
    verifyType: parseIntOrNull(verifyStr),
    inOutMode: parseIntOrNull(inOutStr),
    workCode: parseIntOrNull(workCodeStr),
    rawLine: trimmed,
  };
}

/** Supports YYYY-MM-DD HH:mm:ss and YYYY/MM/DD HH:mm:ss */
export function parseDeviceDateTime(value: string): Date | null {
  const normalized = value.trim().replace(/\//g, "-");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const date = new Date(
    parseInt(y!, 10),
    parseInt(mo!, 10) - 1,
    parseInt(d!, 10),
    parseInt(h!, 10),
    parseInt(mi!, 10),
    parseInt(s!, 10)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAttlogBody(body: string): ParsedAttendanceRow[] {
  const lines = body.split(/\r?\n/);
  const rows: ParsedAttendanceRow[] = [];

  for (const line of lines) {
    const row = parseAttlogLine(line);
    if (row) rows.push(row);
  }

  return rows;
}
