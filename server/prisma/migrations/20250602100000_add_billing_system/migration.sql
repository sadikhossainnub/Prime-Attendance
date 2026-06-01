-- Create BillingCycle enum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- Create SubscriptionStatus enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- Add billing fields to tenants table
ALTER TABLE "tenants" ADD COLUMN "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE "tenants" ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "tenants" ADD COLUMN "subscription_start_date" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN "subscription_end_date" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN "next_billing_date" TIMESTAMP(3);
ALTER TABLE "tenants" ADD COLUMN "monthly_price" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "yearly_price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create subscriptions table
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "billing_cycle" "BillingCycle" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "start_date" TIMESTAMP(3) NOT NULL,
  "end_date" TIMESTAMP(3),
  "next_billing_date" TIMESTAMP(3) NOT NULL,
  "auto_renew" BOOLEAN NOT NULL DEFAULT true,
  "cancelled_at" TIMESTAMP(3),
  "cancel_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
);

-- Create invoices table
CREATE TABLE "invoices" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "billing_period_start" TIMESTAMP(3) NOT NULL,
  "billing_period_end" TIMESTAMP(3) NOT NULL,
  "due_date" TIMESTAMP(3) NOT NULL,
  "paid_at" TIMESTAMP(3),
  "description" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_next_billing_date_idx" ON "subscriptions"("next_billing_date");

CREATE UNIQUE INDEX "invoices_tenant_id_invoice_number_key" ON "invoices"("tenant_id", "invoice_number");
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
