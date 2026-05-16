import { Router, type Request, type Response } from "express";
import { upsertDevice, logRawEvent } from "../services/deviceService.js";
import { ingestAttlog } from "../services/attendanceIngest.js";

export const iclockRouter = Router();

function getSn(req: Request): string | undefined {
  const sn = req.query.SN ?? req.query.sn;
  return typeof sn === "string" ? sn : undefined;
}

function getTable(req: Request): string | undefined {
  const table = req.query.table ?? req.query.Table;
  return typeof table === "string" ? table : undefined;
}

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "";
}

async function recordRaw(req: Request, deviceSn?: string) {
  const body =
    typeof req.body === "string"
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : "";

  await logRawEvent({
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

/** GET /iclock/cdata — device handshake / options */
iclockRouter.get("/cdata", async (req: Request, res: Response) => {
  const sn = getSn(req);
  const table = getTable(req);

  try {
    if (sn) {
      await upsertDevice(sn, clientIp(req));
    }
    await recordRaw(req, sn);

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

/** POST /iclock/cdata — attendance and other table uploads */
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
    if (sn) {
      await upsertDevice(sn, clientIp(req));
    }
    await recordRaw(req, sn);

    if (!sn) {
      res.type("text/plain").send("OK");
      return;
    }

    if (table === "ATTLOG" || table === "attlog") {
      const { inserted, duplicates } = await ingestAttlog(sn, body);
      console.log(
        `[iclock] ATTLOG from ${sn}: inserted=${inserted} duplicates=${duplicates}`
      );
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

/** GET/POST /iclock/getrequest — device polls for commands */
iclockRouter.all("/getrequest", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) {
      await upsertDevice(sn, clientIp(req));
    }
    await recordRaw(req, sn);
    res.type("text/plain").send("OK\n");
  } catch (err) {
    console.error("[iclock] getrequest error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});

/** GET/POST /iclock/devicecmd — command execution results */
iclockRouter.all("/devicecmd", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) {
      await upsertDevice(sn, clientIp(req));
    }
    await recordRaw(req, sn);
    res.type("text/plain").send("OK");
  } catch (err) {
    console.error("[iclock] devicecmd error:", err);
    res.type("text/plain").status(500).send("ERROR");
  }
});

/** Optional heartbeat */
iclockRouter.all("/ping", async (req: Request, res: Response) => {
  const sn = getSn(req);
  try {
    if (sn) {
      await upsertDevice(sn, clientIp(req));
    }
    res.type("text/plain").send("OK");
  } catch (err) {
    res.type("text/plain").status(500).send("ERROR");
  }
});
