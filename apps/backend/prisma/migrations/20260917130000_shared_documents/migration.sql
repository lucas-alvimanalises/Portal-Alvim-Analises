-- AlterEnum
ALTER TYPE "AttachmentKind" ADD VALUE 'SHARED_DOCUMENT';

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN "sharedDocumentClientId" TEXT;

-- CreateIndex
CREATE INDEX "attachments_sharedDocumentClientId_idx" ON "attachments"("sharedDocumentClientId");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_sharedDocumentClientId_fkey" FOREIGN KEY ("sharedDocumentClientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
