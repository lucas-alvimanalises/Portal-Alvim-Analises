import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, CertificateAnalyteConfig, CertificateExtractedData } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository, ResultRowData } from '../../../samples/domain/sample.repository';
import { SampleCompletionService } from '../../../samples/application/sample-completion.service';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CERTIFICATE_REPOSITORY,
  CertificateRepository,
} from '../../../certificates/domain/certificate.repository';
import {
  CERTIFICATE_EXTRACTION_REPOSITORY,
  CertificateExtractionRepository,
} from '../../domain/certificate-extraction.repository';
import { computeCompliance, formatRegulatoryLimit, isZeroResult } from '../certificate-compliance.util';
import { assertNoExistingCertificate } from '../../../certificates/application/assert-no-existing-certificate.util';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

function parseRequiredDate(value: string, fieldLabel: string): Date {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Preencha "${fieldLabel}" antes de aprovar — a IA não conseguiu ler esse campo.`);
  }
  return parsed;
}

function parseRequiredText(value: string, fieldLabel: string): string {
  if (!value?.trim()) {
    throw new BadRequestException(`Preencha "${fieldLabel}" antes de aprovar — a IA não conseguiu ler esse campo.`);
  }
  return value.trim();
}

@Injectable()
export class ApproveCertificateExtractionUseCase {
  constructor(
    @Inject(CERTIFICATE_EXTRACTION_REPOSITORY)
    private readonly certificateExtractionRepository: CertificateExtractionRepository,
    @Inject(CERTIFICATE_REPOSITORY)
    private readonly certificateRepository: CertificateRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    private readonly sampleCompletionService: SampleCompletionService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.certificateExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    assertOwnership(user, { clientId: extraction.sample.clientId });

    if (extraction.status === 'APPROVED') {
      throw new BadRequestException('Esta extração já foi aprovada.');
    }
    if (extraction.status !== 'NEEDS_REVIEW') {
      throw new BadRequestException('Esta extração ainda não está pronta pra aprovação.');
    }

    const reviewedData = (extraction.correctedData ??
      extraction.extractedData) as unknown as CertificateExtractedData | null;
    if (!reviewedData) {
      throw new BadRequestException('Nenhum dado extraído pra gerar o certificado.');
    }

    const sample = await this.sampleRepository.findById(extraction.sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }

    // Checagem de novo aqui (defesa em profundidade): a checagem em
    // UploadCertificateScanUseCase acontece no upload, então um certificado
    // manual criado nesse meio-tempo (upload → revisão → aprovação) ainda
    // não teria sido pego.
    const existingCertificates = await this.certificateRepository.findManyBySampleId(sample.id);
    assertNoExistingCertificate(existingCertificates);

    const certificateNumber = parseRequiredText(reviewedData.certificateNumber, 'Nº do certificado');
    const laboratory = parseRequiredText(reviewedData.laboratory, 'Laboratório');
    const analysisDate = parseRequiredDate(reviewedData.analysisDate, 'Data da análise');
    const issueDate = parseRequiredDate(reviewedData.issueDate, 'Data de emissão');

    // O Certificate guarda seu próprio arquivo (Attachment) separado do
    // escaneado original da extração — mesmo padrão de "entrada crua" vs
    // "documento final" já usado em CustodyDocument (o PDF gerado é um
    // Attachment novo, não reaproveita o escaneado).
    const scanStream = await this.fileStorageService.getStream(extraction.originalScanFile.storageKey);
    const buffer = await streamToBuffer(scanStream);
    const uploaded = await this.fileStorageService.upload({
      buffer,
      filename: extraction.originalScanFile.filename,
      mimeType: extraction.originalScanFile.mimeType,
    });

    const certificate = await this.certificateRepository.create(
      { sampleId: sample.id, certificateNumber, laboratory, analysisDate, issueDate },
      {
        storageKey: uploaded.storageKey,
        filename: extraction.originalScanFile.filename,
        mimeType: extraction.originalScanFile.mimeType,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    // Mescla os resultados lidos nas linhas já existentes da amostra: atualiza
    // quem já tinha o mesmo nome de composto, adiciona os que ainda não
    // existiam — nunca apaga linhas de outros parâmetros já preenchidos à
    // mão (decisão confirmada com o usuário).
    const analytes = extraction.template.analytes as unknown as CertificateAnalyteConfig[];
    const analytesByKey = new Map(analytes.map((analyte) => [analyte.key, analyte]));
    const existingRows: ResultRowData[] = (sample.resultRows ?? []).map((row) => ({
      parameterName: row.parameterName,
      result: row.result,
      unit: row.unit,
      specLimit: row.specLimit ?? undefined,
      compliance: row.compliance ?? undefined,
      notes: row.notes ?? undefined,
      order: row.order,
    }));
    const rowsByParameterName = new Map(existingRows.map((row) => [row.parameterName, row]));

    // Pontos "Biogás" (antes das barreiras de tratamento) não têm limite
    // regulatório aplicável — os limites configurados por composto valem só
    // pro biometano já tratado/odorizado (confirmado com o usuário).
    const isBiogas = sample.samplingPoint?.name === 'Biogás';

    function mergeRow(parameterName: string, resultText: string, unit: string, analyte?: CertificateAnalyteConfig) {
      const compliance =
        analyte && !isBiogas
          ? computeCompliance(resultText, analyte.regulatoryLimit, analyte.warningThreshold, analyte.regulatoryMin)
          : undefined;
      const specLimit =
        analyte?.regulatoryLimit !== undefined && analyte.limitUnit && !isBiogas
          ? formatRegulatoryLimit(analyte.regulatoryLimit, analyte.limitUnit, analyte.warningThreshold, analyte.regulatoryMin)
          : undefined;

      const existingRow = rowsByParameterName.get(parameterName);
      if (existingRow) {
        existingRow.result = resultText;
        existingRow.unit = unit;
        existingRow.specLimit = specLimit;
        existingRow.compliance = compliance;
      } else {
        const newRow: ResultRowData = {
          parameterName,
          result: resultText,
          unit,
          specLimit,
          compliance,
          order: existingRows.length,
        };
        existingRows.push(newRow);
        rowsByParameterName.set(parameterName, newRow);
      }
    }

    if (extraction.template.resultsMode === 'COLLAPSE_BELOW_LQ') {
      // Painel com muitos parâmetros (ex.: Metais, ~30 metais) ou um só (ex.:
      // Mercúrio) onde o que importa é "tudo abaixo do LQ ou não" — se algum
      // resultado veio quantificado (sem "<"), lista só os quantificados
      // individualmente; se todos vieram com "<" (abaixo do limite de
      // quantificação), gera uma única linha resumo em vez de uma por
      // parâmetro (confirmado com o usuário).
      const readableResults = reviewedData.results.filter(
        (result) => analytesByKey.has(result.key) && !!result.result?.trim(),
      );
      const quantifiedResults = readableResults.filter((result) => !result.result.includes('<'));

      if (quantifiedResults.length > 0) {
        for (const result of quantifiedResults) {
          const analyte = analytesByKey.get(result.key)!;
          mergeRow(analyte.label, result.result, result.unit, analyte);
        }
      } else if (readableResults.length > 0) {
        mergeRow(extraction.template.collapsedResultLabel ?? 'Resultado', '<LQ', '');
      }
    } else if (extraction.template.resultsMode === 'SKIP_ZERO') {
      // Laudo que reporta não-detectado como "0,00" em vez de "<" (ex.:
      // Compostos Sulfurados) — cada parâmetro com valor lido vira sua
      // própria linha, exceto os que vierem exatamente "0,00" (omitidos, sem
      // linha resumo — confirmado com o usuário).
      for (const result of reviewedData.results) {
        const analyte = analytesByKey.get(result.key);
        if (!analyte || !result.result?.trim() || isZeroResult(result.result)) continue;
        mergeRow(analyte.label, result.result, result.unit, analyte);
      }
    } else {
      for (const result of reviewedData.results) {
        const analyte = analytesByKey.get(result.key);
        if (!analyte || !result.result?.trim()) continue;
        mergeRow(analyte.label, result.result, result.unit, analyte);
      }
    }

    await this.sampleRepository.replaceResultRows(sample.id, existingRows);

    const approved = await this.certificateExtractionRepository.approve(id, {
      approvedById: user.id,
      generatedCertificateId: certificate.id,
    });

    await this.sampleCompletionService.maybeComplete(sample.id);

    return approved;
  }
}
