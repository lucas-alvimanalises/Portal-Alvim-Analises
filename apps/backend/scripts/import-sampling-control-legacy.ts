// Script avulso (roda UMA vez): importa o histórico pré-portal da planilha
// mestre da Alvim ("Identificação de Amostragens.xlsx", aba "Operações ")
// pra tabela SamplingControlRecord, como linhas source = LEGACY_IMPORT.
//
// Corte: só entra amostragem com Data do Serviço ANTES de 2026-08-01 — de
// agosto/2026 em diante as cadeias passaram a ser 100% no portal, então
// essas linhas vêm do backfill-sampling-control-portal.ts / do hook de
// sincronização, não daqui. Rede de segurança extra: pula qualquer linha
// cujo "N° Relatório Interno" já exista na tabela (o portal sempre ganha).
//
//   npx ts-node scripts/import-sampling-control-legacy.ts "<caminho/planilha.xlsx>"            (dry run)
//   npx ts-node scripts/import-sampling-control-legacy.ts "<caminho/planilha.xlsx>" --apply
import ExcelJS from 'exceljs';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const XLSX_PATH = process.argv.find((a) => a.toLowerCase().endsWith('.xlsx'));

const SHEET_NAME = 'Operações '; // com espaço no fim, como está na planilha
const HEADER_ROW = 4; // dados começam na linha 5
const CUTOFF = new Date('2026-08-01T00:00:00Z'); // < agosto/2026 = legado

// Nomes curtos internos da planilha -> razão social do Client cadastrado no
// portal (confirmado com o usuário). Só as empresas que existem no portal
// entram aqui; o resto (Essencis - Caieiras/Salvador, outras plantas da
// Gás Verde, CRVR, Marquise, UVS, ... — clientes antigos nunca cadastrados)
// fica com clientId nulo de propósito, aparecendo só pelo nome-texto.
const LEGACY_CLIENT_NAME_MAP: Record<string, string> = {
  'gás verde - seropédica rj': 'Gás Verde S/A',
  'orizon- jaboatão dos guararapes': 'ORIZON BIOMETANO JABOATAO DOS GUARARAPES LIMITADA',
  'essencis - minas do leão': 'BIOMETANO SUL S.A',
  'biotérmica minas do leão': 'BIOMETANO SUL S.A',
  bvp: 'BIOMETANO VERDE PAULÍNIA S.A.',
  'metagás': 'METAGAS BIOGAS E ENERGIA S/A',
  'gnr fortaleza': 'GNR FORTALEZA VALORIZAÇÃO DE BIOGÁS LTDA',
  'biometano são leopoldo': 'Biometano São Leopoldo S.A.',
};

// Colunas (1 = coluna A):
const COL = {
  date: 2,
  client: 3,
  compound: 4,
  vial1: 5,
  vial2: 6,
  vial3: 7,
  id: 8,
  reportNumber: 9,
  pump: 10,
  samplingPoint: 11,
  observation: 12,
  billing: 13,
} as const;

function cleanText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  let s: string;
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    s = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('');
  } else if (typeof v === 'object' && v !== null && 'text' in v) {
    s = String((v as { text: unknown }).text);
  } else {
    s = String(v);
  }
  s = s.trim();
  if (!s || s === '-' || s === '—' || s === '--') return null;
  return s;
}

// Datas na planilha: umas vêm como Date (célula formatada como data), outras
// como texto "M/D/AA" (formato americano do Excel). Normaliza pra meia-noite
// UTC (mesmo padrão de Sample.collectionDate).
function parseServiceDate(raw: unknown): Date | null {
  if (raw instanceof Date) {
    return new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate()));
  }
  const text = cleanText(raw);
  if (!text) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(text);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function buildSampleIdentification(row: ExcelJS.Row): string | null {
  const vials = [COL.vial1, COL.vial2, COL.vial3]
    .map((c) => cleanText(row.getCell(c).value))
    .filter((v): v is string => !!v);
  if (vials.length > 0) return vials.join(' - ');
  return cleanText(row.getCell(COL.id).value);
}

async function main() {
  if (!XLSX_PATH) {
    console.error('Informe o caminho do .xlsx como argumento.');
    process.exit(1);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(XLSX_PATH);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    console.error(`Aba "${SHEET_NAME}" não encontrada. Abas: ${workbook.worksheets.map((w) => `"${w.name}"`).join(', ')}`);
    process.exit(1);
  }

  const clients = await prisma.client.findMany({ select: { id: true, companyName: true } });
  const clientIdByName = new Map(clients.map((c) => [c.companyName.trim().toLowerCase(), c.id]));

  const existingReportNumbers = new Set(
    (
      await prisma.samplingControlRecord.findMany({
        where: { fieldReportNumber: { not: null } },
        select: { fieldReportNumber: true },
      })
    ).map((r) => r.fieldReportNumber as string),
  );

  const toInsert: Prisma.SamplingControlRecordCreateManyInput[] = [];
  const seenReportInFile = new Set<string>();
  const unmatchedClients = new Map<string, number>();
  let skippedAfterCutoff = 0;
  let skippedDupReport = 0;
  let skippedNoDate = 0;
  let skippedEmpty = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= HEADER_ROW) return;

    const clientName = cleanText(row.getCell(COL.client).value);
    const compoundName = cleanText(row.getCell(COL.compound).value);
    const serviceDate = parseServiceDate(row.getCell(COL.date).value);

    // Linha vazia / rodapé.
    if (!clientName && !compoundName && !serviceDate) return;

    if (!serviceDate) {
      skippedNoDate++;
      console.log(`  ! linha ${rowNumber}: sem data válida — ${clientName ?? '?'} / ${compoundName ?? '?'}`);
      return;
    }
    if (!clientName || !compoundName) {
      skippedEmpty++;
      return;
    }
    if (serviceDate >= CUTOFF) {
      skippedAfterCutoff++;
      return;
    }

    const reportNumber = cleanText(row.getCell(COL.reportNumber).value);
    if (reportNumber && (existingReportNumbers.has(reportNumber) || seenReportInFile.has(reportNumber))) {
      skippedDupReport++;
      console.log(`  ~ linha ${rowNumber}: nº relatório "${reportNumber}" já existe — pulada`);
      return;
    }
    if (reportNumber) seenReportInFile.add(reportNumber);

    const mappedName = LEGACY_CLIENT_NAME_MAP[clientName.toLowerCase()];
    const clientId =
      clientIdByName.get((mappedName ?? clientName).toLowerCase()) ?? null;
    if (!clientId) unmatchedClients.set(clientName, (unmatchedClients.get(clientName) ?? 0) + 1);

    toInsert.push({
      serviceDate,
      clientName,
      clientId,
      compoundName,
      sampleIdentification: buildSampleIdentification(row),
      fieldReportNumber: reportNumber,
      pump: cleanText(row.getCell(COL.pump).value),
      samplingPointName: cleanText(row.getCell(COL.samplingPoint).value),
      observation: cleanText(row.getCell(COL.observation).value),
      billingResponsible: cleanText(row.getCell(COL.billing).value),
      source: 'LEGACY_IMPORT',
    });
  });

  console.log('\n--- Empresas da planilha sem correspondência em Client (clientId ficará nulo) ---');
  if (unmatchedClients.size === 0) {
    console.log('  (nenhuma — todas casaram)');
  } else {
    [...unmatchedClients.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => console.log(`  ${count.toString().padStart(4)}×  ${name}`));
  }

  const linkedCount = toInsert.filter((r) => r.clientId).length;

  console.log('\n--- Resumo ---');
  console.log(`  ${toInsert.length} linha(s) ${APPLY ? 'inseridas' : 'seriam inseridas'} (LEGACY_IMPORT)`);
  console.log(`  ${linkedCount} com clientId vinculado, ${toInsert.length - linkedCount} só com nome-texto`);
  console.log(`  ${skippedAfterCutoff} puladas (Data do Serviço >= 2026-08-01, vêm do portal)`);
  console.log(`  ${skippedDupReport} puladas (nº de relatório já existente / repetido na planilha)`);
  console.log(`  ${skippedNoDate} puladas (sem data válida)`);
  console.log(`  ${skippedEmpty} puladas (sem cliente ou composto)`);

  if (!APPLY) {
    console.log('\nDRY RUN — nada gravado. Rode de novo com --apply pra importar.');
    return;
  }

  const result = await prisma.samplingControlRecord.createMany({ data: toInsert });
  console.log(`\nOK — ${result.count} linha(s) inseridas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
