-- CreateEnum
CREATE TYPE "CertificateExtractionStatus" AS ENUM ('PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'FAILED');

-- CreateTable
CREATE TABLE "certificate_analyte_templates" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "analytes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_analyte_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_extractions" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "originalScanFileId" TEXT NOT NULL,
    "status" "CertificateExtractionStatus" NOT NULL DEFAULT 'PROCESSING',
    "extractedData" JSONB,
    "correctedData" JSONB,
    "errorMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "generatedCertificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_analyte_templates_compoundId_key" ON "certificate_analyte_templates"("compoundId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_extractions_originalScanFileId_key" ON "certificate_extractions"("originalScanFileId");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_extractions_generatedCertificateId_key" ON "certificate_extractions"("generatedCertificateId");

-- CreateIndex
CREATE INDEX "certificate_extractions_sampleId_idx" ON "certificate_extractions"("sampleId");

-- AddForeignKey
ALTER TABLE "certificate_analyte_templates" ADD CONSTRAINT "certificate_analyte_templates_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_extractions" ADD CONSTRAINT "certificate_extractions_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_extractions" ADD CONSTRAINT "certificate_extractions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_analyte_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_extractions" ADD CONSTRAINT "certificate_extractions_originalScanFileId_fkey" FOREIGN KEY ("originalScanFileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_extractions" ADD CONSTRAINT "certificate_extractions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_extractions" ADD CONSTRAINT "certificate_extractions_generatedCertificateId_fkey" FOREIGN KEY ("generatedCertificateId") REFERENCES "certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
