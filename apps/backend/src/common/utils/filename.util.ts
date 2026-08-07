// Nomes gerados a partir de dados de negócio (razão social, etc.) podem
// conter caracteres inválidos em nome de arquivo — o caso real que estourou
// isso foi "Gás Verde S/A" virando parte do path físico salvo em disco
// (LocalFileStorageService.upload), onde a "/" era interpretada como
// separador de diretório e quebrava com ENOENT (pasta inexistente). Troca
// qualquer caractere de \ / : * ? " < > | por espaço, e colapsa espaços
// duplicados que sobrarem.
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
}
