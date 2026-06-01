import "dotenv/config";

/**
 * Validates and loads configuration from environment variables
 * Throws error if required variables are missing or invalid
 */
function validateConfig() {
  const errors: string[] = [];

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL environment variable is required");
  }

  // Validate JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET ?? "change-me-jwt-secret-min-32-chars-long";
  if (jwtSecret.length < 32) {
    errors.push(`JWT_SECRET must be at least 32 characters (current: ${jwtSecret.length})`);
  }
  if (jwtSecret === "change-me-jwt-secret-min-32-chars-long") {
    console.warn("⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable in production.");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join("\n")}`);
  }
}

validateConfig();

export const config = {
  port: parseInt(process.env.PORT ?? "7788", 10),
  timezone: process.env.TZ ?? "Asia/Dhaka",
  nodeEnv: process.env.NODE_ENV ?? "development",
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
  cors: {
    origin: process.env.CORS_ORIGIN ?? (process.env.NODE_ENV === "production" ? "https://yourdomain.com" : true),
  },
};
