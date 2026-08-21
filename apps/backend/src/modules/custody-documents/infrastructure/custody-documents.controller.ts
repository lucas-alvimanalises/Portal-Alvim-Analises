import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateCustodyDocumentDto } from '../application/dto/create-custody-document.dto';
import { ListCustodyDocumentsUseCase } from '../application/use-cases/list-custody-documents.use-case';
import { UploadCustodyDocumentUseCase } from '../application/use-cases/upload-custody-document.use-case';
import { DeleteCustodyDocumentUseCase } from '../application/use-cases/delete-custody-document.use-case';
import { DownloadCustodyDocumentUseCase } from '../application/use-cases/download-custody-document.use-case';
import { SyncCustodyDocumentsFromDiskUseCase } from '../application/use-cases/sync-custody-documents-from-disk.use-case';
import { DedupeCustodyDocumentsUseCase } from '../application/use-cases/dedupe-custody-documents.use-case';
import { toCustodyDocumentDto } from '../application/custody-document.mapper';

// Sem escopo de cliente (ver domain/custody-document.repository.ts) — por
// isso nunca visível a CLIENT. Técnico agora visualiza/baixa (confirmado com
// o usuário: acesso a todo o menu menos Usuários e Contratos), mas
// sincronizar/enviar/excluir arquivo continuam exclusivos de ADMIN/MANAGER.
@Controller('custody-documents')
@UseGuards(RolesGuard)
export class CustodyDocumentsController {
  constructor(
    private readonly listCustodyDocumentsUseCase: ListCustodyDocumentsUseCase,
    private readonly uploadCustodyDocumentUseCase: UploadCustodyDocumentUseCase,
    private readonly deleteCustodyDocumentUseCase: DeleteCustodyDocumentUseCase,
    private readonly downloadCustodyDocumentUseCase: DownloadCustodyDocumentUseCase,
    private readonly syncCustodyDocumentsFromDiskUseCase: SyncCustodyDocumentsFromDiskUseCase,
    private readonly dedupeCustodyDocumentsUseCase: DedupeCustodyDocumentsUseCase,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async findAll(@Query('compoundId') compoundId?: string) {
    const documents = await this.listCustodyDocumentsUseCase.execute(compoundId);
    return documents.map(toCustodyDocumentDto);
  }

  // Botão "Atualizar pastas" — varre a pasta local do OneDrive configurada
  // no backend e sobe qualquer PDF novo. Ver use-case pra detalhes.
  @Post('sync')
  @Roles(Role.ADMIN, Role.MANAGER)
  async sync(@CurrentUser() user: AuthenticatedUser) {
    return this.syncCustodyDocumentsFromDiskUseCase.execute(user);
  }

  // Botão "Remover duplicatas" — achado real (usuário reportou pasta com
  // cadeia de custódia repetida): só remove o padrão seguro (2 cópias, uma
  // órfã sem amostra + uma vinculada), o resto entra em skippedGroups pra
  // revisão manual. Idempotente, sem efeito colateral rodar de novo.
  @Post('dedupe')
  @Roles(Role.ADMIN, Role.MANAGER)
  async dedupe() {
    return this.dedupeCustodyDocumentsUseCase.execute();
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async download(@Param('id') id: string, @Res() res: Response) {
    const { stream, filename, mimeType } = await this.downloadCustodyDocumentUseCase.execute(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Mesmo arquivo do download acima, só que com Content-Disposition: inline
  // — o navegador renderiza o PDF direto na aba em vez de baixar, pra
  // visualizar sem precisar abrir o arquivo baixado toda vez.
  @Get(':id/view')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async view(@Param('id') id: string, @Res() res: Response) {
    const { stream, filename, mimeType } = await this.downloadCustodyDocumentUseCase.execute(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() dto: CreateCustodyDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const document = await this.uploadCustodyDocumentUseCase.execute(dto, file, user);
    return toCustodyDocumentDto(document);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.deleteCustodyDocumentUseCase.execute(id);
  }
}
