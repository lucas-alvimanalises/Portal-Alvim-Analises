import { Injectable } from '@nestjs/common';
import { ScheduleDerivedStatus } from '@portal-alvim/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { isScheduleRealized } from '../../../common/utils/schedule-date.util';

interface ScheduleForStatus {
  id: string;
  status: string;
  dateConfirmed: boolean;
  scheduledDate: Date;
}

// Calcula o status "de verdade" mostrado em Agendamento/Realizados a partir
// dos dados reais (não é um campo salvo no banco). Consulta o Prisma direto
// em vez de injetar SamplesModule/CertificatesModule/CustodyExtractionsModule
// pra evitar dependência circular (essas módulos já importam SchedulesModule
// — ver samples.module.ts) — PrismaService é @Global(), então dá pra ler
// direto sem passar pelas fronteiras de módulo pra essa consulta agregada,
// só-leitura, entre módulos.
@Injectable()
export class ScheduleDerivedStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async computeOne(schedule: ScheduleForStatus): Promise<ScheduleDerivedStatus> {
    const result = await this.computeMany([schedule]);
    return result[schedule.id];
  }

  async computeMany(schedules: ScheduleForStatus[]): Promise<Record<string, ScheduleDerivedStatus>> {
    const result: Record<string, ScheduleDerivedStatus> = {};
    const realizedIds: string[] = [];

    for (const schedule of schedules) {
      if (schedule.status === 'CANCELLED') {
        result[schedule.id] = 'CANCELADO';
        continue;
      }
      if (!isScheduleRealized(schedule)) {
        result[schedule.id] = schedule.dateConfirmed ? 'AGENDADO' : 'PROGRAMADO';
        continue;
      }
      realizedIds.push(schedule.id);
    }

    if (realizedIds.length === 0) {
      return result;
    }

    // Só compostos com modelo de cadeia de custódia cadastrado E marcados
    // como custodyRequired exigem uma cadeia aprovada pra "Aguardando
    // Informações" liberar — os demais pulam direto pra checar certificado.
    // Compostos Sulfurados fica de fora por enquanto: nunca teve cadeia de
    // custódia digitalizada antes desta plataforma (confirmado com o
    // usuário — vira obrigatório quando o portal for lançado oficialmente).
    const templates = await this.prisma.custodyFieldTemplate.findMany({
      where: { custodyRequired: true },
      select: { compoundId: true },
    });
    const compoundIdsNeedingCustody = new Set(templates.map((t) => t.compoundId));

    const samples = await this.prisma.sample.findMany({
      where: { scheduleId: { in: realizedIds }, active: true },
      select: { id: true, scheduleId: true, compoundId: true },
    });
    const sampleIds = samples.map((s) => s.id);

    const extractions = sampleIds.length
      ? await this.prisma.custodyExtraction.findMany({
          where: { sampleId: { in: sampleIds } },
          select: { sampleId: true, status: true },
        })
      : [];
    const sampleIdsWithApprovedCustody = new Set(
      extractions.filter((e) => e.status === 'APPROVED').map((e) => e.sampleId),
    );

    const certificates = sampleIds.length
      ? await this.prisma.certificate.findMany({
          where: { sampleId: { in: sampleIds } },
          select: { sampleId: true },
        })
      : [];
    const sampleIdsWithCertificate = new Set(certificates.map((c) => c.sampleId));

    // Tipos de serviço com requiresCertificate: false (ex.: "Coleta de
    // amostras" — cliente contrata só a coleta em campo, não a consultoria/
    // análise laboratorial, confirmado com o usuário) pulam a checagem de
    // certificado e vão direto pra Concluído assim que a cadeia de custódia
    // estiver ok.
    const schedulesWithServiceType = await this.prisma.schedule.findMany({
      where: { id: { in: realizedIds } },
      select: { id: true, serviceType: { select: { requiresCertificate: true } } },
    });
    const scheduleIdsNotRequiringCertificate = new Set(
      schedulesWithServiceType.filter((s) => !s.serviceType.requiresCertificate).map((s) => s.id),
    );

    const samplesByScheduleId = new Map<string, typeof samples>();
    samples.forEach((sample) => {
      const list = samplesByScheduleId.get(sample.scheduleId) ?? [];
      list.push(sample);
      samplesByScheduleId.set(sample.scheduleId, list);
    });

    for (const id of realizedIds) {
      const scheduleSamples = samplesByScheduleId.get(id) ?? [];
      if (scheduleSamples.length === 0) {
        // Nenhuma amostra lançada ainda — falta informação por definição.
        result[id] = 'AGUARDANDO_INFORMACOES';
        continue;
      }

      const needingCustody = scheduleSamples.filter(
        (s) => s.compoundId && compoundIdsNeedingCustody.has(s.compoundId),
      );
      const allCustodyDone = needingCustody.every((s) => sampleIdsWithApprovedCustody.has(s.id));
      if (!allCustodyDone) {
        result[id] = 'AGUARDANDO_INFORMACOES';
        continue;
      }

      const allCertificatesDone =
        scheduleIdsNotRequiringCertificate.has(id) ||
        scheduleSamples.every((s) => sampleIdsWithCertificate.has(s.id));
      result[id] = allCertificatesDone ? 'CONCLUIDO' : 'AGUARDANDO_CERTIFICADOS';
    }

    return result;
  }
}
