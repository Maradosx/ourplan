// ─── Quick Shift – centralized config & i18n ─────────────────────────────────
// Single source of truth for shift types, colors, labels, and strings.
// All UI components import from here; never hardcode shift data elsewhere.

export type ShiftKey =
  | 'night'
  | 'morning'
  | 'half_day_am'
  | 'day'
  | 'full_day'
  | 'afternoon'
  | 'half_day_pm'
  | 'evening'
  | 'overtime'
  | 'off'
  | 'leave';

export interface ShiftConfig {
  key: ShiftKey;
  order: number;
  /** 24-hour "HH:MM", null for off/leave */
  startTime: string | null;
  endTime: string | null;
  blocksAvailability: boolean;
  /** Compact label shown in small calendar cells */
  shortLabel: string;
  /** Primary color (used for strip, badge border, icon) */
  color: string;
  /** Light background – typically color + '22' alpha */
  bgColor: string;
  /** Readable text color for use on bgColor */
  textColor: string;
}

export const SHIFT_CONFIGS: Record<ShiftKey, ShiftConfig> = {
  night: {
    key: 'night', order: 1,
    startTime: '00:00', endTime: '08:00',
    blocksAvailability: true,
    shortLabel: 'N',
    color: '#1D4ED8', bgColor: '#1D4ED822', textColor: '#1D4ED8',
  },
  morning: {
    key: 'morning', order: 2,
    startTime: '06:00', endTime: '12:00',
    blocksAvailability: true,
    shortLabel: 'M',
    color: '#0EA5E9', bgColor: '#0EA5E922', textColor: '#0369A1',
  },
  half_day_am: {
    key: 'half_day_am', order: 3,
    startTime: '08:00', endTime: '12:00',
    blocksAvailability: true,
    shortLabel: 'HD-AM',
    color: '#CA8A04', bgColor: '#CA8A0422', textColor: '#A16207',
  },
  day: {
    key: 'day', order: 4,
    startTime: '08:00', endTime: '16:00',
    blocksAvailability: true,
    shortLabel: 'D',
    color: '#F59E0B', bgColor: '#F59E0B22', textColor: '#B45309',
  },
  full_day: {
    key: 'full_day', order: 5,
    startTime: '09:00', endTime: '17:00',
    blocksAvailability: true,
    shortLabel: 'FD',
    color: '#D97706', bgColor: '#D9770622', textColor: '#92400E',
  },
  afternoon: {
    key: 'afternoon', order: 6,
    startTime: '12:00', endTime: '18:00',
    blocksAvailability: true,
    shortLabel: 'A',
    color: '#EA580C', bgColor: '#EA580C22', textColor: '#C2410C',
  },
  half_day_pm: {
    key: 'half_day_pm', order: 7,
    startTime: '13:00', endTime: '17:00',
    blocksAvailability: true,
    shortLabel: 'HD-PM',
    color: '#FB923C', bgColor: '#FB923C22', textColor: '#C2410C',
  },
  evening: {
    key: 'evening', order: 8,
    startTime: '16:00', endTime: '00:00',  // midnight = end of same day
    blocksAvailability: true,
    shortLabel: 'E',
    color: '#DB2777', bgColor: '#DB277722', textColor: '#BE185D',
  },
  overtime: {
    key: 'overtime', order: 9,
    startTime: '17:00', endTime: '20:00',
    blocksAvailability: true,
    shortLabel: 'OT',
    color: '#DC2626', bgColor: '#DC262622', textColor: '#B91C1C',
  },
  off: {
    key: 'off', order: 10,
    startTime: null, endTime: null,
    blocksAvailability: false,
    shortLabel: 'Off',
    color: '#7C3AED', bgColor: '#7C3AED22', textColor: '#6D28D9',
  },
  leave: {
    key: 'leave', order: 11,
    startTime: null, endTime: null,
    blocksAvailability: false,
    shortLabel: 'Lv',
    color: '#64748B', bgColor: '#64748B22', textColor: '#475569',
  },
};

/** Ordered list of all shift configs (use this for rendering lists) */
export const SHIFT_LIST: ShiftConfig[] = Object.values(SHIFT_CONFIGS).sort(
  (a, b) => a.order - b.order,
);

// ─── i18n ─────────────────────────────────────────────────────────────────────

export interface QsTypeStrings {
  name: string;
  timeLabel: string;
}

export interface QsStrings {
  title: string;
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  applyToSelectedDays: string;
  empty: string;
  replaceTitle: string;
  replaceMessage: string;
  replaceConfirm: string;
  successAdded: string;
  successUpdated: string;
  successDeleted: string;
  multiSelect: string;
  multiSelectDone: string;
  selectedCount: (n: number) => string;
  types: Record<ShiftKey, QsTypeStrings>;
}

const QS_EN: QsStrings = {
  title:              'Quick Shift',
  add:                'Add Quick Shift',
  edit:               'Edit Quick Shift',
  delete:             'Delete Quick Shift',
  save:               'Save',
  cancel:             'Cancel',
  applyToSelectedDays:'Apply to selected days',
  empty:              'No quick shift for this day yet',
  replaceTitle:       'Replace existing shift?',
  replaceMessage:     'Some selected dates already have a quick shift. Do you want to replace them?',
  replaceConfirm:     'Replace',
  successAdded:       'Quick shift added',
  successUpdated:     'Quick shift updated',
  successDeleted:     'Quick shift deleted',
  multiSelect:        'Select dates',
  multiSelectDone:    'Done',
  selectedCount:      (n) => `${n} date${n !== 1 ? 's' : ''} selected`,
  types: {
    night:       { name: 'Night',       timeLabel: '12:00 AM – 08:00 AM' },
    morning:     { name: 'Morning',     timeLabel: '06:00 AM – 12:00 PM' },
    half_day_am: { name: 'Half Day AM', timeLabel: '08:00 AM – 12:00 PM' },
    day:         { name: 'Day',         timeLabel: '08:00 AM – 04:00 PM' },
    full_day:    { name: 'Full Day',    timeLabel: '09:00 AM – 05:00 PM' },
    afternoon:   { name: 'Afternoon',   timeLabel: '12:00 PM – 06:00 PM' },
    half_day_pm: { name: 'Half Day PM', timeLabel: '01:00 PM – 05:00 PM' },
    evening:     { name: 'Evening',     timeLabel: '04:00 PM – 12:00 AM' },
    overtime:    { name: 'Overtime',    timeLabel: 'After work' },
    off:         { name: 'Off',         timeLabel: 'No work' },
    leave:       { name: 'Leave',       timeLabel: 'Leave day' },
  },
};

const QS_TH: QsStrings = {
  title:              'กะงานด่วน',
  add:                'เพิ่มกะงานด่วน',
  edit:               'แก้ไขกะงานด่วน',
  delete:             'ลบกะงานด่วน',
  save:               'บันทึก',
  cancel:             'ยกเลิก',
  applyToSelectedDays:'ใช้กับวันที่เลือก',
  empty:              'ยังไม่มีกะงานด่วนในวันนี้',
  replaceTitle:       'แทนที่กะงานเดิม?',
  replaceMessage:     'บางวันที่เลือกมีกะงานด่วนอยู่แล้ว ต้องการแทนที่หรือไม่',
  replaceConfirm:     'แทนที่',
  successAdded:       'เพิ่มกะงานด่วนเรียบร้อยแล้ว',
  successUpdated:     'อัปเดตกะงานด่วนเรียบร้อยแล้ว',
  successDeleted:     'ลบกะงานด่วนเรียบร้อยแล้ว',
  multiSelect:        'เลือกวัน',
  multiSelectDone:    'เสร็จ',
  selectedCount:      (n) => `เลือก ${n} วัน`,
  types: {
    night:       { name: 'กะดึก',          timeLabel: '12:00 AM – 08:00 AM' },
    morning:     { name: 'งานเช้า',         timeLabel: '06:00 AM – 12:00 PM' },
    half_day_am: { name: 'ครึ่งวันเช้า',    timeLabel: '08:00 AM – 12:00 PM' },
    day:         { name: 'งานปกติ',         timeLabel: '08:00 AM – 04:00 PM' },
    full_day:    { name: 'เต็มวัน',         timeLabel: '09:00 AM – 05:00 PM' },
    afternoon:   { name: 'งานบ่าย',         timeLabel: '12:00 PM – 06:00 PM' },
    half_day_pm: { name: 'ครึ่งวันบ่าย',    timeLabel: '01:00 PM – 05:00 PM' },
    evening:     { name: 'กะเย็น',          timeLabel: '04:00 PM – 12:00 AM' },
    overtime:    { name: 'ทำงานล่วงเวลา',    timeLabel: 'หลังเวลางาน' },
    off:         { name: 'วันหยุด',          timeLabel: 'ไม่มีงาน' },
    leave:       { name: 'วันลา',           timeLabel: 'วันลา' },
  },
};

export const QS_STRINGS: Record<'en' | 'th', QsStrings> = {
  en: QS_EN,
  th: QS_TH,
};

/** Get localized strings for the current language */
export function getQsStrings(lang: 'en' | 'th'): QsStrings {
  return QS_STRINGS[lang];
}

// ─── Availability helpers ─────────────────────────────────────────────────────

export interface QuickShiftEntry {
  date: string;
  shiftKey: ShiftKey;
  startTime: string | null;
  endTime: string | null;
  blocksAvailability: boolean;
}

/** Returns true if this shift type blocks the user's availability */
export function doesQuickShiftBlockAvailability(shiftKey: ShiftKey): boolean {
  return SHIFT_CONFIGS[shiftKey].blocksAvailability;
}

/**
 * Returns the blocked time range for a shift entry as [startMinutes, endMinutes]
 * where minutes are measured from midnight (0–1440).
 * Returns null if shift does not block availability or has no time range.
 * Special case: evening endTime '00:00' is treated as 1440 (next midnight).
 */
export function getQuickShiftBlockedRange(
  entry: QuickShiftEntry,
): [number, number] | null {
  if (!entry.blocksAvailability) return null;
  if (!entry.startTime || !entry.endTime) return null;
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const start = toMin(entry.startTime);
  let end = toMin(entry.endTime);
  if (end === 0) end = 1440; // midnight = end of day
  return [start, end];
}
