import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto/create-schedule.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private schedules: SchedulesService) {}

  // ── My schedule ──────────────────────────────────────────────────────────────
  @Get()
  findByDate(@Request() req: any, @Query('date') date: string) {
    const d = date ?? new Date().toISOString().split('T')[0];
    return this.schedules.findByDate(req.user.sub, d);
  }

  // ── My schedule – month dots ─────────────────────────────────────────────────
  @Get('month')
  findMonthForMe(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedules.findMonthForMe(
      req.user.sub,
      Number(year),
      Number(month),
    );
  }

  // ── Free slots ───────────────────────────────────────────────────────────────
  @Get('free-slots')
  freeSlots(
    @Request() req: any,
    @Query('days') days: string,
    @Query('minDuration') minDuration: string,
    @Query('friendIds') friendIds?: string,
    @Query('windowStart') windowStart?: string,
    @Query('windowEnd') windowEnd?: string,
  ) {
    const ids = friendIds ? friendIds.split(',').filter(Boolean) : undefined;
    return this.schedules.findFreeSlots(
      req.user.sub,
      Number(days) || 7,
      Number(minDuration) || 60,
      ids,
      windowStart !== undefined ? Number(windowStart) : 8,
      windowEnd !== undefined ? Number(windowEnd) : 22,
    );
  }

  // ── All friends – day ────────────────────────────────────────────────────────
  @Get('friends/all')
  findDayAllFriends(
    @Request() req: any,
    @Query('date') date: string,
    @Query('friendIds') friendIds?: string,
  ) {
    const d = date ?? new Date().toISOString().split('T')[0];
    const ids = friendIds ? friendIds.split(',').filter(Boolean) : undefined;
    return this.schedules.findDayAllFriends(req.user.sub, d, ids);
  }

  // ── All friends – month dots ─────────────────────────────────────────────────
  @Get('friends/month')
  findMonthAllFriends(
    @Request() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('friendIds') friendIds?: string,
  ) {
    const ids = friendIds ? friendIds.split(',').filter(Boolean) : undefined;
    return this.schedules.findMonthAllFriends(
      req.user.sub,
      Number(year),
      Number(month),
      ids,
    );
  }

  // ── Single friend – month dots ───────────────────────────────────────────────
  @Get('friend/:friendId/month')
  findMonthForFriend(
    @Request() req: any,
    @Param('friendId') friendId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedules.findMonthForFriend(
      req.user.sub,
      friendId,
      Number(year),
      Number(month),
    );
  }

  // ── Single friend – day ──────────────────────────────────────────────────────
  @Get('friend/:friendId')
  findByDateForFriend(
    @Request() req: any,
    @Param('friendId') friendId: string,
    @Query('date') date: string,
  ) {
    const d = date ?? new Date().toISOString().split('T')[0];
    return this.schedules.findByDateForFriend(req.user.sub, friendId, d);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.schedules.findOne(req.user.sub, id);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(req.user.sub, dto);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedules.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.schedules.remove(req.user.sub, id);
  }
}
