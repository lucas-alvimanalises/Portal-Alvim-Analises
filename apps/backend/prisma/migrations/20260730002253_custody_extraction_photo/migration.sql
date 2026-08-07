-- AlterTable
ALTER TABLE "custody_extractions" ADD COLUMN     "selectedPhotoId" TEXT;

-- AddForeignKey
ALTER TABLE "custody_extractions" ADD CONSTRAINT "custody_extractions_selectedPhotoId_fkey" FOREIGN KEY ("selectedPhotoId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
