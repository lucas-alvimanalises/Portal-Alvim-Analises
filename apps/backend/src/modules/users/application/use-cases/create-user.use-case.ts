import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PasswordHasherService } from '../../../auth/infrastructure/password-hasher.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async execute(dto: CreateUserDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    // Não espalhar `dto` direto: ele tem `password` (texto puro), que não é
    // um campo do modelo User (só `passwordHash` é persistido).
    const { password: _password, ...userData } = dto;
    return this.userRepository.create({ ...userData, passwordHash });
  }
}
