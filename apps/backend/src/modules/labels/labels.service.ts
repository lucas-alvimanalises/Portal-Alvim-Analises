import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PreviewLabelsResponse, PrintedLabelDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';

// Cada amostra (frasco) imprime 3 etiquetas de número sequencial — o
// Siloxanos ainda soma +1 etiqueta em branco por cima dessas 3, mas isso é
// só decisão de exibição da página de impressão (ver
// ImprimirEtiquetasPage), não gera PrintedLabel (a etiqueta em branco não
// tem número pra guardar/nunca-repetir).
const LABELS_PER_SAMPLE = 3;

interface Slot {
  samplingPointId: string;
  samplingPointName: string;
  bottleIndex: number;
  labelIndex: number;
}

interface ExistingLabel {
  number: number;
  createdAt: Date;
}

interface LabelContext {
  scheduleId: string;
  compoundId: string;
  compoundCode: string;
  compoundName: string;
  clientName: string;
  scheduledDate: string;
  slots: Slot[];
  existingByKey: Map<string, ExistingLabel>;
}

function slotKey(samplingPointId: string, bottleIndex: number, labelIndex: number): string {
  return `${samplingPointId}-${bottleIndex}-${labelIndex}`;
}

// Etiquetas físicas (impressora Zebra ZD-220, 100x40mm, USB — sem impressão
// em rede) pra Siloxanos e Compostos Sulfurados (Enxofre): número + código
// de barras, sem mais nada (ver foto de referência do usuário). Um registro
// por etiqueta numerada (samplingPointId + bottleIndex 1..quantity ×
// labelIndex 1..3).
//
// Importante: abrir/pré-visualizar a página NUNCA reserva número nenhum —
// só a confirmação de impressão (botão "Imprimir") consome a sequência e
// grava no banco. Reabrir um serviço já impresso sempre mostra os mesmos
// números (idempotente); reabrir um ainda não impresso mostra uma prévia
// calculada em memória a partir do último número já usado, sem gravar nada.
//
// PrintedLabel referencia scheduleId+samplingPointId direto (não o id
// efêmero de ScheduleSamplingPointCompound, que é apagado e recriado a cada
// "Salvar alterações" no agendamento — ver PrismaScheduleRepository.update)
// justamente pra sobreviver a edições do agendamento sem perder o registro
// do que já foi impresso de verdade.
@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadContext(scheduleId: string, compoundId: string): Promise<LabelContext> {
    const compound = await this.prisma.compound.findUnique({ where: { id: compoundId } });
    if (!compound) {
      throw new NotFoundException('Composto não encontrado.');
    }

    const pointCompounds = await this.prisma.scheduleSamplingPointCompound.findMany({
      where: { compoundId, scheduleSamplingPoint: { scheduleId } },
      include: {
        scheduleSamplingPoint: {
          include: {
            samplingPoint: true,
            schedule: { include: { client: true } },
          },
        },
      },
    });

    if (pointCompounds.length === 0) {
      throw new BadRequestException('Este composto não faz parte deste agendamento.');
    }

    const existingLabels = await this.prisma.printedLabel.findMany({
      where: { scheduleId, compoundId },
    });
    const existingByKey = new Map<string, ExistingLabel>(
      existingLabels.map((label) => [
        slotKey(label.samplingPointId, label.bottleIndex, label.labelIndex),
        { number: label.number, createdAt: label.createdAt },
      ]),
    );

    const slots: Slot[] = [];
    let clientName = '';
    let scheduledDate = '';

    pointCompounds.forEach((pointCompound) => {
      clientName = pointCompound.scheduleSamplingPoint.schedule.client.companyName;
      scheduledDate = pointCompound.scheduleSamplingPoint.schedule.scheduledDate.toISOString();
      const samplingPointId = pointCompound.scheduleSamplingPoint.samplingPointId;
      const samplingPointName = pointCompound.scheduleSamplingPoint.samplingPoint.name;

      for (let bottleIndex = 1; bottleIndex <= pointCompound.quantity; bottleIndex++) {
        for (let labelIndex = 1; labelIndex <= LABELS_PER_SAMPLE; labelIndex++) {
          slots.push({ samplingPointId, samplingPointName, bottleIndex, labelIndex });
        }
      }
    });

    return {
      scheduleId,
      compoundId: compound.id,
      compoundCode: compound.code,
      compoundName: compound.name,
      clientName,
      scheduledDate,
      slots,
      existingByKey,
    };
  }

  private toDto(ctx: LabelContext, slot: Slot, number: number, createdAt: Date | null): PrintedLabelDto {
    return {
      id: slotKey(slot.samplingPointId, slot.bottleIndex, slot.labelIndex),
      number,
      bottleIndex: slot.bottleIndex,
      labelIndex: slot.labelIndex,
      compoundId: ctx.compoundId,
      compoundCode: ctx.compoundCode,
      compoundName: ctx.compoundName,
      samplingPointName: slot.samplingPointName,
      clientName: ctx.clientName,
      scheduledDate: ctx.scheduledDate,
      createdAt: createdAt ? createdAt.toISOString() : null,
    };
  }

  private sortDtos(labels: PrintedLabelDto[]): PrintedLabelDto[] {
    return labels.sort(
      (a, b) =>
        a.samplingPointName.localeCompare(b.samplingPointName) ||
        a.bottleIndex - b.bottleIndex ||
        a.labelIndex - b.labelIndex,
    );
  }

  // Só leitura — nunca grava nada. Etiquetas já impressas voltam com o
  // número real (idempotente); as que faltam voltam com um número "de
  // mentira" calculado a partir do último número já usado, só pra
  // visualização (ver confirmPrint pra quando isso vira de verdade).
  async previewLabels(scheduleId: string, compoundId: string): Promise<PreviewLabelsResponse> {
    const ctx = await this.loadContext(scheduleId, compoundId);
    const missing = ctx.slots.filter(
      (slot) => !ctx.existingByKey.has(slotKey(slot.samplingPointId, slot.bottleIndex, slot.labelIndex)),
    );

    let previewBase = 0;
    if (missing.length > 0) {
      const sequence = await this.prisma.labelSequence.findUnique({ where: { compoundId } });
      previewBase = sequence?.lastNumber ?? 0;
    }

    let previewOffset = 0;
    const labels = ctx.slots.map((slot) => {
      const existing = ctx.existingByKey.get(slotKey(slot.samplingPointId, slot.bottleIndex, slot.labelIndex));
      if (existing) return this.toDto(ctx, slot, existing.number, existing.createdAt);
      previewOffset += 1;
      return this.toDto(ctx, slot, previewBase + previewOffset, null);
    });

    return { labels: this.sortDtos(labels), confirmed: missing.length === 0 };
  }

  // Só roda quando o usuário efetivamente clica em "Imprimir" — reserva
  // (incrementa a sequência UMA vez pro lote inteiro) e grava só as
  // etiquetas que ainda não existem; as que já foram impressas antes (ex.:
  // reimpressão, ou topping-up depois de editar o agendamento e adicionar
  // mais pontos) são mantidas como estão, nunca reatribuídas.
  async confirmPrint(scheduleId: string, compoundId: string, userId: string): Promise<PrintedLabelDto[]> {
    const ctx = await this.loadContext(scheduleId, compoundId);
    const missing = ctx.slots.filter(
      (slot) => !ctx.existingByKey.has(slotKey(slot.samplingPointId, slot.bottleIndex, slot.labelIndex)),
    );

    if (missing.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        const sequence = await tx.labelSequence.upsert({
          where: { compoundId },
          update: { lastNumber: { increment: missing.length } },
          create: { compoundId, lastNumber: missing.length },
          select: { lastNumber: true },
        });
        const baseNumber = sequence.lastNumber - missing.length;
        // skipDuplicates: defesa contra duas confirmações concorrentes do
        // mesmo lote (ex.: duplo-clique ou duas abas) — a sequência já foi
        // consumida por quem chegou primeiro, a segunda só ignora as linhas
        // que colidirem em vez de estourar erro; nenhum número é reaproveitado.
        await tx.printedLabel.createMany({
          data: missing.map((slot, index) => ({
            scheduleId,
            samplingPointId: slot.samplingPointId,
            bottleIndex: slot.bottleIndex,
            labelIndex: slot.labelIndex,
            number: baseNumber + index + 1,
            compoundId,
            printedById: userId,
          })),
          skipDuplicates: true,
        });
      });
    }

    // Recarrega do banco pra devolver o estado real e definitivo (cobre o
    // caso raro de corrida acima, onde algumas linhas podem ter sido
    // puladas por já existirem).
    const refreshed = await this.loadContext(scheduleId, compoundId);
    const labels = refreshed.slots.map((slot) => {
      const existing = refreshed.existingByKey.get(
        slotKey(slot.samplingPointId, slot.bottleIndex, slot.labelIndex),
      );
      if (!existing) {
        // Não deveria acontecer — só se outra confirmação concorrente
        // também estiver rodando neste exato instante.
        throw new BadRequestException('Não foi possível confirmar todas as etiquetas, tente novamente.');
      }
      return this.toDto(refreshed, slot, existing.number, existing.createdAt);
    });

    return this.sortDtos(labels);
  }
}
