import { Module } from '@nestjs/common';
import { MobileRealtimeService } from './mobile-realtime.service';

@Module({
  providers: [MobileRealtimeService],
  exports: [MobileRealtimeService],
})
export class MobileRealtimeModule {}
