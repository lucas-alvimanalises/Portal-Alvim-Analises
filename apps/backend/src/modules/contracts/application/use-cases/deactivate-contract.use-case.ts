import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class DeactivateContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  async execute(id: string) {
    const existing = await this.contractRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    return this.contractRepository.deactivate(id);
  }
}
