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
import { UploadCertificateScanDto } from '../application/dto/upload-certificate-scan.dto';
import { UpdateCertificateExtractionDto } from '../application/dto/update-certificate-extraction.dto';
import { UploadCertificateScanUseCase } from '../application/use-cases/upload-certificate-scan.use-case';
import { GetCertificateExtractionUseCase } from '../application/use-cases/get-certificate-extraction.use-case';
import { ListCertificateExtractionsBySampleUseCase } from '../application/use-cases/list-certificate-extractions-by-sample.use-case';
import { UpdateCertificateExtractionUseCase } from '../application/use-cases/update-certificate-extraction.use-case';
import { ApproveCertificateExtractionUseCase } from '../application/use-cases/approve-certificate-extraction.use-case';
import { DownloadCertificateScanUseCase } from '../application/use-cases/download-certificate-scan.use-case';
import { DeleteCertificateExtractionUseCase } from '../application/use-cases/delete-certificate-extraction.use-case';
import { toCertificateExtractionDto } from '../application/certificate-extraction.mapper';

// Mesma restrição de papel do módulo certificates (upload manual): quem
// recebe e anexa laudos do laboratório é a equipe interna (ADMIN/MANAGER),
// não o técnico de campo — diferente de cadeia de custódia.
@Controller('certificate-extractions')
@UseGuards(RolesGuard)
export class CertificateExtractionsController {
  constructor(
    private readonly uploadCertificateScanUseCase: UploadCertificateScanUseCase,
    private readonly getCertificateExtractionUseCase: GetCertificateExtractionUseCase,
    private readonly listCertificateExtractionsBySampleUseCase: ListCertificateExtractionsBySampleUseCase,
    private readonly updateCertificateExtractionUseCase: UpdateCertificateExtractionUseCase,
    private readonly approveCertificateExtractionUseCase: ApproveCertificateExtractionUseCase,
    private readonly downloadCertificateScanUseCase: DownloadCertificateScanUseCase,
    private readonly deleteCertificateExtractionUseCase: DeleteCertificateExtractionUseCase,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(@Query('sampleId') sampleId: string, @CurrentUser() user: AuthenticatedUser) {
    if (!sampleId) {
      throw new BadRequestException('Informe sampleId.');
    }
    const extractions = await this.listCertificateExtractionsBySampleUseCase.execute(sampleId, user);
    return extractions.map(toCertificateExtractionDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const extraction = await this.getCertificateExtractionUseCase.execute(id, user);
    return toCertificateExtractionDto(extraction);
  }

  @Get(':id/scan')
  @Roles(Role.ADMIN, Role.MANAGER)
  async downloadScan(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadCertificateScanUseCase.execute(id, user);
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
    @Body() dto: UploadCertificateScanDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.uploadCertificateScanUseCase.execute(dto.sampleId, file, user);
    return toCertificateExtractionDto(extraction);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCertificateExtractionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const extraction = await this.updateCertificateExtractionUseCase.execute(id, dto.correctedData, user);
    return toCertificateExtractionDto(extraction);
  }

  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.MANAGER)
  async approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const extraction = await this.approveCertificateExtractionUseCase.execute(id, user);
    return toCertificateExtractionDto(extraction);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteCertificateExtractionUseCase.execute(id, user);
  }
}
