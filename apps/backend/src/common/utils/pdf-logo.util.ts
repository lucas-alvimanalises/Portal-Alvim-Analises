import * as fs from 'fs';
import * as path from 'path';

// Compartilhado entre os geradores de PDF server-side (Ordem de Serviço,
// Cadeia de Custódia) — resolvido a partir do cwd (apps/backend), mesmo
// padrão usado por FILE_STORAGE_LOCAL_PATH, funciona tanto em
// `nest start` quanto em `node dist/main.js`.
let cachedLogoBase64: string | null | undefined;
export function getLogoBase64(): string | null {
  if (cachedLogoBase64 !== undefined) return cachedLogoBase64;
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo.jpg');
    cachedLogoBase64 = fs.readFileSync(logoPath).toString('base64');
  } catch {
    cachedLogoBase64 = null;
  }
  return cachedLogoBase64;
}
