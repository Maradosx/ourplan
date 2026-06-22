import { SchedulesService } from './schedules.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Mock of the PrismaService surface that SchedulesService.findFreeSlots uses.
 * findFreeSlots issues exactly three queries: friendship.findMany,
 * schedule.findMany, and quickShift.findMany.
 */
function buildPrismaMock() {
  return {
    friendship: { findMany: jest.fn() },
    schedule: { findMany: jest.fn() },
    quickShift: { findMany: jest.fn() },
  };
}

const ME = 'user-me';
const FRIEND = 'user-friend';

/**
 * findFreeSlots scans days starting from `now`. The day-bucketing compares each
 * schedule's UTC date (toISOString) against a locally-formatted day string,
 * while the scanning window is built from LOCAL-time strings. Anchoring busy
 * events at local NOON keeps the UTC date and local date identical in any
 * realistic timezone, so the fixtures stay deterministic regardless of where
 * the test runs. We target "tomorrow" to stay safely inside the [now, now+days]
 * range without racing the current wall clock.
 *
 * Scanning mechanics worth keeping in mind when sizing fixtures:
 *  - The cursor advances in 30-minute steps; each step probes the window
 *    [cursor, cursor + minDuration]. A run is "open" only while the FULL probe
 *    window is free, so a free gap of length G yields a recorded slot roughly
 *    (G - minDuration + 30min) long. Fixtures therefore use wide-open windows so
 *    qualifying slots are comfortably produced.
 */
function dayStrFor(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Local-time Date at the given hour:minute on the offset day. */
function localAt(offsetDays: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

describe('SchedulesService.findFreeSlots', () => {
  let prisma: ReturnType<typeof buildPrismaMock>;
  let service: SchedulesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new SchedulesService(prisma as unknown as PrismaService);
    // Default: no quick shifts unless a test overrides.
    prisma.quickShift.findMany.mockResolvedValue([]);
  });

  it('passes a `where` whose OR blocks the user OWN events (all visibility) AND only non-private friend events', async () => {
    prisma.friendship.findMany.mockResolvedValue([]); // solo
    prisma.schedule.findMany.mockResolvedValue([]);

    await service.findFreeSlots(ME, 2, 60, undefined, 8, 22);

    const whereArg = prisma.schedule.findMany.mock.calls[0][0].where;
    // The OR must contain: the user's own events (no visibility filter)…
    expect(whereArg.OR).toEqual(expect.arrayContaining([{ userId: ME }]));
    // …and friends' events constrained to non-private visibility.
    const friendClause = whereArg.OR.find((c: any) => c.visibility);
    expect(friendClause).toMatchObject({ visibility: { not: 'private' } });
    // The scan range is bounded [now, now + days].
    expect(whereArg.startDatetime).toEqual(
      expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
    );
  });

  it("counts the requesting user's OWN PRIVATE event as busy (it still blocks their availability)", async () => {
    prisma.friendship.findMany.mockResolvedValue([]); // solo: only "Me"
    // A private own-event blocking 12:00–15:00 tomorrow.
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'own-private',
        userId: ME,
        visibility: 'private',
        startDatetime: localAt(1, 12),
        endDatetime: localAt(1, 15),
      },
    ]);

    const slots = await service.findFreeSlots(ME, 2, 60, undefined, 8, 22);
    const tomorrow = dayStrFor(1);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    // Solo participant => a slot only appears when they're free, so no returned
    // slot may overlap the private 12:00–15:00 block. The private event still
    // blocks availability despite being private.
    expect(tomorrowSlots.length).toBeGreaterThan(0);
    for (const s of tomorrowSlots) {
      const noOverlap = s.endTime <= '12:00' || s.startTime >= '15:00';
      expect(noOverlap).toBe(true);
      expect(s.allFree).toBe(true); // solo
      expect(s.totalCount).toBe(1);
    }
    // Free windows exist both before (08:00–12:00) and after (15:00–22:00).
    expect(tomorrowSlots.some((s) => s.startTime === '08:00')).toBe(true);
    expect(tomorrowSlots.some((s) => s.startTime >= '15:00')).toBe(true);
  });

  it('reports free/busy counts: a slot overlapping a busy participant is excluded; open windows are allFree', async () => {
    // Me + one friend. Friend is busy 12:00–15:00; I am free all day.
    // For 2 participants the "mostFree" threshold is ceil(2 * 0.7) = 2, so BOTH
    // must be free for a slot — the overlap window yields no slot, the open
    // windows yield allFree slots.
    prisma.friendship.findMany.mockResolvedValue([
      {
        requesterId: ME,
        addresseeId: FRIEND,
        requester: { id: ME, displayName: 'Me', avatarUrl: null },
        addressee: { id: FRIEND, displayName: 'Friend', avatarUrl: null },
      },
    ]);
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'friend-busy',
        userId: FRIEND,
        visibility: 'friends',
        startDatetime: localAt(1, 12),
        endDatetime: localAt(1, 15),
      },
    ]);

    const slots = await service.findFreeSlots(ME, 2, 60, undefined, 8, 22);
    const tomorrow = dayStrFor(1);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    expect(tomorrowSlots.length).toBeGreaterThan(0);
    for (const s of tomorrowSlots) {
      expect(s.totalCount).toBe(2);
      // No returned slot overlaps the friend's 12:00–15:00 block.
      const noOverlap = s.endTime <= '12:00' || s.startTime >= '15:00';
      expect(noOverlap).toBe(true);
    }
    // The morning window (starts 08:00) is fully free => allFree with freeCount 2.
    const morning = tomorrowSlots.find((s) => s.startTime === '08:00');
    expect(morning).toBeDefined();
    expect(morning!.allFree).toBe(true);
    expect(morning!.freeCount).toBe(2);
  });

  it('surfaces a NOT-allFree slot under the 70% rule when one of four participants is busy', async () => {
    // Me + 3 friends => "mostFree" threshold = ceil(4 * 0.7) = 3, so a 3-of-4
    // window still qualifies. freeCount is captured at the moment a run OPENS, so
    // to observe a not-allFree slot the busy interval must cover the window start
    // (08:00). Here f1 is busy 08:00–15:00: the run opens at 08:00 with 3 free and
    // stays open all day, yielding one slot with freeCount 3 and allFree=false.
    const friends = ['f1', 'f2', 'f3'];
    prisma.friendship.findMany.mockResolvedValue(
      friends.map((fid) => ({
        requesterId: ME,
        addresseeId: fid,
        requester: { id: ME, displayName: 'Me', avatarUrl: null },
        addressee: { id: fid, displayName: fid, avatarUrl: null },
      })),
    );
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'f1-busy',
        userId: 'f1',
        visibility: 'friends',
        startDatetime: localAt(1, 8),
        endDatetime: localAt(1, 15),
      },
    ]);

    const slots = await service.findFreeSlots(ME, 2, 60, undefined, 8, 22);
    const tomorrow = dayStrFor(1);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    expect(tomorrowSlots.length).toBeGreaterThan(0);
    // Every slot covers all 4 participants in totals.
    for (const s of tomorrowSlots) expect(s.totalCount).toBe(4);
    // The run opening at 08:00 has only 3 of 4 free => surfaces a slot that is
    // NOT allFree, with freeCount 3.
    const opening = tomorrowSlots.find((s) => s.startTime === '08:00');
    expect(opening).toBeDefined();
    expect(opening!.allFree).toBe(false);
    expect(opening!.freeCount).toBe(3);
  });

  it('bounds slots within [windowStart, windowEnd] and never reports times outside it', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);
    prisma.schedule.findMany.mockResolvedValue([]); // fully free day

    const slots = await service.findFreeSlots(ME, 2, 60, undefined, 10, 14); // 10:00–14:00 only
    const tomorrow = dayStrFor(1);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    expect(tomorrowSlots.length).toBeGreaterThan(0);
    for (const s of tomorrowSlots) {
      expect(s.startTime >= '10:00').toBe(true);
      expect(s.endTime <= '14:00').toBe(true);
    }
  });

  it('respects minDuration: a free gap shorter than minDuration produces no slot', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);
    // Busy 09:30–21:30 leaves only 08:00–09:30 (1.5h) and 21:30–22:00 (0.5h) free.
    // With minDuration = 180 mins (3h), neither gap qualifies => zero slots tomorrow.
    prisma.schedule.findMany.mockResolvedValue([
      {
        id: 'own-busy',
        userId: ME,
        visibility: 'private',
        startDatetime: localAt(1, 9, 30),
        endDatetime: localAt(1, 21, 30),
      },
    ]);

    const slots = await service.findFreeSlots(ME, 2, 180, undefined, 8, 22);
    const tomorrow = dayStrFor(1);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    expect(tomorrowSlots).toHaveLength(0);
  });

  it('blocks availability via Quick Shifts that have blocksAvailability=true', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);
    prisma.schedule.findMany.mockResolvedValue([]); // no calendar events
    const tomorrow = dayStrFor(1);
    // A day shift 12:00–17:00 from a Quick Shift should carve the same hole as a
    // regular event would.
    prisma.quickShift.findMany.mockResolvedValue([
      {
        id: 'qs-1',
        userId: ME,
        date: tomorrow,
        startTime: '12:00',
        endTime: '17:00',
        blocksAvailability: true,
      },
    ]);

    const slots = await service.findFreeSlots(ME, 2, 60, undefined, 8, 22);
    const tomorrowSlots = slots.filter((s) => s.dateISO === tomorrow);

    expect(tomorrowSlots.length).toBeGreaterThan(0);
    for (const s of tomorrowSlots) {
      const noOverlap = s.endTime <= '12:00' || s.startTime >= '17:00';
      expect(noOverlap).toBe(true);
    }
    // The morning window (starts 08:00) remains free.
    expect(tomorrowSlots.some((s) => s.startTime === '08:00')).toBe(true);
  });

  it('only considers the friends passed in friendIds when that filter is supplied', async () => {
    prisma.friendship.findMany.mockResolvedValue([
      {
        requesterId: ME,
        addresseeId: FRIEND,
        requester: { id: ME, displayName: 'Me', avatarUrl: null },
        addressee: { id: FRIEND, displayName: 'Friend', avatarUrl: null },
      },
      {
        requesterId: 'other',
        addresseeId: ME,
        requester: { id: 'other', displayName: 'Other', avatarUrl: null },
        addressee: { id: ME, displayName: 'Me', avatarUrl: null },
      },
    ]);
    prisma.schedule.findMany.mockResolvedValue([]);

    await service.findFreeSlots(ME, 1, 60, [FRIEND], 8, 22);

    // The schedule query restricts friend events to the filtered friend only.
    const whereArg = prisma.schedule.findMany.mock.calls[0][0].where;
    const friendClause = whereArg.OR.find((c: any) => c.userId && c.userId.in);
    expect(friendClause.userId.in).toEqual([FRIEND]);
    // QuickShift participants are Me + the filtered friend only ("other" excluded).
    const qsWhere = prisma.quickShift.findMany.mock.calls[0][0].where;
    expect(qsWhere.userId.in).toEqual(expect.arrayContaining([ME, FRIEND]));
    expect(qsWhere.userId.in).not.toContain('other');
  });

  it('caps the result at 20 slots', async () => {
    prisma.friendship.findMany.mockResolvedValue([]);
    prisma.schedule.findMany.mockResolvedValue([]); // every day fully free
    // 30 fully-free days would generate one big slot per day (>20) → capped.
    const slots = await service.findFreeSlots(ME, 30, 60, undefined, 8, 22);
    expect(slots.length).toBeLessThanOrEqual(20);
  });
});
