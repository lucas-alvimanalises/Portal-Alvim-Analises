// Script avulso: aplica retroativamente a mesma regra do
// SampleCompletionService (apps/backend/src/modules/samples/application/sample-completion.service.ts)
// em todas as amostras já existentes — corrige quem já tinha cadeia de
// custódia aprovada (quando exigida) + certificado, mas ficou presa em
// "Pendente" porque esse cálculo automático não existia ainda. Roda com:
//   npx ts-node scripts/backfill-sample-completion.ts
import { PrismaClient, AnalysisStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const samples = await prisma.sample.findMany({
    where: { active: true, analysisStatus: { not: AnalysisStatus.COMPLETED }, compoundId: { not: null } },
    select: { id: true, compoundId: true },
  });
  console.log(`Verificando ${samples.length} amostra(s) ainda não marcadas como Concluída...`);

  const templatesByCompoundId = new Map(
    (await prisma.custodyFieldTemplate.findMany({ select: { compoundId: true, custodyRequired: true } })).map(
      (t) => [t.compoundId, t.custodyRequired],
    ),
  );

  let updated = 0;
  for (const sample of samples) {
    if (!sample.compoundId) continue;
    const custodyRequired = templatesByCompoundId.get(sample.compoundId);
    if (custodyRequired) {
      const approvedCustody = await prisma.custodyExtraction.findFirst({
        where: { sampleId: sample.id, status: 'APPROVED' },
        select: { id: true },
      });
      if (!approvedCustody) continue;
    }

    const certificate = await prisma.certificate.findFirst({
      where: { sampleId: sample.id },
      select: { id: true },
    });
    if (!certificate) continue;

    await prisma.sample.update({
      where: { id: sample.id },
      data: { analysisStatus: AnalysisStatus.COMPLETED },
    });
    updated++;
    console.log(`  ${sample.id}: marcada como Concluída.`);
  }

  console.log(`${updated} amostra(s) atualizada(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
