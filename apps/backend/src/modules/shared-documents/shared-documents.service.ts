import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser, Role, SharedDocumentDto } from '@portal-alvim/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership, resolveActiveClientId } from '../../common/utils/scope.util';
import { fixMultipartFilename } from '../../common/utils/multipart-filename.util';
import { FILE_STORAGE_SERVICE, FileStorageService } from '../attachments/domain/file-storage.interface';
import { toSharedDocumentDto } from './shared-document.mapper';

const INCLUDE = { uploadedBy: { select: { name: true, role: true } } } as const;

// "Documentos Compartilhados" — pasta por empresa onde ADMIN/MANAGER e o
// próprio CLIENT sobem arquivos (pedido do usuário). Reaproveita o model
// Attachment já existente (mesmo padrão de PlantMaintenance): kind =
// SHARED_DOCUMENT + sharedDocumentClientId identificam essas linhas. Cliente
// só enxerga/mexe nas próprias empresas (assertOwnership, igual
// PlantMaintenancesService); exclusão de um documento enviado pela Alvim fica
// restrita a ADMIN/MANAGER — Cliente só apaga o que ele mesmo enviou.
@Injectable()
export class SharedDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FILE_STORAGE_SERVICE) private readonly fileStorageService: FileStorageService,
  ) {}

  async list(user: AuthenticatedUser, requestedClientId?: string): Promise<SharedDocumentDto[]> {
    let clientId: string;
    if (user.role === Role.CLIENT) {
      clientId = resolveActiveClientId(user, requestedClientId);
    } else {
      if (!requestedClientId) {
        throw new BadRequestException('Informe clientId.');
      }
      clientId = requestedClientId;
    }

    const rows = await this.prisma.attachment.findMany({
      where: { kind: 'SHARED_DOCUMENT', sharedDocumentClientId: clientId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSharedDocumentDto);
  }

  async upload(
    clientId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<SharedDocumentDto> {
    assertOwnership(user, { clientId });
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    file.originalname = fixMultipartFilename(file.originalname);

    const uploaded = await this.fileStorageService.upload({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
    });

    const row = await this.prisma.attachment.create({
      data: {
        kind: 'SHARED_DOCUMENT',
        storageKey: uploaded.storageKey,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: uploaded.sizeBytes,
        uploadedById: user.id,
        sharedDocumentClientId: clientId,
      },
      include: INCLUDE,
    });
    return toSharedDocumentDto(row);
  }

  private async getOwned(id: string, user: AuthenticatedUser) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment || attachment.kind !== 'SHARED_DOCUMENT' || !attachment.sharedDocumentClientId) {
      throw new NotFoundException('Documento não encontrado.');
    }
    assertOwnership(user, { clientId: attachment.sharedDocumentClientId });
    return attachment;
  }

  async download(id: string, user: AuthenticatedUser) {
    const attachment = await this.getOwned(id, user);
    const stream = await this.fileStorageService.getStream(attachment.storageKey);
    return { stream, filename: attachment.filename, mimeType: attachment.mimeType };
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ success: true }> {
    const attachment = await this.getOwned(id, user);
    if (user.role === Role.CLIENT && attachment.uploadedById !== user.id) {
      throw new ForbiddenException('Você só pode excluir documentos que você mesmo enviou.');
    }

    await this.fileStorageService.delete(attachment.storageKey);
    await this.prisma.attachment.delete({ where: { id } });
    return { success: true };
  }
}
