import { create } from 'zustand';
import { api } from '../lib/api';
import { ShiftKey, SHIFT_CONFIGS } from '../constants/quickShift';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuickShift {
  id: string;
  userId: string;
  /** YYYY-MM-DD local date */
  date: string;
  shiftKey: ShiftKey;
  /** HH:MM 24-hour, null for off/leave */
  startTime: string | null;
  endTime: string | null;
  blocksAvailability: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Overlap helper (mirrors backend logic) ───────────────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function shiftsOverlap(keyA: ShiftKey, keyB: ShiftKey): boolean {
  const a = SHIFT_CONFIGS[keyA];
  const b = SHIFT_CONFIGS[keyB];
  if (!a?.startTime || !b?.startTime) return false; // off/leave never overlap
  const aStart = timeToMins(a.startTime);
  const aEnd   = a.endTime === '00:00' ? 1440 : timeToMins(a.endTime!);
  const bStart = timeToMins(b.startTime);
  const bEnd   = b.endTime === '00:00' ? 1440 : timeToMins(b.endTime!);
  return aStart < bEnd && bStart < aEnd;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface QuickShiftStore {
  /** Map from YYYY-MM-DD → QuickShift[] for fast calendar lookup */
  monthShifts: Record<string, QuickShift[]>;
  isLoading: boolean;

  /** Load all quick shifts for a month. month is 0-indexed (JS Date). */
  fetchMonth: (year: number, month: number) => Promise<void>;

  /**
   * Apply one shift to one or more dates.
   * Returns { count, replacedCount }.
   * Throws if the backend rejects due to overlap.
   * customStart / customEnd are HH:MM strings – only used when shiftKey === 'overtime'.
   */
  applyShift: (
    dates: string[],
    shiftKey: ShiftKey,
    customStart?: string,
    customEnd?: string,
  ) => Promise<{ count: number; replacedCount: number }>;

  /**
   * Delete a shift.
   * If shiftKey is provided → DELETE /quick-shifts/:date/:shiftKey (one shift).
   * If shiftKey is omitted  → DELETE /quick-shifts/:date (all shifts for that day).
   */
  deleteShift: (date: string, shiftKey?: ShiftKey) => Promise<void>;

  /**
   * Check which of the given dates have an existing shift that OVERLAPS with newShiftKey.
   * Uses the current monthShifts cache – make sure fetchMonth() was called first.
   */
  checkConflicts: (dates: string[], newShiftKey: ShiftKey) => string[];

  /** Clear local cache (e.g. on logout) */
  clear: () => void;
}

export const useQuickShiftStore = create<QuickShiftStore>((set, get) => ({
  monthShifts: {},
  isLoading: false,

  // ── Fetch ──────────────────────────────────────────────────────────────────

  fetchMonth: async (year, month) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<QuickShift[]>('/quick-shifts/month', {
        params: { year, month },
      });
      // Group by date into arrays
      const map: Record<string, QuickShift[]> = {};
      for (const qs of data) {
        if (!map[qs.date]) map[qs.date] = [];
        map[qs.date].push(qs);
      }
      set({ monthShifts: map });
    } catch {
      // Keep existing cache on error
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Apply ─────────────────────────────────────────────────────────────────

  applyShift: async (dates, shiftKey, customStart, customEnd) => {
    set({ isLoading: true });
    try {
      const endpoint = dates.length === 1 ? '/quick-shifts' : '/quick-shifts/bulk';
      // Include custom times for overtime when provided
      const otExtras = shiftKey === 'overtime' && customStart && customEnd
        ? { customStart, customEnd }
        : {};
      const body = dates.length === 1
        ? { date: dates[0], shiftKey, ...otExtras }
        : { dates, shiftKey, ...otExtras };

      const { data } = await api.post<QuickShift | { count: number; replacedCount: number }>(
        endpoint, body,
      );

      // Update local cache
      set((state) => {
        const next = { ...state.monthShifts };
        if (dates.length === 1) {
          const qs = data as QuickShift;
          const existing = next[qs.date] ?? [];
          // Replace entry with same shiftKey, or append
          const idx = existing.findIndex((e) => e.shiftKey === qs.shiftKey);
          if (idx >= 0) {
            next[qs.date] = [...existing.slice(0, idx), qs, ...existing.slice(idx + 1)];
          } else {
            next[qs.date] = [...existing, qs];
          }
          return { monthShifts: next, isLoading: false };
        } else {
          // bulk: add lightweight placeholder for each date
          for (const date of dates) {
            const existing = next[date] ?? [];
            const idx = existing.findIndex((e) => e.shiftKey === shiftKey);
            const placeholder: QuickShift = {
              ...(existing[idx] ?? {}),
              date,
              shiftKey,
            } as QuickShift;
            if (idx >= 0) {
              next[date] = [...existing.slice(0, idx), placeholder, ...existing.slice(idx + 1)];
            } else {
              next[date] = [...existing, placeholder];
            }
          }
          return { monthShifts: next, isLoading: false };
        }
      });

      return dates.length === 1
        ? { count: 1, replacedCount: 0 }
        : (data as { count: number; replacedCount: number });
    } catch (err: any) {
      set({ isLoading: false });
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to apply quick shift';
      throw new Error(msg);
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────

  deleteShift: async (date, shiftKey) => {
    set({ isLoading: true });
    try {
      if (shiftKey) {
        await api.delete(`/quick-shifts/${date}/${shiftKey}`);
        set((state) => {
          const next = { ...state.monthShifts };
          const existing = next[date] ?? [];
          const filtered = existing.filter((e) => e.shiftKey !== shiftKey);
          if (filtered.length === 0) {
            delete next[date];
          } else {
            next[date] = filtered;
          }
          return { monthShifts: next, isLoading: false };
        });
      } else {
        await api.delete(`/quick-shifts/${date}`);
        set((state) => {
          const next = { ...state.monthShifts };
          delete next[date];
          return { monthShifts: next, isLoading: false };
        });
      }
    } catch {
      set({ isLoading: false });
      throw new Error('Failed to delete quick shift');
    }
  },

  // ── Helpers ───────────────────────────────────────────────────────────────

  checkConflicts: (dates, newShiftKey) => {
    const { monthShifts } = get();
    return dates.filter((d) => {
      const existing = monthShifts[d] ?? [];
      return existing.some((e) => e.shiftKey !== newShiftKey && shiftsOverlap(newShiftKey, e.shiftKey));
    });
  },

  clear: () => set({ monthShifts: {}, isLoading: false }),
}));
