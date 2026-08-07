import { Inject, Injectable } from '@nestjs/common';
import { CreateContractDto } from '../dto/create-contract.dto';
import { CONTRACT_REPOSITORY, ContractRepository } from '../../domain/contract.repository';

@Injectable()
export class CreateContractUseCase {
  constructor(
    @Inject(CONTRACT_REPOSITORY) private readonly contractRepository: ContractRepository,
  ) {}

  execute(dto: CreateContractDto) {
    return this.contractRepository.create({
      ...dto,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }
}
