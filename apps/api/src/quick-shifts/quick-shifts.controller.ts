import {
  Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards,
  HttpCode, HttpStatus, Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuickShiftsService, UpsertQuickShiftDto, BulkApplyDto } from './quick-shifts.service';

@Controller('quick-shifts')
@UseGuards(JwtAuthGuard)
export class QuickShiftsController {
  private readonly logger = new Logger(QuickShiftsController.name);
  constructor(private readonly service: QuickShiftsService) {}

  /** GET /quick-shifts?date=YYYY-MM-DD — returns array of shifts for that date */
  @Get()
  getByDate(@Request() req: any, @Query('date') date: string) {
    const d = date ?? new Date().toISOString().split('T')[0];
    return this.service.getByDate(req.user.sub, d);
  }

  /** GET /quick-shifts/month?year=2025&month=3  (month is 0-indexed) */
  @Get('month')
  getMonth(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getMonth(req.user.sub, Number(year), Number(month));
  }

  /** POST /quick-shifts – upsert single date+shiftKey */
  @Post()
  upsert(@Request() req: any, @Body() dto: UpsertQuickShiftDto) {
    this.logger.log(`upsert userId=${req.user?.sub} date=${dto?.date} shiftKey=${dto?.shiftKey}`);
    return this.service.upsert(req.user.sub, dto);
  }

  /** POST /quick-shifts/bulk – apply shift to multiple dates */
  @Post('bulk')
  bulkApply(@Request() req: any, @Body() dto: BulkApplyDto) {
    return this.service.bulkApply(req.user.sub, dto);
  }

  /** DELETE /quick-shifts/:date – remove ALL shifts for a date */
  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAllByDate(@Request() req: any, @Param('date') date: string) {
    return this.service.deleteAllByDate(req.user.sub, date);
  }

  /** DELETE /quick-shifts/:date/:shiftKey – remove one specific shift */
  @Delete(':date/:shiftKey')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteByDateAndShiftKey(
    @Request() req: any,
    @Param('date') date: string,
    @Param('shiftKey') shiftKey: string,
  ) {
    return this.service.deleteByDateAndShiftKey(req.user.sub, date, shiftKey);
  }
}
