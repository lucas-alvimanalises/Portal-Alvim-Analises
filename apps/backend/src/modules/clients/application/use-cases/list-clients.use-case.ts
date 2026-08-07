import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser, Role } from '@portal-alvim/shared';
import { ForbiddenException } from '@nestjs/common';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@Injectable()
export class ListClientsUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(user: AuthenticatedUser) {
    // Cliente não lista todos os clientes — usa GET /clients/me. ADMIN/MANAGER veem tudo.
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Use /clients/me para ver os dados do seu cliente.');
    }
    return this.clientRepository.findMany();
  }
}
