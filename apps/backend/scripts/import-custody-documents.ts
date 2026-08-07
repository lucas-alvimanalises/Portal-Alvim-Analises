// Importação em massa de PDFs de cadeia de custódia já existentes no
// OneDrive (Amostragem de Campo > {composto} > {ano} > *.pdf) pro portal.
// Só LÊ os arquivos de origem — nunca move nem apaga nada da pasta original.
//
// Uso: npx ts-node scripts/import-custody-documents.ts <compoundCode> "<pasta raiz do composto>"
// Ex.:  npx ts-node scripts/import-custody-documents.ts 11000 "C:/.../Amostragem de Campo/11000 - Siloxanos"
//
// Roda contra a API já em pé (usa fetch/FormData/Blob nativos do Node —
// sem dependência nova). Não aborta no primeiro erro: continua e reporta
// um resumo no final.

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@alvim.com.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123';

interface Compound {
  id: string;
  code: string;
  name: string;
}

interface CustodyDocument {
  year: number;
  filename: string;
}

async function login(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login falhou: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

async function findCompound(token: string, code: string): Promise<Compound> {
  const res = await fetch(`${API_BASE}/compounds`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao buscar compostos: HTTP ${res.status}`);
  }
  const compounds = (await res.json()) as Compound[];
  const compound = compounds.find((c) => c.code === code);
  if (!compound) {
    throw new Error(`Composto com código "${code}" não encontrado.`);
  }
  return compound;
}

// Chave "ano|filename" pra pular arquivos já importados — torna o script
// seguro de rodar de novo (ex.: depois de falhas transitórias de rede numa
// execução anterior) sem duplicar os que já subiram.
async function findExistingKeys(token: string, compoundId: string): Promise<Set<string>> {
  const res = await fetch(`${API_BASE}/custody-documents?compoundId=${compoundId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Falha ao listar documentos existentes: HTTP ${res.status}`);
  }
  const documents = (await res.json()) as CustodyDocument[];
  return new Set(documents.map((doc) => `${doc.year}|${doc.filename}`));
}

async function uploadDocument(
  token: string,
  compoundId: string,
  year: number,
  filePath: string,
  filename: string,
): Promise<Response> {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.set('compoundId', compoundId);
  form.set('year', String(year));
  form.set('file', new Blob([buffer], { type: 'application/pdf' }), filename);

  return fetch(`${API_BASE}/custody-documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

async function main() {
  const [, , compoundCode, rootPath] = process.argv;
  if (!compoundCode || !rootPath) {
    console.error(
      'Uso: npx ts-node scripts/import-custody-documents.ts <compoundCode> "<pasta raiz do composto>"',
    );
    process.exit(1);
  }

  const token = await login();
  const compound = await findCompound(token, compoundCode);
  console.log(`Composto encontrado: ${compound.code} - ${compound.name} (${compound.id})`);

  const existingKeys = await findExistingKeys(token, compound.id);
  console.log(`Documentos já importados anteriormente: ${existingKeys.size}`);

  const entries = await readdir(rootPath, { withFileTypes: true });
  const yearFolders = entries
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (yearFolders.length === 0) {
    console.warn(`Nenhuma subpasta de ano (4 dígitos) encontrada em "${rootPath}".`);
  }

  let uploaded = 0;
  let skipped = 0;
  const failures: { file: string; reason: string }[] = [];

  for (const yearFolder of yearFolders) {
    const year = Number(yearFolder.name);
    const yearPath = join(rootPath, yearFolder.name);
    const files = await readdir(yearPath, { withFileTypes: true });
    const pdfFiles = files.filter(
      (file) => file.isFile() && file.name.toLowerCase().endsWith('.pdf'),
    );

    console.log(`Ano ${year}: ${pdfFiles.length} PDF(s) encontrado(s).`);

    for (const file of pdfFiles) {
      if (existingKeys.has(`${year}|${file.name}`)) {
        skipped += 1;
        continue;
      }
      const filePath = join(yearPath, file.name);
      try {
        const res = await uploadDocument(token, compound.id, year, filePath, file.name);
        if (!res.ok) {
          const body = await res.text();
          failures.push({ file: filePath, reason: `HTTP ${res.status}: ${body}` });
          console.error(`  FALHA: ${file.name} — HTTP ${res.status}`);
          continue;
        }
        uploaded += 1;
        console.log(`  OK: ${file.name}`);
      } catch (error) {
        failures.push({ file: filePath, reason: String(error) });
        console.error(`  ERRO: ${file.name} — ${error}`);
      }
    }
  }

  console.log('\n--- Resumo ---');
  console.log(`Enviados com sucesso: ${uploaded}`);
  console.log(`Já existiam (pulados): ${skipped}`);
  console.log(`Falhas: ${failures.length}`);
  failures.forEach((failure) => console.log(`  - ${failure.file}: ${failure.reason}`));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
