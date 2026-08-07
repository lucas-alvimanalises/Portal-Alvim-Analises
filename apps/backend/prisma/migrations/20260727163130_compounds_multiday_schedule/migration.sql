-- AlterTable
ALTER TABLE "samples" ADD COLUMN     "compoundId" TEXT,
ALTER COLUMN "analysisType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "endDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "compounds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "compounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_sampling_point_compounds" (
    "id" TEXT NOT NULL,
    "scheduleSamplingPointId" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,

    CONSTRAINT "schedule_sampling_point_compounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compounds_code_key" ON "compounds"("code");

-- CreateIndex
CREATE UNIQUE INDEX "compounds_name_key" ON "compounds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_sampling_point_compounds_scheduleSamplingPointId_c_key" ON "schedule_sampling_point_compounds"("scheduleSamplingPointId", "compoundId");

-- AddForeignKey
ALTER TABLE "schedule_sampling_point_compounds" ADD CONSTRAINT "schedule_sampling_point_compounds_scheduleSamplingPointId_fkey" FOREIGN KEY ("scheduleSamplingPointId") REFERENCES "schedule_sampling_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_sampling_point_compounds" ADD CONSTRAINT "schedule_sampling_point_compounds_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
