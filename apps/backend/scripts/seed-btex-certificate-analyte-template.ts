// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de BTEX no
// banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-btex-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (BTEX_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const BTEX_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'benzeno', label: 'Benzeno', reportAnalyteName: 'Benzeno', unitHint: 'mg/m³' },
  { key: 'etilbenzeno', label: 'Etilbenzeno', reportAnalyteName: 'Etilbenzeno', unitHint: 'mg/m³' },
  { key: 'xilenos', label: 'o, m e p-Xileno', reportAnalyteName: 'o, m e p-Xileno', unitHint: 'mg/m³' },
  { key: 'tolueno', label: 'Tolueno', reportAnalyteName: 'Tolueno', unitHint: 'mg/m³' },
  {
    key: 'vocComoTolueno',
    label: 'COV Total como Tolueno (BTEX)',
    reportAnalyteName: 'COV Total como Tolueno (BTEX)',
    unitHint: 'mg/m³',
  },
];

async function main() {
  const btex = await prisma.compound.findUniqueOrThrow({ where: { code: '17000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: btex.id },
    update: { analytes: BTEX_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: { compoundId: btex.id, analytes: BTEX_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
  });
  console.log('Template de leitura de certificado (BTEX) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
