import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore, Lang } from '../../store/languageStore';
import { RADIUS, SPACING } from '../../constants/theme';

const OPTIONS: { id: Lang; flag: string; label: string; sub: string }[] = [
  { id: 'en', flag: '🇬🇧', label: 'English', sub: 'English' },
  { id: 'th', flag: '🇹🇭', label: 'ภาษาไทย', sub: 'Thai' },
];

export default function LanguageScreen() {
  const { theme: t } = useThemeStore();
  const { lang, setLang } = useLanguageStore();
  const isThai = lang === 'th';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{isThai ? 'ภาษา' : 'Language'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        <Text style={[styles.hint, { color: t.subtext }]}>{isThai ? 'เลือกภาษาที่ต้องการ' : 'Choose your preferred language'}</Text>

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          {OPTIONS.map((opt, i) => {
            const active = lang === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.row,
                  i < OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.divider },
                  active && { backgroundColor: t.accentSoft },
                ]}
                onPress={() => setLang(opt.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: t.text }]}>{opt.label}</Text>
                  <Text style={[styles.sub, { color: t.subtext }]}>{opt.sub}</Text>
                </View>
                {active && (
                  <View style={[styles.check, { backgroundColor: t.accent }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: SPACING.lg, gap: SPACING.md },
  hint: { fontSize: 13, marginBottom: 4 },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md + 2,
  },
  flag: { fontSize: 28 },
  label: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
