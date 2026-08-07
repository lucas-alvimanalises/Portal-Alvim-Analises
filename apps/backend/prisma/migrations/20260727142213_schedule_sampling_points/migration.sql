-- CreateTable
CREATE TABLE "schedule_sampling_points" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "samplingPointId" TEXT NOT NULL,

    CONSTRAINT "schedule_sampling_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedule_sampling_points_scheduleId_samplingPointId_key" ON "schedule_sampling_points"("scheduleId", "samplingPointId");

-- AddForeignKey
ALTER TABLE "schedule_sampling_points" ADD CONSTRAINT "schedule_sampling_points_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_sampling_points" ADD CONSTRAINT "schedule_sampling_points_samplingPointId_fkey" FOREIGN KEY ("samplingPointId") REFERENCES "sampling_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
