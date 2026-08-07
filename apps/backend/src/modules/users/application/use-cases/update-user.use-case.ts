import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from '../dto/update-user.dto';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class UpdateUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  async execute(id: string, dto: UpdateUserDto) {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.userRepository.update(id, dto);
  }
}
