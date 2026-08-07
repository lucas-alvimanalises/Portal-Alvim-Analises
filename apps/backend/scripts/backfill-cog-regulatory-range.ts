// Script avulso: recalcula specLimit/compliance de todas as linhas de
// resultado "COG (Concentração de Odorante no Gás)" já existentes, agora que
// o composto ganhou faixa regulatória de 15 a 30 mg/m³ (confirmado com o
// usuário) — roda com:
//   npx ts-node scripts/backfill-cog-regulatory-range.ts
// Mesma lógica de apps/backend/src/modules/certificate-extractions/application/certificate-compliance.util.ts
// (parseNumericResult/computeCompliance/formatRegulatoryLimit), reimplementada
// aqui pra não depender de importar um módulo do backend fora do Nest.
// Pontos "Biogás" ficam de fora (mesma exceção aplicada em
// ApproveCertificateExtractionUseCase — limite só vale pro biometano já
// tratado/odorizado).
import { PrismaClient, ComplianceStatus } from '@prisma/client';

const prisma = new PrismaClient();

const REGULATORY_MIN = 15;
const REGULATORY_LIMIT = 30;
const LIMIT_UNIT = 'mg/m³';

function parseNumericResult(resultText: string): number | null {
  const match = /-?\d+(?:[.,]\d+)?/.exec(resultText);
  if (!match) return null;
  return Number(match[0].replace(',', '.'));
}

function computeCompliance(resultText: string): ComplianceStatus | undefined {
  const value = parseNumericResult(resultText);
  if (value === null) return undefined;
  if (value > REGULATORY_LIMIT || value < REGULATORY_MIN) return ComplianceStatus.NAO_CONFORME;
  return ComplianceStatus.CONFORME;
}

async function main() {
  const rows = await prisma.sampleResultRow.findMany({
    where: { parameterName: 'COG (Concentração de Odorante no Gás)' },
    include: { sample: { include: { samplingPoint: true } } },
  });

  console.log(`Encontradas ${rows.length} linha(s) de "COG (Concentração de Odorante no Gás)".`);

  const specLimit = `${REGULATORY_MIN.toFixed(2).replace('.', ',')} a ${REGULATORY_LIMIT.toFixed(2).replace('.', ',')} ${LIMIT_UNIT}`;
  for (const row of rows) {
    const isBiogas = row.sample.samplingPoint?.name === 'Biogás';
    if (isBiogas) {
      console.log(`  ${row.id}: ponto Biogás, sem limite aplicável — pulando.`);
      continue;
    }
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
