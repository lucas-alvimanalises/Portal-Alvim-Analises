-- AlterTable
ALTER TABLE "attachments" ADD COLUMN "serviceChecklistId" TEXT;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_serviceChecklistId_fkey" FOREIGN KEY ("serviceChecklistId") REFERENCES "service_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
