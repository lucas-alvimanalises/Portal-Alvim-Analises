import { Module } from '@nestjs/common';
import { ContractsController } from './infrastructure/contracts.controller';
import { PrismaContractRepository } from './infrastructure/prisma-contract.repository';
import { CONTRACT_REPOSITORY } from './domain/contract.repository';
import { CreateContractUseCase } from './application/use-cases/create-contract.use-case';
import { ListContractsUseCase } from './application/use-cases/list-contracts.use-case';
import { GetContractUseCase } from './application/use-cases/get-contract.use-case';
import { UpdateContractUseCase } from './application/use-cases/update-contract.use-case';
import { DeactivateContractUseCase } from './application/use-cases/deactivate-contract.use-case';
import { ManageContractScopeUseCase } from './application/use-cases/manage-contract-scope.use-case';

@Module({
  controllers: [ContractsController],
  providers: [
    { provide: CONTRACT_REPOSITORY, useClass: PrismaContractRepository },
    CreateContractUseCase,
    ListContractsUseCase,
    GetContractUseCase,
    UpdateContractUseCase,
    DeactivateContractUseCase,
    ManageContractScopeUseCase,
  ],
  exports: [CONTRACT_REPOSITORY],
})
export class ContractsModule {}
