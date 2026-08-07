import { Injectable } from '@nestjs/common';
import { PendingCertificateDto } from '@portal-alvim/shared';
import { PrismaService } from '../../../../prisma/prisma.service';

// Consulta prisma direto (mesmo motivo de SampleCompletionService/
// ScheduleDerivedStatusService: junta Sample com Schedule/Client/
// ServiceType/SamplingPoint/Compound, além do escopo do SampleRepository) —
// tela é ADMIN/MANAGER/TECHNICIAN, sem escopo de cliente (mesmo critério de
// "Cadeia de Custódia").
//
// "Pendente" aqui é "nenhum Certificate anexado ainda" — deliberadamente
// diferente de Sample.analysisStatus === PENDING (que também fica PENDING
// só por falta de cadeia de custódia aprovada, mesmo já tendo certificado —
// não faz sentido essa amostra aparecer numa lista de "anexar certificado").
// Compostos de serviços com requiresCertificate=false (ex.: "Coleta de
// amostras") nunca entram — a Alvim não deve nada de certificado nesses
// casos (mesma regra de SampleCompletionService.maybeComplete).
@Injectable()
export class ListPendingCertificatesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<PendingCertificateDto[]> {
    const samples = await this.prisma.sample.findMany({
      where: {
        active: true,
        compoundId: { not: null },
        certificates: { none: {} },
        schedule: { serviceType: { requiresCertificate: true } },
      },
      select: {
        id: true,
        samplingPoint: { select: { name: true } },
        compound: { select: { code: true, name: true } },
        schedule: {
          select: {
            id: true,
            scheduledDate: true,
            client: { select: { companyName: true } },
            serviceType: { select: { name: true } },
            technicians: { select: { technician: { select: { name: true } } } },
          },
        },
      },
      orderBy: { schedule: { scheduledDate: 'asc' } },
    });

    return samples.map((sample) => ({
      sampleId: sample.id,
      scheduleId: sample.schedule.id,
      serviceDate: sample.schedule.scheduledDate.toISOString(),
      clientName: sample.schedule.client.companyName,
      serviceTypeName: sample.schedule.serviceType.name,
      samplingPointName: sample.samplingPoint?.name ?? '-',
      compoundLabel: sample.compound ? `${sample.compound.code} - ${sample.compound.name}` : '-',
      hasCompound: !!sample.compound,
      technicianNames: sample.schedule.technicians.map((t) => t.technician.name),
    }));
  }
}
