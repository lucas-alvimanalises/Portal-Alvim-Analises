// Busboy (usado por multer/@nestjs/platform-express) decodifica os bytes do
// cabeçalho multipart como latin1 e nunca reconverte o parâmetro `filename`
// pra UTF-8 — diferente dos valores de campo de texto, que passam por essa
// conversão (`convertToUTF8`). Navegadores reais e o FormData nativo do Node
// mandam o filename em UTF-8 puro (sem RFC 5987 `filename*=`), então o
// resultado chega com cada byte UTF-8 virando um char code Latin-1 isolado
// (ex.: "ó" chega como "Ã³"). Reverter esse round-trip aqui recupera o nome
// original. Nomes puramente ASCII não são afetados (idempotente).
export function fixMultipartFilename(filename: string): string {
  return Buffer.from(filename, 'latin1').toString('utf8');
}
