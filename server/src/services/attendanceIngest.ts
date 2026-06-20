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
  
  // Fetch device configuration to check punch_type
  const device = await prisma.device.findUnique({
    where: { 
      tenantId_serialNumber: { tenantId, serialNumber: deviceSn }
    },
    select: { punchType: true, name: true },
  });

  let devicePunchTypeOverride: string | null = null;
  if (device?.punchType) {
    devicePunchTypeOverride = device.punchType;
    console.log(`[ingest] 🔧 Device "${device.name || deviceSn}" punch_type: ${devicePunchTypeOverride}`);
  }
  
  // Debug: Log first few rows to see inOutMode values
  if (rows.length > 0) {
    const sampleRows = rows.slice(0, 3);
    console.log(`[ingest] 🔍 Sample data (first ${sampleRows.length} rows):`);
    sampleRows.forEach((row, idx) => {
      console.log(`  [${idx + 1}] PIN: ${row.userPin}, Time: ${row.punchedAt.toISOString()}, RAW inOutMode: ${row.inOutMode} (${row.inOutMode === 0 ? 'IN' : row.inOutMode === 1 ? 'OUT' : 'NULL'})`);
    });
  }

  for (const row of rows) {
    try {
      // Override inOutMode based on device punch_type configuration
      let finalInOutMode = row.inOutMode;
      
      if (devicePunchTypeOverride === 'IN_ONLY') {
        // IN_ONLY device: force all punches to IN (0)
        finalInOutMode = 0;
        if (row.inOutMode !== 0) {
          console.log(`[ingest] 🔄 Override: Device is IN_ONLY, forcing inOutMode from ${row.inOutMode} to 0 (IN)`);
        }
      } else if (devicePunchTypeOverride === 'OUT_ONLY') {
        // OUT_ONLY device: force all punches to OUT (1)
        finalInOutMode = 1;
        if (row.inOutMode !== 1) {
          console.log(`[ingest] 🔄 Override: Device is OUT_ONLY, forcing inOutMode from ${row.inOutMode} to 1 (OUT)`);
        }
      }
      // If devicePunchTypeOverride === 'BOTH' or null, use raw inOutMode from device
      
      const log = await prisma.attendanceLog.create({
        data: {
          tenantId,
          deviceSn,
          userPin: row.userPin,
          punchedAt: row.punchedAt,
          status: row.status,
          verifyType: row.verifyType,
          inOutMode: finalInOutMode,
          workCode: row.workCode,
          rawLine: row.rawLine,
          syncStatus: "PENDING",
        },
      });
      inserted++;
      
      // Debug log for each inserted record
      console.log(`[ingest] ✅ Inserted: PIN ${row.userPin}, inOutMode: ${finalInOutMode} (${finalInOutMode === 0 ? 'IN' : finalInOutMode === 1 ? 'OUT' : 'NULL'})`);
      
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
