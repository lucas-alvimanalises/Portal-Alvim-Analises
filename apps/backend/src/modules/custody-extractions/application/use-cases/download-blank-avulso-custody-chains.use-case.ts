import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CUSTODY_BLANK_AVULSO_MAX_COPIES,
  CustodyExtractedData,
  CustodyTemplateSchema,
} from '@portal-alvim/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildCustodyDocumentPdfBuffer } from '../custody-extraction-pdf.util';
import { mergePdfBuffers } from '../../../../common/utils/merge-pdf.util';

export interface BlankAvulsoItem {
  compoundId: string;
  quantity: number;
}

// Cadeias de custódia TOTALMENTE em branco pra impressão avulsa — sem
// vínculo com nenhum agendamento, a quantidade de cada composto vem do
// painel "Imprimir Cadeias de Custódia Avulso". É a versão sem agenda do
// DownloadBlankCustodyChainsUseCase: mesma geração de branco (só os campos
// fixos do modelo, ex.: Metodologia), só que o N vem do usuário.
@Injectable()
export class DownloadBlankAvulsoCustodyChainsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(items: BlankAvulsoItem[]): Promise<{ buffer: Buffer; filename: string }> {
    const wanted = items.filter((item) => item.quantity > 0);
    if (wanted.length === 0) {
      throw new BadRequestException('Escolha a quantidade de pelo menos um modelo.');
    }

    const totalCopies = wanted.reduce((sum, item) => sum + item.quantity, 0);
    if (totalCopies > CUSTODY_BLANK_AVULSO_MAX_COPIES) {
      throw new BadRequestException(
        `Máximo de ${CUSTODY_BLANK_AVULSO_MAX_COPIES} cópias por PDF (pedido: ${totalCopies}). Gere em lotes menores.`,
      );
    }

    const templates = await this.prisma.custodyFieldTemplate.findMany({
      where: { compoundId: { in: wanted.map((item) => item.compoundId) } },
      include: { compound: { select: { id: true, code: true, name: true } } },
      orderBy: { compound: { code: 'asc' } },
    });
    const templateByCompoundId = new Map(templates.map((t) => [t.compoundId, t]));

    const missing = wanted.filter((item) => !templateByCompoundId.has(item.compoundId));
    if (missing.length > 0) {
      throw new BadRequestException('Um dos modelos escolhidos não existe mais.');
    }

    const quantityByCompoundId = new Map(wanted.map((item) => [item.compoundId, item.quantity]));

    const buffers: Buffer[] = [];
    // Ordem do PDF: por código do composto (todas as cópias de Siloxanos
    // juntas, depois VOCs, ...).
    for (const template of templates) {
      const schema = template.fields as unknown as CustodyTemplateSchema;
      const blankData: CustodyExtractedData = { fields: {}, table: {} };
      // Campos fixos do modelo (Metodologia, Procedimento Interno, ...) são
      // texto impresso do formulário oficial, aparecem mesmo em branco —
      // mesma regra do DownloadBlankCustodyChainsUseCase / da aprovação.
      schema.fields.forEach((field) => {
        if (field.fixedValue !== undefined) {
          blankData.fields[field.key] = { value: field.fixedValue, confidence: 1 };
        }
      });
      // Gera uma vez e repete o mesmo buffer — as cópias são idênticas.
      const buffer = buildCustodyDocumentPdfBuffer(template.compound.name, schema, blankData);
      const quantity = quantityByCompoundId.get(template.compoundId) ?? 0;
      for (let i = 0; i < quantity; i++) {
        buffers.push(buffer);
      }
    }

    const merged = buffers.length === 1 ? buffers[0] : await mergePdfBuffers(buffers);
    return { buffer: merged, filename: 'cadeias-custodia-avulso.pdf' };
  }
}
