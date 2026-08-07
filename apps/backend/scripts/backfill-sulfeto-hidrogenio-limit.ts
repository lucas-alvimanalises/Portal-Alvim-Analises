// Script avulso: recalcula specLimit/compliance de todas as linhas de
// resultado "Sulfeto de Hidrogênio" já existentes, agora que o composto
// ganhou limite regulatório de 10 mg/m³ (confirmado com o usuário) — roda
// com:
//   npx ts-node scripts/backfill-sulfeto-hidrogenio-limit.ts
// Mesma lógica de apps/backend/src/modules/certificate-extractions/application/certificate-compliance.util.ts
// (parseNumericResult/computeCompliance/formatRegulatoryLimit), reimplementada
// aqui pra não depender de importar um módulo do backend fora do Nest.
import { PrismaClient, ComplianceStatus } from '@prisma/client';

const prisma = new PrismaClient();

const REGULATORY_LIMIT = 10;
const LIMIT_UNIT = 'mg/m³';

function parseNumericResult(resultText: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(resultText);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

function computeCompliance(resultText: string): ComplianceStatus | undefined {
  const value = parseNumericResult(resultText);
  if (value === null) return undefined;
  return value > REGULATORY_LIMIT ? ComplianceStatus.NAO_CONFORME : ComplianceStatus.CONFORME;
}

async function main() {
  const rows = await prisma.sampleResultRow.findMany({
    where: { parameterName: 'Sulfeto de Hidrogênio' },
  });

  console.log(`Encontradas ${rows.length} linha(s) de "Sulfeto de Hidrogênio".`);

  const specLimit = `${REGULATORY_LIMIT.toFixed(2).replace('.', ',')} ${LIMIT_UNIT}`;
  for (const row of rows) {
    const compliance = computeCompliance(row.result);
    await prisma.sampleResultRow.update({
      where: { id: row.id },
      data: { specLimit, compliance: compliance ?? null },
    });
    console.log(`  ${row.id}: result="${row.result}" -> specLimit="${specLimit}", compliance=${compliance}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
