// jsPDF, por padrão, usa as fontes Standard-14 (helvetica etc.), que só
// cobrem o alfabeto WinAnsi/CP1252 — qualquer caractere fora dessa faixa
// (emoji, símbolos matemáticos como ≥/≤/±) corrompe silenciosamente a
// célula inteira no PDF final (bytes de glyph errados), sem lançar nenhum
// erro. Já descoberto uma vez com emoji (🔴/🟢) no Reporte ANP; o mesmo
// aconteceu aqui com "0,30 mg Si/m³ (atenção ≥ 0,21)" — o dado em si está
// correto (ver certificate-compliance.util.ts formatRegulatoryLimit), só o
// "≥" não tem glyph no WinAnsi. Substitui por equivalentes ASCII antes de
// qualquer chamada doc.text()/autoTable com texto vindo de dados de negócio.
const PDF_UNSAFE_CHAR_REPLACEMENTS: [RegExp, string][] = [
  [/≥/g, '>='],
  [/≤/g, '<='],
  [/±/g, '+/-'],
  [/–/g, '-'], // en dash
  [/—/g, '-'], // em dash
  [/…/g, '...'],
  [/→/g, '->'], // seta (ex.: título "1ª Barreira -> 2ª Barreira") — mesmo bug do ≥
  [/←/g, '<-'],
];

export function sanitizePdfText(text: string): string {
  return PDF_UNSAFE_CHAR_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

// Aceita dígitos, vírgula/ponto decimal, espaço, unidades comuns (letras,
// µ, ³, °, /), e os operadores usados nos textos de limite já existentes no
// sistema (<, >, =, -, "a" de faixa). Qualquer coisa fora disso é sinal de
// dado suspeito (ex.: texto de observação vazando pro campo errado) — só
// loga um aviso, não bloqueia a geração (o usuário pediu "sinalizar/logar",
// não impedir).
const SUSPICIOUS_LIMIT_PATTERN = /^[0-9.,\s<>=\-a-zA-ZÀ-ÿ/³µ°%()]*$/;

export function warnIfSuspiciousLimit(context: string, specLimit: string | null): void {
  if (!specLimit) return;
  if (!SUSPICIOUS_LIMIT_PATTERN.test(specLimit)) {
    // eslint-disable-next-line no-console
    console.warn(`[results-summary] Campo "Limite" com caracteres inesperados em ${context}: "${specLimit}"`);
  }
}
