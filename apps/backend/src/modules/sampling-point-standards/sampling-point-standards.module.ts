import { Module } from '@nestjs/common';
import { SamplingPointStandardsController } from './sampling-point-standards.controller';
import { SamplingPointStandardsService } from './sampling-point-standards.service';

@Module({
  controllers: [SamplingPointStandardsController],
  providers: [SamplingPointStandardsService],
  exports: [SamplingPointStandardsService],
})
export class SamplingPointStandardsModule {}
