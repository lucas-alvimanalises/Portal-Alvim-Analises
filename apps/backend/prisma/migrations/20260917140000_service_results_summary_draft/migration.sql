-- CreateTable
CREATE TABLE "service_results_summary_drafts" (
    "scheduleId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_results_summary_drafts_pkey" PRIMARY KEY ("scheduleId")
);

-- AddForeignKey
ALTER TABLE "service_results_summary_drafts" ADD CONSTRAINT "service_results_summary_drafts_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_results_summary_drafts" ADD CONSTRAINT "service_results_summary_drafts_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
