import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CLIENT_DERIVED_CUSTODY_FIELD_KEYS, CustodyExtractedData, CustodyTemplateSchema } from '@portal-alvim/shared';
import { AppConfig } from '../../../config/configuration';

export interface ScanFile {
  buffer: Buffer;
  mimeType: string;
}

const MODEL = 'claude-sonnet-5';

function buildPrompt(schema: CustodyTemplateSchema): string {
  // Campos fixos (Metodologia, Procedimento Interno, ...), o número de
  // relatório (atribuído pelo backend na aprovação) e Empresa/Endereço (já
  // conhecidos pelo agendamento — ver buildClientDerivedFields) não são
  // perguntados à IA — já têm valor certo sem depender de leitura de imagem.
  const readableFields = schema.fields.filter(
    (field) =>
      field.fixedValue === undefined &&
      !field.systemGenerated &&
      !(CLIENT_DERIVED_CUSTODY_FIELD_KEYS as readonly string[]).includes(field.key),
  );
  const fieldList = readableFields
    .map((field) => `- "${field.key}": ${field.label}${field.required ? ' (obrigatório)' : ''}`)
    .join('\n');
  const tableDescription = `Tabela com colunas [${schema.table.columns.join(', ')}] e linhas:\n${schema.table.rows
    .map((row) => `- "${row.key}": ${row.label}`)
    .join('\n')}`;

  return `Você está lendo uma "Cadeia de Custódia" preenchida à mão em campo por um técnico de coleta de amostras ambientais. A imagem/PDF anexado é o formulário escaneado.

Extraia os seguintes campos (todos manuscritos, em português):
${fieldList}

Além dos campos acima, extraia a tabela de amostragem:
${tableDescription}

Responda APENAS com um JSON válido (sem markdown, sem texto extra, sem \`\`\`), exatamente neste formato:
{
  "fields": { "<chave_do_campo>": { "value": "<texto lido>", "confidence": <0 a 1> }, ... },
  "table": { "<coluna>": { "<chave_da_linha>": { "value": "<texto lido>", "confidence": <0 a 1> }, ... }, ... }
}

Regras:
- Use exatamente as chaves fornecidas acima (não traduza nem invente novas chaves).
- Se um campo estiver ilegível ou em branco no formulário, retorne "value": "" e "confidence": 0 — NUNCA invente um valor.
- "confidence" reflete o quanto você tem certeza da leitura da letra manuscrita (1 = muito legível, 0 = ilegível/ausente).
- Preencha TODAS as chaves de campos e todas as combinações coluna×linha da tabela, mesmo que vazias.`;
}

function toBase64Source(file: ScanFile) {
  const data = file.buffer.toString('base64');
  if (file.mimeType === 'application/pdf') {
    return { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data } };
  }
  const media_type = file.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  return { type: 'image' as const, source: { type: 'base64' as const, media_type, data } };
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

// Leitura de cadeia de custódia manuscrita via Claude Vision — manda a
// foto/PDF escaneado + a lista de campos esperados (do CustodyFieldTemplate
// do composto) e pede de volta um JSON estrito com valor + confiança por
// campo. Sem ANTHROPIC_API_KEY configurada, falha com erro claro em vez de
// tentar chamar a API sem credencial (mesmo padrão do MailService).
@Injectable()
export class ClaudeOcrService {
  private readonly logger = new Logger(ClaudeOcrService.name);
  private readonly client: Anthropic | null;

  constructor(configService: ConfigService) {
    const appConfig = configService.get<AppConfig>('app')!;
    this.client = appConfig.anthropicApiKey ? new Anthropic({ apiKey: appConfig.anthropicApiKey }) : null;
  }

  async extractCustodyForm(file: ScanFile, schema: CustodyTemplateSchema): Promise<CustodyExtractedData> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Leitura por IA não configurada: defina ANTHROPIC_API_KEY no .env do backend.',
      );
    }

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [toBase64Source(file), { type: 'text', text: buildPrompt(schema) }],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new ServiceUnavailableException('A IA não retornou texto na resposta.');
    }

    try {
      const parsed = JSON.parse(stripCodeFence(textBlock.text)) as CustodyExtractedData;
      if (!parsed.fields || !parsed.table) {
        throw new Error('JSON sem "fields"/"table".');
      }
      return parsed;
    } catch (error) {
      this.logger.error(`Falha ao interpretar resposta da IA: ${error}`);
      throw new ServiceUnavailableException('A IA retornou um formato inesperado. Tente novamente.');
    }
  }
}
