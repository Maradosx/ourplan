import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, Visibility } from '@prisma/client';

export interface CreateScheduleDto {
  title: string;
  description?: string;
  category: Category;
  startDatetime: string;
  endDatetime: string;
  location?: string;
  visibility?: Visibility;
  isRecurring?: boolean;
  recurrenceRule?: string;
  colorTag?: string;
  icon?: string;
}

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  private tp(n: number) { return String(n).padStart(2, '0'); }

  // ─── My schedule ────────────────────────────────────────────────────────────

  async findByDate(userId: string, date: string) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd   = new Date(`${date}T23:59:59`);

    const [regular, recurringBase] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: false, startDatetime: { gte: dayStart, lte: dayEnd } },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: true, startDatetime: { lte: dayEnd } },
        orderBy: { startDatetime: 'asc' },
      }),
    ]);

    const dateObj = new Date(`${date}T00:00:00`);
    const expanded = recurringBase
      .filter(sc => this.doesRecurOnDate(sc, dateObj))
      .map(sc => {
        const dur = sc.endDatetime.getTime() - sc.startDatetime.getTime();
        const newStart = new Date(`${date}T${this.tp(sc.startDatetime.getHours())}:${this.tp(sc.startDatetime.getMinutes())}:00`);
        return { ...sc, startDatetime: newStart, endDatetime: new Date(newStart.getTime() + dur) };
      });

    return [...regular, ...expanded].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  // ─── Friend schedule (day) ──────────────────────────────────────────────────

  async findByDateForFriend(requesterId: string, friendId: string, date: string) {
    await this.assertFriendship(requesterId, friendId);

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd   = new Date(`${date}T23:59:59`);

    const [regular, recurringBase] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId: friendId, isRecurring: false, startDatetime: { gte: dayStart, lte: dayEnd }, visibility: { not: 'private' } },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId: friendId, isRecurring: true, startDatetime: { lte: dayEnd }, visibility: { not: 'private' } },
        orderBy: { startDatetime: 'asc' },
      }),
    ]);

    const dateObj = new Date(`${date}T00:00:00`);
    const expanded = recurringBase
      .filter(sc => this.doesRecurOnDate(sc, dateObj))
      .map(sc => {
        const dur = sc.endDatetime.getTime() - sc.startDatetime.getTime();
        const newStart = new Date(`${date}T${this.tp(sc.startDatetime.getHours())}:${this.tp(sc.startDatetime.getMinutes())}:00`);
        return { ...sc, startDatetime: newStart, endDatetime: new Date(newStart.getTime() + dur) };
      });

    return [...regular, ...expanded].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  // ─── Friend schedule (month – for calendar dots) ────────────────────────────

  async findMonthForFriend(requesterId: string, friendId: string, year: number, month: number) {
    await this.assertFriendship(requesterId, friendId);

    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);

    const [regular, recurringBase] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId: friendId, isRecurring: false, startDatetime: { gte: monthStart, lte: monthEnd }, visibility: { not: 'private' } },
        select: { id: true, title: true, category: true, startDatetime: true },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId: friendId, isRecurring: true, startDatetime: { lte: monthEnd }, visibility: { not: 'private' } },
        select: { id: true, title: true, category: true, startDatetime: true, recurrenceRule: true },
      }),
    ]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const expanded: { id: string; title: string; category: any; startDatetime: Date }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      for (const sc of recurringBase) {
        if (this.doesRecurOnDate(sc, dateObj)) {
          expanded.push({
            id: `${sc.id}-r${d}`,
            title: sc.title,
            category: sc.category,
            startDatetime: new Date(year, month, d, sc.startDatetime.getHours(), sc.startDatetime.getMinutes()),
          });
        }
      }
    }

    return [...regular, ...expanded].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  // ─── My schedule (month – for calendar dots) ─────────────────────────────────

  async findMonthForMe(userId: string, year: number, month: number) {
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);

    const [regular, recurringBase] = await Promise.all([
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: false, startDatetime: { gte: monthStart, lte: monthEnd } },
        select: { id: true, category: true, startDatetime: true },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: true, startDatetime: { lte: monthEnd } },
        select: { id: true, category: true, startDatetime: true, recurrenceRule: true },
      }),
    ]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const expanded: { id: string; category: any; startDatetime: Date }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      for (const sc of recurringBase) {
        if (this.doesRecurOnDate(sc, dateObj)) {
          expanded.push({
            id: `${sc.id}-r${d}`,
            category: sc.category,
            startDatetime: new Date(year, month, d, sc.startDatetime.getHours(), sc.startDatetime.getMinutes()),
          });
        }
      }
    }

    return [...regular, ...expanded].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  // ─── All friends schedule (day, optional friendId filter for groups) ─────────

  async findDayAllFriends(userId: string, date: string, filterIds?: string[]) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        addressee: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });

    let friends = friendships.map(f => f.requesterId === userId ? f.addressee : f.requester);
    if (filterIds && filterIds.length > 0) {
      friends = friends.filter(f => filterIds.includes(f.id));
    }

    const dayStart  = new Date(`${date}T00:00:00`);
    const dayEnd    = new Date(`${date}T23:59:59`);
    const friendIds = friends.map(f => f.id);
    const friendMap = Object.fromEntries(friends.map(f => [f.id, f]));

    // Fetch friends' non-private events + own events (all visibility) in parallel
    const [fRegular, fRecurring, myRegular, myRecurring] = await Promise.all([
      friendIds.length > 0
        ? this.prisma.schedule.findMany({
            where: { userId: { in: friendIds }, isRecurring: false, startDatetime: { gte: dayStart, lte: dayEnd }, visibility: { not: 'private' } },
            orderBy: { startDatetime: 'asc' },
          })
        : Promise.resolve([]),
      friendIds.length > 0
        ? this.prisma.schedule.findMany({
            where: { userId: { in: friendIds }, isRecurring: true, startDatetime: { lte: dayEnd }, visibility: { not: 'private' } },
            orderBy: { startDatetime: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: false, startDatetime: { gte: dayStart, lte: dayEnd } },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: true, startDatetime: { lte: dayEnd } },
        orderBy: { startDatetime: 'asc' },
      }),
    ]);

    const dateObj = new Date(`${date}T00:00:00`);
    const expandRecurring = (list: typeof fRecurring) =>
      list.filter(sc => this.doesRecurOnDate(sc, dateObj)).map(sc => {
        const dur = sc.endDatetime.getTime() - sc.startDatetime.getTime();
        const newStart = new Date(`${date}T${this.tp(sc.startDatetime.getHours())}:${this.tp(sc.startDatetime.getMinutes())}:00`);
        return { ...sc, startDatetime: newStart, endDatetime: new Date(newStart.getTime() + dur) };
      });

    const all = [
      ...fRegular, ...expandRecurring(fRecurring),
      ...myRegular, ...expandRecurring(myRecurring),
    ].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());

    return all.map(e => ({
      ...e,
      friendDisplayName: e.userId === userId ? null : (friendMap[e.userId]?.displayName ?? ''),
      friendAvatarUrl:   e.userId === userId ? null : (friendMap[e.userId]?.avatarUrl   ?? null),
      isSelf: e.userId === userId,
    }));
  }

  // ─── All friends schedule (month – for calendar dots) ────────────────────────

  async findMonthAllFriends(userId: string, year: number, month: number, filterIds?: string[]) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });

    let friendIds = friendships.map(f => f.requesterId === userId ? f.addresseeId : f.requesterId);
    if (filterIds && filterIds.length > 0) friendIds = friendIds.filter(id => filterIds.includes(id));

    const monthStart  = new Date(year, month, 1);
    const monthEnd    = new Date(year, month + 1, 0, 23, 59, 59);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Fetch friends' non-private + own events in parallel
    const [fRegular, fRecurring, myRegular, myRecurring] = await Promise.all([
      friendIds.length > 0
        ? this.prisma.schedule.findMany({
            where: { userId: { in: friendIds }, isRecurring: false, startDatetime: { gte: monthStart, lte: monthEnd }, visibility: { not: 'private' } },
            select: { id: true, category: true, startDatetime: true, userId: true },
            orderBy: { startDatetime: 'asc' },
          })
        : Promise.resolve([]),
      friendIds.length > 0
        ? this.prisma.schedule.findMany({
            where: { userId: { in: friendIds }, isRecurring: true, startDatetime: { lte: monthEnd }, visibility: { not: 'private' } },
            select: { id: true, category: true, startDatetime: true, userId: true, recurrenceRule: true },
          })
        : Promise.resolve([]),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: false, startDatetime: { gte: monthStart, lte: monthEnd } },
        select: { id: true, category: true, startDatetime: true, userId: true },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.schedule.findMany({
        where: { userId, isRecurring: true, startDatetime: { lte: monthEnd } },
        select: { id: true, category: true, startDatetime: true, userId: true, recurrenceRule: true },
      }),
    ]);

    const expandMonth = (list: typeof fRecurring) => {
      const out: { id: string; category: any; startDatetime: Date; userId: string }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        for (const sc of list) {
          if (this.doesRecurOnDate(sc, dateObj)) {
            out.push({
              id: `${sc.id}-r${d}`,
              category: sc.category,
              userId: sc.userId,
              startDatetime: new Date(year, month, d, sc.startDatetime.getHours(), sc.startDatetime.getMinutes()),
            });
          }
        }
      }
      return out;
    };

    return [
      ...fRegular, ...expandMonth(fRecurring),
      ...myRegular, ...expandMonth(myRecurring),
    ].sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async findOne(userId: string, id: string) {
    const sc = await this.prisma.schedule.findUnique({ where: { id } });
    if (!sc) throw new NotFoundException('Schedule not found');
    if (sc.userId !== userId) throw new ForbiddenException();
    return sc;
  }

  async create(userId: string, dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: { ...dto, userId, startDatetime: new Date(dto.startDatetime), endDatetime: new Date(dto.endDatetime) },
    });
  }

  async update(userId: string, id: string, dto: Partial<CreateScheduleDto>) {
    const sc = await this.prisma.schedule.findUnique({ where: { id } });
    if (!sc) throw new NotFoundException('Schedule not found');
    if (sc.userId !== userId) throw new ForbiddenException();
    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...dto,
        startDatetime: dto.startDatetime ? new Date(dto.startDatetime) : undefined,
        endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    const sc = await this.prisma.schedule.findUnique({ where: { id } });
    if (!sc) throw new NotFoundException('Schedule not found');
    if (sc.userId !== userId) throw new ForbiddenException();
    return this.prisma.schedule.delete({ where: { id } });
  }

  // ─── Free slots ─────────────────────────────────────────────────────────────

  async findFreeSlots(
    userId: string,
    days = 7,
    minDurationMins = 60,
    friendIds?: string[],
    windowStart = 8,   // earliest hour to consider (default 08:00)
    windowEnd   = 22,  // latest hour to consider (default 22:00)
  ) {
    const friendships = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, displayName: true, avatarUrl: true } },
        addressee: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    let friends = friendships.map(f => f.requesterId === userId ? f.addressee : f.requester);
    if (friendIds && friendIds.length > 0) friends = friends.filter(f => friendIds.includes(f.id));

    const participants = [{ id: userId, displayName: 'Me', avatarUrl: null }, ...friends];
    const participantIds = participants.map(p => p.id);
    const friendParticipantIds = friends.map(f => f.id);

    const now = new Date();
    const rangeEnd = new Date();
    rangeEnd.setDate(now.getDate() + days);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        startDatetime: { gte: now, lte: rangeEnd },
        OR: [
          // The requesting user's OWN events always block their availability — including
          // private ones (you are still busy during your own private event).
          { userId },
          // Friends' events block only when visible to the requester.
          { userId: { in: friendParticipantIds }, visibility: { not: 'private' } },
        ],
      },
      orderBy: { startDatetime: 'asc' },
    });

    // Also fetch Quick Shifts that block availability for all participants
    const todayStr    = now.toISOString().split('T')[0];
    const rangeEndStr = rangeEnd.toISOString().split('T')[0];
    const quickShifts = await this.prisma.quickShift.findMany({
      where: {
        userId: { in: participantIds },
        date: { gte: todayStr, lte: rangeEndStr },
        blocksAvailability: true,
      },
    });

    const freeSlots: any[] = [];
    const DAY_START = Math.max(0, Math.min(windowStart, 23));
    const DAY_END   = Math.max(DAY_START + 1, Math.min(windowEnd, 24));

    for (let d = 0; d < days; d++) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() + d);
      const y = dayDate.getFullYear();
      const m = this.tp(dayDate.getMonth() + 1);
      const dd = this.tp(dayDate.getDate());
      const dayStr = `${y}-${m}-${dd}`;

      const busyByUser: Record<string, { s: Date; e: Date }[]> = {};
      participantIds.forEach(id => (busyByUser[id] = []));

      // Regular schedule blocks
      for (const sc of schedules) {
        const scDay = sc.startDatetime.toISOString().split('T')[0];
        if (scDay === dayStr && busyByUser[sc.userId]) {
          busyByUser[sc.userId].push({ s: sc.startDatetime, e: sc.endDatetime });
        }
      }

      // Quick Shift blocks
      for (const qs of quickShifts) {
        if (qs.date !== dayStr || !busyByUser[qs.userId]) continue;
        if (!qs.startTime || !qs.endTime) continue;
        const [sh, sm] = qs.startTime.split(':').map(Number);
        let [eh, em]   = qs.endTime.split(':').map(Number);
        // evening shift: endTime '00:00' = midnight → treat as 24:00
        if (eh === 0 && em === 0) { eh = 23; em = 59; }
        const qsStart = new Date(`${dayStr}T${this.tp(sh)}:${this.tp(sm)}:00`);
        const qsEnd   = new Date(`${dayStr}T${this.tp(eh)}:${this.tp(em)}:00`);
        busyByUser[qs.userId].push({ s: qsStart, e: qsEnd });
      }

      const dayStart = new Date(`${dayStr}T${this.tp(DAY_START)}:00:00`);
      const dayEnd   = new Date(`${dayStr}T${this.tp(DAY_END)}:00:00`);

      const checkInterval = (slotStart: Date, slotEnd: Date) => {
        let freeCount = 0;
        for (const id of participantIds) {
          const isBusy = busyByUser[id].some(b => b.s < slotEnd && b.e > slotStart);
          if (!isBusy) freeCount++;
        }
        return freeCount;
      };

      const windowMs = minDurationMins * 60 * 1000;
      let cursor = dayStart.getTime();
      let slotStart: number | null = null;
      let slotFreeCount = 0;

      while (cursor + windowMs <= dayEnd.getTime()) {
        const ws = new Date(cursor);
        const we = new Date(cursor + windowMs);
        const freeCount = checkInterval(ws, we);
        const mostFree = freeCount >= Math.ceil(participantIds.length * 0.7);

        if (mostFree) {
          if (slotStart === null) { slotStart = cursor; slotFreeCount = freeCount; }
        } else {
          if (slotStart !== null) {
            const dur = (cursor - slotStart) / 3600000;
            if (dur >= minDurationMins / 60) {
              const st = new Date(slotStart);
              freeSlots.push({
                dateISO: dayStr,
                startTime: `${this.tp(st.getHours())}:${this.tp(st.getMinutes())}`,
                endTime:   `${this.tp(new Date(cursor).getHours())}:${this.tp(new Date(cursor).getMinutes())}`,
                durationHours: Math.round(dur * 10) / 10,
                allFree: slotFreeCount === participantIds.length,
                freeCount: slotFreeCount,
                totalCount: participantIds.length,
                participants,
              });
            }
            slotStart = null;
          }
        }
        cursor += 30 * 60 * 1000;
      }

      if (slotStart !== null) {
        const dur = (cursor - slotStart) / 3600000;
        if (dur >= minDurationMins / 60) {
          const st = new Date(slotStart);
          freeSlots.push({
            dateISO: dayStr,
            startTime: `${this.tp(st.getHours())}:${this.tp(st.getMinutes())}`,
            endTime:   `${this.tp(DAY_END)}:00`,
            durationHours: Math.round(dur * 10) / 10,
            allFree: slotFreeCount === participantIds.length,
            freeCount: slotFreeCount,
            totalCount: participantIds.length,
            participants,
          });
        }
      }
    }

    return freeSlots.slice(0, 20);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async assertFriendship(userId: string, friendId: string) {
    const f = await this.prisma.friendship.findFirst({
      where: { status: 'accepted', OR: [{ requesterId: userId, addresseeId: friendId }, { requesterId: friendId, addresseeId: userId }] },
    });
    if (!f) throw new ForbiddenException('Not friends');
  }

  private doesRecurOnDate(sc: { startDatetime: Date; recurrenceRule: string | null }, date: Date): boolean {
    if (!sc.recurrenceRule) return false;
    try {
      const rule = JSON.parse(sc.recurrenceRule) as { type: string; weekDays?: number[]; endDate?: string };
      const orig  = sc.startDatetime;
      const start = new Date(orig.getFullYear(), orig.getMonth(), orig.getDate());
      const check = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (check < start) return false;
      if (rule.endDate && date > new Date(rule.endDate + 'T23:59:59')) return false;
      switch (rule.type) {
        case 'daily':   return true;
        case 'weekly':  return (rule.weekDays ?? []).includes((date.getDay() + 6) % 7);
        case 'monthly': return date.getDate() === orig.getDate();
        case 'yearly':  return date.getMonth() === orig.getMonth() && date.getDate() === orig.getDate();
        default:        return false;
      }
    } catch { return false; }
  }
}
