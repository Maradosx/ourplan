import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView,
  ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../../store/themeStore';
import { useScheduleStore } from '../../../store/scheduleStore';
import { useLanguageStore } from '../../../store/languageStore';
import { CATEGORY_COLORS, CATEGORIES, Category, RADIUS, SPACING } from '../../../constants/theme';
import { StickerPicker } from '../../../components/ui/StickerPicker';
import { api } from '../../../lib/api';
import RecurringModal, { RecurringConfig, recurLabel } from '../../../components/ui/RecurringModal';

type Visibility = 'private' | 'friends' | 'public';

const CATEGORY_TH: Record<string, string> = {
  Work: 'งาน', Health: 'สุขภาพ', Errand: 'ธุระ',
  Social: 'สังคม', Travel: 'เดินทาง', Other: 'อื่นๆ',
};

function getVisibilityOptions(isThai: boolean) {
  return [
    { key: 'private' as Visibility, label: isThai ? 'เฉพาะฉัน' : 'Only me',  icon: '🔒' },
    { key: 'friends' as Visibility, label: isThai ? 'เพื่อน'   : 'Friends',  icon: '👥' },
    { key: 'public'  as Visibility, label: isThai ? 'ทุกคน'    : 'Public',   icon: '🌐' },
  ];
}

function timePad(n: number) { return String(n).padStart(2, '0'); }
function buildISO(dateStr: string, hour: number, minute: number) {
  return new Date(`${dateStr}T${timePad(hour)}:${timePad(minute)}:00`).toISOString();
}
function parseHour(iso: string) { return new Date(iso).getHours(); }
function parseMin(iso: string)  { return new Date(iso).getMinutes(); }
function parseDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${timePad(d.getMonth() + 1)}-${timePad(d.getDate())}`;
}

export default function EditEventScreen() {
  const { id, pickedLocation } = useLocalSearchParams<{ id: string; pickedLocation?: string }>();
  const { theme: t } = useThemeStore();
  const { updateSchedule } = useScheduleStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [isFetching, setIsFetching] = useState(true);
  const [notFound, setNotFound]     = useState(false);

  // Form state (initialised once event loads)
  const [title, setTitle]             = useState('');
  const [category, setCategory]       = useState<Category>('Other');
  const [date, setDate]               = useState('');
  const [startHour, setStartHour]     = useState(9);
  const [startMin, setStartMin]       = useState(0);
  const [endHour, setEndHour]         = useState(10);
  const [endMin, setEndMin]           = useState(0);
  const [location, setLocation]       = useState('');
  const [icon, setIcon]               = useState<string | null>(null);
  const [visibility, setVisibility]   = useState<Visibility>('private');
  const [notes, setNotes]             = useState('');
  const [isSaving, setIsSaving]       = useState(false);
  const [eventId, setEventId]         = useState('');
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig | null>(null);
  const [showRecurring,   setShowRecurring]   = useState(false);

  useEffect(() => {
    api.get(`/schedules/${id}`)
      .then(({ data }) => {
        setTitle(data.title);
        setCategory(data.category);
        setDate(parseDate(data.startDatetime));
        setStartHour(parseHour(data.startDatetime));
        setStartMin(parseMin(data.startDatetime));
        setEndHour(parseHour(data.endDatetime));
        setEndMin(parseMin(data.endDatetime));
        setLocation(data.location ?? '');
        setIcon(data.icon ?? null);
        setVisibility(data.visibility);
        setNotes(data.description ?? '');
        setEventId(data.id);
        if (data.recurrenceRule) {
          try { setRecurringConfig(JSON.parse(data.recurrenceRule)); } catch {}
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsFetching(false));
  }, [id]);

  useFocusEffect(useCallback(() => {
    if (pickedLocation) setLocation(pickedLocation);
  }, [pickedLocation]));

  const displayDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString(isThai ? 'th-TH' : 'en-GB', {
        weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  function shiftHour(type: 'start' | 'end', delta: number) {
    if (type === 'start') {
      const next = Math.min(23, Math.max(0, startHour + delta));
      setStartHour(next);
      if (next > endHour || (next === endHour && startMin >= endMin)) {
        setEndHour(Math.min(23, next + 1));
      }
    } else {
      setEndHour(Math.min(23, Math.max(0, endHour + delta)));
    }
  }
  function shiftMin(type: 'start' | 'end', delta: number) {
    if (type === 'start') setStartMin(m => (m + delta + 60) % 60);
    else setEndMin(m => (m + delta + 60) % 60);
  }

  function toggleAmPm(type: 'start' | 'end') {
    if (type === 'start') {
      setStartHour(h => h < 12 ? h + 12 : h - 12);
    } else {
      setEndHour(h => h < 12 ? h + 12 : h - 12);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert(
        isThai ? 'ต้องใส่ชื่อ' : 'Title required',
        isThai ? 'กรุณาใส่ชื่อกิจกรรม' : 'Please enter a title for your event.',
      );
      return;
    }
    const start = buildISO(date, startHour, startMin);
    const end   = buildISO(date, endHour, endMin);
    if (new Date(end) <= new Date(start)) {
      Alert.alert(
        isThai ? 'เวลาไม่ถูกต้อง' : 'Invalid time',
        isThai ? 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น' : 'End time must be after start time.',
      );
      return;
    }
    setIsSaving(true);
    try {
      await updateSchedule(eventId, {
        title: title.trim(),
        category,
        startDatetime: start,
        endDatetime: end,
        location: location.trim() || null,
        icon: icon || null,
        visibility,
        description: notes.trim() || null,
        isRecurring: !!recurringConfig,
        recurrenceRule: recurringConfig ? JSON.stringify(recurringConfig) : undefined,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? e?.message ?? (isThai ? 'ไม่สามารถบันทึกได้' : 'Could not save event.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (isFetching) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.center}>
          <Text style={[{ color: t.subtext, fontSize: 16 }]}>{isThai ? 'ไม่พบกิจกรรม' : 'Event not found'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[{ color: t.accent, fontSize: 15, fontWeight: '600', marginTop: 8 }]}>← {isThai ? 'กลับ' : 'Go back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const accent = CATEGORY_COLORS[category];
  const VISIBILITY_OPTIONS = getVisibilityOptions(isThai);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: t.divider }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backBtn, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.text }]}>{isThai ? 'แก้ไขกิจกรรม' : 'Edit Event'}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'ชื่อกิจกรรม' : 'Title'}</Text>
          <TextInput
            style={[styles.titleInput, { backgroundColor: t.surface, color: t.text, borderColor: title ? accent : t.divider }]}
            placeholder={isThai ? 'แผนของคุณคืออะไร?' : "What's the plan?"}
            placeholderTextColor={t.subtext}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
          />

          {/* Category */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'หมวดหมู่' : 'Category'}</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const color = CATEGORY_COLORS[cat];
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, { borderColor: active ? color : t.divider, backgroundColor: active ? color + '22' : t.surface }]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catDot, { backgroundColor: color }]} />
                  <Text style={[styles.categoryChipText, { color: active ? color : t.subtext }]}>
                    {isThai ? CATEGORY_TH[cat] : cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date (read-only) */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'วันที่' : 'Date'}</Text>
          <View style={[styles.fieldRow, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <Text style={{ fontSize: 16 }}>📅</Text>
            <Text style={[styles.dateText, { color: t.text }]}>{displayDate}</Text>
          </View>

          {/* Time */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'เวลา' : 'Time'}</Text>
          <View style={styles.timeRow}>
            <TimePicker label={isThai ? 'เริ่ม' : 'Start'} hour={startHour} minute={startMin}
              onHourUp={() => shiftHour('start', 1)} onHourDown={() => shiftHour('start', -1)}
              onMinUp={() => shiftMin('start', 1)} onMinDown={() => shiftMin('start', -1)}
              onAmPmToggle={() => toggleAmPm('start')}
              accent={accent} surface={t.surface} divider={t.divider} text={t.text} subtext={t.subtext} />
            <View style={[styles.timeSep, { backgroundColor: t.divider }]} />
            <TimePicker label={isThai ? 'สิ้นสุด' : 'End'} hour={endHour} minute={endMin}
              onHourUp={() => shiftHour('end', 1)} onHourDown={() => shiftHour('end', -1)}
              onMinUp={() => shiftMin('end', 1)} onMinDown={() => shiftMin('end', -1)}
              onAmPmToggle={() => toggleAmPm('end')}
              accent={accent} surface={t.surface} divider={t.divider} text={t.text} subtext={t.subtext} />
          </View>

          {/* Location */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'สถานที่' : 'Location'}</Text>
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: t.surface, borderColor: location ? accent : t.divider }]}
            onPress={() => router.push('/location/picker')}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 16 }}>📍</Text>
            <Text style={[styles.locationInput, { color: location ? t.text : t.subtext }]} numberOfLines={1}>
              {location || (isThai ? 'ค้นหาหรือเลือกบนแผนที่ (ไม่บังคับ)' : 'Search or pick on map (optional)')}
            </Text>
            {location ? (
              <TouchableOpacity onPress={() => setLocation('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[{ color: t.subtext, fontSize: 14 }]}>✕</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: t.subtext, fontSize: 16 }}>›</Text>
            )}
          </TouchableOpacity>

          {/* Icon / Sticker */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'ไอคอน' : 'Icon'}</Text>
          <StickerPicker value={icon} onChange={setIcon} isThai={isThai} />

          {/* Visibility */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'การมองเห็น' : 'Visibility'}</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = visibility === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.visChip, { borderColor: active ? accent : t.divider, backgroundColor: active ? accent + '18' : t.surface }]}
                  onPress={() => setVisibility(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.visIcon}>{opt.icon}</Text>
                  <Text style={[styles.visLabel, { color: active ? accent : t.subtext }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Recurrence */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'กำหนดรอบ' : 'Recurrence'}</Text>
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: t.surface, borderColor: recurringConfig ? accent : t.divider }]}
            onPress={() => setShowRecurring(true)}
            activeOpacity={0.75}
          >
            <CycleIcon color={recurringConfig ? accent : t.subtext} />
            <Text style={[styles.locationInput, { color: recurringConfig ? t.text : t.subtext }]} numberOfLines={1}>
              {recurLabel(recurringConfig, isThai, date)}
            </Text>
            {recurringConfig && (
              <TouchableOpacity onPress={() => setRecurringConfig(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: t.subtext, fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Notes */}
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'บันทึก' : 'Notes'}</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: t.surface, color: t.text, borderColor: t.divider }]}
            placeholder={isThai ? 'เพิ่มบันทึก (ไม่บังคับ)' : 'Add notes (optional)'}
            placeholderTextColor={t.subtext}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: accent, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>{isThai ? 'บันทึก' : 'Save Changes'}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <RecurringModal
        visible={showRecurring}
        eventDate={date}
        value={recurringConfig}
        isThai={isThai}
        accent={accent}
        bg={t.bg}
        surface={t.surface}
        textColor={t.text}
        subtext={t.subtext}
        divider={t.divider}
        onCancel={() => setShowRecurring(false)}
        onConfirm={(cfg) => { setRecurringConfig(cfg); setShowRecurring(false); }}
      />
    </SafeAreaView>
  );
}

/* ── CycleIcon — custom recurrence icon ── */
function CycleIcon({ color, size = 19 }: { color: string; size?: number }) {
  const sw = Math.round(size * 0.145);
  return (
    <View style={{ width: size, height: size }}>
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: sw,
        borderColor: color, borderTopColor: 'transparent',
        transform: [{ rotate: '45deg' }],
      }} />
      <View style={{
        position: 'absolute', top: 0, right: sw * 0.6,
        borderLeftWidth: sw * 1.5, borderLeftColor: 'transparent',
        borderRightWidth: sw * 1.5, borderRightColor: 'transparent',
        borderBottomWidth: sw * 2.2, borderBottomColor: color,
        transform: [{ rotate: '-45deg' }],
      }} />
    </View>
  );
}

/* ── HoldButton — tap or hold to repeat ── */
function HoldButton({ onPress, label, color }: { onPress: () => void; label: string; color: string }) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  function begin() {
    onPress();
    timer.current = setTimeout(function repeat() {
      onPress();
      timer.current = setTimeout(repeat, 80);
    }, 380);
  }
  function end() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }
  return (
    <Pressable onPressIn={begin} onPressOut={end} hitSlop={10}>
      {({ pressed }) => (
        <Text style={[tpStyles.arrow, { color, opacity: pressed ? 0.4 : 1 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/* ── TimePicker ── */
interface TimePickerProps {
  label: string;
  hour: number; minute: number;
  onHourUp: () => void; onHourDown: () => void;
  onMinUp: () => void; onMinDown: () => void;
  onAmPmToggle: () => void;
  accent: string; surface: string; divider: string; text: string; subtext: string;
}

function TimePicker({ label, hour, minute, onHourUp, onHourDown, onMinUp, onMinDown, onAmPmToggle, accent, surface, divider, text, subtext }: TimePickerProps) {
  const isPM = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return (
    <View style={[tpStyles.wrap, { backgroundColor: surface, borderColor: divider }]}>
      <Text style={[tpStyles.label, { color: subtext }]}>{label}</Text>
      <View style={tpStyles.wheelRow}>
        <View style={tpStyles.wheel}>
          <HoldButton onPress={onHourUp} label="▲" color={accent} />
          <Text style={[tpStyles.digit, { color: text }]}>{timePad(h12)}</Text>
          <HoldButton onPress={onHourDown} label="▼" color={accent} />
        </View>
        <Text style={[tpStyles.colon, { color: text }]}>:</Text>
        <View style={tpStyles.wheel}>
          <HoldButton onPress={onMinUp} label="▲" color={accent} />
          <Text style={[tpStyles.digit, { color: text }]}>{timePad(minute)}</Text>
          <HoldButton onPress={onMinDown} label="▼" color={accent} />
        </View>
        <TouchableOpacity onPress={onAmPmToggle} activeOpacity={0.7} style={[tpStyles.ampmBtn, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
          <Text style={[tpStyles.ampm, { color: accent }]}>{isPM ? 'PM' : 'AM'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tpStyles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  wheelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wheel: { alignItems: 'center', gap: 6 },
  arrow: { fontSize: 20, fontWeight: '800' },
  digit: { fontSize: 26, fontWeight: '700', width: 36, textAlign: 'center' },
  colon: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  ampmBtn: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1.5, marginLeft: 4 },
  ampm: { fontSize: 13, fontWeight: '800' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1,
  },
  backBtn: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 60 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: SPACING.sm },
  titleInput: { fontSize: 18, fontWeight: '600', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  categoryChipText: { fontSize: 13, fontWeight: '600' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  dateText: { fontSize: 15, fontWeight: '500' },
  timeRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  timeSep: { width: 1, alignSelf: 'stretch', borderRadius: 1 },
  locationInput: { flex: 1, fontSize: 15 },
  visibilityRow: { flexDirection: 'row', gap: SPACING.sm },
  visChip: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 3, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1.5 },
  visIcon: { fontSize: 18 },
  visLabel: { fontSize: 11, fontWeight: '600' },
  notesInput: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingTop: 12, paddingBottom: 12, fontSize: 15, minHeight: 80 },
  saveBtn: { marginTop: SPACING.md, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
