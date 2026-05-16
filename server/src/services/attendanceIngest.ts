import { prisma } from "../lib/prisma.js";
import { parseAttlogBody } from "./attendanceParser.js";
import { queueAttendanceSync } from "./erpnext.js";

export async function ingestAttlog(
  deviceSn: string,
  body: string
): Promise<{ inserted: number; duplicates: number }> {
  const rows = parseAttlogBody(body);
  let inserted = 0;
  let duplicates = 0;

  for (const row of rows) {
    try {
      const log = await prisma.attendanceLog.create({
        data: {
          deviceSn,
          userPin: row.userPin,
          punchedAt: row.punchedAt,
          status: row.status,
          verifyType: row.verifyType,
          inOutMode: row.inOutMode,
          workCode: row.workCode,
          rawLine: row.rawLine,
          syncStatus: "PENDING",
        },
      });
      inserted++;
      void queueAttendanceSync(log.id);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        duplicates++;
      } else {
        throw err;
      }
    }
  }

  return { inserted, duplicates };
}
