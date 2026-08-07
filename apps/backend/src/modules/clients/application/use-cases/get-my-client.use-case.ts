import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

// Lista todas as empresas que o usuário (papel CLIENT) pode acessar — usado
// para popular o seletor de empresa no portal. Um usuário pode ter 0 (ainda
// não vinculado por um admin), 1 ou várias.
@Injectable()
export class GetMyClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  execute(user: AuthenticatedUser) {
    return this.clientRepository.findManyByIds(user.clientIds);
  }
}
