-- CreateTable
CREATE TABLE "printed_labels" (
    "id" TEXT NOT NULL,
    "scheduleSamplingPointCompoundId" TEXT NOT NULL,
    "bottleIndex" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "compoundId" TEXT NOT NULL,
    "printedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "printed_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_sequences" (
    "compoundId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "label_sequences_pkey" PRIMARY KEY ("compoundId")
);

-- CreateIndex
CREATE UNIQUE INDEX "printed_labels_scheduleSamplingPointCompoundId_bottleIndex_key" ON "printed_labels"("scheduleSamplingPointCompoundId", "bottleIndex");

-- CreateIndex
CREATE UNIQUE INDEX "printed_labels_compoundId_number_key" ON "printed_labels"("compoundId", "number");

-- AddForeignKey
ALTER TABLE "printed_labels" ADD CONSTRAINT "printed_labels_scheduleSamplingPointCompoundId_fkey" FOREIGN KEY ("scheduleSamplingPointCompoundId") REFERENCES "schedule_sampling_point_compounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printed_labels" ADD CONSTRAINT "printed_labels_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "printed_labels" ADD CONSTRAINT "printed_labels_printedById_fkey" FOREIGN KEY ("printedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_sequences" ADD CONSTRAINT "label_sequences_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "compounds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
