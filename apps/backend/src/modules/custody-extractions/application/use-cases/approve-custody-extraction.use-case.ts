import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, CustodyExtractedData, CustodyTemplateSchema } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import { SampleCompletionService } from '../../../samples/application/sample-completion.service';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../../custody-documents/domain/custody-document.repository';
import {
  CUSTODY_EXTRACTION_REPOSITORY,
  CustodyExtractionRepository,
} from '../../domain/custody-extraction.repository';
import { USER_REPOSITORY, UserRepository } from '../../../users/domain/user.repository';
import { CustodyFieldTemplatesService } from '../../infrastructure/custody-field-templates.service';
import { buildCustodyDocumentPdfBuffer, CustodyDocumentPhoto } from '../custody-extraction-pdf.util';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

// Os 1954 documentos importados do OneDrive seguem o padrão de nome
// "{número}_{aa} - ...", onde {número} continua a sequência do composto
// (ex.: Siloxanos/2026 foi de 11000_26 até 11149_26). Documentos gerados
// por este fluxo usam o mesmo padrão de nome, então dá pra achar o próximo
// número só olhando o maior prefixo numérico já usado nesse composto+ano.
function parseReportSequence(filename: string): number | null {
  const match = /^(\d+)_\d{2}\s*-/.exec(filename);
  return match ? Number(match[1]) : null;
}

function computeNextReportNumber(
  existingFilenames: string[],
  compoundCode: string,
  year: number,
): string {
  const sequences = existingFilenames
    .map(parseReportSequence)
    .filter((n): n is number => n !== null);
  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : Number(compoundCode);
  const yearSuffix = String(year % 100).padStart(2, '0');
  return `${next}/${yearSuffix}`;
}

// Mesmo padrão de nome usado em `filename` na aprovação — "número/ano" pra
// exibir numa mensagem de erro (ex.: "11150/26"), em vez do nome de arquivo
// completo.
function reportNumberFromFilename(filename: string): string | null {
  const match = /^(\d+)_(\d{2})\s*-/.exec(filename);
  return match ? `${match[1]}/${match[2]}` : null;
}

@Injectable()
export class ApproveCustodyExtractionUseCase {
  constructor(
    @Inject(CUSTODY_EXTRACTION_REPOSITORY)
    private readonly custodyExtractionRepository: CustodyExtractionRepository,
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly custodyFieldTemplatesService: CustodyFieldTemplatesService,
    private readonly sampleCompletionService: SampleCompletionService,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const extraction = await this.custodyExtractionRepository.findById(id);
    if (!extraction) {
      throw new NotFoundException('Extração não encontrada.');
    }
    const sample = await this.sampleRepository.findById(extraction.sampleId);
    if (!sample) {
      throw new NotFoundException('Amostra não encontrada.');
    }
    assertOwnership(user, { clientId: sample.clientId });

    if (extraction.status === 'APPROVED') {
      throw new BadRequestException('Esta extração já foi aprovada.');
    }
    if (extraction.status !== 'NEEDS_REVIEW') {
      throw new BadRequestException('Esta extração ainda não está pronta pra aprovação.');
    }
    if (!sample.compoundId) {
      throw new BadRequestException('Amostra sem composto definido.');
    }

    const reviewedData = extraction.correctedData ?? extraction.extractedData;
    if (!reviewedData) {
      throw new BadRequestException('Nenhum dado extraído pra gerar o documento.');
    }

    const template = await this.custodyFieldTemplatesService.findById(extraction.templateId);
    if (!template) {
      throw new NotFoundException('Modelo de cadeia de custódia não encontrado.');
    }
    const compound = sample.compound;
    const schema = template.fields as unknown as CustodyTemplateSchema;
    const year = sample.collectionDate.getUTCFullYear();

    // Assinatura digital de quem aprova entra automaticamente no campo
    // correspondente (ver User.signatureFileId) — só exigida em compostos
    // cujo template já tem esse campo modelado. Checada antes de consumir o
    // próximo número de relatório pra falhar cedo, sem efeito colateral.
    let signature: CustodyDocumentPhoto | undefined;
    if (schema.signatureFieldKey) {
      const approver = await this.userRepository.findById(user.id);
      if (!approver?.signature) {
        throw new BadRequestException(
          'Você precisa cadastrar sua assinatura digital em "Meu Perfil" antes de aprovar uma cadeia de custódia.',
        );
      }
      const stream = await this.fileStorageService.getStream(approver.signature.storageKey);
      signature = { buffer: await streamToBuffer(stream), mimeType: approver.signature.mimeType };
    }

    const existingDocuments = await this.custodyDocumentRepository.findMany(sample.compoundId);
    const reportNumber = computeNextReportNumber(
      existingDocuments.filter((doc) => doc.year === year).map((doc) => doc.file.filename),
      compound?.code ?? '0',
      year,
    );

    // Preenche os campos fixos do template (Metodologia, Procedimento
    // Interno, ...) e o número de relatório recém-atribuído — a IA nunca
    // recebeu esses campos pra ler, então eles não vêm em extractedData.
    const reviewed = reviewedData as unknown as CustodyExtractedData;
    const finalData: CustodyExtractedData = {
      fields: { ...reviewed.fields },
      table: reviewed.table,
    };
    schema.fields.forEach((field) => {
      if (field.fixedValue !== undefined) {
        finalData.fields[field.key] = { value: field.fixedValue, confidence: 1 };
      }
    });
    finalData.fields[schema.topRowFieldKeys.reportNumber] = { value: reportNumber, confidence: 1 };

    // Código da amostra e Data da coleta deixaram de ser digitados na mão em
    // Resultados — vêm direto da cadeia de custódia (ver SampleResultCard.tsx).
    // Data sempre atualiza; Código só quando o template define de qual linha
    // da tabela tirar (Siloxanos usa "Amostrador Impingers nsº").
    const sampleUpdates: { sampleCode?: string; collectionDate?: Date } = {};

    const dateValue = finalData.fields[schema.topRowFieldKeys.date]?.value;
    if (dateValue) {
      const parsedDate = new Date(dateValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        sampleUpdates.collectionDate = parsedDate;
      }
    }

    if (schema.sampleCodeTableRowKey) {
      const rowKey = schema.sampleCodeTableRowKey;
      // "Branco" é a amostra de controle/em branco — não tem número de
      // impinger de verdade, então fica fora do código da amostra.
      const codeParts = schema.table.columns
        .filter((column) => column !== 'Branco')
        .map((column) => finalData.table[column]?.[rowKey]?.value)
        .filter((value): value is string => !!value);
      if (codeParts.length > 0) {
        sampleUpdates.sampleCode = codeParts.join(' - ');
      }
    } else if (schema.sampleCodeFieldKey) {
      // Modelos sem tabela de amostras (ex.: VOCs) usam um campo simples
      // como identificador físico — ex.: "Tubo de Amostragem".
      const value = finalData.fields[schema.sampleCodeFieldKey]?.value;
      if (value) {
        sampleUpdates.sampleCode = value;
      }
    }

    // Código da amostra é único no sistema inteiro — cada tubo/cassete/bag
    // físico só é usado uma vez. Se o valor lido/digitado já pertence a outra
    // amostra, bloqueia a aprovação e cita em qual cadeia de custódia (número
    // do relatório) esse código já foi usado, pra evitar confundir duas
    // coletas diferentes.
    if (sampleUpdates.sampleCode) {
      const duplicates = await this.sampleRepository.findMany({
        sampleCode: sampleUpdates.sampleCode,
        active: true,
        id: { not: sample.id },
      });
      if (duplicates.length > 0) {
        const otherExtractions = await this.custodyExtractionRepository.findManyBySampleId(
          duplicates[0].id,
        );
        const approvedWithDocument = otherExtractions.find(
          (candidate) => candidate.status === 'APPROVED' && candidate.generatedDocument,
        );
        const existingReportNumber = approvedWithDocument?.generatedDocument
          ? reportNumberFromFilename(approvedWithDocument.generatedDocument.file.filename)
          : null;
        throw new BadRequestException(
          existingReportNumber
            ? `Código da amostra "${sampleUpdates.sampleCode}" já está cadastrado na cadeia de custódia nº ${existingReportNumber}.`
            : `Código da amostra "${sampleUpdates.sampleCode}" já está cadastrado em outra amostra.`,
        );
      }
    }

    if (Object.keys(sampleUpdates).length > 0) {
      await this.sampleRepository.update(sample.id, sampleUpdates);
    }

    let photo: { buffer: Buffer; mimeType: string } | undefined;
    if (extraction.selectedPhoto) {
      const stream = await this.fileStorageService.getStream(extraction.selectedPhoto.storageKey);
      photo = { buffer: await streamToBuffer(stream), mimeType: extraction.selectedPhoto.mimeType };
    }

    const pdfBuffer = buildCustodyDocumentPdfBuffer(
      compound?.name ?? 'Composto',
      schema,
      finalData,
      photo,
      signature,
    );
    const yearSuffix = String(year % 100).padStart(2, '0');
    const filename = `${reportNumber.split('/')[0]}_${yearSuffix} - Cadeia de Custódia ${compound?.name ?? ''}.pdf`;

    const uploaded = await this.fileStorageService.upload({
      buffer: pdfBuffer,
      filename,
      mimeType: 'application/pdf',
    });

    const document = await this.custodyDocumentRepository.create(
      { compoundId: sample.compoundId, year, uploadedById: user.id, sampleId: sample.id },
      {
        storageKey: uploaded.storageKey,
        filename,
        mimeType: 'application/pdf',
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );

    const approved = await this.custodyExtractionRepository.approve(id, {
      approvedById: user.id,
      generatedDocumentId: document.id,
    });

    await this.sampleCompletionService.maybeComplete(sample.id);

    return approved;
  }
}
