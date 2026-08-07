-- CreateTable: junção N:N Schedule <-> User (técnicos), criada ANTES de
-- remover a coluna antiga para permitir copiar os dados existentes.
CREATE TABLE "schedule_technicians" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,

    CONSTRAINT "schedule_technicians_pkey" PRIMARY KEY ("id")
);

-- Backfill: cada agendamento existente vira uma linha em schedule_technicians
-- com o técnico que já estava atribuído em schedules.technicianId.
INSERT INTO "schedule_technicians" ("id", "scheduleId", "technicianId")
SELECT gen_random_uuid()::text, "id", "technicianId"
FROM "schedules"
WHERE "technicianId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "schedule_technicians_scheduleId_technicianId_key" ON "schedule_technicians"("scheduleId", "technicianId");

-- AddForeignKey
ALTER TABLE "schedule_technicians" ADD CONSTRAINT "schedule_technicians_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_technicians" ADD CONSTRAINT "schedule_technicians_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey: remove a coluna antiga de técnico único, agora substituída
-- pela tabela de junção acima.
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_technicianId_fkey";

-- DropIndex
DROP INDEX "schedules_technicianId_idx";

-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "technicianId",
ADD COLUMN     "orderNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "schedules_orderNumber_key" ON "schedules"("orderNumber");

-- Ajusta a sequência do orderNumber: os agendamentos existentes ficam com
-- números baixos (irrelevante, são dados de teste); a próxima Ordem de
-- Serviço criada a partir de agora começa em 160, continuando a numeração
-- que a Alvim já usava no sistema anterior.
SELECT setval(pg_get_serial_sequence('schedules', 'orderNumber'), 159, true);
