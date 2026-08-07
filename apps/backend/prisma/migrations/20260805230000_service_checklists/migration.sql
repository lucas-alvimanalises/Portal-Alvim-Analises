-- CreateTable
CREATE TABLE "service_checklists" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "checkedItems" TEXT[],
    "filledById" TEXT NOT NULL,
    "filledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_checklists_scheduleId_key" ON "service_checklists"("scheduleId");

-- AddForeignKey
ALTER TABLE "service_checklists" ADD CONSTRAINT "service_checklists_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_checklists" ADD CONSTRAINT "service_checklists_filledById_fkey" FOREIGN KEY ("filledById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
