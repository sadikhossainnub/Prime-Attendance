import { prisma } from "../lib/prisma.js";
import { parseAttlogBody } from "./attendanceParser.js";
import { queueAttendanceSync } from "./erpnext.js";

export async function ingestAttlog(
  tenantId: string,
  deviceSn: string,
  body: string
): Promise<{ inserted: number; duplicates: number }> {
  const rows = parseAttlogBody(body);
  let inserted = 0;
  let duplicates = 0;

  console.log(`[ingest] 📥 Processing ${rows.length} attendance rows from device ${deviceSn}`);
  
  // Debug: Log first few rows to see inOutMode values
  if (rows.length > 0) {
    const sampleRows = rows.slice(0, 3);
    console.log(`[ingest] 🔍 Sample data (first ${sampleRows.length} rows):`);
    sampleRows.forEach((row, idx) => {
      console.log(`  [${idx + 1}] PIN: ${row.userPin}, Time: ${row.punchedAt.toISOString()}, inOutMode: ${row.inOutMode} (${row.inOutMode === 0 ? 'IN' : row.inOutMode === 1 ? 'OUT' : 'NULL'})`);
    });
  }

  for (const row of rows) {
    try {
      const log = await prisma.attendanceLog.create({
        data: {
          tenantId,
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
      
      // Debug log for each inserted record
      console.log(`[ingest] ✅ Inserted: PIN ${row.userPin}, inOutMode: ${row.inOutMode} (${row.inOutMode === 0 ? 'IN' : row.inOutMode === 1 ? 'OUT' : 'NULL'})`);
      
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

  console.log(`[ingest] 📊 Summary: ${inserted} inserted, ${duplicates} duplicates`);
  return { inserted, duplicates };
}
