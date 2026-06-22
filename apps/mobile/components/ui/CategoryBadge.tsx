import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CATEGORY_COLORS, Category, RADIUS } from '../../constants/theme';

interface Props {
  category: Category;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'sm' }: Props) {
  const color = CATEGORY_COLORS[category];
  return (
    <View style={[styles.badge, { backgroundColor: color + '28' }, size === 'md' && styles.badgeMd]}>
      <View style={[styles.dot, { backgroundColor: color }, size === 'md' && styles.dotMd]} />
      <Text style={[styles.label, { color }, size === 'md' && styles.labelMd]}>{category}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeMd: { paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 7, height: 7, borderRadius: RADIUS.full },
  dotMd: { width: 9, height: 9 },
  label: { fontSize: 10, fontWeight: '700' },
  labelMd: { fontSize: 12 },
});
