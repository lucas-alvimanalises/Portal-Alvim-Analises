// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Óleo no
// banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-oleo-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (OLEO_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const OLEO_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'oleoMineral', label: 'Óleo Mineral', reportAnalyteName: 'Óleo Mineral', unitHint: 'mg/m³' },
];

async function main() {
  const oleo = await prisma.compound.findUniqueOrThrow({ where: { code: '18000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: oleo.id },
    update: {
      analytes: OLEO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Óleo Mineral',
    },
    create: {
      compoundId: oleo.id,
      analytes: OLEO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Óleo Mineral',
    },
  });
  console.log('Template de leitura de certificado (Óleo) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
