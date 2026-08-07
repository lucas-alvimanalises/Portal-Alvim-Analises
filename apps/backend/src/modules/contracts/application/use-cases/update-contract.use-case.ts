import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateContractDto } from '../dto/update-contract.dto';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class UpdateContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  async execute(id: string, dto: UpdateContractDto) {
    const existing = await this.contractRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    return this.contractRepository.update(id, {
      ...dto,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }
}
