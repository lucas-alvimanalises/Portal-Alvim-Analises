// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Amônia
// no banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-amonia-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (AMONIA_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const AMONIA_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'amonia', label: 'Amônia', reportAnalyteName: 'Amônia', unitHint: 'mg/m³' },
];

async function main() {
  const amonia = await prisma.compound.findUniqueOrThrow({ where: { code: '15000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: amonia.id },
    update: {
      analytes: AMONIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Amônia',
    },
    create: {
      compoundId: amonia.id,
      analytes: AMONIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Amônia',
    },
  });
  console.log('Template de leitura de certificado (Amônia) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
