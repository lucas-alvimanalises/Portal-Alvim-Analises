// Invariantes de negócio do Cliente, isoladas do Prisma e do HTTP.
// CNPJ é armazenado como veio (com ou sem máscara) — normalização de
// formatação fica a critério do frontend; aqui só validamos o formato básico.
const CNPJ_DIGITS_ONLY = /^\d{14}$/;
const CNPJ_MASKED = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

export function isValidCnpjFormat(cnpj: string): boolean {
  return CNPJ_DIGITS_ONLY.test(cnpj) || CNPJ_MASKED.test(cnpj);
}
