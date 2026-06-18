import { Router, type Request, type Response } from "express";
import { logRawEvent } from "../services/deviceService.js";
import { ingestAttlog } from "../services/attendanceIngest.js";
import {
  resolveTenantForDevice,
  registerDeviceToTenant,
} from "../services/tenantResolver.js";

export const iclockRouter = Router();

function getSn(req: Request): string | undefined {
  const sn = req.query.SN ?? req.query.sn;
  return typeof sn === "string" ? sn : undefined;
}

function getTable(req: Request): string | undefined {
  const table = req.query.table ?? req.query.Table;
  return typeof table === "string" ? table : undefined;
}

function getTenantSlug(req: Request): string | undefined {
  const t = req.query.tenant ?? req.query.Tenant;
  return typeof t === "string" ? t : undefined;
}

function getProvisionKey(req: Request): string | undefined {
  const k = req.query.key ?? req.query.provision_key;
  return typeof k === "string" ? k : undefined;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "";
}

async function resolveTenant(req: Request, sn: string | undefined) {
  if (!sn) return null;
  return resolveTenantForDevice(sn, {
    tenantSlug: getTenantSlug(req),
    provisionKey: getProvisionKey(req),
  });
}

async function recordRaw(
  req: Request,
  tenantId?: string,
  deviceSn?: string
) {
  const body =
    typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : "";

  await logRawEvent({
    tenantId,
    deviceSn,
    method: req.method,
    path: req.path,
    query: JSON.stringify(req.query),
    bodyPreview: body.slice(0, 4000),
  });
}

function buildOptionsResponse(): string {
  return [
    "GET OPTION FROM: PrimeAttendance",
    "ATTLOGStamp=0",
    "OPERLOGStamp=0",
    "ATTPHOTOStamp=0",
    "ErrorDelay=30",
    "Delay=10",
    "TransTimes=00:00;23:59",
    "TransInterval=1",
    "Realtime=1",
    "Encrypt=0",
    "TimeZone=6",
  ].join("\r\n");
}

async function handleDeviceConnection(req: Request, sn: string) {
  const tenant = await resolveTenant(req, sn);
  if (!tenant) {
    console.warn(`[iclock] Unknown device SN=${sn} — register in portal or use ?tenant=slug&key=provision_key`);
    return null;
  }
  
  const ip = clientIp(req);
  const device = await registerDeviceToTenant(tenant.id, sn, ip);
  
  // Log successful connection
  console.log(`[iclock] Device connected: SN=${sn}, IP=${ip}, tenant=${tenant.slug}, lastSeen=${device.lastSeenAt}`);
  
  return tenant;
}

iclockRouter.get("/cdata", async (req: Request, res: Response) => {
  const sn = getSn(req);
  const table = getTable(req);

  try {
    let tenantId: string | undefined;
    if (sn) {
      const tenant = await handleDeviceConnection(req, sn);
      if (!tenant) {
        res.type("text/plain").status(403).send("ERROR: Device not registered");
        return;
      }
      tenantId = tenant.id;
    }
    await recordRaw(req, tenantId, sn);

    if (table === "options" || req.query.options === "all") {
      res.type("text/plain").send(buildOptionsResponse());
      return;
    }
    res.type("text/plain").send("OK");
  } catch (err) {
    console.error("[iclock] GET cdata error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});

iclockRouter.post("/cdata", async (req: Request, res: Response) => {
  const sn = getSn(req);
  const table = getTable(req);
  const body =
    typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : "";

  try {
    if (!sn) {
      await recordRaw(req);
      res.type("text/plain").send("OK");
      return;
    }

    const tenant = await handleDeviceConnection(req, sn);
    if (!tenant) {
      await recordRaw(req, undefined, sn);
      res.type("text/plain").status(403).send("ERROR: Device not registered");
      return;
    }

    await recordRaw(req, tenant.id, sn);

    if (table === "ATTLOG" || table === "attlog") {
      const { inserted, duplicates } = await ingestAttlog(tenant.id, sn, body);
      console.log(
        `[iclock] ATTLOG tenant=${tenant.slug} sn=${sn}: inserted=${inserted} dup=${duplicates}`
      );
    } else if (table === "USERINFO" || table === "userinfo" || table === "USER") {
      // Device sending user list
      console.log(`[iclock] USERINFO received from SN=${sn}:`);
      console.log(body);
      
      // Parse user data (format: PIN\tName\tPrivilege\tPassword\tCard\tGroup\tTimeZone)
      const lines = body.split(/\r?\n/).filter(l => l.trim());
      let imported = 0;
      
      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 2) {
          const pin = parts[0]?.trim();
          const name = parts[1]?.trim();
          const privilege = parts[2] ? parseInt(parts[2], 10) : 0;
          
          if (pin && /^\d+$/.test(pin)) {
            const { prisma } = await import("../lib/prisma.js");
            
            try {
              // Upsert device user
              await prisma.deviceUser.upsert({
                where: {
                  tenantId_deviceSn_userPin: {
                    tenantId: tenant.id,
                    deviceSn: sn,
                    userPin: pin,
                  },
                },
                create: {
                  tenantId: tenant.id,
                  deviceSn: sn,
                  userPin: pin,
                  userName: name || null,
                  privilege: privilege,
                  enabled: true,
                  lastSyncedAt: new Date(),
                },
                update: {
                  userName: name || null,
                  privilege: privilege,
                  lastSyncedAt: new Date(),
                },
              });
              imported++;
            } catch (err) {
              console.error(`[iclock] Failed to import user PIN=${pin}:`, err);
            }
          }
        }
      }
      
      console.log(`[iclock] USERINFO imported: ${imported} users for SN=${sn}`);
    }

    const stamp = req.query.Stamp ?? req.query.stamp;
    if (stamp) {
      res.type("text/plain").send(`OK:${stamp}`);
      return;
    }
    res.type("text/plain").send("OK");
  } catch (err) {
    console.error("[iclock] POST cdata error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});

iclockRouter.all("/getrequest", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (!sn) {
      await recordRaw(req, undefined, sn);
      res.type("text/plain").send("OK\n");
      return;
    }

    const tenant = await handleDeviceConnection(req, sn);
    await recordRaw(req, tenant?.id, sn);
    
    if (!tenant) {
      res.type("text/plain").send("OK\n");
      return;
    }

    // Check for pending commands for this device
    const { prisma } = await import("../lib/prisma.js");
    const pendingCommands = await prisma.deviceUser.findMany({
      where: {
        tenantId: tenant.id,
        deviceSn: sn,
        lastSyncedAt: null, // Not synced yet
      },
      take: 10, // Limit batch size
    });

    if (pendingCommands.length > 0) {
      // Send USER commands to device
      const commands: string[] = [];
      for (const user of pendingCommands) {
        // Format: DATA USER PIN={pin}\tName={name}\tPri={privilege}\tPasswd=\tCard=[cardno]\tGrp=1\tTZ=0000000000
        const cmd = `DATA USER PIN=${user.userPin}\tName=${user.userName || ""}\tPri=${user.privilege ?? 0}\tPasswd=\tCard=\tGrp=1\tTZ=0000000000`;
        commands.push(cmd);
        
        // Mark as synced
        await prisma.deviceUser.update({
          where: { id: user.id },
          data: { lastSyncedAt: new Date() },
        });
      }
      
      console.log(`[iclock] Sending ${commands.length} USER commands to device SN=${sn}`);
      res.type("text/plain").send(commands.join("\n") + "\n");
      return;
    }

    res.type("text/plain").send("OK\n");
  } catch (err) {
    console.error("[iclock] getrequest error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});

iclockRouter.all("/devicecmd", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) await handleDeviceConnection(req, sn);
    await recordRaw(req, undefined, sn);
    res.type("text/plain").send("OK");
  } catch (err) {
    res.type("text/plain").status(500).send("ERROR");
  }
});

iclockRouter.all("/ping", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) await handleDeviceConnection(req, sn);
    res.type("text/plain").send("OK");
  } catch {
    res.type("text/plain").status(500).send("ERROR");
  }
});

// Catch-all for any other iClock paths (some F18/ZKTeco models use different paths)
iclockRouter.all("*", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) {
      await handleDeviceConnection(req, sn);
      console.log(`[iclock] Catch-all: path=${req.path} SN=${sn} method=${req.method}`);
    }
    await recordRaw(req, undefined, sn);
    res.type("text/plain").send("OK");
  } catch (err) {
    console.error("[iclock] Catch-all error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});
