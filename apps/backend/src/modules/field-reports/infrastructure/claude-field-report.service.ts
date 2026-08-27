import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { AppConfig } from '../../../config/configuration';

const MODEL = 'claude-sonnet-5';

export interface FieldReportSummaryInput {
  clientName: string;
  serviceTypeName: string;
  // Já formatado ("04/08/2026" ou "04/08/2026 a 05/08/2026") — mesmo padrão
  // de formatPeriod() em resultados/page.tsx, calculado pelo caller.
  formattedDate: string;
  points: { name: string; compoundNames: string[] }[];
}

// Texto de estilo — só pra dar o tom/registro ao modelo (o texto real do
// serviço nunca é fixo, vem sempre do que foi de fato agendado). Não é
// copiado literalmente: pedimos pra IA escrever um parágrafo NOVO, coerente
// com o que foi passado em `FieldReportSummaryInput`.
const STYLE_EXAMPLE =
  'No dia 06 de maio foi realizado o serviço conforme escopo estabelecido mensalmente, ' +
  'a realização das amostragens para identificação das concentrações de Orgânicos ' +
  'Voláteis, Siloxanos e Compostos de Enxofre.';

function buildPrompt(input: FieldReportSummaryInput): string {
  const pointsList = input.points
    .map((p) => `- ${p.name}: ${p.compoundNames.join(', ')}`)
    .join('\n');

  return `Você escreve relatórios de campo formais para a Alvim Análises, empresa de monitoramento ambiental de biometano/biogás.

Escreva UM parágrafo (1 a 3 frases), em português formal, resumindo o serviço de campo abaixo — mesmo tom/registro deste exemplo de estilo (não copie o conteúdo dele, é só referência de tom):
"${STYLE_EXAMPLE}"

Dados do serviço a descrever:
- Empresa: ${input.clientName}
- Tipo de serviço: ${input.serviceTypeName}
- Data(s): ${input.formattedDate}
- Pontos de amostragem e compostos analisados:
${pointsList}

Regras:
- Mencione a(s) data(s), os pontos de amostragem e os compostos analisados.
- Não invente nenhum dado que não esteja na lista acima.
- Responda APENAS com o parágrafo em texto puro — sem markdown, sem aspas, sem título, sem explicação.`;
}

// Gera o parágrafo central do "Relatório de Campo" (ver
// FieldReportsService) a partir do que foi realmente agendado — mesmo
// esqueleto de configuração do já existente ClaudeOcrService
// (custody-extractions/infrastructure/claude-ocr.service.ts), mas texto
// puro, sem visão computacional nem JSON estruturado.
@Injectable()
export class ClaudeFieldReportService {
  private readonly logger = new Logger(ClaudeFieldReportService.name);
  private readonly client: Anthropic | null;

  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    // maxRetries acima do padrão do SDK (2) — mesmo raciocínio de
    // ClaudeCertificateOcrService/ClaudeOcrService: picos de sobrecarga do
    // Claude (529) costumam durar só alguns segundos.
    this.client = appConfig.anthropicApiKey
      ? new Anthropic({ apiKey: appConfig.anthropicApiKey, maxRetries: 5 })
      : null;
  }

  async generateSummary(input: FieldReportSummaryInput): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Geração de relatório por IA não configurada: defina ANTHROPIC_API_KEY no .env do backend.',
      );
    }

    let response;
    try {
      response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: 'user', content: buildPrompt(input) }],
      });
    } catch (error) {
      if (error instanceof APIError && (error.status === 529 || error.status === 429 || error.status === 503)) {
        this.logger.warn(`IA sobrecarregada (status ${error.status}) ao gerar relatório de campo: ${error.message}`);
        throw new ServiceUnavailableException(
          'A IA de geração de relatório está temporariamente sobrecarregada. Tente novamente em alguns minutos.',
        );
      }
      throw error;
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text' || !textBlock.text.trim()) {
      this.logger.error('A IA não retornou texto para o relatório de campo.');
      throw new ServiceUnavailableException('A IA não retornou texto para o relatório de campo.');
    }

    return textBlock.text.trim();
  }
}
