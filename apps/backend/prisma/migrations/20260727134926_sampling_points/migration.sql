-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_contractId_fkey";

-- CreateTable
CREATE TABLE "sampling_point_standards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sampling_point_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sampling_points" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "standardId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sampling_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sampling_point_standards_name_key" ON "sampling_point_standards"("name");

-- CreateIndex
CREATE INDEX "sampling_points_clientId_idx" ON "sampling_points"("clientId");

-- AddForeignKey
ALTER TABLE "sampling_points" ADD CONSTRAINT "sampling_points_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sampling_points" ADD CONSTRAINT "sampling_points_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "sampling_point_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
