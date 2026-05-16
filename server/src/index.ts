import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";
import { iclockRouter } from "./routes/iclock.js";
import { apiRouter } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("trust proxy", 1);

const iclockLimiter = rateLimit({
  windowMs: 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use("/iclock", iclockLimiter);
app.use(
  "/iclock",
  express.raw({ type: "*/*", limit: "10mb" }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      (req as express.Request & { body: string }).body =
        req.body.toString("utf8");
    }
    next();
  },
  iclockRouter
);

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.use("/api", apiRouter);

app.get("/api", (_req, res) => {
  res.json({
    name: "Prime Attendance",
    iclock: "/iclock",
    api: "/api",
  });
});

const clientDist =
  process.env.CLIENT_DIST_PATH ??
  path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/iclock") || req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Prime Attendance server listening on port ${config.port}`);
  console.log(`Timezone: ${config.timezone}`);
  console.log(`ERPNext sync: ${config.erpnext.enabled ? "enabled" : "disabled"}`);
});
