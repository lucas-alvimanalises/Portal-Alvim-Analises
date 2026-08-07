import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@Injectable()
export class GetClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(id: string, user: AuthenticatedUser) {
    const client = await this.clientRepository.findById(id);
    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    assertOwnership(user, { clientId: client.id });
    return client;
  }
}
