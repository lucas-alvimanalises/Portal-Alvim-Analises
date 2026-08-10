import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { ChangeMyPasswordDto } from '../application/dto/change-my-password.dto';
import { CreateUserUseCase } from '../application/use-cases/create-user.use-case';
import { ListUsersUseCase } from '../application/use-cases/list-users.use-case';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';
import { DeactivateUserUseCase } from '../application/use-cases/deactivate-user.use-case';
import { UploadMySignatureUseCase } from '../application/use-cases/upload-my-signature.use-case';
import { RemoveMySignatureUseCase } from '../application/use-cases/remove-my-signature.use-case';
import { DownloadMySignatureUseCase } from '../application/use-cases/download-my-signature.use-case';
import { ChangeMyPasswordUseCase } from '../application/use-cases/change-my-password.use-case';
import { toUserDto } from '../application/user.mapper';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly uploadMySignatureUseCase: UploadMySignatureUseCase,
    private readonly removeMySignatureUseCase: RemoveMySignatureUseCase,
    private readonly downloadMySignatureUseCase: DownloadMySignatureUseCase,
    private readonly changeMyPasswordUseCase: ChangeMyPasswordUseCase,
  ) {}

  // Self-service — qualquer papel autenticado pode ver o próprio perfil;
  // cadastradas ANTES das rotas /:id pra "me" nunca ser interpretado como um id.
  @Get('me')
  async findMe(@CurrentUser() user: AuthenticatedUser) {
    const me = await this.getUserUseCase.execute(user.id);
    return toUserDto(me);
  }

  @Get('me/signature/file')
  async downloadMySignature(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const { stream, filename, mimeType } = await this.downloadMySignatureUseCase.execute(user.id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
    });
    stream.pipe(res);
  }

  // Assinatura é usada pra gerar cadeia de custódia (ADMIN/MANAGER/TECHNICIAN,
  // ver custody-extractions) — CLIENT não tem uso pra ela.
  @Post('me/signature')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMySignature(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const updated = await this.uploadMySignatureUseCase.execute(user.id, file);
    return toUserDto(updated);
  }

  @Delete('me/signature')
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async removeMySignature(@CurrentUser() user: AuthenticatedUser) {
    const updated = await this.removeMySignatureUseCase.execute(user.id);
    return toUserDto(updated);
  }

  // Sem @Roles — qualquer papel autenticado troca a própria senha.
  @Patch('me/password')
  async changeMyPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeMyPasswordDto) {
    const updated = await this.changeMyPasswordUseCase.execute(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return toUserDto(updated);
  }

  // Técnico precisa da lista (só nome/id, sem gerenciar nada aqui — criar/
  // editar/excluir continuam ADMIN só abaixo) pra colorir o Calendário por
  // pessoa e ver os nomes no seletor de técnico ao confirmar um agendamento
  // (ver technician-colors.ts, ConfirmDropModal, DayNoteModal) — sem essa
  // rota, a lista vinha vazia e o calendário aparecia sem cor nenhuma pra
  // qualquer Técnico.
  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.TECHNICIAN)
  async findAll() {
    const users = await this.listUsersUseCase.execute();
    return users.map(toUserDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  async findOne(@Param('id') id: string) {
    const user = await this.getUserUseCase.execute(id);
    return toUserDto(user);
  }

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto);
    return toUserDto(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.updateUserUseCase.execute(id, dto);
    return toUserDto(user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    const user = await this.deactivateUserUseCase.execute(id);
    return toUserDto(user);
  }
}
