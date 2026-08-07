-- CreateEnum
CREATE TYPE "CustodyExtractionStatus" AS ENUM ('PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'FAILED');

-- AlterTable
ALTER TABLE "custody_documents" ADD COLUMN     "sampleId" TEXT;

-- CreateTable
CREATE TABLE "custody_field_templates" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custody_field_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_extractions" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "originalScanFileId" TEXT NOT NULL,
    "status" "CustodyExtractionStatus" NOT NULL DEFAULT 'PROCESSING',
    "extractedData" JSONB,
    "correctedData" JSONB,
    "errorMessage" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "generatedDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custody_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custody_field_templates_compoundId_key" ON "custody_field_templates"("compoundId");

-- CreateIndex
CREATE UNIQUE INDEX "custody_extractions_originalScanFileId_key" ON "custody_extractions"("originalScanFileId");

-- CreateIndex
CREATE UNIQUE INDEX "custody_extractions_generatedDocumentId_key" ON "custody_extractions"("generatedDocumentId");

-- CreateIndex
CREATE INDEX "custody_extractions_sampleId_idx" ON "custody_extractions"("sampleId");

-- CreateIndex
CREATE INDEX "custody_documents_sampleId_idx" ON "custody_documents"("sampleId");

-- AddForeignKey
ALTER TABLE "custody_documents" ADD CONSTRAINT "custody_documents_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_field_templates" ADD CONSTRAINT "custody_field_templates_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "custody_field_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_originalScanFileId_fkey" FOREIGN KEY ("originalScanFileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "custody_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
