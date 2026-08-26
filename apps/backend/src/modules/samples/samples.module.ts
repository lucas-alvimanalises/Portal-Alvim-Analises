import { Module } from '@nestjs/common';
import { SchedulesModule } from '../schedules/schedules.module';
import { SamplesController } from './infrastructure/samples.controller';
import { PrismaSampleRepository } from './infrastructure/prisma-sample.repository';
import { SAMPLE_REPOSITORY } from './domain/sample.repository';
import { CreateSampleUseCase } from './application/use-cases/create-sample.use-case';
import { ListSamplesUseCase } from './application/use-cases/list-samples.use-case';
import { GetSampleUseCase } from './application/use-cases/get-sample.use-case';
import { UpdateSampleUseCase } from './application/use-cases/update-sample.use-case';
import { DeactivateSampleUseCase } from './application/use-cases/deactivate-sample.use-case';
import { ReplaceSampleResultRowsUseCase } from './application/use-cases/replace-sample-result-rows.use-case';
import { ListPendingCertificatesUseCase } from './application/use-cases/list-pending-certificates.use-case';
import { ExportSamplesExcelUseCase } from './application/use-cases/export-samples-excel.use-case';
import { SampleCompletionService } from './application/sample-completion.service';

@Module({
  imports: [SchedulesModule],
  controllers: [SamplesController],
  providers: [
    { provide: SAMPLE_REPOSITORY, useClass: PrismaSampleRepository },
    CreateSampleUseCase,
    ListSamplesUseCase,
    GetSampleUseCase,
    UpdateSampleUseCase,
    DeactivateSampleUseCase,
    ReplaceSampleResultRowsUseCase,
    ListPendingCertificatesUseCase,
    ExportSamplesExcelUseCase,
    SampleCompletionService,
  ],
  exports: [SAMPLE_REPOSITORY, SampleCompletionService],
})
export class SamplesModule {}
