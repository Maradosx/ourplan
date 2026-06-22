import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch,
} from 'react-native';
import { RADIUS, SPACING } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
export type RecurType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringConfig {
  type: RecurType;
  weekDays: number[];      // 0=Mon … 6=Sun (weekly only)
  endDate: string | null;  // YYYY-MM-DD or null
}

// ─── Locale data ──────────────────────────────────────────────────────────────
export const THAI_MONTHS_FULL = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];
export const EN_MONTHS_FULL = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const EN_MONTHS_SHORT   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEK_TH = ['จ','อ','พ','พฤ','ศ','ส','อา'];
const WEEK_EN = ['M','T','W','T','F','S','S'];
const WEEK_TH_FULL  = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];
const WEEK_EN_FULL  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function timePad(n: number) { return String(n).padStart(2, '0'); }
const ITEM_H    = 44;
const BASE_YEAR = new Date().getFullYear();
const YEAR_COUNT = 12;

// ─── Public helper — summary label for the event form row ─────────────────────
export function recurLabel(cfg: RecurringConfig | null, isThai: boolean, eventDate: string): string {
  if (!cfg) return isThai ? 'ครั้งเดียว' : 'One-time only';
  const d     = new Date(eventDate + 'T00:00:00');
  const day   = d.getDate();
  const month = d.getMonth();
  const mFull = isThai ? THAI_MONTHS_FULL[month] : EN_MONTHS_FULL[month];
  const wFull = isThai ? WEEK_TH_FULL : WEEK_EN_FULL;
  switch (cfg.type) {
    case 'daily':   return isThai ? 'ทุกวัน' : 'Every day';
    case 'weekly': {
      if (!cfg.weekDays.length) return isThai ? 'ทุกสัปดาห์' : 'Every week';
      const days = [...cfg.weekDays].sort().map(i => wFull[i]).join(', ');
      return isThai ? `ทุก${days}` : `Every ${days}`;
    }
    case 'monthly': return isThai ? `ทุกเดือน วันที่ ${day}` : `Monthly on the ${day}`;
    case 'yearly':  return isThai ? `ทุกปี ${day} ${mFull}` : `Yearly, ${mFull} ${day}`;
  }
}

// ─── Scroll-wheel column ──────────────────────────────────────────────────────
function WheelColumn({
  data, selectedIdx, onSelect, accent, textColor, surfaceColor,
}: {
  data: string[]; selectedIdx: number; onSelect: (i: number) => void;
  accent: string; textColor: string; surfaceColor: string;
}) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIdx * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, height: ITEM_H * 5, overflow: 'hidden' }}>
      {/* selected-row highlight */}
      <View
        style={[whs.highlight, { backgroundColor: accent + '18', borderColor: accent + '40' }]}
        pointerEvents="none"
      />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onMomentumScrollEnd={e => {
          const idx = Math.max(0, Math.min(
            Math.round(e.nativeEvent.contentOffset.y / ITEM_H),
            data.length - 1,
          ));
          onSelect(idx);
        }}
      >
        {data.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={whs.item}
            onPress={() => { onSelect(i); ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); }}
            activeOpacity={0.6}
          >
            <Text style={[
              whs.itemText,
              i === selectedIdx
                ? { color: accent, fontWeight: '700', fontSize: 15 }
                : { color: textColor + '70', fontWeight: '400', fontSize: 14 },
            ]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const whs = StyleSheet.create({
  highlight: { position: 'absolute', top: ITEM_H * 2, left: 6, right: 6, height: ITEM_H, borderRadius: RADIUS.md, borderWidth: 1 },
  item:      { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText:  {},
});

// ─── RecurringModal ───────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  eventDate: string;
  value: RecurringConfig | null;
  isThai: boolean;
  accent: string;
  /** Pass the theme colours so the sheet blends into the app */
  bg?: string;
  surface?: string;
  textColor?: string;
  subtext?: string;
  divider?: string;
  onCancel: () => void;
  onConfirm: (cfg: RecurringConfig | null) => void;
}

export default function RecurringModal({
  visible, eventDate, value, isThai, accent,
  bg = '#F3F5FB', surface = '#FFFFFF', textColor = '#191A2D',
  subtext = '#757898', divider = 'rgba(0,0,0,0.07)',
  onCancel, onConfirm,
}: Props) {
  const evDate  = new Date(eventDate + 'T00:00:00');
  const evDay   = evDate.getDate();
  const evMonth = evDate.getMonth();

  const [recurType, setRecurType] = useState<RecurType>(value?.type ?? 'daily');
  const [weekDays,  setWeekDays]  = useState<number[]>(value?.weekDays ?? []);
  const [hasEnd,    setHasEnd]    = useState(!!value?.endDate);
  const [endDay,    setEndDay]    = useState(0);
  const [endMonth,  setEndMonth]  = useState(0);
  const [endYear,   setEndYear]   = useState(1);

  useEffect(() => {
    if (!visible) return;
    setRecurType(value?.type ?? 'daily');
    setWeekDays(value?.weekDays ?? []);
    setHasEnd(!!value?.endDate);
    const edo = value?.endDate
      ? new Date(value.endDate + 'T00:00:00')
      : new Date(evDate.getFullYear() + 1, evDate.getMonth(), evDate.getDate());
    setEndDay(edo.getDate() - 1);
    setEndMonth(edo.getMonth());
    setEndYear(Math.max(0, Math.min(edo.getFullYear() - BASE_YEAR, YEAR_COUNT - 1)));
  }, [visible]);

  const toggleDay = (d: number) =>
    setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const buildEndDate = () =>
    `${BASE_YEAR + endYear}-${timePad(endMonth + 1)}-${timePad(endDay + 1)}`;

  function handleConfirm() {
    let days = weekDays;
    if (recurType === 'weekly' && days.length === 0) {
      days = [(evDate.getDay() + 6) % 7]; // default to event's weekday
    }
    onConfirm({ type: recurType, weekDays: days, endDate: hasEnd ? buildEndDate() : null });
  }

  const repeatOptions: { key: RecurType; icon: string; label: string; sub: string }[] = [
    {
      key: 'daily',
      icon: '🌅',
      label: isThai ? 'ทุกวัน' : 'Daily',
      sub: isThai ? 'ซ้ำทุกวันจนกว่าจะสิ้นสุด' : 'Repeats every single day',
    },
    {
      key: 'weekly',
      icon: '📅',
      label: isThai ? 'รายสัปดาห์' : 'Weekly',
      sub: isThai ? 'เลือกวันที่ต้องการในแต่ละสัปดาห์' : 'Pick which days each week',
    },
    {
      key: 'monthly',
      icon: '🗓️',
      label: isThai ? 'รายเดือน' : 'Monthly',
      sub: isThai ? `ทุกเดือน วันที่ ${evDay}` : `Every month on the ${evDay}`,
    },
    {
      key: 'yearly',
      icon: '🎂',
      label: isThai ? 'ทุกปี' : 'Yearly',
      sub: isThai
        ? `${evDay} ${THAI_MONTHS_FULL[evMonth]} ของทุกปี`
        : `${EN_MONTHS_FULL[evMonth]} ${evDay} each year`,
    },
  ];

  const wShort = isThai ? WEEK_TH : WEEK_EN;
  const dayData   = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const monthData = isThai ? THAI_MONTHS_SHORT : EN_MONTHS_SHORT;
  const yearData  = Array.from({ length: YEAR_COUNT }, (_, i) =>
    isThai ? String(BASE_YEAR + i + 543) : String(BASE_YEAR + i),
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject as any} activeOpacity={1} onPress={onCancel} />

        <View style={[s.sheet, { backgroundColor: bg }]}>
          {/* ── Drag handle ── */}
          <View style={[s.handle, { backgroundColor: divider }]} />

          {/* ── Title bar ── */}
          <View style={s.titleRow}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[s.cancelLink, { color: subtext }]}>{isThai ? 'ยกเลิก' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={[s.titleText, { color: textColor }]}>
              {isThai ? 'กำหนดรอบกิจกรรม' : 'Recurrence'}
            </Text>
            <View style={{ width: 52 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollBody}
          >
            {/* ── Repeat type cards ── */}
            <View style={s.optionList}>
              {repeatOptions.map(opt => {
                const active = recurType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      s.optionRow,
                      { backgroundColor: surface, borderColor: active ? accent : divider },
                      active && { borderColor: accent, shadowColor: accent, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
                    ]}
                    onPress={() => setRecurType(opt.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.optionIconWrap, { backgroundColor: active ? accent + '18' : bg }]}>
                      <Text style={s.optionIcon}>{opt.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.optionLabel, { color: active ? accent : textColor }]}>{opt.label}</Text>
                      <Text style={[s.optionSub, { color: subtext }]}>{opt.sub}</Text>
                    </View>
                    <View style={[
                      s.radio,
                      { borderColor: active ? accent : divider },
                      active && { backgroundColor: accent },
                    ]}>
                      {active && <View style={s.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Weekly day picker ── */}
            {recurType === 'weekly' && (
              <View style={[s.daySection, { backgroundColor: surface, borderColor: divider }]}>
                <Text style={[s.daySectionLabel, { color: subtext }]}>
                  {isThai ? 'เลือกวันในสัปดาห์' : 'Select days of the week'}
                </Text>
                <View style={s.dayGrid}>
                  {wShort.map((lbl, i) => {
                    const active = weekDays.includes(i);
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          s.dayChip,
                          { borderColor: active ? accent : divider, backgroundColor: active ? accent : surface },
                        ]}
                        onPress={() => toggleDay(i)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.dayChipText, { color: active ? '#fff' : subtext }]}>{lbl}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── End date toggle ── */}
            <View style={[s.endCard, { backgroundColor: surface, borderColor: divider }]}>
              <View style={s.endToggleRow}>
                <View style={[s.endIconWrap, { backgroundColor: hasEnd ? accent + '18' : bg }]}>
                  <Text style={{ fontSize: 18 }}>📆</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.endLabel, { color: textColor }]}>
                    {isThai ? 'กำหนดวันสิ้นสุด' : 'End date'}
                  </Text>
                  <Text style={[s.endSub, { color: subtext }]}>
                    {hasEnd
                      ? (isThai ? 'ซ้ำจนถึงวันที่เลือก' : 'Repeats until selected date')
                      : (isThai ? 'วนต่อเนื่อง ไม่มีกำหนดสิ้นสุด' : 'Continues indefinitely')}
                  </Text>
                </View>
                <Switch
                  value={hasEnd}
                  onValueChange={setHasEnd}
                  trackColor={{ false: divider, true: accent + '88' }}
                  thumbColor={hasEnd ? accent : '#fff'}
                  ios_backgroundColor={divider}
                />
              </View>

              {hasEnd && (
                <>
                  <View style={[s.endDivider, { backgroundColor: divider }]} />
                  <View style={[s.wheelWrap, { backgroundColor: bg }]}>
                    <WheelColumn
                      data={dayData} selectedIdx={endDay} onSelect={setEndDay}
                      accent={accent} textColor={textColor} surfaceColor={surface}
                    />
                    <View style={[s.wheelSep, { backgroundColor: divider }]} />
                    <WheelColumn
                      data={monthData} selectedIdx={endMonth} onSelect={setEndMonth}
                      accent={accent} textColor={textColor} surfaceColor={surface}
                    />
                    <View style={[s.wheelSep, { backgroundColor: divider }]} />
                    <WheelColumn
                      data={yearData} selectedIdx={endYear} onSelect={setEndYear}
                      accent={accent} textColor={textColor} surfaceColor={surface}
                    />
                  </View>
                </>
              )}
            </View>

            {/* ── Summary pill ── */}
            <View style={[s.summaryPill, { backgroundColor: accent + '12', borderColor: accent + '30' }]}>
              <Text style={[s.summaryText, { color: accent }]}>
                {isThai ? '✨ ' : '✨ '}
                {recurLabel(
                  { type: recurType, weekDays, endDate: hasEnd ? buildEndDate() : null },
                  isThai, eventDate,
                )}
                {hasEnd ? (isThai ? '  ·  มีวันหมดรอบ' : '  ·  ends on date') : ''}
              </Text>
            </View>
          </ScrollView>

          {/* ── Save button ── */}
          <View style={[s.footer, { borderTopColor: divider, backgroundColor: bg }]}>
            <TouchableOpacity
              style={[s.saveBtn, { backgroundColor: accent }]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={s.saveBtnText}>{isThai ? 'ตั้งรอบกิจกรรม' : 'Set Recurrence'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', maxHeight: '92%', paddingBottom: 12 },

  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },

  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  cancelLink: { fontSize: 15, fontWeight: '500', minWidth: 52 },
  titleText:  { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  scrollBody: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.sm },

  // Option rows
  optionList: { gap: SPACING.sm },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.xl, borderWidth: 1.5,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4,
  },
  optionIconWrap: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  optionIcon:  { fontSize: 22 },
  optionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  optionSub:   { fontSize: 12, lineHeight: 16 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },

  // Weekly day grid
  daySection: {
    borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md, gap: SPACING.sm,
  },
  daySectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  dayGrid:   { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1, height: 40, borderRadius: RADIUS.md, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontSize: 12, fontWeight: '700' },

  // End date card
  endCard:       { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  endToggleRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  endIconWrap:   { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  endLabel:      { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  endSub:        { fontSize: 12 },
  endDivider:    { height: 1, marginHorizontal: SPACING.md },

  // Wheel picker
  wheelWrap:  { flexDirection: 'row', paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  wheelSep:   { width: 1, marginVertical: SPACING.lg },

  // Summary pill
  summaryPill: {
    borderRadius: RADIUS.full, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  summaryText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Footer
  footer:  { borderTopWidth: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  saveBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center',
    shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
