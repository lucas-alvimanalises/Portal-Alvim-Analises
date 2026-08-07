// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Compostos
// Sulfurados (Bags) no banco já rodando, sem reexecutar o seed inteiro (que
// teria efeitos colaterais em dados de teste não-idempotentes —
// schedules/samples). Roda com:
//   npx ts-node scripts/seed-compostos-sulfurados-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts
// (COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE) — mantidas em
// sincronia manualmente, já que seed.ts executa main() como efeito colateral
// da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  {
    key: 'sulfetoHidrogenio',
    label: 'Sulfeto de Hidrogênio',
    reportAnalyteName: 'Sulfeto de Hidrogênio',
    unitHint: 'mg/m³',
    regulatoryLimit: 10,
    limitUnit: 'mg/m³',
  },
  {
    key: 'isoPropilMercaptana',
    label: 'Iso Propil Mercaptana',
    reportAnalyteName: 'Iso Propil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'normalPropilMercaptana',
    label: 'Normal Propil Mercaptana',
    reportAnalyteName: 'Normal Propil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'tercButilMercaptana',
    label: 'Terc Butil Mercaptana',
    reportAnalyteName: 'Terc Butil Mercaptana',
    unitHint: 'mg/m³',
  },
  {
    key: 'thtTetraHidroTiofeno',
    label: 'THT Tetra Hidro Tiofeno',
    reportAnalyteName: 'THT Tetra hidro tiofeno',
    unitHint: 'mg/m³',
  },
  {
    key: 'cog',
    label: 'COG (Concentração de Odorante no Gás)',
    reportAnalyteName: 'COG (Conc. de Odorante no Gás)',
    unitHint: 'mg/m³',
    regulatoryMin: 15,
    regulatoryLimit: 30,
    limitUnit: 'mg/m³',
  },
  {
    key: 'enxofreTotal',
    label: 'Enxofre Total',
    reportAnalyteName: 'Enxofre Total',
    unitHint: 'mg/m³',
  },
];

async function main() {
  const compostosSulfurados = await prisma.compound.findUniqueOrThrow({ where: { code: '22000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: compostosSulfurados.id },
    update: {
      analytes: COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'SKIP_ZERO',
    },
    create: {
      compoundId: compostosSulfurados.id,
      analytes: COMPOSTOS_SULFURADOS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'SKIP_ZERO',
    },
  });
  console.log('Template de leitura de certificado (Compostos Sulfurados) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
