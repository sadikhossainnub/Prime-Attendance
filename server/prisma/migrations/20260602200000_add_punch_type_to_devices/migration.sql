-- CreateEnum
CREATE TYPE "PunchType" AS ENUM ('BOTH', 'IN_ONLY', 'OUT_ONLY');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN "punch_type" "PunchType" NOT NULL DEFAULT 'BOTH';

-- CreateIndex
CREATE INDEX "devices_punch_type_idx" ON "devices"("punch_type");
