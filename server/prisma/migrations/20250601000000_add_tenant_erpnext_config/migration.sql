-- Add ERPNext configuration fields to Tenant table
ALTER TABLE "tenants" ADD COLUMN "erpnext_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN "erpnext_url" TEXT;
ALTER TABLE "tenants" ADD COLUMN "erpnext_api_key" TEXT;
ALTER TABLE "tenants" ADD COLUMN "erpnext_api_secret" TEXT;
