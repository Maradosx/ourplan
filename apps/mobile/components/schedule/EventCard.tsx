import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Schedule } from '../../store/scheduleStore';
import { CATEGORY_COLORS, RADIUS, SPACING } from '../../constants/theme';
import { CategoryBadge } from '../ui/CategoryBadge';
import { formatTime } from '../../lib/dateUtils';
import { useThemeStore } from '../../store/themeStore';

interface Props {
  item: Schedule;
  onPress?: () => void;
}

export function EventCard({ item, onPress }: Props) {
  const { theme: t } = useThemeStore();
  const catColor = CATEGORY_COLORS[item.category];
  const start = formatTime(item.startDatetime);
  const end = formatTime(item.endDatetime);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: t.card, shadowColor: t.shadow }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.strip, { backgroundColor: catColor }]} />
      <View style={styles.body}>
        <View style={styles.row}>
          <CategoryBadge category={item.category} />
          <Text style={[styles.time, { color: t.subtext }]}>{start} – {end}</Text>
        </View>
        <View style={styles.titleRow}>
          {item.icon ? <Text style={styles.icon}>{item.icon}</Text> : null}
          <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>{item.title}</Text>
        </View>
        {item.location ? (
          <Text style={[styles.loc, { color: t.subtext }]}>📍 {item.location}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  strip: { width: 4, flexShrink: 0 },
  body: { flex: 1, padding: SPACING.md, gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontSize: 11 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 16 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  loc: { fontSize: 11 },
});
