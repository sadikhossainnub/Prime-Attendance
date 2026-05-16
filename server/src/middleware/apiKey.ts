import type { Request, Response, NextFunction } from "express";
import { config } from "../lib/config.js";

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header("X-API-Key");
  if (!key || key !== config.apiKey) {
    res.status(401).json({ error: "Invalid or missing API key" });
    return;
  }
  next();
}
