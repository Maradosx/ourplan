import { create } from 'zustand';
import { api } from '../lib/api';
import { Category } from '../constants/theme';
import { todayString } from '../lib/dateUtils';

export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: Category;
  startDatetime: string;
  endDatetime: string;
  location: string | null;
  visibility: 'private' | 'friends' | 'public';
  isRecurring: boolean;
  recurrenceRule: string | null;
  colorTag: string | null;
  icon: string | null;
  createdAt: string;
}

interface ScheduleStore {
  schedules: Schedule[];
  selectedDate: string;
  isLoading: boolean;
  fetchSchedules: (date?: string) => Promise<void>;
  createSchedule: (data: Partial<Schedule>) => Promise<void>;
  updateSchedule: (id: string, data: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  reset: () => void;
}

// Local calendar date — using toISOString() here would show the wrong day near
// midnight for non-UTC users (e.g. it returns "yesterday" for ICT after 17:00).
const today = todayString();

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  selectedDate: today,
  isLoading: false,

  fetchSchedules: async (date) => {
    set({ isLoading: true });
    try {
      const d = date || get().selectedDate;
      const { data } = await api.get(`/schedules?date=${d}`);
      set({ schedules: data });
    } finally {
      set({ isLoading: false });
    }
  },

  createSchedule: async (payload) => {
    const { data } = await api.post('/schedules', payload);
    set((s) => ({ schedules: [data, ...s.schedules] }));
  },

  updateSchedule: async (id, payload) => {
    const { data } = await api.patch(`/schedules/${id}`, payload);
    set((s) => ({
      schedules: s.schedules.map((sc) => (sc.id === id ? data : sc)),
    }));
  },

  deleteSchedule: async (id) => {
    await api.delete(`/schedules/${id}`);
    set((s) => ({ schedules: s.schedules.filter((sc) => sc.id !== id) }));
  },

  setSelectedDate: (date) => set({ selectedDate: date }),

  // Clear all cached schedule data — called on logout so the next account on this
  // device never briefly sees the previous user's events.
  reset: () => set({ schedules: [], selectedDate: todayString(), isLoading: false }),
}));
