import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getWeekDays, formatDate, isSameDay } from '../../lib/dateUtils';
import { RADIUS, SPACING } from '../../constants/theme';

const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

interface Props {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  baseDate?: Date;
}

export function WeekStrip({ selectedDate, onSelectDate, baseDate }: Props) {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const DAY_LABELS = lang === 'th' ? DAY_LABELS_TH : DAY_LABELS_EN;
  const days = getWeekDays(baseDate);

  return (
    <View style={styles.wrap}>
      {days.map((day, i) => {
        const isSel = isSameDay(day, selectedDate);
        const isWknd = i >= 5;
        const isToday = isSameDay(day, new Date());
        const dayColor = isSel ? '#fff' : isWknd ? t.accent : t.subtext;
        const dateColor = isSel ? '#fff' : isWknd ? t.accent : t.text;

        return (
          <TouchableOpacity
            key={i}
            style={[styles.dayBtn, isSel && { backgroundColor: t.accent }]}
            onPress={() => onSelectDate(formatDate(day))}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayLabel, { color: dayColor }]}>{DAY_LABELS[i]}</Text>
            <Text style={[styles.dateNum, { color: dateColor }, isSel && styles.boldNum]}>
              {day.getDate()}
            </Text>
            {isToday && !isSel && (
              <View style={[styles.todayDot, { backgroundColor: t.accent }]} />
            )}
            {isSel && <View style={[styles.selDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', paddingHorizontal: SPACING.sm, paddingBottom: SPACING.sm },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 3,
  },
  dayLabel: { fontSize: 10, fontWeight: '500' },
  dateNum: { fontSize: 16, fontWeight: '600' },
  boldNum: { fontWeight: '800' },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
  selDot: { width: 5, height: 5, borderRadius: 3 },
});
