import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class ManageContractScopeUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  async addScope(contractId: string, serviceTypeId: string) {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    await this.contractRepository.addScope(contractId, serviceTypeId);
    return this.contractRepository.findById(contractId);
  }

  async removeScope(contractId: string, serviceTypeId: string) {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    await this.contractRepository.removeScope(contractId, serviceTypeId);
    return this.contractRepository.findById(contractId);
  }
}
