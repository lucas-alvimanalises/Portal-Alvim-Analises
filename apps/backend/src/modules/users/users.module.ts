import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { UsersController } from './infrastructure/users.controller';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { USER_REPOSITORY } from './domain/user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { DeactivateUserUseCase } from './application/use-cases/deactivate-user.use-case';
import { UploadMySignatureUseCase } from './application/use-cases/upload-my-signature.use-case';
import { RemoveMySignatureUseCase } from './application/use-cases/remove-my-signature.use-case';
import { DownloadMySignatureUseCase } from './application/use-cases/download-my-signature.use-case';
import { ChangeMyPasswordUseCase } from './application/use-cases/change-my-password.use-case';

@Module({
  imports: [AuthModule, AttachmentsModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeactivateUserUseCase,
    UploadMySignatureUseCase,
    RemoveMySignatureUseCase,
    DownloadMySignatureUseCase,
    ChangeMyPasswordUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
