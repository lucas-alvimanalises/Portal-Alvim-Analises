-- AlterEnum
ALTER TYPE "AttachmentKind" ADD VALUE 'SIGNATURE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "signatureFileId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_signatureFileId_key" ON "users"("signatureFileId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
