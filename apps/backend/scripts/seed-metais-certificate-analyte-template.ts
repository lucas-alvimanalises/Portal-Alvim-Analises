// Script avulso: sobe/atualiza só o CertificateAnalyteTemplate de Metais
// no banco já rodando, sem reexecutar o seed inteiro (que teria efeitos
// colaterais em dados de teste não-idempotentes — schedules/samples). Roda
// com:
//   npx ts-node scripts/seed-metais-certificate-analyte-template.ts
// Mesma definição usada em prisma/seed.ts (METAIS_CERTIFICATE_ANALYTE_TEMPLATE)
// — mantidas em sincronia manualmente, já que seed.ts executa main() como
// efeito colateral da importação e não dá pra importar o array de lá direto.
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig } from '@portal-alvim/shared';

const prisma = new PrismaClient();

const METAIS_CERTIFICATE_ANALYTE_TEMPLATE: CertificateAnalyteConfig[] = [
  { key: 'aluminio', label: 'Alumínio', reportAnalyteName: 'Alumínio', unitHint: 'mg/m³' },
  { key: 'antimonio', label: 'Antimônio', reportAnalyteName: 'Antimônio', unitHint: 'mg/m³' },
  { key: 'arsenio', label: 'Arsênio', reportAnalyteName: 'Arsênio', unitHint: 'mg/m³' },
  { key: 'bario', label: 'Bário', reportAnalyteName: 'Bário', unitHint: 'mg/m³' },
  { key: 'bismuto', label: 'Bismuto', reportAnalyteName: 'Bismuto', unitHint: 'mg/m³' },
  { key: 'boro', label: 'Boro', reportAnalyteName: 'Boro', unitHint: 'mg/m³' },
  { key: 'cadmio', label: 'Cádmio', reportAnalyteName: 'Cádmio', unitHint: 'mg/m³' },
  { key: 'calcio', label: 'Cálcio', reportAnalyteName: 'Cálcio', unitHint: 'mg/m³' },
  { key: 'chumbo', label: 'Chumbo', reportAnalyteName: 'Chumbo', unitHint: 'mg/m³' },
  { key: 'cobalto', label: 'Cobalto', reportAnalyteName: 'Cobalto', unitHint: 'mg/m³' },
  { key: 'cobre', label: 'Cobre', reportAnalyteName: 'Cobre', unitHint: 'mg/m³' },
  { key: 'cromo', label: 'Cromo', reportAnalyteName: 'Cromo', unitHint: 'mg/m³' },
  { key: 'estanho', label: 'Estanho', reportAnalyteName: 'Estanho', unitHint: 'mg/m³' },
  { key: 'estroncio', label: 'Estrôncio', reportAnalyteName: 'Estrôncio', unitHint: 'mg/m³' },
  { key: 'ferro', label: 'Ferro', reportAnalyteName: 'Ferro', unitHint: 'mg/m³' },
  { key: 'litio', label: 'Lítio', reportAnalyteName: 'Lítio', unitHint: 'mg/m³' },
  { key: 'magnesio', label: 'Magnésio', reportAnalyteName: 'Magnésio', unitHint: 'mg/m³' },
  { key: 'manganes', label: 'Manganês', reportAnalyteName: 'Manganês', unitHint: 'mg/m³' },
  { key: 'molibdenio', label: 'Molibdênio', reportAnalyteName: 'Molibdênio', unitHint: 'mg/m³' },
  { key: 'niquel', label: 'Níquel', reportAnalyteName: 'Níquel', unitHint: 'mg/m³' },
  { key: 'potassio', label: 'Potássio', reportAnalyteName: 'Potássio', unitHint: 'mg/m³' },
  { key: 'prata', label: 'Prata', reportAnalyteName: 'Prata', unitHint: 'mg/m³' },
  { key: 'selenio', label: 'Selênio', reportAnalyteName: 'Selênio', unitHint: 'mg/m³' },
  { key: 'silicio', label: 'Silício', reportAnalyteName: 'Silício', unitHint: 'mg/m³' },
  { key: 'sodio', label: 'Sódio', reportAnalyteName: 'Sódio', unitHint: 'mg/m³' },
  { key: 'talio', label: 'Tálio', reportAnalyteName: 'Tálio', unitHint: 'mg/m³' },
  { key: 'titanio', label: 'Titânio', reportAnalyteName: 'Titânio', unitHint: 'mg/m³' },
  { key: 'tungstenio', label: 'Tungstênio', reportAnalyteName: 'Tungstênio', unitHint: 'mg/m³' },
  { key: 'vanadio', label: 'Vanádio', reportAnalyteName: 'Vanádio', unitHint: 'mg/m³' },
  { key: 'zinco', label: 'Zinco', reportAnalyteName: 'Zinco', unitHint: 'mg/m³' },
];

async function main() {
  const metais = await prisma.compound.findUniqueOrThrow({ where: { code: '13000' } });
  const template = await prisma.certificateAnalyteTemplate.upsert({
    where: { compoundId: metais.id },
    update: {
      analytes: METAIS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Metais',
    },
    create: {
      compoundId: metais.id,
      analytes: METAIS_CERTIFICATE_ANALYTE_TEMPLATE as unknown as object,
      resultsMode: 'COLLAPSE_BELOW_LQ',
      collapsedResultLabel: 'Metais',
    },
  });
  console.log('Template de leitura de certificado (Metais) salvo:', template.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
