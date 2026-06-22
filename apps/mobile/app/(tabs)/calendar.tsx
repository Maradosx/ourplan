import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useScheduleStore, Schedule } from '../../store/scheduleStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useQuickShiftStore } from '../../store/quickShiftStore';
import { EventCard } from '../../components/schedule/EventCard';
import { Avatar } from '../../components/ui/Avatar';
import { CATEGORY_COLORS, RADIUS, SPACING } from '../../constants/theme';
import { ThemeDecor } from '../../components/ui/ThemeDecor';
import { formatDate } from '../../lib/dateUtils';
import { api } from '../../lib/api';
import {
  SHIFT_CONFIGS, ShiftKey, getQsStrings,
} from '../../constants/quickShift';
import ShiftPickerModal from '../../components/quickShift/ShiftPickerModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NAMES_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_SHORT_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_TH = ['อา','จ','อ','พ','พฤ','ศ','ส'];
const FRIEND_COLORS = ['#7B62FF','#46DCB0','#FF9040','#FF6190','#40B4FF','#FFD700'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayEvents { [dateStr: string]: { category: string; userId?: string }[] }

interface Friend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface GroupMember {
  id: string;
  role: string;
  user: { id: string; displayName: string; avatarUrl: string | null; username: string };
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: GroupMember[];
}

type ViewMode =
  | { kind: 'me' }
  | { kind: 'friends' }
  | { kind: 'friend'; id: string; name: string; avatarUrl: string | null; colorIdx: number }
  | { kind: 'group'; id: string; name: string; memberIds: string[] };

interface FriendEvent extends Schedule {
  friendDisplayName?: string | null;
  friendAvatarUrl?: string | null;
  isSelf?: boolean;
}

interface PersonEntry {
  key: string;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
  events: FriendEvent[];
  colorIdx: number;
}

function getMonthDays(year: number, month: number) {
  return {
    firstDow: new Date(year, month, 1).getDay(),
    days: new Date(year, month + 1, 0).getDate(),
  };
}

// (ShiftCellBadge removed — ring+label rendered inline in calendar cell)

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { theme: t } = useThemeStore();
  const { user } = useAuthStore();
  const { selectedDate, setSelectedDate, fetchSchedules, schedules, isLoading: myLoading } = useScheduleStore();
  const { lang } = useLanguageStore();
  const {
    monthShifts, fetchMonth: fetchQSMonth,
    applyShift, deleteShift, checkConflicts,
  } = useQuickShiftStore();
  const isThai = lang === 'th';
  const qs = getQsStrings(isThai ? 'th' : 'en');

  const MONTH_NAMES  = isThai ? MONTH_NAMES_TH  : MONTH_NAMES_EN;
  const DAY_NAMES    = isThai ? DAY_NAMES_TH    : DAY_NAMES_EN;
  const MONTHS_SHORT = isThai ? MONTHS_SHORT_TH : MONTHS_SHORT_EN;
  const today = new Date();

  // ── Calendar state ──────────────────────────────────────────────────────────
  const [viewDate, setViewDate]       = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [monthEvents, setMonthEvents] = useState<DayEvents>({});
  const [loadingMonth, setLoadingMonth] = useState(false);

  // ── View switcher ───────────────────────────────────────────────────────────
  const [viewMode, setViewMode]   = useState<ViewMode>({ kind: 'me' });
  const [friends, setFriends]     = useState<Friend[]>([]);
  const [groups, setGroups]       = useState<Group[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // ── Friend/group day events ─────────────────────────────────────────────────
  const [friendEvents, setFriendEvents]         = useState<FriendEvent[]>([]);
  const [loadingFriendDay, setLoadingFriendDay] = useState(false);

  // ── Multi-select ────────────────────────────────────────────────────────────
  const [multiSelectDates, setMultiSelectDates] = useState<Set<string>>(new Set());
  const [isMultiSelect, setIsMultiSelect]       = useState(false);

  // ── Quick Shift picker ──────────────────────────────────────────────────────
  const [showShiftPicker, setShowShiftPicker]   = useState(false);
  const [pickerDates, setPickerDates]           = useState<string[]>([]);

  // ── Month/Year picker ───────────────────────────────────────────────────────
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear]           = useState(() => today.getFullYear());

  const { firstDow, days } = getMonthDays(viewDate.getFullYear(), viewDate.getMonth());
  const currentMonth = viewDate.getMonth();
  const currentYear  = viewDate.getFullYear();

  // ── Load friends & groups once ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      api.get('/friends').then(({ data }) => setFriends(data)).catch(() => {}),
      api.get('/groups').then(({ data }) => setGroups(data)).catch(() => {}),
    ]).finally(() => setLoadingMeta(false));
  }, []);

  // ── Refresh when month or viewMode changes ──────────────────────────────────
  useEffect(() => {
    fetchMonthDots();
    // Always fetch own QS — we show them on calendar cells in all view modes
    fetchQSMonth(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate, viewMode]);

  // ── Refresh day events when selectedDate or viewMode changes ────────────────
  useEffect(() => {
    // Clear stale friend events immediately when switching view
    if (viewMode.kind !== 'me') setFriendEvents([]);
    fetchDayEvents();
  }, [selectedDate, viewMode]);

  // ── Month dot fetching ──────────────────────────────────────────────────────
  async function fetchMonthDots() {
    setLoadingMonth(true);
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();

    try {
      if (viewMode.kind === 'me') {
        const { data } = await api.get('/schedules/month', { params: { year, month } });
        const results: DayEvents = {};
        for (const ev of data) {
          const ds = ev.startDatetime.split('T')[0];
          if (!results[ds]) results[ds] = [];
          results[ds].push({ category: ev.category });
        }
        setMonthEvents(results);
      } else if (viewMode.kind === 'friends') {
        // /schedules/friends/month (findMonthAllFriends) already includes own events
        const { data } = await api.get('/schedules/friends/month', { params: { year, month } });
        const results: DayEvents = {};
        for (const ev of data) {
          const ds = ev.startDatetime.split('T')[0];
          if (!results[ds]) results[ds] = [];
          results[ds].push({ category: ev.category, userId: ev.userId });
        }
        setMonthEvents(results);
      } else if (viewMode.kind === 'friend') {
        const { data } = await api.get(`/schedules/friend/${viewMode.id}/month`, { params: { year, month } });
        const results: DayEvents = {};
        for (const ev of data) {
          const ds = ev.startDatetime.split('T')[0];
          if (!results[ds]) results[ds] = [];
          results[ds].push({ category: ev.category });
        }
        setMonthEvents(results);
      } else if (viewMode.kind === 'group') {
        // /schedules/friends/month (findMonthAllFriends) already includes own events
        const { data } = await api.get('/schedules/friends/month', {
          params: { year, month, friendIds: viewMode.memberIds.join(',') },
        });
        const results: DayEvents = {};
        for (const ev of data) {
          const ds = ev.startDatetime.split('T')[0];
          if (!results[ds]) results[ds] = [];
          results[ds].push({ category: ev.category, userId: ev.userId });
        }
        setMonthEvents(results);
      }
    } catch {
      setMonthEvents({});
    } finally {
      setLoadingMonth(false);
    }
  }

  // ── Day event fetching ──────────────────────────────────────────────────────
  async function fetchDayEvents() {
    if (viewMode.kind === 'me') {
      fetchSchedules(selectedDate);
      return;
    }
    setLoadingFriendDay(true);
    try {
      if (viewMode.kind === 'friends') {
        // findDayAllFriends already includes own events with isSelf: true — no separate fetch needed
        const { data } = await api.get('/schedules/friends/all', { params: { date: selectedDate } });
        setFriendEvents(data);
      } else if (viewMode.kind === 'friend') {
        const { data } = await api.get(`/schedules/friend/${viewMode.id}`, { params: { date: selectedDate } });
        setFriendEvents(data.map((e: Schedule) => ({
          ...e, friendDisplayName: viewMode.name, friendAvatarUrl: viewMode.avatarUrl,
        })));
      } else if (viewMode.kind === 'group') {
        // findDayAllFriends already includes own events with isSelf: true — no separate fetch needed
        const { data } = await api.get('/schedules/friends/all', {
          params: { date: selectedDate, friendIds: viewMode.memberIds.join(',') },
        });
        setFriendEvents(data);
      }
    } catch {
      setFriendEvents([]);
    } finally {
      setLoadingFriendDay(false);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    exitMultiSelect();
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    exitMultiSelect();
    setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  };
  function openMonthPicker() { setPickerYear(viewDate.getFullYear()); setShowMonthPicker(true); }
  function selectPickerMonth(monthIndex: number) {
    exitMultiSelect();
    setViewDate(new Date(pickerYear, monthIndex, 1));
    setShowMonthPicker(false);
  }

  // ── Cell press handlers ─────────────────────────────────────────────────────
  const handleDayPress = (ds: string) => {
    if (isMultiSelect) {
      setMultiSelectDates((prev) => {
        const next = new Set(prev);
        next.has(ds) ? next.delete(ds) : next.add(ds);
        return next;
      });
      return;
    }
    setSelectedDate(ds);
  };

  const handleDayLongPress = (ds: string) => {
    if (viewMode.kind !== 'me') return; // multi-select only in "My Schedule" mode
    if (!isMultiSelect) {
      setIsMultiSelect(true);
      setMultiSelectDates(new Set([ds]));
    }
  };

  function exitMultiSelect() {
    setIsMultiSelect(false);
    setMultiSelectDates(new Set());
  }

  // ── View switcher ────────────────────────────────────────────────────────────
  function switchToMe()      { exitMultiSelect(); setViewMode({ kind: 'me' }); }
  function switchToFriends() { exitMultiSelect(); setViewMode({ kind: 'friends' }); }
  function switchToFriend(f: Friend, idx: number) {
    exitMultiSelect();
    setViewMode({ kind: 'friend', id: f.id, name: f.displayName, avatarUrl: f.avatarUrl, colorIdx: idx });
  }
  function switchToGroup(g: Group) {
    exitMultiSelect();
    const memberIds = g.members.map((m) => m.user.id).filter((id) => id !== user?.id);
    setViewMode({ kind: 'group', id: g.id, name: g.name, memberIds });
  }

  // ── Quick Shift flow ─────────────────────────────────────────────────────────

  function openShiftPickerForDate(date: string) {
    setPickerDates([date]);
    setShowShiftPicker(true);
  }

  function openShiftPickerForMulti() {
    if (multiSelectDates.size === 0) return;
    setPickerDates(Array.from(multiSelectDates));
    setShowShiftPicker(true);
  }

  async function handleShiftConfirm(shiftKey: ShiftKey, dates: string[], customStart?: string, customEnd?: string) {
    const conflicts = checkConflicts(dates, shiftKey);
    if (conflicts.length > 0 && dates.length > 1) {
      await new Promise<void>((resolve, reject) => {
        Alert.alert(
          qs.replaceTitle,
          qs.replaceMessage,
          [
            { text: qs.cancel, style: 'cancel', onPress: () => reject(new Error('cancelled')) },
            {
              text: qs.replaceConfirm, style: 'destructive',
              onPress: () => resolve(),
            },
          ],
        );
      });
    }
    await applyShift(dates, shiftKey, customStart, customEnd);
    // Refresh month dots for QS
    await fetchQSMonth(viewDate.getFullYear(), viewDate.getMonth());
    if (isMultiSelect) exitMultiSelect();
  }

  async function handleShiftDelete(date: string, shiftKey?: ShiftKey) {
    await deleteShift(date, shiftKey);
    await fetchQSMonth(viewDate.getFullYear(), viewDate.getMonth());
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isMyMode       = viewMode.kind === 'me';
  const displayedEvents = isMyMode
    // Compare on the LOCAL calendar day. A raw startsWith() against the UTC ISO string
    // hides early-morning / late-evening events for users in non-UTC timezones (e.g. ICT).
    ? schedules.filter((s) => formatDate(s.startDatetime) === selectedDate)
    : friendEvents;
  const dayLoading = isMyMode ? myLoading : loadingFriendDay;

  // Multi-shift support: always show own QS for selected day in all view modes
  const shiftsForSelectedDay = monthShifts[selectedDate] ?? [];
  const viewLabel = (): string => {
    if (viewMode.kind === 'me')      return isThai ? 'ตารางของฉัน' : 'My Schedule';
    if (viewMode.kind === 'friends') return isThai ? 'ตารางเพื่อนทุกคน' : 'All Friends';
    if (viewMode.kind === 'friend')  return viewMode.name;
    if (viewMode.kind === 'group')   return viewMode.name;
    return '';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        <ThemeDecor />

        {/* ── View switcher (sticky) ── */}
        <View style={[styles.switcherWrap, { backgroundColor: t.bg, borderBottomColor: t.divider }]}>
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherRow}
          >
            {/* Me */}
            <TouchableOpacity
              style={[
                styles.switchChip, { borderColor: t.divider, backgroundColor: t.bg },
                isMyMode && { backgroundColor: t.accent, borderColor: t.accent },
              ]}
              onPress={switchToMe} activeOpacity={0.75}
            >
              <Text style={[styles.switchChipText, { color: isMyMode ? '#fff' : t.text }]}>
                {isThai ? '🙋 ฉัน' : '🙋 Me'}
              </Text>
            </TouchableOpacity>

            {/* All friends */}
            {friends.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.switchChip, { borderColor: t.divider, backgroundColor: t.bg },
                  viewMode.kind === 'friends' && { backgroundColor: t.accent, borderColor: t.accent },
                ]}
                onPress={switchToFriends} activeOpacity={0.75}
              >
                <Text style={[styles.switchChipText, { color: viewMode.kind === 'friends' ? '#fff' : t.text }]}>
                  {isThai ? '👥 เพื่อนทั้งหมด' : '👥 All Friends'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Per-friend chips */}
            {friends.map((f, idx) => {
              const active = viewMode.kind === 'friend' && viewMode.id === f.id;
              const color  = FRIEND_COLORS[idx % FRIEND_COLORS.length];
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.switchChip, { borderColor: t.divider, backgroundColor: t.bg },
                    active && { backgroundColor: color + '20', borderColor: color },
                  ]}
                  onPress={() => switchToFriend(f, idx)} activeOpacity={0.75}
                >
                  <Avatar name={f.displayName} uri={f.avatarUrl} size={18} color={color} />
                  <Text
                    style={[styles.switchChipText, { color: active ? color : t.text }]}
                    numberOfLines={1}
                  >
                    {f.displayName}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Group chips */}
            {groups.map((g) => {
              const active = viewMode.kind === 'group' && viewMode.id === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.switchChip, { borderColor: t.divider, backgroundColor: t.bg },
                    active && { backgroundColor: t.accent + '20', borderColor: t.accent },
                  ]}
                  onPress={() => switchToGroup(g)} activeOpacity={0.75}
                >
                  <Text style={styles.groupChipIcon}>👥</Text>
                  <Text
                    style={[styles.switchChipText, { color: active ? t.accent : t.text }]}
                    numberOfLines={1}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Month header ── */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: t.accent }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openMonthPicker} activeOpacity={0.7} style={styles.monthTitleBtn}>
            <Text style={[styles.monthTitle, { color: t.text }]}>
              {MONTH_NAMES[viewDate.getMonth()]} {isThai ? viewDate.getFullYear() + 543 : viewDate.getFullYear()}
            </Text>
            <Text style={[styles.chevron, { color: t.accent }]}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Multi-select bar (shows when in multi-select mode, otherwise hints) ── */}
        {isMyMode && isMultiSelect && (
          <View style={[styles.inlineMultiBar, { backgroundColor: t.accent + '12', borderColor: t.accent }]}>
            <Text style={[styles.inlineMultiCount, { color: t.accent }]}>
              ✓ {qs.selectedCount(multiSelectDates.size)}
            </Text>
            <View style={styles.inlineMultiBtns}>
              <TouchableOpacity
                style={[styles.inlineMultiAction, { backgroundColor: t.accent }]}
                onPress={openShiftPickerForMulti}
                disabled={multiSelectDates.size === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.inlineMultiActionText}>
                  ⚡ {isThai ? 'กะงานด่วน' : 'Quick Shift'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exitMultiSelect} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.inlineMultiCancel, { color: t.subtext }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {isMyMode && !isMultiSelect && (
          <Text style={[styles.multiHint, { color: t.subtext + '70' }]}>
            {isThai ? '✦ กดค้างที่วันเพื่อเลือกหลายวัน' : '✦ Long-press a date to multi-select'}
          </Text>
        )}

        {/* ── Day labels ── */}
        <View style={styles.dayLabels}>
          {DAY_NAMES.map((d) => (
            <Text key={d} style={[styles.dayLabel, { color: t.subtext }]}>{d}</Text>
          ))}
        </View>

        {/* ── Calendar grid ── */}
        <View style={styles.grid}>
          {Array.from({ length: firstDow }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.cell} />
          ))}
          {Array.from({ length: days }, (_, i) => i + 1).map((day) => {
            const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            const ds       = formatDate(cellDate);
            const isSelected = isMultiSelect
              ? multiSelectDates.has(ds)
              : ds === selectedDate;
            const isToday  = ds === formatDate(today);
            const evs      = monthEvents[ds] ?? [];
            const isWknd   = cellDate.getDay() === 0 || cellDate.getDay() === 6;
            // Show QS rings only in me/friends/group — NOT in single-friend mode
            const showQSOnCell = isMyMode || viewMode.kind === 'friends' || viewMode.kind === 'group';
            const qShifts  = showQSOnCell ? (monthShifts[ds] ?? []) : [];
            const primaryQS = qShifts.find(
              (q) => q.shiftKey !== 'off' && q.shiftKey !== 'leave',
            ) ?? qShifts[0] ?? null;
            const qsCfgCell = primaryQS ? SHIFT_CONFIGS[primaryQS.shiftKey as ShiftKey] : null;
            return (
              <TouchableOpacity
                key={day}
                style={styles.cell}
                onPress={() => handleDayPress(ds)}
                onLongPress={() => handleDayLongPress(ds)}
                delayLongPress={350}
                activeOpacity={0.7}
              >
                {/* Day number circle – ring when QS, filled when selected */}
                <View style={[
                  styles.dayNumWrap,
                  // QS ring (only when not selected)
                  !isSelected && qsCfgCell && {
                    borderColor: qsCfgCell.color,
                    borderWidth: 2,
                    backgroundColor: qsCfgCell.bgColor,
                  },
                  // Single selected
                  isSelected && !isMultiSelect && {
                    backgroundColor: t.accent,
                  },
                  // Multi-select
                  isSelected && isMultiSelect && {
                    backgroundColor: t.accent + '35',
                    borderColor: t.accent,
                    borderWidth: 1.5,
                  },
                ]}>
                  <Text style={[
                    styles.cellNum,
                    { color: isSelected && !isMultiSelect
                        ? '#fff'
                        : !isSelected && qsCfgCell
                          ? qsCfgCell.textColor
                          : isWknd ? t.accent : t.text },
                    isToday && !isSelected && { fontWeight: '900' },
                  ]}>
                    {day}
                  </Text>
                </View>

                {/* Today indicator dot */}
                {isToday && !isSelected && (
                  <View style={[styles.todayDot, { backgroundColor: t.accent }]} />
                )}

                {/* QS short label */}
                {qsCfgCell && (
                  <Text style={[
                    styles.qsCellLabel,
                    { color: isSelected && !isMultiSelect
                        ? 'rgba(255,255,255,0.85)'
                        : qsCfgCell.color },
                  ]}>
                    {qShifts.length > 1
                      ? `${qsCfgCell.shortLabel}+${qShifts.length - 1}`
                      : qsCfgCell.shortLabel}
                  </Text>
                )}

                {/* Event dots */}
                {!loadingMonth && evs.length > 0 && (
                  <View style={styles.dotsRow}>
                    {evs.slice(0, 3).map((ev, di) => (
                      <View
                        key={di}
                        style={[
                          styles.dot,
                          { backgroundColor: isSelected && !isMultiSelect
                            ? 'rgba(255,255,255,0.7)'
                            : (CATEGORY_COLORS as any)[ev.category] ?? t.accent },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══ QUICK SHIFT PANEL – shown in "me"/"friends"/"group" modes, not single-friend ══ */}
        {(() => {
          const showQSPanel = isMyMode || viewMode.kind === 'friends' || viewMode.kind === 'group';
          return showQSPanel && (isMyMode || shiftsForSelectedDay.length > 0);
        })() && (
          <View style={[styles.qsPanelWrap, { backgroundColor: t.surface, borderColor: t.divider }]}>
            {/* Header row */}
            <View style={styles.qsPanelHeader}>
              <Text style={[styles.qsPanelSuperLabel, { color: t.subtext }]}>⚡ {qs.title}</Text>
              {/* Only show add button in "me" mode */}
              {isMyMode && (
                <TouchableOpacity
                  style={[styles.qsPanelAddBtn, { backgroundColor: t.accent + '18' }]}
                  onPress={() => openShiftPickerForDate(selectedDate)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.qsPanelAddBtnText, { color: t.accent }]}>
                    {isThai ? '+ เพิ่มกะ' : '+ Add shift'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Shift rows */}
            {shiftsForSelectedDay.length === 0 ? (
              <Text style={[styles.qsPanelEmpty, { color: t.subtext }]}>{qs.empty}</Text>
            ) : (
              shiftsForSelectedDay.map((shift) => {
                const cfg       = SHIFT_CONFIGS[shift.shiftKey as ShiftKey];
                const labelBase = qs.types[shift.shiftKey as ShiftKey];
                // For overtime: show the actual stored time range if available
                const timeLabel = shift.shiftKey === 'overtime' && shift.startTime && shift.endTime
                  ? `${shift.startTime} – ${shift.endTime}`
                  : labelBase.timeLabel;
                return (
                  <View
                    key={shift.shiftKey}
                    style={[styles.qsShiftRow, { backgroundColor: cfg.bgColor, borderColor: cfg.color + '55' }]}
                  >
                    <View style={[styles.qsPanelStrip, { backgroundColor: cfg.color }]} />
                    <View style={styles.qsShiftRowBody}>
                      <Text style={[styles.qsPanelShift, { color: cfg.textColor }]}>
                        {labelBase.name}
                        <Text style={[styles.qsPanelTime, { color: cfg.textColor + 'aa' }]}>
                          {'  '}{timeLabel}
                        </Text>
                      </Text>
                    </View>
                    {/* Delete button only in "me" mode */}
                    {isMyMode && (
                      <TouchableOpacity
                        style={[styles.qsShiftDeleteBtn, { borderColor: cfg.color + '60' }]}
                        onPress={() => handleShiftDelete(selectedDate, shift.shiftKey as ShiftKey)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.qsShiftDeleteText, { color: cfg.color }]}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: t.divider }]} />

        {/* ── Day events section ── */}
        <View style={styles.eventsSection}>
          {/* Day header */}
          <View style={styles.eventsSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eventsTitle, { color: t.text }]}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(isThai ? 'th-TH' : 'en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
              {!isMyMode && (
                <Text style={[styles.viewModeLabel, { color: t.accent }]}>{viewLabel()}</Text>
              )}
            </View>
            <View style={styles.headerBtns}>
              {isMyMode && (
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: t.accent }]}
                  onPress={() => router.push('/event/new')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addBtnText}>{isThai ? '+ เพิ่ม' : '+ Add'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Me mode: simple event list ── */}
          {isMyMode && (
            <>
              <Text style={[styles.sectionSubLabel, { color: t.subtext }]}>
                {isThai ? 'กิจกรรม' : 'Events'}
              </Text>
              {dayLoading ? (
                <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.md }} />
              ) : displayedEvents.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
                  <Text style={[styles.emptyText, { color: t.subtext }]}>
                    {isThai ? 'ไม่มีกิจกรรมวันนี้' : 'No events this day'}
                  </Text>
                </View>
              ) : (
                displayedEvents.map((item) => (
                  <EventCard
                    key={item.id}
                    item={item}
                    onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
                  />
                ))
              )}
            </>
          )}

          {/* ── Friends / Group / Single-friend mode: per-person summary ── */}
          {!isMyMode && (() => {
            // Build map: personKey → { name, avatarUrl, isSelf, events, color }
            const map = new Map<string, PersonEntry>();

            for (const ev of (friendEvents as FriendEvent[])) {
              const isSelfEv = !!ev.isSelf;
              const key = isSelfEv ? '__self__' : (ev.friendDisplayName ?? 'unknown');
              if (!map.has(key)) {
                // Use position in friends[] array so color matches the switcher chip color
                const friendIdx = isSelfEv ? -1 : friends.findIndex((f) => f.id === ev.userId);
                const colorIdx  = friendIdx >= 0 ? friendIdx : map.size;
                map.set(key, {
                  key,
                  name: isSelfEv ? (isThai ? 'ฉัน' : 'Me') : (ev.friendDisplayName ?? ''),
                  avatarUrl: isSelfEv ? null : (ev.friendAvatarUrl ?? null),
                  isSelf: isSelfEv,
                  events: [],
                  colorIdx,
                });
              }
              map.get(key)!.events.push(ev);
            }

            // "friends" and "group" modes include self → show self card (with QS)
            // single-friend mode shows ONLY that friend → never show self
            const showSelf = viewMode.kind === 'friends' || viewMode.kind === 'group';

            if (showSelf) {
              // Add self card if not already in map (e.g. has QS but no events today)
              const hasSelfQS = shiftsForSelectedDay.length > 0;
              if (hasSelfQS && !map.has('__self__')) {
                map.set('__self__', {
                  key: '__self__',
                  name: isThai ? 'ฉัน' : 'Me',
                  avatarUrl: null,
                  isSelf: true,
                  events: [],
                  colorIdx: 0,
                });
              }
            } else {
              // Single-friend mode: strip self from map entirely
              map.delete('__self__');
            }

            // Sort: self first, then others alphabetically
            const persons = Array.from(map.values()).sort((a, b) => {
              if (a.isSelf) return -1;
              if (b.isSelf) return 1;
              return a.name.localeCompare(b.name);
            });

            if (persons.length === 0 && !dayLoading) {
              return (
                <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
                  <Text style={[styles.emptyText, { color: t.subtext }]}>
                    {isThai ? 'ไม่มีกิจกรรมที่มองเห็นได้' : 'No visible events'}
                  </Text>
                </View>
              );
            }

            if (dayLoading) {
              return <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.md }} />;
            }

            return (
              <>
                {persons.map((person) => {
                  const personColor = person.isSelf ? t.accent : FRIEND_COLORS[person.colorIdx % FRIEND_COLORS.length];
                  // QS shifts for self only
                  const personShifts = person.isSelf ? shiftsForSelectedDay : [];
                  const hasData = personShifts.length > 0 || person.events.length > 0;
                  if (!hasData) return null;

                  return (
                    <View key={person.key} style={[styles.personCard, { borderColor: personColor + '30', backgroundColor: t.surface }]}>
                      {/* Person header */}
                      <View style={[styles.personHeader, { borderBottomColor: t.divider }]}>
                        {person.isSelf ? (
                          <View style={[styles.personAvatarDot, { backgroundColor: t.accent }]}>
                            <Text style={styles.personAvatarDotText}>ฉ</Text>
                          </View>
                        ) : (
                          <Avatar name={person.name} uri={person.avatarUrl} size={22} color={personColor} />
                        )}
                        <Text style={[styles.personName, { color: personColor }]}>
                          {person.name}
                        </Text>
                        {/* Summary badges */}
                        <View style={styles.personBadgeRow}>
                          {personShifts.length > 0 && (
                            <View style={[styles.personBadge, { backgroundColor: personColor + '20', borderColor: personColor + '50' }]}>
                              <Text style={[styles.personBadgeText, { color: personColor }]}>
                                ⚡ {personShifts.length} {isThai ? 'กะ' : 'shift'}
                              </Text>
                            </View>
                          )}
                          {person.events.length > 0 && (
                            <View style={[styles.personBadge, { backgroundColor: t.accent + '15', borderColor: t.accent + '40' }]}>
                              <Text style={[styles.personBadgeText, { color: t.accent }]}>
                                📅 {person.events.length}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* QS shift chips (self only) */}
                      {personShifts.length > 0 && (
                        <View style={styles.personShiftsWrap}>
                          {personShifts.map((shift) => {
                            const cfg = SHIFT_CONFIGS[shift.shiftKey as ShiftKey];
                            const lbl = qs.types[shift.shiftKey as ShiftKey];
                            const tl = shift.shiftKey === 'overtime' && shift.startTime && shift.endTime
                              ? `${shift.startTime} – ${shift.endTime}`
                              : lbl.timeLabel;
                            return (
                              <View key={shift.shiftKey} style={[styles.personShiftChip, { backgroundColor: cfg.bgColor, borderColor: cfg.color + '60' }]}>
                                <View style={[styles.personShiftDot, { backgroundColor: cfg.color }]} />
                                <Text style={[styles.personShiftName, { color: cfg.textColor }]}>
                                  {lbl.name}
                                </Text>
                                <Text style={[styles.personShiftTime, { color: cfg.textColor + 'aa' }]}>
                                  {tl}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {/* Events */}
                      {person.events.length > 0 && (
                        <View style={styles.personEventsWrap}>
                          {person.events.map((ev, idx) => (
                            <EventCard
                              key={`${ev.id}-${idx}`}
                              item={ev}
                              onPress={person.isSelf
                                ? () => router.push({ pathname: '/event/[id]', params: { id: ev.id } })
                                : undefined}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            );
          })()}
        </View>
      </ScrollView>

      {/* ── Shift Picker Modal ── */}
      <ShiftPickerModal
        visible={showShiftPicker}
        dates={pickerDates}
        currentShiftKeys={
          pickerDates.length === 1
            ? (monthShifts[pickerDates[0]] ?? []).map((q) => q.shiftKey as ShiftKey)
            : []
        }
        currentShiftsMeta={
          pickerDates.length === 1
            ? (monthShifts[pickerDates[0]] ?? []).map((q) => ({
                shiftKey: q.shiftKey as ShiftKey,
                startTime: q.startTime,
                endTime: q.endTime,
              }))
            : []
        }
        isThai={isThai}
        onConfirm={handleShiftConfirm}
        onDeleteShift={async (shiftKey) => {
          if (pickerDates.length === 1) {
            await handleShiftDelete(pickerDates[0], shiftKey);
          }
        }}
        onClose={() => setShowShiftPicker(false)}
      />

      {/* ── Month/Year picker modal ── */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)} />
        <View style={[styles.pickerSheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
          <View style={[styles.pickerHandle, { backgroundColor: t.divider }]} />

          <View style={styles.pickerYearRow}>
            <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.pickerArrow, { color: t.accent }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerYear, { color: t.text }]}>
              {isThai ? pickerYear + 543 : pickerYear}
            </Text>
            <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.pickerArrow, { color: t.accent }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerMonthGrid}>
            {MONTHS_SHORT.map((label, i) => {
              const isSelected   = i === currentMonth && pickerYear === currentYear;
              const isTodayMonth = i === today.getMonth() && pickerYear === today.getFullYear();
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerMonthBtn,
                    { backgroundColor: isSelected ? t.accent : t.surface },
                    !isSelected && isTodayMonth && { borderColor: t.accent, borderWidth: 1.5 },
                  ]}
                  onPress={() => selectPickerMonth(i)} activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerMonthText,
                    { color: isSelected ? '#fff' : isTodayMonth ? t.accent : t.text },
                    isSelected && { fontWeight: '800' },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setShowMonthPicker(false)}
            style={[styles.pickerCancel, { borderColor: t.divider }]}
          >
            <Text style={[styles.pickerCancelText, { color: t.subtext }]}>
              {isThai ? 'ยกเลิก' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // View switcher
  switcherWrap: { borderBottomWidth: 1, paddingVertical: SPACING.xs },
  switcherRow: { paddingHorizontal: SPACING.md, gap: 8, alignItems: 'center', paddingVertical: 4 },
  switchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5,
  },
  switchChipText: { fontSize: 12, fontWeight: '700', maxWidth: 90 },
  groupChipIcon: { fontSize: 13 },

  // Calendar header
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: 4,
  },
  navArrow: { fontSize: 28, fontWeight: '300' },
  monthTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthTitle: { fontSize: 18, fontWeight: '700' },
  chevron: { fontSize: 13, marginTop: 2 },
  multiHint: { textAlign: 'center', fontSize: 10, marginBottom: 2 },
  inlineMultiBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xs,
    borderRadius: RADIUS.lg, borderWidth: 1.5,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
  },
  inlineMultiCount: { flex: 1, fontSize: 12, fontWeight: '700' },
  inlineMultiBtns: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  inlineMultiAction: {
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6,
  },
  inlineMultiActionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  inlineMultiCancel: { fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  // Day grid
  dayLabels: { flexDirection: 'row', paddingHorizontal: SPACING.sm, marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.sm },
  cell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center', padding: 1,
  },
  dayNumWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  cellNum: { fontSize: 13, fontWeight: '600' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  qsCellLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.1, marginTop: 0 },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  divider: { height: 1 },

  // ── Quick Shift Panel (sits directly below grid, always visible) ──
  qsPanelWrap: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.sm,
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    overflow: 'hidden', paddingBottom: 8,
  },
  qsPanelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: 10, paddingBottom: 6,
  },
  qsPanelSuperLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  qsPanelAddBtn: { borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 5 },
  qsPanelAddBtnText: { fontSize: 11, fontWeight: '800' },
  qsShiftRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.sm, marginBottom: 5,
    borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden',
  },
  qsPanelStrip: { width: 5, alignSelf: 'stretch' },
  qsShiftRowBody: { flex: 1, paddingVertical: 10, paddingHorizontal: SPACING.sm, gap: 2 },
  qsPanelShift: { fontSize: 14, fontWeight: '800' },
  qsPanelTime: { fontSize: 11, fontWeight: '500' },
  qsPanelEmpty: { fontSize: 12, fontStyle: 'italic', paddingHorizontal: SPACING.md, paddingBottom: 4 },
  qsShiftDeleteBtn: { padding: 8, marginRight: 6, borderRadius: RADIUS.sm, borderWidth: 1 },
  qsShiftDeleteText: { fontSize: 13, fontWeight: '700' },

  // Events section
  eventsSection: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 120 },
  eventsSectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  eventsTitle: { fontSize: 16, fontWeight: '700' },
  viewModeLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addBtn: { borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sectionSubLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

  emptyCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1 },
  emptyText: { fontSize: 14 },

  // Friend event owner (legacy, kept for safety)
  friendEventOwner: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4, marginLeft: 4 },
  friendEventOwnerName: { fontSize: 11, fontWeight: '600' },
  selfDot: { width: 16, height: 16, borderRadius: 8 },

  // Per-person summary cards (friends/group mode)
  personCard: {
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    overflow: 'hidden', marginBottom: SPACING.sm,
  },
  personHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  personAvatarDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  personAvatarDotText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  personName: { fontSize: 13, fontWeight: '800', flex: 1 },
  personBadgeRow: { flexDirection: 'row', gap: 4 },
  personBadge: {
    borderRadius: RADIUS.full, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  personBadgeText: { fontSize: 9, fontWeight: '700' },
  personShiftsWrap: {
    paddingHorizontal: SPACING.sm, paddingTop: 8, paddingBottom: 4, gap: 5,
  },
  personShiftChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingVertical: 7, paddingHorizontal: SPACING.sm,
  },
  personShiftDot: { width: 8, height: 8, borderRadius: 4 },
  personShiftName: { fontSize: 12, fontWeight: '700' },
  personShiftTime: { fontSize: 11, flex: 1 },
  personEventsWrap: { padding: SPACING.sm, gap: 6 },

  // Month picker modal
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000050' },
  pickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, borderTopWidth: 1,
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 16 },
  pickerArrow: { fontSize: 28, fontWeight: '700' },
  pickerYear: { fontSize: 22, fontWeight: '800', minWidth: 80, textAlign: 'center' },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 },
  pickerMonthBtn: { width: '22%', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  pickerMonthText: { fontSize: 14, fontWeight: '600' },
  pickerCancel: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1 },
  pickerCancelText: { fontSize: 15, fontWeight: '500' },
});
