// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de
// Particulados no banco já rodando, sem reexecutar o seed inteiro (que teria
// efeitos colaterais em dados de teste não-idempotentes — schedules/samples).
// Roda com:
//   npx ts-node scripts/seed-particulados-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'particuladoTotal',
    label: 'Particulado Total',
    reportAnalyteName: 'Particulado Total',
    unitHint: 'mg/m³',
  },
];

async function main() {
  const particulados = await prisma.compound.findUniqueOrThrow({ where: { code: '16000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: particulados.id },
    update: {
      analytes: PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Particulado Total',
    },
    create: {
      compoundId: particulados.id,
      analytes: PARTICULADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Particulado Total',
    },
  });
  console.log('Template de leitura de certificado (Particulados) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
