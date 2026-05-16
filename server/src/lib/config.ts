import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "7788", 10),
  apiKey: process.env.API_KEY ?? "change-me",
  timezone: process.env.TZ ?? "Asia/Dhaka",
  erpnext: {
    enabled: process.env.ERPNEXT_ENABLED === "true",
    url: process.env.ERPNEXT_URL ?? "",
    apiKey: process.env.ERPNEXT_API_KEY ?? "",
    apiSecret: process.env.ERPNEXT_API_SECRET ?? "",
  },
};
