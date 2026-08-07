import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustodyExtractedData, CustodyTemplateSchema } from '@portal-alvim/shared';
import { PrismaService } from '../../../../prisma/prisma.service';
import { buildCustodyDocumentPdfBuffer } from '../custody-extraction-pdf.util';
import { mergePdfBuffers } from '../../../../common/utils/merge-pdf.util';

// Cadeias de custódia TOTALMENTE em branco (sem nenhum dado da coleta,
// nem número de relatório nem data — só os campos fixos do modelo, ex.:
// Metodologia) pra levar a campo já impressas — o agendamento já diz quais
// compostos serão coletados e QUANTAS amostras de cada (campo "Qtd.
// amostras" por ponto+composto, ver ScheduleSamplingPointCompound.quantity),
// então a quantidade de cópias por composto já é conhecida, sem precisar
// perguntar nada antes de gerar. Uma cadeia física por amostra — se o
// serviço tem 2 amostras de Siloxanos (num ponto só ou somadas entre
// pontos), saem 2 cópias em branco desse composto, não 1.
@Injectable()
export class DownloadBlankCustodyChainsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(scheduleId: string): Promise<{ buffer: Buffer; filename: string }> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        client: true,
        samplingPoints: {
          include: {
            compounds: {
              include: { compound: { include: { custodyFieldTemplate: true } } },
            },
          },
        },
      },
    });
    if (!schedule) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    // Um composto pode aparecer em vários pontos da mesma visita — soma a
    // quantidade de todos os pontos onde ele aparece (2 amostras no Ponto A
    // + 1 no Ponto B = 3 cadeias desse composto, não 2 nem 1).
    const quantityByCompound = new Map<
      string,
      { name: string; schema: CustodyTemplateSchema; quantity: number }
    >();
    schedule.samplingPoints.forEach((point) => {
      point.compounds.forEach((pointCompound) => {
        const template = pointCompound.compound.custodyFieldTemplate;
        if (!template) return;
        const existing = quantityByCompound.get(pointCompound.compoundId);
        if (existing) {
          existing.quantity += pointCompound.quantity;
          return;
        }
        quantityByCompound.set(pointCompound.compoundId, {
          name: pointCompound.compound.name,
          schema: template.fields as unknown as CustodyTemplateSchema,
          quantity: pointCompound.quantity,
        });
      });
    });

    if (quantityByCompound.size === 0) {
      throw new BadRequestException(
        'Nenhum composto deste agendamento tem modelo de cadeia de custódia cadastrado.',
      );
    }

    const buffers: Buffer[] = [];
    quantityByCompound.forEach(({ name, schema, quantity }) => {
      const blankData: CustodyExtractedData = { fields: {}, table: {} };
      // Campos fixos do modelo (ex.: Metodologia, Procedimento Interno)
      // aparecem mesmo em branco — são texto impresso no formulário oficial,
      // não algo preenchido a mão na coleta (ver ApproveCustodyExtractionUseCase,
      // mesma regra usada lá).
      schema.fields.forEach((field) => {
        if (field.fixedValue !== undefined) {
          blankData.fields[field.key] = { value: field.fixedValue, confidence: 1 };
        }
      });
      // Gera o PDF uma vez só e repete o mesmo buffer `quantity` vezes — as
      // cópias são idênticas (tudo em branco), não há motivo pra regerar.
      const buffer = buildCustodyDocumentPdfBuffer(name, schema, blankData);
      for (let i = 0; i < quantity; i++) {
        buffers.push(buffer);
      }
    });

    const merged = buffers.length === 1 ? buffers[0] : await mergePdfBuffers(buffers);
    return {
      buffer: merged,
      filename: `cadeias-custodia-em-branco-${schedule.client.companyName}.pdf`,
    };
  }
}
