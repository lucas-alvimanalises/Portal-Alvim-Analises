-- CreateTable
CREATE TABLE "service_results_summaries" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "comment" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_results_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_results_summaries_scheduleId_idx" ON "service_results_summaries"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "service_results_summaries_fileId_key" ON "service_results_summaries"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "service_results_summaries_scheduleId_version_key" ON "service_results_summaries"("scheduleId", "version");

-- AddForeignKey
ALTER TABLE "service_results_summaries" ADD CONSTRAINT "service_results_summaries_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results_summaries" ADD CONSTRAINT "service_results_summaries_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results_summaries" ADD CONSTRAINT "service_results_summaries_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
