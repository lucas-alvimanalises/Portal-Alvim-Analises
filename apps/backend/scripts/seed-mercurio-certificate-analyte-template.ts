// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Mercúrio
// no banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-mercurio-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'mercurio', label: 'Mercúrio', reportAnalyteName: 'Mercúrio', unitHint: 'mg/m³' },
];

async function main() {
  const mercurio = await prisma.compound.findUniqueOrThrow({ where: { code: '14000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: mercurio.id },
    update: {
      analytes: MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Mercúrio',
    },
    create: {
      compoundId: mercurio.id,
      analytes: MERCURIO_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Mercúrio',
    },
  });
  console.log('Template de leitura de certificado (Mercúrio) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
