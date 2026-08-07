import { Module } from '@nestjs/common';
import { SamplingPointsController } from './infrastructure/sampling-points.controller';
import { PrismaSamplingPointRepository } from './infrastructure/prisma-sampling-point.repository';
import { SAMPLING_POINT_REPOSITORY } from './domain/sampling-point.repository';
import { CreateSamplingPointUseCase } from './application/use-cases/create-sampling-point.use-case';
import { ListSamplingPointsUseCase } from './application/use-cases/list-sampling-points.use-case';
import { UpdateSamplingPointUseCase } from './application/use-cases/update-sampling-point.use-case';
import { DeactivateSamplingPointUseCase } from './application/use-cases/deactivate-sampling-point.use-case';

@Module({
  controllers: [SamplingPointsController],
  providers: [
    { provide: SAMPLING_POINT_REPOSITORY, useClass: PrismaSamplingPointRepository },
    CreateSamplingPointUseCase,
    ListSamplingPointsUseCase,
    UpdateSamplingPointUseCase,
    DeactivateSamplingPointUseCase,
  ],
})
export class SamplingPointsModule {}
