import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UploadServicePhotoUseCase } from '../application/use-cases/upload-service-photo.use-case';
import { ListServicePhotosUseCase } from '../application/use-cases/list-service-photos.use-case';
import { DeleteServicePhotoUseCase } from '../application/use-cases/delete-service-photo.use-case';
import { GetServicePhotoFileUseCase } from '../application/use-cases/get-service-photo-file.use-case';
import { toServicePhotoDto } from '../application/service-photo.mapper';

// "Fotos do Serviço" — anexos gerais da visita (inclusive fotos de
// amostras), tem dono via Schedule.clientId. Mesmo escopo de papéis de
// custody-extractions: é o técnico de campo quem sobe as fotos.
@Controller('service-executions')
@UseGuards(RolesGuard)
export class ServiceExecutionsController {
  constructor(
    private readonly uploadServicePhotoUseCase: UploadServicePhotoUseCase,
    private readonly listServicePhotosUseCase: ListServicePhotosUseCase,
    private readonly deleteServicePhotoUseCase: DeleteServicePhotoUseCase,
    private readonly getServicePhotoFileUseCase: GetServicePhotoFileUseCase,
  ) {}

  @Get('schedule/:scheduleId/photos')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async list(@Param('scheduleId') scheduleId: string, @CurrentUser() user: AuthenticatedUser) {
    const photos = await this.listServicePhotosUseCase.execute(scheduleId, user);
    return photos.map(toServicePhotoDto);
  }

  @Post('schedule/:scheduleId/photos')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('scheduleId') scheduleId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const photo = await this.uploadServicePhotoUseCase.execute(scheduleId, file, user);
    return toServicePhotoDto(photo);
  }

  @Get('photos/:id/file')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async downloadFile(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.getServicePhotoFileUseCase.execute(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Delete('photos/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteServicePhotoUseCase.execute(id, user);
  }
}
