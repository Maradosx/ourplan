import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { RADIUS, SPACING } from '../../constants/theme';
import {
  SHIFT_LIST, ShiftKey, getQsStrings, ShiftConfig, SHIFT_CONFIGS,
} from '../../constants/quickShift';

// ─── Time helpers ─────────────────────────────────────────────────────────────

function minsToHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function HHMMToMins(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtDisplay(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12    = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ─── Overlap helper (mirrors backend + store logic) ──────────────────────────

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function shiftsOverlap(keyA: ShiftKey, keyB: ShiftKey): boolean {
  const a = SHIFT_CONFIGS[keyA];
  const b = SHIFT_CONFIGS[keyB];
  if (!a?.startTime || !b?.startTime) return false;
  const aStart = timeToMins(a.startTime);
  const aEnd   = a.endTime === '00:00' ? 1440 : timeToMins(a.endTime!);
  const bStart = timeToMins(b.startTime);
  const bEnd   = b.endTime === '00:00' ? 1440 : timeToMins(b.endTime!);
  return aStart < bEnd && bStart < aEnd;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ShiftTimeMeta {
  shiftKey: ShiftKey;
  startTime?: string | null;
  endTime?: string | null;
}

interface Props {
  visible: boolean;
  dates: string[];
  /** Currently applied shift keys on the date(s) */
  currentShiftKeys: ShiftKey[];
  /** Optional: full shift data so we can show actual stored times (e.g. custom OT) */
  currentShiftsMeta?: ShiftTimeMeta[];
  isThai: boolean;
  onConfirm: (shiftKey: ShiftKey, dates: string[], customStart?: string, customEnd?: string) => Promise<void>;
  onDeleteShift: (shiftKey: ShiftKey) => Promise<void>;
  onClose: () => void;
}

// ─── OT Time Picker sub-component ────────────────────────────────────────────

interface TimePickerProps {
  label: string;
  value: string;    // HH:MM
  onChange: (v: string) => void;
  textColor: string;
  accentColor: string;
  surfaceColor: string;
}

function TimePicker({ label, value, onChange, textColor, accentColor, surfaceColor }: TimePickerProps) {
  const mins = HHMMToMins(value);
  const step = (delta: number) => onChange(minsToHHMM((mins + delta + 1440) % 1440));

  return (
    <View style={tpStyles.wrap}>
      <Text style={[tpStyles.label, { color: textColor + '99' }]}>{label}</Text>
      <View style={[tpStyles.box, { backgroundColor: surfaceColor, borderColor: accentColor + '55' }]}>
        <TouchableOpacity onPress={() => step(-30)} style={tpStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[tpStyles.arrow, { color: accentColor }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[tpStyles.time, { color: textColor }]}>{fmtDisplay(value)}</Text>
        <TouchableOpacity onPress={() => step(30)} style={tpStyles.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[tpStyles.arrow, { color: accentColor }]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tpStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  box: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 6,
    gap: 6, width: '100%', justifyContent: 'space-between',
  },
  arrow:    { fontSize: 22, fontWeight: '700', width: 22, textAlign: 'center' },
  arrowBtn: { padding: 2 },
  time:     { fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'center' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateParts(dateStr: string, isThai: boolean) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const day = d.getDate();
    const month = d.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', { month: 'short' });
    const weekday = d.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', { weekday: 'long' });
    return { day, month, weekday };
  } catch {
    return { day: 0, month: '', weekday: '' };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ShiftPickerModal({
  visible, dates, currentShiftKeys, currentShiftsMeta, isThai, onConfirm, onDeleteShift, onClose,
}: Props) {
  const { theme: t } = useThemeStore();
  const qs = getQsStrings(isThai ? 'th' : 'en');

  const [selected, setSelected] = useState<ShiftKey | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<ShiftKey | null>(null);

  // OT custom time state (used when selected === 'overtime')
  const [otStart, setOtStart] = useState('17:00');
  const [otEnd,   setOtEnd]   = useState('20:00');

  React.useEffect(() => {
    if (visible) {
      setSelected(null);
      setOtStart('17:00');
      setOtEnd('20:00');
    }
  }, [visible]);

  const isMulti = dates.length > 1;
  const selCfg  = selected ? SHIFT_CONFIGS[selected] : null;

  async function handleConfirm() {
    if (!selected) return;

    // Validate OT custom times
    if (selected === 'overtime') {
      const s = HHMMToMins(otStart);
      const e = HHMMToMins(otEnd);
      if (s >= e) {
        Alert.alert(
          isThai ? 'เวลาไม่ถูกต้อง' : 'Invalid time',
          isThai ? 'เวลาเลิกงานต้องหลังเวลาเริ่มงาน' : 'End time must be after start time.',
        );
        return;
      }
      // Check custom OT times against existing shifts (client-side preview)
      const otOverlap = currentShiftKeys.some((k) => {
        if (k === selected) return false;
        const cfg = SHIFT_CONFIGS[k];
        if (!cfg?.startTime) return false;
        const ks = timeToMins(cfg.startTime);
        const ke = cfg.endTime === '00:00' ? 1440 : timeToMins(cfg.endTime!);
        return s < ke && ks < e;
      });
      if (otOverlap) {
        Alert.alert(
          isThai ? 'กะทับซ้อน' : 'Shift Overlap',
          isThai
            ? 'ช่วงเวลา OT ที่เลือกทับซ้อนกับกะที่มีอยู่'
            : 'The selected OT time range overlaps with an existing shift.',
        );
        return;
      }
    }

    setSaving(true);
    try {
      if (selected === 'overtime') {
        await onConfirm(selected, dates, otStart, otEnd);
      } else {
        await onConfirm(selected, dates);
      }
      onClose();
    } catch (err: any) {
      Alert.alert(
        isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        err?.message ?? (isThai ? 'ไม่สามารถบันทึกได้' : 'Could not save shift.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteShift(shiftKey: ShiftKey) {
    Alert.alert(
      qs.delete,
      isThai ? `ต้องการลบกะ "${qs.types[shiftKey].name}" ใช่ไหม?` : `Remove the "${qs.types[shiftKey].name}" shift?`,
      [
        { text: qs.cancel, style: 'cancel' },
        {
          text: isThai ? 'ลบ' : 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(shiftKey);
            try {
              await onDeleteShift(shiftKey);
            } catch {
              Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Error', isThai ? 'ลบไม่สำเร็จ' : 'Could not delete.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ],
    );
  }

  // ── Date section renderer ─────────────────────────────────────────────────

  function renderDateSection() {
    if (isMulti) {
      return (
        <View style={styles.dateSectionRow}>
          <View style={[
            styles.multiDateBubble,
            { backgroundColor: selCfg ? selCfg.bgColor : t.surface, borderColor: selCfg ? selCfg.color : t.accent },
          ]}>
            <Text style={[styles.multiDateCount, { color: selCfg ? selCfg.color : t.accent }]}>
              {dates.length}
            </Text>
            <Text style={[styles.multiDateLabel, { color: selCfg ? selCfg.color : t.accent }]}>
              {isThai ? 'วัน' : 'days'}
            </Text>
          </View>
          <View style={styles.dateSectionInfo}>
            <Text style={[styles.dateSectionSuperTitle, { color: t.subtext }]}>
              {isThai ? 'เลือก' : 'Selected'}
            </Text>
            <Text style={[styles.dateSectionMain, { color: t.text }]}>
              {qs.selectedCount(dates.length)}
            </Text>
            {selCfg && (
              <Text style={[styles.dateSectionShift, { color: selCfg.color }]}>
                ⚡ {qs.types[selected!].name}
              </Text>
            )}
          </View>
        </View>
      );
    }

    // Single date
    const { day, month, weekday } = parseDateParts(dates[0], isThai);
    return (
      <View style={styles.dateSectionRow}>
        {/* Circle */}
        <View style={[
          styles.dateCircle,
          {
            backgroundColor: selCfg ? selCfg.bgColor : t.surface,
            borderColor: selCfg ? selCfg.color : t.divider,
            borderWidth: selCfg ? 3 : 1.5,
          },
        ]}>
          <Text style={[styles.dateCircleDay, { color: selCfg ? selCfg.textColor : t.text }]}>
            {day}
          </Text>
          {selCfg ? (
            <View style={[styles.dateCircleBadge, { backgroundColor: selCfg.color }]}>
              <Text style={styles.dateCircleBadgeText}>{selCfg.shortLabel}</Text>
            </View>
          ) : (
            <Text style={[styles.dateCircleMonth, { color: t.subtext }]}>{month}</Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.dateSectionInfo}>
          <Text style={[styles.dateSectionSuperTitle, { color: t.subtext }]}>{weekday}</Text>
          <Text style={[styles.dateSectionMain, { color: t.text }]}>
            {day} {month}
          </Text>
          {selCfg ? (
            <Text style={[styles.dateSectionShift, { color: selCfg.color }]}>
              ⚡ {qs.types[selected!].name}
              {'  '}
              <Text style={{ fontWeight: '500' }}>{qs.types[selected!].timeLabel}</Text>
            </Text>
          ) : (
            <Text style={[styles.dateSectionEmpty, { color: t.subtext }]}>
              {isThai ? 'เลือกกะด้านล่าง' : 'Pick a shift below'}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ── Existing shifts section (single-date only) ────────────────────────────

  function renderExistingShifts() {
    if (isMulti) return null;
    return (
      <View style={[styles.existingSection, { borderBottomColor: t.divider }]}>
        <Text style={[styles.existingLabel, { color: t.subtext }]}>
          {isThai ? 'กะงานปัจจุบัน' : 'Current shifts'}
        </Text>
        {currentShiftKeys.length === 0 ? (
          <Text style={[styles.existingEmpty, { color: t.subtext }]}>
            {isThai ? 'ยังไม่มีกะงาน' : 'No shifts yet'}
          </Text>
        ) : (
          currentShiftKeys.map((key) => {
            const cfg      = SHIFT_CONFIGS[key];
            const label    = qs.types[key];
            const isDel    = deleting === key;
            const meta     = currentShiftsMeta?.find((m) => m.shiftKey === key);
            const timeLabel = key === 'overtime' && meta?.startTime && meta?.endTime
              ? `${meta.startTime} – ${meta.endTime}`
              : label.timeLabel;
            return (
              <View key={key} style={[styles.existingRow, { backgroundColor: cfg.bgColor, borderColor: cfg.color + '55' }]}>
                <View style={[styles.existingColorBar, { backgroundColor: cfg.color }]} />
                <View style={styles.existingRowInfo}>
                  <Text style={[styles.existingRowName, { color: cfg.textColor }]}>{label.name}</Text>
                  <Text style={[styles.existingRowTime, { color: cfg.textColor + 'aa' }]}>{timeLabel}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.existingDeleteBtn, { borderColor: cfg.color + '80' }]}
                  onPress={() => handleDeleteShift(key)}
                  disabled={isDel}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isDel
                    ? <ActivityIndicator size="small" color={cfg.color} />
                    : <Text style={[styles.existingDeleteText, { color: cfg.color }]}>✕</Text>}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={[styles.sheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
        <View style={[styles.handle, { backgroundColor: t.divider }]} />

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.headerCancel, { color: t.subtext }]}>{qs.cancel}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.text }]}>
            {isThai ? '⚡ กะงานด่วน' : '⚡ Quick Shift'}
          </Text>
          <View style={{ minWidth: 50 }} />
        </View>

        {/* Date section */}
        <View style={[styles.dateSectionWrap, { backgroundColor: t.surface, borderBottomColor: t.divider }]}>
          {renderDateSection()}
        </View>

        {/* Existing shifts (single date) */}
        {renderExistingShifts()}

        {/* Add new shift header */}
        <View style={[styles.addNewHeader, { borderBottomColor: t.divider }]}>
          <Text style={[styles.addNewLabel, { color: t.subtext }]}>
            {isThai ? '+ เพิ่มกะใหม่' : '+ Add new shift'}
          </Text>
        </View>

        {/* Shift list */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {SHIFT_LIST.map((cfg: ShiftConfig) => {
            const label    = qs.types[cfg.key];
            const isSel    = selected === cfg.key;
            const isApplied = !isMulti && currentShiftKeys.includes(cfg.key);
            // For overtime with custom times, we can't do a static overlap check on the list row —
            // we use the default overtime window for the visual hint only.
            const wouldOverlap = !isMulti && !isApplied && currentShiftKeys.some(
              (k) => shiftsOverlap(cfg.key, k),
            );

            return (
              <TouchableOpacity
                key={cfg.key}
                style={[
                  styles.row,
                  { backgroundColor: t.surface, borderColor: t.divider },
                  isSel && { borderColor: cfg.color, backgroundColor: cfg.bgColor, borderWidth: 2 },
                  (isApplied || wouldOverlap) && { opacity: 0.55 },
                ]}
                onPress={() => {
                  if (isApplied) return; // already applied, no-op
                  if (wouldOverlap) {
                    Alert.alert(
                      isThai ? 'กะทับซ้อน' : 'Shift Overlap',
                      isThai
                        ? `กะ "${label.name}" ทับซ้อนกับกะที่มีอยู่`
                        : `"${label.name}" overlaps with an existing shift.`,
                    );
                    return;
                  }
                  setSelected(cfg.key);
                }}
                activeOpacity={0.7}
              >
                {/* Left color bar */}
                <View style={[styles.colorBar, { backgroundColor: cfg.color }]} />

                {/* Color dot */}
                <View style={[styles.colorDot, { backgroundColor: cfg.color + (isSel ? 'ff' : '44') }]} />

                {/* Info */}
                <View style={styles.rowInfo}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowName, { color: isSel ? cfg.textColor : t.text }]}>
                      {label.name}
                    </Text>
                    {isApplied && (
                      <View style={[styles.currentBadge, { backgroundColor: cfg.bgColor, borderColor: cfg.color }]}>
                        <Text style={[styles.currentBadgeText, { color: cfg.textColor }]}>
                          {isThai ? 'ใช้งานอยู่ ✓' : 'Applied ✓'}
                        </Text>
                      </View>
                    )}
                    {wouldOverlap && (
                      <View style={[styles.overlapBadge, { backgroundColor: '#FEF3C7', borderColor: '#D97706' }]}>
                        <Text style={[styles.overlapBadgeText, { color: '#92400E' }]}>
                          {isThai ? '⚠ ทับกัน' : '⚠ Overlap'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.rowTime, { color: isSel ? cfg.textColor + 'cc' : t.subtext }]}>
                    {label.timeLabel}
                  </Text>
                </View>

                {/* Short label pill */}
                <View style={[
                  styles.shortLabel,
                  { backgroundColor: isSel ? cfg.color : cfg.color + '22', borderColor: cfg.color + (isSel ? 'ff' : '44') },
                ]}>
                  <Text style={[styles.shortLabelText, { color: isSel ? '#fff' : cfg.textColor }]}>
                    {cfg.shortLabel}
                  </Text>
                </View>

                {/* Checkmark when selected */}
                {isSel && (
                  <View style={[styles.checkCircle, { backgroundColor: cfg.color }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* OT Custom Time Picker – shown only when overtime is selected */}
        {selected === 'overtime' && (() => {
          const otCfg = SHIFT_CONFIGS['overtime'];
          const s = HHMMToMins(otStart);
          const e = HHMMToMins(otEnd);
          const invalid = s >= e;
          return (
            <View style={[styles.otSection, { backgroundColor: otCfg.bgColor, borderColor: otCfg.color + '55' }]}>
              <View style={styles.otHeader}>
                <View style={[styles.otBadge, { backgroundColor: otCfg.color }]}>
                  <Text style={styles.otBadgeText}>OT</Text>
                </View>
                <Text style={[styles.otTitle, { color: otCfg.textColor }]}>
                  {isThai ? 'กำหนดเวลา OT' : 'Set OT Time'}
                </Text>
              </View>
              <View style={styles.otPickers}>
                <TimePicker
                  label={isThai ? 'เริ่ม' : 'Start'}
                  value={otStart}
                  onChange={setOtStart}
                  textColor={otCfg.textColor}
                  accentColor={otCfg.color}
                  surfaceColor={otCfg.bgColor}
                />
                <View style={[styles.otDash, { backgroundColor: otCfg.color + '60' }]} />
                <TimePicker
                  label={isThai ? 'เลิก' : 'End'}
                  value={otEnd}
                  onChange={setOtEnd}
                  textColor={otCfg.textColor}
                  accentColor={otCfg.color}
                  surfaceColor={otCfg.bgColor}
                />
              </View>
              {invalid && (
                <Text style={[styles.otError, { color: '#DC2626' }]}>
                  ⚠ {isThai ? 'เวลาเลิกงานต้องหลังเวลาเริ่มงาน' : 'End time must be after start time'}
                </Text>
              )}
              <Text style={[styles.otHint, { color: otCfg.textColor + '88' }]}>
                {isThai ? '← → เปลี่ยนทีละ 30 นาที' : '← → adjusts in 30-min steps'}
              </Text>
            </View>
          );
        })()}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: t.divider }]}>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: selCfg ? selCfg.color : t.accent },
              !selected && { opacity: 0.45 },
            ]}
            onPress={handleConfirm}
            disabled={!selected || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>
                  {isMulti ? qs.applyToSelectedDays : qs.save}
                </Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000060',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    maxHeight: '92%',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  handle: {
    width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },

  // Header
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
  },
  headerCancel: { fontSize: 14, fontWeight: '500' },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  // Date section
  dateSectionWrap: {
    paddingHorizontal: SPACING.lg, paddingVertical: 14,
    borderBottomWidth: 1, marginBottom: 0,
  },
  dateSectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  dateCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    gap: 2,
  },
  dateCircleDay: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  dateCircleMonth: { fontSize: 11, fontWeight: '600' },
  dateCircleBadge: {
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1,
  },
  dateCircleBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff' },
  multiDateBubble: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  multiDateCount: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  multiDateLabel: { fontSize: 11, fontWeight: '700' },
  dateSectionInfo: { flex: 1, gap: 2 },
  dateSectionSuperTitle: { fontSize: 11, fontWeight: '500' },
  dateSectionMain: { fontSize: 20, fontWeight: '800' },
  dateSectionShift: { fontSize: 13, fontWeight: '700' },
  dateSectionEmpty: { fontSize: 12, fontStyle: 'italic' },

  // Existing shifts
  existingSection: {
    paddingHorizontal: SPACING.lg, paddingVertical: 10,
    borderBottomWidth: 1, gap: 6,
  },
  existingLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  existingEmpty: { fontSize: 12, fontStyle: 'italic', paddingVertical: 4 },
  existingRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden',
  },
  existingColorBar: { width: 5, alignSelf: 'stretch' },
  existingRowInfo: { flex: 1, paddingVertical: 8, paddingHorizontal: SPACING.sm, gap: 1 },
  existingRowName: { fontSize: 13, fontWeight: '700' },
  existingRowTime: { fontSize: 11 },
  existingDeleteBtn: {
    padding: 10, marginRight: 6, borderRadius: RADIUS.sm, borderWidth: 1,
  },
  existingDeleteText: { fontSize: 13, fontWeight: '700' },

  // Add new shift header
  addNewHeader: {
    paddingHorizontal: SPACING.lg, paddingVertical: 8,
    borderBottomWidth: 1,
  },
  addNewLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // List
  listContent: { paddingHorizontal: SPACING.lg, gap: 7, paddingBottom: 8, paddingTop: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: 1.5,
    overflow: 'hidden', gap: 10,
    paddingRight: 12,
  },
  colorBar: { width: 7, alignSelf: 'stretch' },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  rowInfo: { flex: 1, paddingVertical: 12, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rowName: { fontSize: 14, fontWeight: '700' },
  rowTime: { fontSize: 11 },
  currentBadge: {
    borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1,
  },
  currentBadgeText: { fontSize: 9, fontWeight: '700' },
  overlapBadge: {
    borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1,
  },
  overlapBadgeText: { fontSize: 9, fontWeight: '700' },
  shortLabel: {
    minWidth: 38, paddingHorizontal: 7, paddingVertical: 4,
    borderRadius: RADIUS.sm, alignItems: 'center', borderWidth: 1,
  },
  shortLabelText: { fontSize: 10, fontWeight: '900' },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // OT Section
  otSection: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1.5,
    padding: SPACING.sm, gap: 8,
  },
  otHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  otBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  otBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  otTitle: { fontSize: 13, fontWeight: '800' },
  otPickers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  otDash: { width: 1.5, height: 28, borderRadius: 1 },
  otError: { fontSize: 11, fontWeight: '600' },
  otHint: { fontSize: 10, fontStyle: 'italic' },

  // Footer
  footer: {
    paddingHorizontal: SPACING.lg, paddingTop: 10, gap: SPACING.sm,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center',
    shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
