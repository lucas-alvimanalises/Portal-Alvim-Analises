-- AlterEnum
ALTER TYPE "AttachmentKind" ADD VALUE 'CUSTODY_DOCUMENT';

-- CreateTable
CREATE TABLE "custody_documents" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custody_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "custody_documents_fileId_key" ON "custody_documents"("fileId");

-- CreateIndex
CREATE INDEX "custody_documents_compoundId_idx" ON "custody_documents"("compoundId");

-- CreateIndex
CREATE INDEX "custody_documents_year_idx" ON "custody_documents"("year");

-- AddForeignKey
ALTER TABLE "custody_documents" ADD CONSTRAINT "custody_documents_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_documents" ADD CONSTRAINT "custody_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_documents" ADD CONSTRAINT "custody_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
