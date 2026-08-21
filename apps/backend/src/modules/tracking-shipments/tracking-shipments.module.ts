import { Module } from '@nestjs/common';
import { TrackingShipmentsController } from './tracking-shipments.controller';
import { TrackingShipmentsService } from './tracking-shipments.service';

@Module({
  controllers: [TrackingShipmentsController],
  providers: [TrackingShipmentsService],
})
export class TrackingShipmentsModule {}
