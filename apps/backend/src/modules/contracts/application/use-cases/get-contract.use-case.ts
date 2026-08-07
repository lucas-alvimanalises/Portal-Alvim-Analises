import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { assertOwnership } from '../../../../common/utils/scope.util';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class GetContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  async execute(id: string, user: AuthenticatedUser) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) {
      throw new NotFoundException('Contrato não encontrado.');
    }
    assertOwnership(user, { clientId: contract.clientId });
    return contract;
  }
}
