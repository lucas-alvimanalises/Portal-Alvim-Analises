import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { CreateClientDto } from '../dto/create-client.dto';
import { CLIENT_REPOSITORY, ClientRepository } from '../../domain/client.repository';
import { isValidCnpjFormat } from '../../domain/client.entity';

@Injectable()
export class CreateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly clientRepository: ClientRepository) {}

  async execute(dto: CreateClientDto) {
    if (!isValidCnpjFormat(dto.cnpj)) {
      throw new BadRequestException('CNPJ em formato inválido.');
    }

    const existing = await this.clientRepository.findByCnpj(dto.cnpj);
    if (existing) {
      throw new ConflictException('Já existe um cliente com este CNPJ.');
    }

    return this.clientRepository.create(dto);
  }
}
