-- CreateTable
CREATE TABLE "field_reports" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_reports_scheduleId_key" ON "field_reports"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "field_reports_fileId_key" ON "field_reports"("fileId");

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
