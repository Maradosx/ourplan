import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty, IsArray, ArrayNotEmpty, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

// ─── Shift config (backend source of truth for time/availability defaults) ────

const VALID_SHIFT_KEYS = new Set([
  'night', 'morning', 'half_day_am', 'day', 'full_day',
  'afternoon', 'half_day_pm', 'evening', 'overtime', 'off', 'leave',
]);

interface ShiftDefaults {
  startTime: string | null;
  endTime: string | null;
  blocksAvailability: boolean;
}

const SHIFT_DEFAULTS: Record<string, ShiftDefaults> = {
  night:       { startTime: '00:00', endTime: '08:00', blocksAvailability: true },
  morning:     { startTime: '06:00', endTime: '12:00', blocksAvailability: true },
  half_day_am: { startTime: '08:00', endTime: '12:00', blocksAvailability: true },
  day:         { startTime: '08:00', endTime: '16:00', blocksAvailability: true },
  full_day:    { startTime: '09:00', endTime: '17:00', blocksAvailability: true },
  afternoon:   { startTime: '12:00', endTime: '18:00', blocksAvailability: true },
  half_day_pm: { startTime: '13:00', endTime: '17:00', blocksAvailability: true },
  evening:     { startTime: '16:00', endTime: '00:00', blocksAvailability: true },
  overtime:    { startTime: '17:00', endTime: '20:00', blocksAvailability: true },
  off:         { startTime: null,    endTime: null,    blocksAvailability: false },
  leave:       { startTime: null,    endTime: null,    blocksAvailability: false },
};

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class UpsertQuickShiftDto {
  @IsString() @IsNotEmpty()
  date: string;
  @IsString() @IsNotEmpty()
  shiftKey: string;
  /** Optional custom start time (HH:MM) – only honoured for 'overtime' */
  @IsOptional() @IsString()
  customStart?: string;
  /** Optional custom end time (HH:MM) – only honoured for 'overtime' */
  @IsOptional() @IsString()
  customEnd?: string;
}

export class BulkApplyDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true })
  dates: string[];
  @IsString() @IsNotEmpty()
  shiftKey: string;
  /** Optional custom start time (HH:MM) – only honoured for 'overtime' */
  @IsOptional() @IsString()
  customStart?: string;
  /** Optional custom end time (HH:MM) – only honoured for 'overtime' */
  @IsOptional() @IsString()
  customEnd?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class QuickShiftsService {
  constructor(private prisma: PrismaService) {}

  // ─── Validation ─────────────────────────────────────────────────────────────

  private validateShiftKey(key: string): void {
    if (!VALID_SHIFT_KEYS.has(key)) {
      throw new BadRequestException(`Invalid shiftKey: ${key}`);
    }
  }

  private validateDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException(`Invalid date format. Expected YYYY-MM-DD, got: ${date}`);
    }
  }

  // ─── Overlap detection ───────────────────────────────────────────────────────

  private timeToMins(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  private validateTimeHHMM(t: string, label: string): void {
    if (!/^\d{2}:\d{2}$/.test(t)) {
      throw new BadRequestException(`Invalid ${label} format. Expected HH:MM.`);
    }
    const [h, m] = t.split(':').map(Number);
    if (h > 23 || m > 59) {
      throw new BadRequestException(`Invalid ${label}: ${t}`);
    }
  }

  /** Resolve the effective start/end for overlap calculation.
   *  For 'overtime' with custom times, the custom values take precedence. */
  private resolveShiftRange(
    key: string,
    customStart?: string,
    customEnd?: string,
  ): { startTime: string | null; endTime: string | null } {
    if (key === 'overtime' && customStart && customEnd) {
      return { startTime: customStart, endTime: customEnd };
    }
    return SHIFT_DEFAULTS[key] ?? { startTime: null, endTime: null };
  }

  private rangesOverlap(
    aStart: string | null, aEnd: string | null,
    bStart: string | null, bEnd: string | null,
  ): boolean {
    if (!aStart || !bStart) return false;
    const a0 = this.timeToMins(aStart);
    const a1 = aEnd === '00:00' ? 1440 : this.timeToMins(aEnd!);
    const b0 = this.timeToMins(bStart);
    const b1 = bEnd === '00:00' ? 1440 : this.timeToMins(bEnd!);
    return a0 < b1 && b0 < a1;
  }

  private shiftsOverlap(keyA: string, keyB: string): boolean {
    const a = SHIFT_DEFAULTS[keyA];
    const b = SHIFT_DEFAULTS[keyB];
    // off/leave have no time range → never overlap with anything
    if (!a?.startTime || !b?.startTime) return false;
    return this.rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  /** Get all quick shifts for a single date. Returns empty array if none. */
  async getByDate(userId: string, date: string) {
    this.validateDate(date);
    return this.prisma.quickShift.findMany({
      where: { userId, date },
      orderBy: { shiftKey: 'asc' },
    });
  }

  /**
   * Get all quick shifts for a calendar month.
   * month is 0-indexed (JS Date convention: 0=Jan … 11=Dec).
   */
  async getMonth(userId: string, year: number, month: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const m   = month + 1; // 1-indexed for string
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dateStart = `${year}-${pad(m)}-01`;
    const dateEnd   = `${year}-${pad(m)}-${pad(daysInMonth)}`;

    return this.prisma.quickShift.findMany({
      where: { userId, date: { gte: dateStart, lte: dateEnd } },
      orderBy: { date: 'asc' },
    });
  }

  // ─── Write ───────────────────────────────────────────────────────────────────

  /** Upsert (create or replace) quick shift for a single date + shiftKey pair. */
  async upsert(userId: string, dto: UpsertQuickShiftDto) {
    this.validateDate(dto.date);
    this.validateShiftKey(dto.shiftKey);

    // Validate + resolve custom times (overtime only)
    let effectiveStart: string | null;
    let effectiveEnd:   string | null;
    if (dto.shiftKey === 'overtime' && (dto.customStart || dto.customEnd)) {
      if (!dto.customStart || !dto.customEnd) {
        throw new BadRequestException('Both customStart and customEnd are required for overtime.');
      }
      this.validateTimeHHMM(dto.customStart, 'customStart');
      this.validateTimeHHMM(dto.customEnd,   'customEnd');
      const s = this.timeToMins(dto.customStart);
      const e = this.timeToMins(dto.customEnd);
      if (s >= e) throw new BadRequestException('customEnd must be after customStart.');
      effectiveStart = dto.customStart;
      effectiveEnd   = dto.customEnd;
    } else {
      const defaults = SHIFT_DEFAULTS[dto.shiftKey];
      effectiveStart = defaults.startTime;
      effectiveEnd   = defaults.endTime;
    }

    // Check for overlap with existing shifts on the same date (other shiftKeys)
    const existing = await this.prisma.quickShift.findMany({
      where: { userId, date: dto.date, NOT: { shiftKey: dto.shiftKey } },
    });
    for (const ex of existing) {
      const exRange = this.resolveShiftRange(ex.shiftKey, ex.startTime ?? undefined, ex.endTime ?? undefined);
      if (this.rangesOverlap(effectiveStart, effectiveEnd, exRange.startTime, exRange.endTime)) {
        throw new BadRequestException('กะทับซ้อนกับกะที่มีอยู่');
      }
    }

    const defaults = SHIFT_DEFAULTS[dto.shiftKey];
    return this.prisma.quickShift.upsert({
      where: { userId_date_shiftKey: { userId, date: dto.date, shiftKey: dto.shiftKey } },
      create: {
        userId,
        date: dto.date,
        shiftKey: dto.shiftKey,
        startTime: effectiveStart,
        endTime: effectiveEnd,
        blocksAvailability: defaults.blocksAvailability,
      },
      update: {
        startTime: effectiveStart,
        endTime: effectiveEnd,
        blocksAvailability: defaults.blocksAvailability,
      },
    });
  }

  /**
   * Bulk apply one shift type to multiple dates.
   * Returns the count of created/updated records and how many had an existing shift.
   */
  async bulkApply(userId: string, dto: BulkApplyDto) {
    if (!dto.dates || dto.dates.length === 0) {
      throw new BadRequestException('dates must be a non-empty array');
    }
    if (dto.dates.length > 90) {
      throw new BadRequestException('Cannot apply to more than 90 dates at once');
    }
    this.validateShiftKey(dto.shiftKey);
    dto.dates.forEach((d) => this.validateDate(d));

    // Validate + resolve custom times (overtime only)
    let effectiveStart: string | null;
    let effectiveEnd:   string | null;
    if (dto.shiftKey === 'overtime' && (dto.customStart || dto.customEnd)) {
      if (!dto.customStart || !dto.customEnd) {
        throw new BadRequestException('Both customStart and customEnd are required for overtime.');
      }
      this.validateTimeHHMM(dto.customStart, 'customStart');
      this.validateTimeHHMM(dto.customEnd,   'customEnd');
      const s = this.timeToMins(dto.customStart);
      const e = this.timeToMins(dto.customEnd);
      if (s >= e) throw new BadRequestException('customEnd must be after customStart.');
      effectiveStart = dto.customStart;
      effectiveEnd   = dto.customEnd;
    } else {
      const defaults = SHIFT_DEFAULTS[dto.shiftKey];
      effectiveStart = defaults.startTime;
      effectiveEnd   = defaults.endTime;
    }

    // Check overlaps across all target dates
    const existingAll = await this.prisma.quickShift.findMany({
      where: { userId, date: { in: dto.dates }, NOT: { shiftKey: dto.shiftKey } },
    });
    for (const ex of existingAll) {
      const exRange = this.resolveShiftRange(ex.shiftKey, ex.startTime ?? undefined, ex.endTime ?? undefined);
      if (this.rangesOverlap(effectiveStart, effectiveEnd, exRange.startTime, exRange.endTime)) {
        throw new BadRequestException('กะทับซ้อนกับกะที่มีอยู่');
      }
    }

    // Count pre-existing entries for the same shiftKey (being replaced)
    const replacedCount = await this.prisma.quickShift.count({
      where: { userId, date: { in: dto.dates }, shiftKey: dto.shiftKey },
    });

    const defaults = SHIFT_DEFAULTS[dto.shiftKey];
    const results = await Promise.all(
      dto.dates.map((date) =>
        this.prisma.quickShift.upsert({
          where: { userId_date_shiftKey: { userId, date, shiftKey: dto.shiftKey } },
          create: {
            userId, date,
            shiftKey: dto.shiftKey,
            startTime: effectiveStart,
            endTime: effectiveEnd,
            blocksAvailability: defaults.blocksAvailability,
          },
          update: {
            startTime: effectiveStart,
            endTime: effectiveEnd,
            blocksAvailability: defaults.blocksAvailability,
          },
        }),
      ),
    );

    return { count: results.length, replacedCount };
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  /** Delete a specific shift by date + shiftKey. Throws 404 if not found. */
  async deleteByDateAndShiftKey(userId: string, date: string, shiftKey: string) {
    this.validateDate(date);
    this.validateShiftKey(shiftKey);
    const existing = await this.prisma.quickShift.findUnique({
      where: { userId_date_shiftKey: { userId, date, shiftKey } },
    });
    if (!existing) throw new NotFoundException('Quick shift not found');
    return this.prisma.quickShift.delete({
      where: { userId_date_shiftKey: { userId, date, shiftKey } },
    });
  }

  /** Delete ALL quick shifts for a specific date. */
  async deleteAllByDate(userId: string, date: string) {
    this.validateDate(date);
    return this.prisma.quickShift.deleteMany({
      where: { userId, date },
    });
  }
}
