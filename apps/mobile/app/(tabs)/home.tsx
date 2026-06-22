import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { useQuickShiftStore } from '../../store/quickShiftStore';
import { WeekStrip } from '../../components/schedule/WeekStrip';
import { EventCard } from '../../components/schedule/EventCard';
import { Avatar } from '../../components/ui/Avatar';
import { ThemeDecor } from '../../components/ui/ThemeDecor';
import { CATEGORY_COLORS, CATEGORIES, Category, RADIUS, SPACING } from '../../constants/theme';
import { formatDisplayDate, formatDate } from '../../lib/dateUtils';
import { useLanguageStore } from '../../store/languageStore';
import { SHIFT_CONFIGS, ShiftKey, getQsStrings } from '../../constants/quickShift';
import ShiftPickerModal from '../../components/quickShift/ShiftPickerModal';

const CATEGORY_TH: Record<string, string> = {
  Work: 'งาน', Health: 'สุขภาพ', Errand: 'ธุระ',
  Social: 'สังคม', Travel: 'เดินทาง', Other: 'อื่นๆ',
};

export default function HomeScreen() {
  const { theme: t } = useThemeStore();
  const { user } = useAuthStore();
  const { schedules, selectedDate, fetchSchedules, setSelectedDate, isLoading } = useScheduleStore();
  const { monthShifts, fetchMonth: fetchQSMonth, applyShift, deleteShift } = useQuickShiftStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';
  const qs = getQsStrings(isThai ? 'th' : 'en');

  const [activeFilter, setActiveFilter] = useState<Category | 'All'>('All');
  const [weekBase, setWeekBase]         = useState<Date | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date(selectedDate + 'T00:00:00').getFullYear());

  // Quick Shift picker state
  const [showShiftPicker, setShowShiftPicker] = useState(false);

  const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

  const greeting = () => {
    const h = new Date().getHours();
    if (isThai) {
      if (h < 12) return 'สวัสดีตอนเช้า';
      if (h < 18) return 'สวัสดีตอนบ่าย';
      return 'สวัสดีตอนเย็น';
    }
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Load schedules when selectedDate changes
  useEffect(() => { fetchSchedules(); }, [selectedDate]);

  // Load QS for the month containing selectedDate
  useEffect(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    fetchQSMonth(d.getFullYear(), d.getMonth());
  }, [selectedDate]);

  const filtered = activeFilter === 'All'
    ? schedules
    : schedules.filter((s) => s.category === activeFilter);

  const displayBase = weekBase ?? new Date(selectedDate + 'T00:00:00');
  const month = displayBase.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', { month: 'long', year: 'numeric' });
  const currentMonth = displayBase.getMonth();
  const currentPickerYear = displayBase.getFullYear();

  // Current day's quick shifts (array)
  const shiftsForDay = monthShifts[selectedDate] ?? [];
  // Primary shift for panel display: prefer non-off/leave
  const shiftForDay = shiftsForDay.find(
    (q) => q.shiftKey !== 'off' && q.shiftKey !== 'leave',
  ) ?? shiftsForDay[0] ?? null;
  const shiftCfg   = shiftForDay ? SHIFT_CONFIGS[shiftForDay.shiftKey as ShiftKey] : null;
  const shiftLabelBase = shiftForDay ? qs.types[shiftForDay.shiftKey as ShiftKey] : null;
  // For overtime with custom stored times, show the actual time range
  const shiftLabel = shiftLabelBase ? {
    ...shiftLabelBase,
    timeLabel:
      shiftForDay?.shiftKey === 'overtime' && shiftForDay.startTime && shiftForDay.endTime
        ? `${shiftForDay.startTime} – ${shiftForDay.endTime}`
        : shiftLabelBase.timeLabel,
  } : null;

  function openMonthPicker() {
    setPickerYear(displayBase.getFullYear());
    setShowMonthPicker(true);
  }

  function selectPickerMonth(monthIndex: number) {
    const target = new Date(pickerYear, monthIndex, 1);
    const monday = getMonday(target);
    setWeekBase(monday);
    const dateStr = formatDate(monday);
    setSelectedDate(dateStr);
    fetchSchedules(dateStr);
    setShowMonthPicker(false);
  }

  const goToPrevWeek = () => {
    const base = weekBase ?? getMonday(new Date(selectedDate + 'T00:00:00'));
    const prev = new Date(base); prev.setDate(prev.getDate() - 7);
    setWeekBase(prev);
    const prevDate = formatDate(prev);
    setSelectedDate(prevDate); fetchSchedules(prevDate);
  };

  const goToNextWeek = () => {
    const base = weekBase ?? getMonday(new Date(selectedDate + 'T00:00:00'));
    const next = new Date(base); next.setDate(next.getDate() + 7);
    setWeekBase(next);
    const nextDate = formatDate(next);
    setSelectedDate(nextDate); fetchSchedules(nextDate);
  };

  function getMonday(d: Date) {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(d); mon.setDate(d.getDate() + diff);
    return mon;
  }

  async function handleShiftConfirm(shiftKey: ShiftKey, dates: string[], customStart?: string, customEnd?: string) {
    await applyShift(dates, shiftKey, customStart, customEnd);
    // Re-fetch to refresh the panel
    const d = new Date(selectedDate + 'T00:00:00');
    await fetchQSMonth(d.getFullYear(), d.getMonth());
  }

  async function handleShiftDeleteKey(shiftKey: ShiftKey) {
    await deleteShift(selectedDate, shiftKey);
    const d = new Date(selectedDate + 'T00:00:00');
    await fetchQSMonth(d.getFullYear(), d.getMonth());
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchSchedules()} tintColor={t.accent} />}
      >
        {/* Theme decoration */}
        <ThemeDecor />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: t.subtext }]}>{greeting()},</Text>
            <Text style={[styles.name, { color: t.text }]}>{user?.displayName ?? 'there'} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
            <Avatar name={user?.displayName ?? 'U'} uri={user?.avatarUrl} size={46} color={t.accent} />
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: t.divider }]} />

        {/* Month nav */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={goToPrevWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: t.accent }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openMonthPicker} activeOpacity={0.7} style={styles.monthLabelBtn}>
            <Text style={[styles.monthLabel, { color: t.text }]}>{month}</Text>
            <Text style={[styles.monthLabelChevron, { color: t.accent }]}>▾</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.navArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Week strip */}
        <WeekStrip
          selectedDate={selectedDate}
          baseDate={weekBase}
          onSelectDate={(d) => { setSelectedDate(d); fetchSchedules(d); }}
        />

        {/* ══ QUICK SHIFT PANEL ══════════════════════════════════════════════════ */}
        <TouchableOpacity
          style={[
            styles.qsPanel,
            {
              backgroundColor: shiftCfg ? shiftCfg.bgColor : t.surface,
              borderColor: shiftCfg ? shiftCfg.color + '55' : t.divider,
            },
          ]}
          onPress={() => setShowShiftPicker(true)}
          activeOpacity={0.8}
        >
          {/* Colored left strip */}
          <View style={[styles.qsPanelStrip, { backgroundColor: shiftCfg ? shiftCfg.color : t.divider }]} />

          {/* Info */}
          <View style={styles.qsPanelBody}>
            <Text style={[styles.qsPanelMeta, { color: shiftCfg ? shiftCfg.textColor : t.subtext }]}>
              ⚡ {qs.title}
            </Text>
            {shiftCfg && shiftLabel ? (
              <Text style={[styles.qsPanelShift, { color: shiftCfg.textColor }]}>
                {shiftLabel.name}
                <Text style={[styles.qsPanelTime, { color: shiftCfg.textColor + 'aa' }]}>
                  {'  '}{shiftLabel.timeLabel}
                </Text>
              </Text>
            ) : (
              <Text style={[styles.qsPanelEmpty, { color: t.subtext }]}>
                {qs.empty}
              </Text>
            )}
          </View>

          {/* Action */}
          <View style={[
            styles.qsPanelBtn,
            { backgroundColor: shiftCfg ? shiftCfg.color + '22' : t.accent + '18' },
          ]}>
            <Text style={[styles.qsPanelBtnText, { color: shiftCfg ? shiftCfg.color : t.accent }]}>
              {shiftCfg ? (isThai ? 'แก้ไข' : 'Edit') : (isThai ? '+ เพิ่ม' : '+ Add')}
            </Text>
          </View>
        </TouchableOpacity>
        {/* ═══════════════════════════════════════════════════════════════════════ */}

        <View style={[styles.divider, { backgroundColor: t.divider }]} />

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(isThai ? 'th-TH' : 'en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
          <Text style={[styles.countBadge, { color: t.accent }]}>
            {filtered.length} {isThai ? 'กิจกรรม' : 'events'}
          </Text>
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={styles.chipRow} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8 }}
        >
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'All' && { backgroundColor: t.accent + '22', borderColor: t.accent }]}
            onPress={() => setActiveFilter('All')}
          >
            <Text style={[styles.chipText, { color: activeFilter === 'All' ? t.accent : t.subtext }]}>
              {isThai ? 'ทั้งหมด' : 'All'}
            </Text>
          </TouchableOpacity>
          {CATEGORIES.slice(0, 5).map((cat) => {
            const color = CATEGORY_COLORS[cat];
            const active = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && { backgroundColor: color + '22', borderColor: color }]}
                onPress={() => setActiveFilter(cat)}
              >
                <View style={[styles.chipDot, { backgroundColor: color }]} />
                <Text style={[styles.chipText, { color: active ? color : t.subtext }]}>
                  {isThai ? CATEGORY_TH[cat] ?? cat : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Events list */}
        <View style={styles.eventList}>
          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
              <Text style={styles.emptyIcon}>🗓</Text>
              <Text style={[styles.emptyTitle, { color: t.text }]}>{isThai ? 'ไม่มีแผน' : 'Nothing planned'}</Text>
              <Text style={[styles.emptySubtext, { color: t.subtext }]}>
                {isThai ? 'กด + เพื่อเพิ่มกิจกรรม' : 'Tap + to add an event for this day'}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <EventCard
                key={item.id}
                item={item}
                onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: t.accent }]}
        onPress={() => router.push('/event/new')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Shift Picker Modal ── */}
      <ShiftPickerModal
        visible={showShiftPicker}
        dates={[selectedDate]}
        currentShiftKeys={shiftsForDay.map((q) => q.shiftKey as ShiftKey)}
        currentShiftsMeta={shiftsForDay.map((q) => ({
          shiftKey: q.shiftKey as ShiftKey,
          startTime: q.startTime,
          endTime: q.endTime,
        }))}
        isThai={isThai}
        onConfirm={handleShiftConfirm}
        onDeleteShift={handleShiftDeleteKey}
        onClose={() => setShowShiftPicker(false)}
      />

      {/* Month/Year picker modal */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        />
        <View style={[styles.pickerSheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
          <View style={[styles.pickerHandle, { backgroundColor: t.divider }]} />

          <View style={styles.pickerYearRow}>
            <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.pickerArrow, { color: t.accent }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerYear, { color: t.text }]}>
              {isThai ? (pickerYear + 543) : pickerYear}
            </Text>
            <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.pickerArrow, { color: t.accent }]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerMonthGrid}>
            {(isThai ? MONTHS_TH : MONTHS_EN).map((label, i) => {
              const isSelected   = i === currentMonth && pickerYear === currentPickerYear;
              const isCurrentMon = i === new Date().getMonth() && pickerYear === new Date().getFullYear();
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.pickerMonthBtn,
                    { backgroundColor: isSelected ? t.accent : t.surface },
                    !isSelected && isCurrentMon && { borderColor: t.accent, borderWidth: 1.5 },
                  ]}
                  onPress={() => selectPickerMonth(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerMonthText,
                    { color: isSelected ? '#fff' : isCurrentMon ? t.accent : t.text },
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md,
  },
  greeting: { fontSize: 13, marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  divider: { height: 1 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  navArrow: { fontSize: 22, paddingHorizontal: 4 },
  monthLabel: { fontSize: 15, fontWeight: '600' },
  monthLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthLabelChevron: { fontSize: 12 },

  // ── Quick Shift Panel ──────────────────────────────────────────────────────
  qsPanel: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.lg, marginVertical: SPACING.sm,
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    overflow: 'hidden', minHeight: 66,
  },
  qsPanelStrip: { width: 6, alignSelf: 'stretch' },
  qsPanelBody: { flex: 1, paddingVertical: 12, paddingHorizontal: SPACING.sm, gap: 3 },
  qsPanelMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  qsPanelShift: { fontSize: 15, fontWeight: '800' },
  qsPanelTime: { fontSize: 12, fontWeight: '500' },
  qsPanelEmpty: { fontSize: 12, fontStyle: 'italic' },
  qsPanelBtn: {
    marginRight: SPACING.sm,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8,
  },
  qsPanelBtnText: { fontSize: 12, fontWeight: '800' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  countBadge: { fontSize: 12, fontWeight: '600' },
  chipRow: { marginBottom: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'transparent',
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600' },
  eventList: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 100 },
  emptyCard: {
    borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 100, right: SPACING.lg,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 10,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
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
