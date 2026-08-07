import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PasswordHasherService } from '../../../auth/infrastructure/password-hasher.service';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

// Self-service — qualquer papel troca a própria senha (ver UsersController,
// rota sem @Roles). Diferente da edição de usuário pelo ADMIN: aqui a senha
// atual é exigida como confirmação de identidade.
@Injectable()
export class ChangeMyPasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const matches = await this.passwordHasher.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    const passwordHash = await this.passwordHasher.hash(newPassword);
    return this.userRepository.updatePassword(userId, passwordHash);
  }
}
