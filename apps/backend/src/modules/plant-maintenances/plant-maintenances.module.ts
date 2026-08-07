import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { PlantMaintenancesController } from './plant-maintenances.controller';
import { PlantMaintenancesService } from './plant-maintenances.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [PlantMaintenancesController],
  providers: [PlantMaintenancesService],
  exports: [PlantMaintenancesService],
})
export class PlantMaintenancesModule {}
