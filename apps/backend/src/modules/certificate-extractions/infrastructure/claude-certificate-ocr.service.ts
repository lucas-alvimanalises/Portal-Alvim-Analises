import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { CertificateAnalyteConfig, CertificateExtractedData } from '@portal-alvim/shared';
import { AppConfig } from '../../../config/configuration';

export interface ScanFile {
  buffer: Buffer;
  mimeType: string;
}

const MODEL = 'claude-sonnet-5';

function buildPrompt(analytes: CertificateAnalyteConfig[]): string {
  const analyteList = analytes
    .map(
      (analyte) =>
        `- "${analyte.key}": procure a linha de resultado do parâmetro "${analyte.reportAnalyteName}". Unidade esperada: ${analyte.unitHint}. Se esse mesmo parâmetro aparecer repetido no laudo em unidades diferentes (ex.: mg/m³, ppb, µg/m³, ppm, ng), pegue APENAS a linha na unidade pedida; se aparecer uma única vez, use essa linha independente da unidade exata.`,
    )
    .join('\n');

  return `Você está lendo um laudo/relatório de análise laboratorial em PDF (pode ter uma ou várias páginas — laboratórios diferentes usam layouts bem diferentes, então não assuma uma estrutura fixa de colunas). O documento tem uma tabela de resultados com pelo menos o nome do parâmetro e o valor medido, podendo também ter colunas como LQ, LD, Referência/Método e Data da análise por linha.

Extraia:
1. "certificateNumber": o número do relatório/certificado. Normalmente perto do título "Relatório de Análise(s)" no topo da primeira página (ex.: "34937/2026.0" ou "03395.1.07.26") — mas em alguns laudos (ex.: Siloxanos) o identificador oficial é o "RC" (Relatório de Campo), que pode aparecer dentro de uma tabela de identificação da amostra em vez do topo do documento (ex.: "Relatório de campo (RC): 11146/26" → use "11146/26"). NÃO confunda com "Nº Amostra", "Nº do Amostrador" nem "Proposta Comercial", que são números diferentes.
2. "laboratory": o nome do laboratório que emitiu o laudo (pode estar no cabeçalho, rodapé, ou perto da assinatura).
3. "issueDate": a data de emissão/publicação do documento — procure um campo como "Data de Publicação/Emissão" no topo, OU uma data por extenso perto da assinatura no final do documento (ex.: "São Bernardo do Campo, 21 de Julho de 2026"). Converta pro formato "AAAA-MM-DD".
4. "analysisDate": a data em que a análise foi feita — procure primeiro um campo único tipo "Data da análise" no cabeçalho/identificação da amostra; se não existir, use a coluna "Data Análise" das linhas de resultado (normalmente a mesma data em todas). Converta pro formato "AAAA-MM-DD".
Se o laudo tiver só UM campo de data no documento inteiro (sem distinção entre emissão e análise — comum em laudos internos mais simples, ex.: um campo único "Data: 02/07/2026"), use essa mesma data tanto pra "issueDate" quanto pra "analysisDate", em vez de deixar algum dos dois em branco.
5. Para cada um destes parâmetros, procure em TODAS as páginas do documento a linha de resultado correta:
${analyteList}

Pra cada parâmetro encontrado, retorne o texto EXATO da célula de resultado (incluindo símbolo "<" se houver, o número e a unidade, ex.: "< 0,012 mg Cl/m³" ou "0,4 mg/m³") e a unidade separada (ex.: "mg/m³").

Responda APENAS com um JSON válido (sem markdown, sem texto extra, sem \`\`\`), exatamente neste formato:
{
  "certificateNumber": "<texto lido>", "certificateNumberConfidence": <0 a 1>,
  "laboratory": "<texto lido>", "laboratoryConfidence": <0 a 1>,
  "issueDate": "<AAAA-MM-DD>", "issueDateConfidence": <0 a 1>,
  "analysisDate": "<AAAA-MM-DD>", "analysisDateConfidence": <0 a 1>,
  "results": [
    { "key": "<chave do parâmetro>", "result": "<texto lido>", "unit": "<unidade lida>", "confidence": <0 a 1> }, ...
  ]
}

Regras:
- Use exatamente as chaves de parâmetro fornecidas acima (não traduza nem invente novas chaves) — inclua uma entrada em "results" para CADA parâmetro da lista, mesmo que não tenha sido encontrado.
- Se um valor estiver ilegível, ausente, ou você não tiver certeza de qual linha é a correta, retorne "" pro campo de texto e confidence 0 — NUNCA invente um valor.
- "confidence" reflete o quanto você tem certeza da leitura (1 = muito claro, 0 = ilegível/ausente/ambíguo).`;
}

function toBase64Source(file: ScanFile) {
  const data = file.buffer.toString('base64');
  if (file.mimeType === 'application/pdf') {
    return {
      type: 'document' as const,
      source: { type: 'base64' as const, media_type: 'application/pdf' as const, data },
    };
  }
  const media_type = file.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  return { type: 'image' as const, source: { type: 'base64' as const, media_type, data } };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// Leitura de certificado laboratorial (PDF/imagem) via Claude Vision — manda
// o arquivo + a lista de análises esperadas (do CertificateAnalyteTemplate
// do composto) e pede de volta um JSON estrito com número do certificado,
// laboratório, datas e um resultado por análise configurada. Mesmo padrão
// de ClaudeOcrService (cadeia de custódia): sem ANTHROPIC_API_KEY, falha com
// erro claro em vez de tentar chamar a API sem credencial.
@Injectable()
export class ClaudeCertificateOcrService {
  private readonly logger = new Logger(ClaudeCertificateOcrService.name);
  private readonly client: Anthropic | null;

  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    // maxRetries acima do padrão do SDK (2) — picos de sobrecarga do
    // Claude (529) costumam durar só alguns segundos; mais tentativas com
    // backoff automático resolve a maioria sem o usuário precisar clicar
    // de novo manualmente (achado real: usuário bateu em 529 3x seguidas).
    this.client = appConfig.anthropicApiKey
      ? new Anthropic({ apiKey: appConfig.anthropicApiKey, maxRetries: 5 })
      : null;
  }

  async extractCertificate(
    file: ScanFile,
    analytes: CertificateAnalyteConfig[],
  ): Promise<CertificateExtractedData> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Leitura por IA não configurada: defina ANTHROPIC_API_KEY no .env do backend.',
      );
    }

    let response;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [toBase64Source(file), { type: 'text', text: buildPrompt(analytes) }],
          },
        ],
      });
    } catch (error) {
      // Mesmo com maxRetries alto, uma sobrecarga sustentada da API da
      // Anthropic pode esgotar as tentativas — nesse caso, mensagem clara
      // em vez do JSON cru do erro (o que aparecia antes pro usuário: acidez
      // tipo '529 {"type":"error","error":{"type":"overloaded_error",...}}').
      if (error instanceof APIError && (error.status === 529 || error.status === 429 || error.status === 503)) {
        this.logger.warn(`IA sobrecarregada (status ${error.status}) ao ler certificado: ${error.message}`);
        throw new ServiceUnavailableException(
          'A IA de leitura automática está temporariamente sobrecarregada. Tente novamente em alguns minutos — ou digite o resultado manualmente, sem precisar esperar.',
        );
      }
      throw error;
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException('A IA não retornou texto na resposta.');
    }

    try {
      const parsed = JSON.parse(stripCodeFence(textBlock.text)) as CertificateExtractedData;
      if (!Array.isArray(parsed.results)) {
        throw new Error('JSON sem "results".');
      }
      return parsed;
    } catch (error) {
      this.logger.error(`Falha ao interpretar resposta da IA: ${error}`);
      throw new ServiceUnavailableException('A IA retornou um formato inesperado. Tente novamente.');
    }
  }
}
