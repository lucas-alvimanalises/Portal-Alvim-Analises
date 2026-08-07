import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateClientDto } from '../dto/update-client.dto';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { isValidCnpjFormat } from '../../domain/client.entity';

@Injectable()
export class UpdateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(id: string, dto: UpdateClientDto) {
    const existing = await this.clientRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    if (dto.cnpj && !isValidCnpjFormat(dto.cnpj)) {
      throw new BadRequestException('CNPJ em formato inválido.');
    }
    return this.clientRepository.update(id, dto);
  }
}
