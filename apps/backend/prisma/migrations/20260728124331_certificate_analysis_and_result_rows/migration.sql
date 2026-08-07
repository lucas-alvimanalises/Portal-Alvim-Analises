-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'IN_ANALYSIS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('CONFORME', 'NAO_CONFORME');

-- DropForeignKey
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_fileId_fkey";

-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "analysisDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "fileId" SET NOT NULL;

-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "sampleCode" TEXT;

-- CreateTable
CREATE TABLE "sample_result_rows" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "parameterName" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "specLimit" TEXT,
    "compliance" "ComplianceStatus",
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sample_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sample_result_rows_sampleId_idx" ON "sample_result_rows"("sampleId");

-- CreateIndex
CREATE INDEX "sample_result_rows_parameterName_idx" ON "sample_result_rows"("parameterName");

-- CreateIndex
CREATE INDEX "certificates_sampleId_idx" ON "certificates"("sampleId");

-- CreateIndex
CREATE INDEX "samples_compoundId_idx" ON "samples"("compoundId");

-- CreateIndex
CREATE INDEX "samples_samplingPointId_idx" ON "samples"("samplingPointId");

-- CreateIndex
CREATE INDEX "samples_collectionDate_idx" ON "samples"("collectionDate");

-- AddForeignKey
ALTER TABLE "sample_result_rows" ADD CONSTRAINT "sample_result_rows_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
