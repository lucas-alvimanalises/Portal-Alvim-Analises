import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@portal-alvim/shared';
import { applyOwnershipScope } from '../../../../common/utils/scope.util';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class ListContractsUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  execute(user: AuthenticatedUser, requestedClientId?: string) {
    const where = applyOwnershipScope({}, user, { requestedClientId });
    return this.contractRepository.findMany(where);
  }
}
