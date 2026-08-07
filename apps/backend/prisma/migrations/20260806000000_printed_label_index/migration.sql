-- AddColumn
ALTER TABLE "printed_labels" ADD COLUMN "labelIndex" INTEGER NOT NULL DEFAULT 1;

-- DropIndex
DROP INDEX "printed_labels_scheduleSamplingPointCompoundId_bottleIndex_key";

-- CreateIndex
CREATE UNIQUE INDEX "printed_labels_scheduleSamplingPointCompoundId_bottleIndex_labelIndex_key" ON "printed_labels"("scheduleSamplingPointCompoundId", "bottleIndex", "labelIndex");
