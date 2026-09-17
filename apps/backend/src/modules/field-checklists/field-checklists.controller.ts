import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FieldChecklistsService } from './field-checklists.service';
import { ChecklistCatalogService } from './checklist-catalog.service';
import { SaveFieldChecklistDto } from './dto/save-field-checklist.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';

// Acesso igual "Organizar Serviço" — ADMIN/Gestor/Técnico, Cliente não
// participa da coleta em campo.
@Controller('field-checklists')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
export class FieldChecklistsController {
  constructor(
    private readonly fieldChecklistsService: FieldChecklistsService,
    private readonly checklistCatalogService: ChecklistCatalogService,
  ) {}

  // Rotas estáticas antes de ':scheduleId'.
  @Get('sections')
  listSections() {
    return this.checklistCatalogService.listSections();
  }

  // Adicionar item é liberado a todo mundo que já preenche o checklist
  // (ADMIN/MANAGER/TECHNICIAN) — quem está em campo e nota que falta algo
  // no catálogo cadastra na hora, sem precisar de outro perfil.
  @Post('sections/:sectionId/items')
  createItem(@Param('sectionId') sectionId: string, @Body() dto: CreateChecklistItemDto) {
    return this.checklistCatalogService.createItem(sectionId, dto.label);
  }

  // Editar/desativar item já é mais sensível (afeta o checklist de todo
  // mundo) — só ADMIN/MANAGER.
  @Patch('items/:itemId')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto) {
    return this.checklistCatalogService.updateItem(itemId, dto);
  }

  @Get('attachments/:attachmentId/file')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } =
      await this.fieldChecklistsService.downloadAttachment(attachmentId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Delete('attachments/:attachmentId')
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.fieldChecklistsService.removeAttachment(attachmentId);
  }

  @Get(':scheduleId')
  get(@Param('scheduleId') scheduleId: string) {
    return this.fieldChecklistsService.get(scheduleId);
  }

  // Checklist em branco pra impressão (modelo Alvim, cabeçalho já preenchido
  // com cliente/serviço/data do agendamento).
  @Get(':scheduleId/blank')
  async downloadBlank(@Param('scheduleId') scheduleId: string, @Res() res: Response) {
    const { buffer, filename } = await this.fieldChecklistsService.getBlankPdf(scheduleId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    res.send(buffer);
  }

  @Put(':scheduleId')
  save(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: SaveFieldChecklistDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldChecklistsService.save(scheduleId, dto.quantities, user.id);
  }

  @Post(':scheduleId/attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('scheduleId') scheduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.fieldChecklistsService.uploadAttachment(scheduleId, file, user.id);
  }
}
