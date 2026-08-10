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
import { CreateCertificateDto } from '../application/dto/create-certificate.dto';
import { UpdateCertificateMetadataDto } from '../application/dto/update-certificate-metadata.dto';
import { ListCertificatesUseCase } from '../application/use-cases/list-certificates.use-case';
import { UploadCertificateUseCase } from '../application/use-cases/upload-certificate.use-case';
import { ReplaceCertificateFileUseCase } from '../application/use-cases/replace-certificate-file.use-case';
import { UpdateCertificateMetadataUseCase } from '../application/use-cases/update-certificate-metadata.use-case';
import { DeleteCertificateUseCase } from '../application/use-cases/delete-certificate.use-case';
import { DownloadCertificateUseCase } from '../application/use-cases/download-certificate.use-case';
import { DownloadCertificateBySampleUseCase } from '../application/use-cases/download-certificate-by-sample.use-case';
import { toCertificateDto } from '../application/certificate.mapper';

@Controller('certificates')
@UseGuards(RolesGuard)
export class CertificatesController {
  constructor(
    private readonly listCertificatesUseCase: ListCertificatesUseCase,
    private readonly uploadCertificateUseCase: UploadCertificateUseCase,
    private readonly replaceCertificateFileUseCase: ReplaceCertificateFileUseCase,
    private readonly updateCertificateMetadataUseCase: UpdateCertificateMetadataUseCase,
    private readonly deleteCertificateUseCase: DeleteCertificateUseCase,
    private readonly downloadCertificateUseCase: DownloadCertificateUseCase,
    private readonly downloadCertificateBySampleUseCase: DownloadCertificateBySampleUseCase,
  ) {}

  // Baixa o certificado direto pela amostra — usado no download em lote
  // (Resultados/Histórico), sem o front precisar buscar o id do certificado
  // antes. Rota estática ("by-sample") registrada antes de ":id/download"
  // só por organização — não há ambiguidade real (formatos com nº de
  // segmentos diferentes).
  @Get('by-sample/:sampleId/download')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async downloadBySample(
    @Param('sampleId') sampleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadCertificateBySampleUseCase.execute(
      sampleId,
      user,
    );
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async findAll(@Query('sampleId') sampleId: string, @CurrentUser() user: AuthenticatedUser) {
    if (!sampleId) {
      throw new BadRequestException('Informe sampleId.');
    }
    const certificates = await this.listCertificatesUseCase.execute(sampleId, user);
    return certificates.map(toCertificateDto);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN, Role.CLIENT)
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadCertificateUseCase.execute(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Liberado pro Técnico a pedido do usuário (Opção A) — antes só
  // ADMIN/MANAGER anexavam certificado manualmente.
  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Body() dto: CreateCertificateDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const certificate = await this.uploadCertificateUseCase.execute(dto, file, user);
    return toCertificateDto(certificate);
  }

  @Patch(':id/file')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async replaceFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const certificate = await this.replaceCertificateFileUseCase.execute(id, file, user);
    return toCertificateDto(certificate);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async updateMetadata(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateMetadataDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const certificate = await this.updateCertificateMetadataUseCase.execute(id, dto, user);
    return toCertificateDto(certificate);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteCertificateUseCase.execute(id, user);
  }
}
