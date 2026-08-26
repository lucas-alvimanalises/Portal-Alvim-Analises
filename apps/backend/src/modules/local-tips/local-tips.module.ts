import { Module } from '@nestjs/common';
import { LocalTipsController } from './local-tips.controller';
import { LocalTipsService } from './local-tips.service';

@Module({
  controllers: [LocalTipsController],
  providers: [LocalTipsService],
})
export class LocalTipsModule {}
