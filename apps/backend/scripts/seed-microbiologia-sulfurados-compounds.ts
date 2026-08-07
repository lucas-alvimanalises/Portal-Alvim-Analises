// Script avulso: cadastra só os dois compostos que faltavam (Microbiologia e
// Compostos Sulfurados) no banco já rodando, sem reexecutar o seed inteiro
// (que teria efeitos colaterais em dados de teste não-idempotentes —
// schedules/samples). Roda com:
//   npx ts-node scripts/seed-microbiologia-sulfurados-compounds.ts
// Mesma lista usada em prisma/seed.ts (COMPOUNDS) — mantidas em sincronia
// manualmente, já que seed.ts executa main() como efeito colateral da
// importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_COMPOUNDS = [
  { code: '21000', name: 'Microbiologia' },
  { code: '22000', name: 'Compostos Sulfurados (Bags)' },
];

async function main() {
  for (const compound of NEW_COMPOUNDS) {
    const saved = await prisma.compound.upsert({
      where: { code: compound.code },
      update: { name: compound.name },
      create: compound,
    });
    console.log('Composto salvo:', saved.code, saved.name, saved.id);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
