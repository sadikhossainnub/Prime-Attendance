import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "7788", 10),
  timezone: process.env.TZ ?? "Asia/Dhaka",
  jwt: {
    secret: process.env.JWT_SECRET ?? "change-me-jwt-secret-min-32-chars-long",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  },
  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL ?? "admin@primetechbd.xyz",
    password: process.env.SUPER_ADMIN_PASSWORD ?? "Admin@12345",
    name: process.env.SUPER_ADMIN_NAME ?? "Super Admin",
  },
  erpnext: {
    enabled: process.env.ERPNEXT_ENABLED === "true",
    url: process.env.ERPNEXT_URL ?? "",
    apiKey: process.env.ERPNEXT_API_KEY ?? "",
    apiSecret: process.env.ERPNEXT_API_SECRET ?? "",
  },
};
