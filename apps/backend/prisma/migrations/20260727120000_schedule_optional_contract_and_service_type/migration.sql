-- DropForeignKey (contractId will become nullable)
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_contractId_fkey";

-- AlterTable: contrato deixa de ser obrigatório para criar um agendamento
ALTER TABLE "schedules" ALTER COLUMN "contractId" DROP NOT NULL;

-- AddForeignKey (re-added, now allowing NULL contractId)
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: adiciona serviceTypeId (nullable por enquanto, para poder popular linhas existentes)
ALTER TABLE "schedules" ADD COLUMN "serviceTypeId" TEXT;

-- Backfill: usa o primeiro tipo de serviço do escopo do contrato do agendamento;
-- se não houver contrato/escopo, cai para "Outros".
UPDATE "schedules" s
SET "serviceTypeId" = COALESCE(
  (SELECT cs."serviceTypeId" FROM "contract_scopes" cs WHERE cs."contractId" = s."contractId" LIMIT 1),
  (SELECT id FROM "service_types" WHERE name = 'Outros' LIMIT 1)
)
WHERE s."serviceTypeId" IS NULL;

-- AlterTable: agora que todas as linhas têm valor, torna obrigatório
ALTER TABLE "schedules" ALTER COLUMN "serviceTypeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "service_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
