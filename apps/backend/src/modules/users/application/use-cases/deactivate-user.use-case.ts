import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class DeactivateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(id: string) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.userRepository.deactivate(id);
  }
}
