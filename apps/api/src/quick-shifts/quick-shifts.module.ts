import { Module } from '@nestjs/common';
import { QuickShiftsController } from './quick-shifts.controller';
import { QuickShiftsService } from './quick-shifts.service';

@Module({
  controllers: [QuickShiftsController],
  providers: [QuickShiftsService],
  exports: [QuickShiftsService],
})
export class QuickShiftsModule {}
