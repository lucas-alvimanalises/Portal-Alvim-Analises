// Script avulso: aplica a RANP 1006 (ANP) retroativamente aos resultados de
// Siloxanos JÁ APROVADOS cuja análise foi feita a partir de 13/08/2026 —
// remove a faixa de "atenção" (0,21 a 0,30 mg Si/m³, que a norma antiga
// RANP 886 exigia reamostragem semanal), deixando só Conforme/Não Conforme
// contra o limite de 0,30 (norma nova). Resultados analisados ANTES dessa
// data não são tocados (continuam sob a RANP 886, vigente na época). Ver
// approve-certificate-extraction.use-case.ts pro mesmo corte aplicado daqui
// pra frente, em toda aprovação nova.
//
// Roda em modo DRY RUN por padrão. Pra aplicar de verdade:
//   npx ts-node scripts/apply-ranp1006-siloxanos.ts --apply
import { PrismaClient } from '@prisma/client';
import { computeCompliance, formatRegulatoryLimit } from '../src/modules/certificate-extractions/application/certificate-compliance.util';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const RANP_1006_EFFECTIVE_DATE = new Date('2026-08-13T00:00:00Z');
const SILOXANOS_COMPOUND_CODE = '11000';
const SILOXANOS_PARAMETER_NAME = 'Concentração Total de Siloxanos';
const SILOXANOS_LIMIT = 0.3;
const SILOXANOS_LIMIT_UNIT = 'mg Si/m³';

// Gás Verde S/A — Molegate Entrada (certificado 11127/25): data de análise
// registrada (05/09/2026) está sob suspeita — o nome do arquivo original
// cita "agosto 2025", possível erro de leitura por IA. Fica de fora desta
// rodada até a data real ser confirmada, pra não classificar errado.
const EXCLUDED_SAMPLE_IDS = new Set(['bd3e3c88-a0e4-4d33-9907-cfff2a87bab8']);

async function main() {
  const compound = await prisma.compound.findUnique({ where: { code: SILOXANOS_COMPOUND_CODE } });
  if (!compound) {
    console.log(`Composto ${SILOXANOS_COMPOUND_CODE} não encontrado — nada a fazer.`);
    return;
  }

  const samples = await prisma.sample.findMany({
    where: { compoundId: compound.id, active: true },
    include: {
      client: { select: { companyName: true } },
      samplingPoint: { select: { name: true } },
      resultRows: { where: { parameterName: SILOXANOS_PARAMETER_NAME } },
      certificates: { orderBy: { analysisDate: 'desc' }, take: 1 },
    },
  });

  let toFix = 0;
  let alreadyCorrect = 0;
  let skippedOldRule = 0;
  let skippedNoData = 0;
  let skippedExcluded = 0;

  for (const sample of samples) {
    if (EXCLUDED_SAMPLE_IDS.has(sample.id)) {
      skippedExcluded++;
      continue;
    }
    const certificate = sample.certificates[0];
    const row = sample.resultRows[0];
    if (!certificate || !row) {
      skippedNoData++;
      continue;
    }
    if (certificate.analysisDate < RANP_1006_EFFECTIVE_DATE) {
      skippedOldRule++;
      continue;
    }

    const newCompliance = computeCompliance(row.result, SILOXANOS_LIMIT, undefined, undefined);
    const newSpecLimit = formatRegulatoryLimit(SILOXANOS_LIMIT, SILOXANOS_LIMIT_UNIT, undefined, undefined);

    if (row.compliance === newCompliance && row.specLimit === newSpecLimit) {
      alreadyCorrect++;
      continue;
    }

    toFix++;
    console.log(
      `  sample ${sample.id} (${sample.client.companyName} — ${sample.samplingPoint?.name ?? '-'}, ` +
        `analisado em ${certificate.analysisDate.toISOString().slice(0, 10)}): ` +
        `resultado="${row.result}" — compliance ${row.compliance ?? '(vazio)'} -> ${newCompliance ?? '(vazio)'}, ` +
        `specLimit "${row.specLimit ?? '(vazio)'}" -> "${newSpecLimit}"`,
    );

    if (APPLY) {
      await prisma.sampleResultRow.update({
        where: { id: row.id },
        data: { compliance: newCompliance ?? null, specLimit: newSpecLimit },
      });
    }
  }

  console.log('');
  console.log(
    `Resumo: ${toFix} linha(s) ${APPLY ? 'corrigida(s)' : 'seriam corrigidas'}, ` +
      `${alreadyCorrect} já estavam certas, ${skippedOldRule} analisadas antes de 13/08/2026 (regra antiga mantida), ` +
      `${skippedNoData} sem certificado/resultado ainda, ${skippedExcluded} excluída(s) por data em dúvida.`,
  );
  if (!APPLY) {
    console.log('Modo DRY RUN — nada foi gravado. Rode de novo com --apply pra aplicar de verdade.');
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
