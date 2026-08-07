-- PrintedLabel passa a referenciar scheduleId+samplingPointId direto, em vez
-- de scheduleSamplingPointCompoundId (que é apagado e recriado a cada edição
-- de agendamento — ver PrismaScheduleRepository.update — o que apagaria em
-- cascata etiquetas já impressas de verdade).

-- AddColumn (nullable por enquanto, backfill logo abaixo)
ALTER TABLE "printed_labels" ADD COLUMN "scheduleId" TEXT;
ALTER TABLE "printed_labels" ADD COLUMN "samplingPointId" TEXT;

-- Backfill a partir da cadeia scheduleSamplingPointCompoundId -> schedule_sampling_points
UPDATE "printed_labels" pl
SET "scheduleId" = ssp."scheduleId",
    "samplingPointId" = ssp."samplingPointId"
FROM "schedule_sampling_point_compounds" sspc
JOIN "schedule_sampling_points" ssp ON ssp.id = sspc."scheduleSamplingPointId"
WHERE pl."scheduleSamplingPointCompoundId" = sspc.id;

-- Agora que backfill rodou, as colunas viram obrigatórias
ALTER TABLE "printed_labels" ALTER COLUMN "scheduleId" SET NOT NULL;
ALTER TABLE "printed_labels" ALTER COLUMN "samplingPointId" SET NOT NULL;

-- DropForeignKey / DropIndex / DropColumn da referência antiga
ALTER TABLE "printed_labels" DROP CONSTRAINT "printed_labels_scheduleSamplingPointCompoundId_fkey";
DROP INDEX "printed_labels_scheduleSamplingPointCompoundId_bottleIndex_labe";
ALTER TABLE "printed_labels" DROP COLUMN "scheduleSamplingPointCompoundId";

-- AddForeignKey
ALTER TABLE "printed_labels" ADD CONSTRAINT "printed_labels_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "printed_labels" ADD CONSTRAINT "printed_labels_samplingPointId_fkey" FOREIGN KEY ("samplingPointId") REFERENCES "sampling_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "printed_labels_schedule_point_compound_bottle_label_key" ON "printed_labels"("scheduleId", "samplingPointId", "compoundId", "bottleIndex", "labelIndex");
