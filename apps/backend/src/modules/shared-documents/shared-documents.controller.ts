import {
  Controller,
  Delete,
  Get,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SharedDocumentsService } from './shared-documents.service';

@Controller('shared-documents')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.CLIENT)
export class SharedDocumentsController {
  constructor(private readonly sharedDocumentsService: SharedDocumentsService) {}

  @Get()
  list(@Query('clientId') clientId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.sharedDocumentsService.list(user, clientId);
  }

  @Get(':id/file')
  async download(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.sharedDocumentsService.download(id, user);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  @Post(':clientId')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('clientId') clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sharedDocumentsService.upload(clientId, file, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.sharedDocumentsService.remove(id, user);
  }
}
