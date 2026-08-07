-- DropForeignKey
ALTER TABLE "custody_extractions" DROP CONSTRAINT "custody_extractions_originalScanFileId_fkey";

-- AlterTable
ALTER TABLE "custody_extractions" ALTER COLUMN "originalScanFileId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_originalScanFileId_fkey" FOREIGN KEY ("originalScanFileId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
