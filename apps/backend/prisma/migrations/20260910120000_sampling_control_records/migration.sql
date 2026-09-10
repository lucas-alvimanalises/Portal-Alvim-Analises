-- CreateEnum
CREATE TYPE "SamplingControlSource" AS ENUM ('LEGACY_IMPORT', 'PORTAL');

-- CreateTable
CREATE TABLE "sampling_control_records" (
    "id" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientId" TEXT,
    "compoundName" TEXT NOT NULL,
    "sampleIdentification" TEXT,
    "fieldReportNumber" TEXT,
    "pump" TEXT,
    "samplingPointName" TEXT,
    "observation" TEXT,
    "billingResponsible" TEXT,
    "source" "SamplingControlSource" NOT NULL,
    "custodyExtractionId" TEXT,
    "sampleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sampling_control_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sampling_control_records_custodyExtractionId_key" ON "sampling_control_records"("custodyExtractionId");

-- CreateIndex
CREATE INDEX "sampling_control_records_serviceDate_idx" ON "sampling_control_records"("serviceDate");

-- CreateIndex
CREATE INDEX "sampling_control_records_fieldReportNumber_idx" ON "sampling_control_records"("fieldReportNumber");

-- CreateIndex
CREATE INDEX "sampling_control_records_clientId_idx" ON "sampling_control_records"("clientId");

-- AddForeignKey
ALTER TABLE "sampling_control_records" ADD CONSTRAINT "sampling_control_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
