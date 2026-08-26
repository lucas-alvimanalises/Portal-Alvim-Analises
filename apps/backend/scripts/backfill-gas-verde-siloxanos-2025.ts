// Script avulso: conserta um problema pontual de dado - 17 certificados da
// Gas Verde S/A (coletas de 06/06, 18/06 e 03/07/2025), aprovados em lote
// em 18-19/08/2026, ficaram sem nenhuma linha em sample_result_rows apesar
// de a IA ja ter extraido os valores corretamente e o Certificate ja ter
// sido gerado normalmente. Investigacao completa descartou bug ao vivo no
// fluxo de aprovacao atual: os mesmos dados, passados pela mesma logica,
// produzem o resultado certo hoje - o problema aconteceu so no momento
// daquelas aprovacoes especificas (provavel condicao de corrida com edicao
// do molde de composto acontecendo em paralelo).
//
// Reaplica a MESMA logica de mesclagem de apps/backend/src/modules/
// certificate-extractions/application/use-cases/approve-certificate-extraction.use-case.ts
// (linhas 116-206), usando o dado ja extraido e aprovado - sem re-aprovar
// nada nem tocar no Certificate ja existente, so preenchendo
// sample_result_rows que ficou vazio.
//
// Roda em modo DRY RUN por padrao (so mostra o que faria). Pra aplicar de
// verdade:
//   npx ts-node scripts/backfill-gas-verde-siloxanos-2025.ts --apply
import { PrismaClient } from '@prisma/client';
import { CertificateAnalyteConfig, CertificateExtractedData } from '@portal-alvim/shared';
import { computeCompliance, formatRegulatoryLimit } from '../src/modules/certificate-extractions/application/certificate-compliance.util';

const prisma = new PrismaClient();

const CLIENT_NAME_FILTER = 'Gás Verde';
const TARGET_DATES = ['2025-06-06', '2025-06-18', '2025-07-03'];
const APPLY = process.argv.includes('--apply');

async function main() {
  const extractions = await prisma.certificateExtraction.findMany({
    where: {
      status: 'APPROVED',
      sample: {
        client: { companyName: { contains: CLIENT_NAME_FILTER } },
        collectionDate: { in: TARGET_DATES.map((d) => new Date(`${d}T00:00:00Z`)) },
      },
    },
    include: {
      template: true,
      sample: {
        include: { resultRows: true, samplingPoint: { select: { name: true } } },
      },
    },
  });

  console.log(`${extractions.length} certificado(s) aprovado(s) encontrado(s) nas datas/empresa alvo.`);

  let toFix = 0;
  let skippedAlreadyHasRows = 0;
  let skippedNoData = 0;

  for (const extraction of extractions) {
    const sample = extraction.sample;
    if ((sample.resultRows?.length ?? 0) > 0) {
      skippedAlreadyHasRows++;
      continue;
    }

    const reviewedData = (extraction.correctedData ?? extraction.extractedData) as unknown as
      | CertificateExtractedData
      | null;
    if (!reviewedData || reviewedData.results.length === 0) {
      skippedNoData++;
      console.log(`  [sem dado extraido, pulando] sample ${sample.id} (${sample.collectionDate.toISOString().slice(0, 10)})`);
      continue;
    }

    const analytes = extraction.template.analytes as unknown as CertificateAnalyteConfig[];
    const analytesByKey = new Map(analytes.map((a) => [a.key, a]));
    const isBiogas = sample.samplingPoint?.name === 'Biogás';

    type NewRow = {
      parameterName: string;
      result: string;
      unit: string;
      specLimit?: string;
      compliance?: ReturnType<typeof computeCompliance>;
      order: number;
    };
    const rows: NewRow[] = [];

    const mergeRow = (parameterName: string, resultText: string, unit: string, analyte?: CertificateAnalyteConfig) => {
      const compliance =
        analyte && !isBiogas
          ? computeCompliance(resultText, analyte.regulatoryLimit, analyte.warningThreshold, analyte.regulatoryMin)
          : undefined;
      const specLimit =
        analyte?.regulatoryLimit !== undefined && analyte.limitUnit && !isBiogas
          ? formatRegulatoryLimit(analyte.regulatoryLimit, analyte.limitUnit, analyte.warningThreshold, analyte.regulatoryMin)
          : undefined;
      rows.push({ parameterName, result: resultText, unit, specLimit, compliance, order: rows.length });
    };

    if (extraction.template.resultsMode === 'COLLAPSE_BELOW_LQ') {
      const readable = reviewedData.results.filter((r) => analytesByKey.has(r.key) && !!r.result?.trim());
      const quantified = readable.filter((r) => !r.result.includes('<'));
      if (quantified.length > 0) {
        for (const r of quantified) mergeRow(analytesByKey.get(r.key)!.label, r.result, r.unit, analytesByKey.get(r.key));
      } else if (readable.length > 0) {
        mergeRow(extraction.template.collapsedResultLabel ?? 'Resultado', '<LQ', '');
      }
    } else if (extraction.template.resultsMode === 'SKIP_ZERO') {
      for (const r of reviewedData.results) {
        const analyte = analytesByKey.get(r.key);
        if (!analyte || !r.result?.trim()) continue;
        mergeRow(analyte.label, r.result, r.unit, analyte);
      }
    } else {
      for (const r of reviewedData.results) {
        const analyte = analytesByKey.get(r.key);
        if (!analyte || !r.result?.trim()) continue;
        mergeRow(analyte.label, r.result, r.unit, analyte);
      }
    }

    if (rows.length === 0) {
      skippedNoData++;
      console.log(`  [mesclagem nao gerou nenhuma linha, pulando] sample ${sample.id}`);
      continue;
    }

    toFix++;
    console.log(
      `  sample ${sample.id} (${sample.collectionDate.toISOString().slice(0, 10)}): ${rows.length} linha(s) -> ` +
        rows.map((r) => `${r.parameterName}=${r.result}${r.unit}`).join(', '),
    );

    if (APPLY) {
      await prisma.sampleResultRow.createMany({
        data: rows.map((r) => ({ ...r, sampleId: sample.id })),
      });
    }
  }

  console.log('');
  console.log(
    `Resumo: ${toFix} amostra(s) ${APPLY ? 'corrigida(s)' : 'seriam corrigidas'}, ` +
      `${skippedAlreadyHasRows} ja tinham resultado (ignoradas), ${skippedNoData} sem dado aproveitavel.`,
  );
  if (!APPLY) {
    console.log('Modo DRY RUN - nada foi gravado. Rode de novo com --apply pra aplicar de verdade.');
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
