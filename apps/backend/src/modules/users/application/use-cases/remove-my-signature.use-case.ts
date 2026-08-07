import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../domain/user.repository';

@Injectable()
export class RemoveMySignatureUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository) {}

  execute(userId: string) {
    return this.userRepository.removeSignature(userId);
  }
}
