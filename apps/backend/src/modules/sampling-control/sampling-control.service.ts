import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CustodyExtractedData,
  ListSamplingControlParams,
  SamplingControlRecordDto,
  UpdateSamplingControlRecordPayload,
} from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toSamplingControlRecordDto } from './sampling-control.mapper';

// Chave do campo "Bomba de amostragem nº" — igual em todos os modelos de
// cadeia de custódia (ver SILOXANOS_CUSTODY_TEMPLATE e os demais em
// prisma/seed.ts).
const PUMP_FIELD_KEY = 'bombaAmostragemN';

// Nome dos PDFs de cadeia gerados pelo portal: "{número}_{aa} - ...". Mesma
// regra de ApproveCustodyExtractionUseCase.reportNumberFromFilename —
// duplicada aqui de propósito pra não acoplar os dois módulos por causa de
// um regex de duas linhas. Cadeias anexadas prontas (AttachExisting) usam o
// nome de arquivo original, que normalmente não bate nesse padrão — nesses
// casos o nº de relatório fica em branco (condiz com a realidade: era um
// backlog sem numeração interna do portal).
function reportNumberFromFilename(filename: string): string | null {
  const match = /^(\d+)_(\d{2})\s*-/.exec(filename);
  return match ? `${match[1]}/${match[2]}` : null;
}

// Alimenta a "Tabela de Controle de Amostras" (planilha mestre da Alvim).
// Linhas do portal são gravadas aqui na aprovação da cadeia de custódia;
// linhas do histórico pré-portal entram uma única vez pelo
// scripts/import-sampling-control-legacy.ts. Consulta o Prisma direto (não
// injeta CustodyExtractionsModule/SamplesModule) pelo mesmo motivo do
// SampleCompletionService: evitar dependência circular entre módulos que já
// importam este aqui.
@Injectable()
export class SamplingControlService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListSamplingControlParams): Promise<SamplingControlRecordDto[]> {
    const where: Prisma.SamplingControlRecordWhereInput = {};

    if (params.startDate || params.endDate) {
      const range: Prisma.DateTimeFilter = {};
      if (params.startDate) range.gte = new Date(`${params.startDate}T00:00:00Z`);
      if (params.endDate) range.lte = new Date(`${params.endDate}T23:59:59Z`);
      where.serviceDate = range;
    }
    if (params.clientId) where.clientId = params.clientId;
    if (params.compoundName) where.compoundName = params.compoundName;
    if (params.source) where.source = params.source;
    if (params.search?.trim()) {
      const search = params.search.trim();
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { fieldReportNumber: { contains: search, mode: 'insensitive' } },
        { sampleIdentification: { contains: search, mode: 'insensitive' } },
        { samplingPointName: { contains: search, mode: 'insensitive' } },
        { pump: { contains: search, mode: 'insensitive' } },
        { billingResponsible: { contains: search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.samplingControlRecord.findMany({
      where,
      // Mesma ordem da planilha: mais recente primeiro, e dentro do mesmo
      // dia agrupado por nº de relatório (a sequência do composto).
      orderBy: [{ serviceDate: 'desc' }, { fieldReportNumber: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toSamplingControlRecordDto);
  }

  async updateRecord(
    id: string,
    payload: UpdateSamplingControlRecordPayload,
  ): Promise<SamplingControlRecordDto> {
    const existing = await this.prisma.samplingControlRecord.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Linha não encontrada.');
    }
    const billingResponsible = payload.billingResponsible?.trim() || null;
    const row = await this.prisma.samplingControlRecord.update({
      where: { id },
      data: { billingResponsible },
    });
    return toSamplingControlRecordDto(row);
  }

  // Chamado na aprovação da cadeia de custódia (ApproveCustodyExtraction e
  // AttachExistingCustodyDocument). Idempotente: upsert pela cadeia, então
  // regerar a cadeia atualiza a mesma linha. `billingResponsible` NUNCA é
  // tocado aqui — é o único campo manual da tela.
  async syncFromCustodyExtraction(extractionId: string): Promise<void> {
    const extraction = await this.prisma.custodyExtraction.findUnique({
      where: { id: extractionId },
      include: {
        generatedDocument: { include: { file: { select: { filename: true } } } },
        sample: {
          include: {
            client: { select: { companyName: true } },
            compound: { select: { name: true } },
            samplingPoint: { select: { name: true } },
          },
        },
      },
    });

    // "Somente cadeias de custódia completas": aprovada + documento oficial
    // gerado. Qualquer outro estado não vira linha.
    if (!extraction || extraction.status !== 'APPROVED' || !extraction.generatedDocument) {
      await this.removeForCustodyExtraction(extractionId);
      return;
    }
    const sample = extraction.sample;
    if (!sample) return;

    const reviewed = (extraction.correctedData ?? extraction.extractedData) as
      | CustodyExtractedData
      | null;
    const pump = reviewed?.fields?.[PUMP_FIELD_KEY]?.value?.trim() || null;
    const fieldReportNumber = reportNumberFromFilename(extraction.generatedDocument.file.filename);

    const data = {
      serviceDate: sample.collectionDate,
      clientName: sample.client?.companyName ?? '—',
      clientId: sample.clientId,
      compoundName: sample.compound?.name ?? '—',
      sampleIdentification: sample.sampleCode?.trim() || null,
      fieldReportNumber,
      pump,
      samplingPointName: sample.samplingPoint?.name ?? null,
      observation: sample.notes?.trim() || null,
      source: 'PORTAL' as const,
      sampleId: sample.id,
    };

    await this.prisma.samplingControlRecord.upsert({
      where: { custodyExtractionId: extractionId },
      create: { ...data, custodyExtractionId: extractionId },
      update: data,
    });

    // Portal ganha da planilha: se o import trouxe uma linha legada com o
    // mesmo nº de relatório (transição jan–jul/2026, adoção parcial),
    // remove — a versão do portal é a fonte da verdade.
    if (fieldReportNumber) {
      await this.prisma.samplingControlRecord.deleteMany({
        where: { fieldReportNumber, source: 'LEGACY_IMPORT' },
      });
    }
  }

  // Cadeia refeita/apagada (DeleteCustodyExtraction) — a amostragem deixa de
  // existir no registro do portal.
  async removeForCustodyExtraction(extractionId: string): Promise<void> {
    await this.prisma.samplingControlRecord.deleteMany({
      where: { custodyExtractionId: extractionId },
    });
  }
}
