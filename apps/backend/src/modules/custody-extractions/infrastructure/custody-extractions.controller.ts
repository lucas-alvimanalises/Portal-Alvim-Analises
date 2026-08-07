import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { UploadCustodyScanDto } from '../application/dto/upload-custody-scan.dto';
import { CreateManualCustodyExtractionDto } from '../application/dto/create-manual-custody-extraction.dto';
import { UpdateCustodyExtractionDto } from '../application/dto/update-custody-extraction.dto';
import { SelectCustodyExtractionPhotoDto } from '../application/dto/select-custody-extraction-photo.dto';
import { UploadCustodyScanUseCase } from '../application/use-cases/upload-custody-scan.use-case';
import { CreateManualCustodyExtractionUseCase } from '../application/use-cases/create-manual-custody-extraction.use-case';
import { GetCustodyExtractionUseCase } from '../application/use-cases/get-custody-extraction.use-case';
import { ListCustodyExtractionsBySampleUseCase } from '../application/use-cases/list-custody-extractions-by-sample.use-case';
import { UpdateCustodyExtractionUseCase } from '../application/use-cases/update-custody-extraction.use-case';
import { ApproveCustodyExtractionUseCase } from '../application/use-cases/approve-custody-extraction.use-case';
import { SelectCustodyExtractionPhotoUseCase } from '../application/use-cases/select-custody-extraction-photo.use-case';
import { DownloadCustodyScanUseCase } from '../application/use-cases/download-custody-scan.use-case';
import { DeleteCustodyExtractionUseCase } from '../application/use-cases/delete-custody-extraction.use-case';
import { AttachExistingCustodyDocumentUseCase } from '../application/use-cases/attach-existing-custody-document.use-case';
import { DownloadCustodyDocumentBySampleUseCase } from '../application/use-cases/download-custody-document-by-sample.use-case';
import { DownloadBlankCustodyChainsUseCase } from '../application/use-cases/download-blank-custody-chains.use-case';
import { toCustodyExtractionDto } from '../application/custody-extraction.mapper';

// Tem dono (via Sample.clientId) — diferente de custody-documents, aqui
// inclui TECHNICIAN: é o técnico de campo quem de fato fotografa a cadeia
// de custódia e sobe pro sistema.
@Controller('custody-extractions')
@UseGuards(RolesGuard)
export class CustodyExtractionsController {
  constructor(
    private readonly uploadCustodyScanUseCase: UploadCustodyScanUseCase,
    private readonly createManualCustodyExtractionUseCase: CreateManualCustodyExtractionUseCase,
    private readonly getCustodyExtractionUseCase: GetCustodyExtractionUseCase,
    private readonly listCustodyExtractionsBySampleUseCase: ListCustodyExtractionsBySampleUseCase,
    private readonly updateCustodyExtractionUseCase: UpdateCustodyExtractionUseCase,
    private readonly approveCustodyExtractionUseCase: ApproveCustodyExtractionUseCase,
    private readonly downloadCustodyScanUseCase: DownloadCustodyScanUseCase,
    private readonly selectCustodyExtractionPhotoUseCase: SelectCustodyExtractionPhotoUseCase,
    private readonly deleteCustodyExtractionUseCase: DeleteCustodyExtractionUseCase,
    private readonly attachExistingCustodyDocumentUseCase: AttachExistingCustodyDocumentUseCase,
    private readonly downloadCustodyDocumentBySampleUseCase: DownloadCustodyDocumentBySampleUseCase,
    private readonly downloadBlankCustodyChainsUseCase: DownloadBlankCustodyChainsUseCase,
  ) {}

  // Baixa o PDF de cadeia de custódia já aprovado direto pela amostra —
  // diferente das rotas abaixo (ADMIN/MANAGER/TECHNICIAN, quem cadastra),
  // esta inclui CLIENT: é o que permite o cliente baixar a própria cadeia em
  // Resultados/Histórico (escopo vem da amostra, ver
  // DownloadCustodyDocumentBySampleUseCase). Rota estática registrada antes
  // de ":id" só por organização — sem ambiguidade real de fato.
  @Get('by-sample/:sampleId/document')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async downloadDocumentBySample(
    @Param('sampleId') sampleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadCustodyDocumentBySampleUseCase.execute(
      sampleId,
      user,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Cadeias de custódia em branco pra impressão (ver "Organizar Serviço") —
  // rota estática, registrada antes de ":id" só por organização (não há
  // ambiguidade real: profundidades de rota diferentes).
  @Get('blank/:scheduleId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async downloadBlank(@Param('scheduleId') scheduleId: string, @Res() res: Response) {
    const { buffer, filename } = await this.downloadBlankCustodyChainsUseCase.execute(scheduleId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    res.send(buffer);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async findAll(@Query('sampleId') sampleId: string, @CurrentUser() user: AuthenticatedUser) {
    if (!sampleId) {
      throw new BadRequestException('Informe sampleId.');
    }
    const extractions = await this.listCustodyExtractionsBySampleUseCase.execute(sampleId, user);
    return extractions.map(toCustodyExtractionDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const extraction = await this.getCustodyExtractionUseCase.execute(id, user);
    return toCustodyExtractionDto(extraction);
  }

  @Get(':id/scan')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async downloadScan(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadCustodyScanUseCase.execute(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() dto: UploadCustodyScanDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.uploadCustodyScanUseCase.execute(dto.sampleId, file, user);
    return toCustodyExtractionDto(extraction);
  }

  // Amostra de serviço antigo cuja cadeia de custódia já foi feita fora da
  // plataforma — anexa o arquivo já pronto direto como documento oficial,
  // sem gerar PDF novo nem passar por revisão (ver
  // AttachExistingCustodyDocumentUseCase).
  @Post('attach-existing')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async attachExisting(
    @Body() dto: UploadCustodyScanDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.attachExistingCustodyDocumentUseCase.execute(
      dto.sampleId,
      file,
      user,
    );
    return toCustodyExtractionDto(extraction);
  }

  @Post('manual')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async createManual(
    @Body() dto: CreateManualCustodyExtractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.createManualCustodyExtractionUseCase.execute(
      dto.sampleId,
      user,
    );
    return toCustodyExtractionDto(extraction);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustodyExtractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.updateCustodyExtractionUseCase.execute(
      id,
      dto.correctedData,
      user,
    );
    return toCustodyExtractionDto(extraction);
  }

  @Patch(':id/photo')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async selectPhoto(
    @Param('id') id: string,
    @Body() dto: SelectCustodyExtractionPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.selectCustodyExtractionPhotoUseCase.execute(
      id,
      dto.photoId ?? null,
      user,
    );
    return toCustodyExtractionDto(extraction);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const extraction = await this.approveCustodyExtractionUseCase.execute(id, user);
    return toCustodyExtractionDto(extraction);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteCustodyExtractionUseCase.execute(id, user);
  }
}
