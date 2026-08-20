import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { fixMultipartFilename } from '../../../../common/utils/multipart-filename.util';
import { CompoundsService } from '../../../compounds/compounds.service';
import { SAMPLE_REPOSITORY, SampleRepository } from '../../../samples/domain/sample.repository';
import {
  FILE_STORAGE_SERVICE,
  FileStorageService,
} from '../../../attachments/domain/file-storage.interface';
import {
  CUSTODY_DOCUMENT_REPOSITORY,
  CustodyDocumentRepository,
} from '../../domain/custody-document.repository';
import { CreateCustodyDocumentDto } from '../dto/create-custody-document.dto';

@Injectable()
export class UploadCustodyDocumentUseCase {
  constructor(
    @Inject(CUSTODY_DOCUMENT_REPOSITORY)
    private readonly custodyDocumentRepository: CustodyDocumentRepository,
    private readonly compoundsService: CompoundsService,
    @Inject(SAMPLE_REPOSITORY) private readonly sampleRepository: SampleRepository,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async execute(
    dto: CreateCustodyDocumentDto,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const compound = await this.compoundsService.findById(dto.compoundId);
    if (!compound) {
      throw new NotFoundException('Composto não encontrado.');
    }

    // Preenchido só quando o upload acontece direto na criação da amostra
    // (anexar uma cadeia de custódia já pronta, sem IA nem digitação manual).
    if (dto.sampleId) {
      const sample = await this.sampleRepository.findById(dto.sampleId);
      if (!sample) {
        throw new NotFoundException('Amostra não encontrada.');
      }
    }

    // Achado real (usuário reportou "pasta com cadeia de custódia
    // duplicada"): este upload direto (usado na pasta do composto, ver
    // amostras/composto/[compoundId]/page.tsx) nunca teve nenhuma proteção
    // contra duplicata — diferente do fluxo de sincronização com o disco
    // (SyncCustodyDocumentsFromDiskUseCase), que já pula arquivo repetido
    // comparando composto+ano+nome. Mesma chave aqui: se alguém reenviar
    // (sem querer, ou achando que precisava "adicionar" um documento que o
    // sistema já tinha gerado sozinho) o mesmo arquivo pro mesmo composto+
    // ano, bloqueia em vez de duplicar a pasta.
    const existingDocuments = await this.custodyDocumentRepository.findMany(dto.compoundId);
    const alreadyExists = existingDocuments.some(
      (doc) => doc.year === dto.year && doc.file.filename === file.originalname,
    );
    if (alreadyExists) {
      throw new ConflictException(
        `Já existe um documento "${file.originalname}" nesta pasta (${compound.code} - ${compound.name} / ${dto.year}). Exclua o existente antes de enviar de novo, se for pra substituir.`,
      );
    }

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    return this.custodyDocumentRepository.create(
      { compoundId: dto.compoundId, year: dto.year, uploadedById: user.id, sampleId: dto.sampleId },
      {
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
      },
    );
  }
}
