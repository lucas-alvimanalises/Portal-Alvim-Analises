import { Inject, Injectable } from '@nestjs/common';
import { AnalysisStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SAMPLE_REPOSITORY, SampleRepository } from '../domain/sample.repository';

// Marca a amostra como "Concluída" (Sample.analysisStatus) assim que tudo
// que ela precisa estiver pronto: cadeia de custódia aprovada (só pros
// compostos que exigem uma — ver CustodyFieldTemplate, mesma checagem do
// ScheduleDerivedStatusService) e certificado anexado (só pros tipos de
// serviço que exigem certificado — ver ServiceType.requiresCertificate;
// "Coleta de amostras" não exige, o cliente contratou só a coleta em campo,
// não a análise laboratorial — confirmado com o usuário. Certificado
// continua podendo ser anexado manualmente depois se a Alvim tiver acesso a
// ele, só não bloqueia mais a conclusão). Chamado depois de aprovar uma
// cadeia de custódia OU de criar um certificado — qualquer um dos dois pode
// ser "o último passo que faltava" (confirmado com o usuário). Consulta o
// Prisma direto em vez de injetar CustodyExtractionsModule/
// CertificatesModule/SchedulesModule pelo mesmo motivo do
// ScheduleDerivedStatusService: evitar dependência circular entre módulos
// que já importam SamplesModule.
@Injectable()
export class SampleCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
  ) {}

  async maybeComplete(sampleId: string): Promise<void> {
    const sample = await this.sampleRepository.findById(sampleId);
    if (!sample || sample.analysisStatus === AnalysisStatus.COMPLETED) return;
    if (!sample.compoundId) return;

    const template = await this.prisma.custodyFieldTemplate.findUnique({
      where: { compoundId: sample.compoundId },
      select: { id: true, custodyRequired: true },
    });
    if (template?.custodyRequired) {
      const approvedCustody = await this.prisma.custodyExtraction.findFirst({
        where: { sampleId, status: 'APPROVED' },
        select: { id: true },
      });
      if (!approvedCustody) return;
    }

    const schedule = await this.prisma.schedule.findUnique({
      where: { id: sample.scheduleId },
      select: { serviceType: { select: { requiresCertificate: true } } },
    });
    if (schedule?.serviceType.requiresCertificate ?? true) {
      const certificate = await this.prisma.certificate.findFirst({
        where: { sampleId },
        select: { id: true },
      });
      if (!certificate) return;
    }

    await this.sampleRepository.update(sampleId, { analysisStatus: AnalysisStatus.COMPLETED });
  }
}
