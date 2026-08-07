// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Siloxanos
// no banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-siloxanos-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'volumeAmostrado',
    label: 'Volume Amostrado',
    reportAnalyteName: 'Volume amostrado (L)',
    unitHint: 'L (litros) — está na tabela de identificação da amostra, não na tabela de resultados',
  },
  {
    key: 'concentracaoTotalSiloxanos',
    label: 'Concentração Total de Siloxanos',
    reportAnalyteName: 'Concentração total de siloxanos',
    unitHint:
      'mg Si/m³ — a tabela de resultados tem uma linha "Concentração" com duas sub-linhas, "mg/m³" (geralmente vazia/traço) e "mg Si/m³" (o valor que interessa, ex.: "<0,21")',
    regulatoryLimit: 0.3,
    warningThreshold: 0.21,
    limitUnit: 'mg Si/m³',
  },
];

async function main() {
  const siloxanos = await prisma.compound.findUniqueOrThrow({ where: { code: '11000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: siloxanos.id },
    update: { analytes: SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: siloxanos.id,
      analytes: SILOXANOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });
  console.log('Template de leitura de certificado (Siloxanos) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
