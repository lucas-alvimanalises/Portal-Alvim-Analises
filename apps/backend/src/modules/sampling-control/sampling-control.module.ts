import { Module } from '@nestjs/common';
import { SamplingControlController } from './sampling-control.controller';
import { SamplingControlService } from './sampling-control.service';
import { SamplingControlExcelService } from './sampling-control-excel.service';

// Exporta SamplingControlService pra CustodyExtractionsModule chamar a
// sincronização na aprovação/anexação/exclusão de cadeia de custódia.
@Module({
  controllers: [SamplingControlController],
  providers: [SamplingControlService, SamplingControlExcelService],
  exports: [SamplingControlService],
})
export class SamplingControlModule {}
