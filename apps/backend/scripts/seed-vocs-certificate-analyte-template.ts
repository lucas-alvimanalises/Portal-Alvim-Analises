// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de VOCs no
// banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-vocs-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (VOCS_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const VOCS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'somatorioClorados',
    label: 'Somatório Clorados',
    reportAnalyteName: 'Somatório Clorados',
    unitHint: 'mg Cl/m³ (família mg.../m³)',
    regulatoryLimit: 5.0,
    limitUnit: 'mg Cl/m³',
  },
  {
    key: 'somatorioBromados',
    label: 'Somatório Bromados',
    reportAnalyteName: 'Somatório Bromados',
    unitHint: 'mg Br/m³ (família mg.../m³)',
  },
  {
    key: 'somatorioFluorados',
    label: 'Somatório Fluorados',
    reportAnalyteName: 'Somatório Fluorados',
    unitHint: 'mg F/m³ (família mg.../m³)',
    regulatoryLimit: 5.0,
    limitUnit: 'mg F/m³',
  },
  {
    key: 'vocComoTolueno',
    label: 'Somatório VOC como Tolueno',
    reportAnalyteName: 'Somatório VOC como Tolueno',
    unitHint: 'mg/m³ (família mg.../m³)',
  },
];

async function main() {
  const vocs = await prisma.compound.findUniqueOrThrow({ where: { code: '12000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: vocs.id },
    update: { analytes: VOCS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: { compoundId: vocs.id, analytes: VOCS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
  });
  console.log('Template de leitura de certificado (VOCs) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
