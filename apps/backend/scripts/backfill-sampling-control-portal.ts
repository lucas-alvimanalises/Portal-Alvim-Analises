// Script avulso: cria as linhas PORTAL da "Tabela de Controle de Amostras"
// pras cadeias de custódia aprovadas ANTES do hook de sincronização existir
// (agosto/2026 em diante, quando a Alvim passou a fazer 100% das cadeias
// pelo portal). A partir daqui toda aprovação nova já grava a linha sozinha
// (ver SamplingControlService, chamado em ApproveCustodyExtraction /
// AttachExistingCustodyDocument).
//
// A lógica de mapeamento aqui é um espelho de
// SamplingControlService.syncFromCustodyExtraction — mantenha as duas em
// sincronia. Idempotente (upsert por custodyExtractionId).
//
//   npx ts-node scripts/backfill-sampling-control-portal.ts          (dry run)
//   npx ts-node scripts/backfill-sampling-control-portal.ts --apply
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const PUMP_FIELD_KEY = 'bombaAmostragemN';

function reportNumberFromFilename(filename: string): string | null {
  const match = /^(\d+)_(\d{2})\s*-/.exec(filename);
  return match ? `${match[1]}/${match[2]}` : null;
}

async function main() {
  const approved = await prisma.custodyExtraction.findMany({
    where: { status: 'APPROVED', generatedDocumentId: { not: null } },
    include: {
      generatedDocument: { include: { file: { select: { filename: true } } } },
      sample: {
        include: {
          client: { select: { companyName: true } },
          compound: { select: { name: true } },
          samplingPoint: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`${approved.length} cadeia(s) de custódia aprovada(s) com documento gerado.\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const extraction of approved) {
    const sample = extraction.sample;
    if (!sample || !extraction.generatedDocument) {
      skipped++;
      continue;
    }

    const reviewed = (extraction.correctedData ?? extraction.extractedData) as {
      fields?: Record<string, { value?: string }>;
    } | null;
    const pump = reviewed?.fields?.[PUMP_FIELD_KEY]?.value?.trim() || null;
    const fieldReportNumber = reportNumberFromFilename(extraction.generatedDocument.file.filename);

    const data = {
      serviceDate: sample.collectionDate,
      clientName: sample.client?.companyName ?? '—',
      clientId: sample.clientId,
      compoundName: sample.compound?.name ?? '—',
      sampleIdentification: sample.sampleCode?.trim() || null,
      fieldReportNumber,
      pump,
      samplingPointName: sample.samplingPoint?.name ?? null,
      observation: sample.notes?.trim() || null,
      source: 'PORTAL' as const,
      sampleId: sample.id,
    };

    const existing = await prisma.samplingControlRecord.findUnique({
      where: { custodyExtractionId: extraction.id },
      select: { id: true },
    });

    const label =
      `${data.clientName} · ${data.compoundName} · ${data.samplingPointName ?? '—'} · ` +
      `${fieldReportNumber ?? extraction.generatedDocument.file.filename}`;
    console.log(`  ${existing ? '~' : '+'} ${label}`);

    if (APPLY) {
      await prisma.samplingControlRecord.upsert({
        where: { custodyExtractionId: extraction.id },
        create: { ...data, custodyExtractionId: extraction.id },
        update: data,
      });
      if (fieldReportNumber) {
        await prisma.samplingControlRecord.deleteMany({
          where: { fieldReportNumber, source: 'LEGACY_IMPORT' },
        });
      }
    }
    if (existing) updated++;
    else created++;
  }

  console.log('');
  console.log(
    `${APPLY ? 'OK' : 'DRY RUN'} — ${created} nova(s), ${updated} atualizada(s), ${skipped} sem amostra/documento.`,
  );
  if (!APPLY) console.log('Rode de novo com --apply pra gravar.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
