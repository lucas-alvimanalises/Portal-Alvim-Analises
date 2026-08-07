-- ServiceChecklist passa de lista de chaves marcadas (boolean) pra um mapa
-- de quantidades por item (ex.: "9 Impingers") — nenhum dado real existe
-- ainda (recurso recém-criado), então é só trocar a coluna.
ALTER TABLE "service_checklists" DROP COLUMN "checkedItems";
ALTER TABLE "service_checklists" ADD COLUMN "quantities" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "service_checklists" ALTER COLUMN "quantities" DROP DEFAULT;
