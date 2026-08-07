// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de
// Microbiologia no banco já rodando, sem reexecutar o seed inteiro (que
// teria efeitos colaterais em dados de teste não-idempotentes —
// schedules/samples). Roda com:
//   npx ts-node scripts/seed-microbiologia-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'contagemBacteriasMesofilas',
    label: 'Contagem Total de Bactérias Mesófilas',
    reportAnalyteName:
      'Resultado médio da Contagem Total de Bactérias Mesófilas — pegue APENAS a linha "Resultado médio" da mini-tabela desse parâmetro, nunca as linhas de amostra individual (nº 1, 2, 3...)',
    unitHint: 'UFC/m³',
  },
  {
    key: 'boloresLeveduras',
    label: 'Bolores e Leveduras',
    reportAnalyteName:
      'Resultado médio de Bolores e Leveduras — pegue APENAS a linha "Resultado médio" da mini-tabela desse parâmetro, nunca as linhas de amostra individual (nº 5, 6, 7...)',
    unitHint: 'UFC/m³',
  },
];

async function main() {
  const microbiologia = await prisma.compound.findUniqueOrThrow({ where: { code: '21000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: microbiologia.id },
    update: { analytes: MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object },
    create: {
      compoundId: microbiologia.id,
      analytes: MICROBIOLOGIA_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
    },
  });
  console.log('Template de leitura de certificado (Microbiologia) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
