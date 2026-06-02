-- Create device_users table to store users registered on biometric devices
CREATE TABLE "device_users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "device_sn" TEXT NOT NULL,
  "user_pin" TEXT NOT NULL,
  "user_name" TEXT,
  "privilege" INTEGER,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "last_synced_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "device_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
);

-- Create unique constraint for tenant + device + pin combination
CREATE UNIQUE INDEX "device_users_tenant_id_device_sn_user_pin_key" ON "device_users"("tenant_id", "device_sn", "user_pin");

-- Create indexes for faster queries
CREATE INDEX "device_users_tenant_id_idx" ON "device_users"("tenant_id");
CREATE INDEX "device_users_device_sn_idx" ON "device_users"("device_sn");
