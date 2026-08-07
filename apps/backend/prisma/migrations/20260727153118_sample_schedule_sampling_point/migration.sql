/*
  Warnings:

  - You are about to drop the column `serviceExecutionId` on the `samples` table. All the data in the column will be lost.
  - Added the required column `scheduleId` to the `samples` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "samples" DROP CONSTRAINT "samples_serviceExecutionId_fkey";

-- AlterTable
ALTER TABLE "samples" DROP COLUMN "serviceExecutionId",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "samplingPointId" TEXT,
ADD COLUMN     "scheduleId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "samples_scheduleId_idx" ON "samples"("scheduleId");

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_samplingPointId_fkey" FOREIGN KEY ("samplingPointId") REFERENCES "sampling_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
