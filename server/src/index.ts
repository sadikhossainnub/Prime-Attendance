import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./lib/config.js";
import { prisma } from "./lib/prisma.js";
import { iclockRouter } from "./routes/iclock.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { portalRouter } from "./routes/portal.js";
import { seedSuperAdmin } from "./services/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("trust proxy", 1);

const iclockLimiter = rateLimit({
  windowMs: 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors({ origin: true, credentials: true }));

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
    res.json({ status: "ok", mode: "saas" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/portal", portalRouter);

const clientDist =
  process.env.CLIENT_DIST_PATH ??
  path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("/{*splat}", (req, res, next) => {
  if (
    req.path.startsWith("/iclock") ||
    req.path.startsWith("/api") ||
    req.path === "/health"
  ) {
    next();
    return;
  }
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

async function start() {
  await seedSuperAdmin();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Prime Attendance SaaS on port ${config.port}`);
    console.log(`Super admin: ${config.superAdmin.email}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
