-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceNature" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'CALIBRATION', 'REPLACEMENT', 'CLEANING', 'OPERATIONAL_ADJUSTMENT');

-- CreateTable
CREATE TABLE "plant_maintenances" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "nature" "MaintenanceNature" NOT NULL,
    "types" TEXT[],
    "otherType" TEXT,
    "objectives" TEXT[],
    "otherObjective" TEXT,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plant_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plant_maintenances_clientId_idx" ON "plant_maintenances"("clientId");

-- CreateIndex
CREATE INDEX "plant_maintenances_date_idx" ON "plant_maintenances"("date");

-- AddForeignKey
ALTER TABLE "plant_maintenances" ADD CONSTRAINT "plant_maintenances_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plant_maintenances" ADD CONSTRAINT "plant_maintenances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN "plantMaintenanceId" TEXT;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_plantMaintenanceId_fkey" FOREIGN KEY ("plantMaintenanceId") REFERENCES "plant_maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
