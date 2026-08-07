import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';

@Injectable()
export class DeactivateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(id: string) {
    const existing = await this.clientRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return this.clientRepository.deactivate(id);
  }
}
