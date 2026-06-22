import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { api } from '../../lib/api';
import { RADIUS, SPACING } from '../../constants/theme';

const CACHE_KEY = 'ourplan_privacy_prefs';

const DEFAULT_PREFS = {
  publicProfile: true,
  showEvents:    true,
  allowSearch:   true,
};

export default function PrivacyScreen() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [prefs, setPrefs]       = useState(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me/preferences');
        const serverPrefs = data.privacyPrefs ?? DEFAULT_PREFS;
        setPrefs({ ...DEFAULT_PREFS, ...serverPrefs });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverPrefs));
      } catch {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {}
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  async function toggle(key: keyof typeof DEFAULT_PREFS, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch('/users/me/preferences', { privacyPrefs: updated });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      }
    }, 300);
  }

  const rows: { key: keyof typeof DEFAULT_PREFS; label: string; sub: string }[] = [
    {
      key: 'publicProfile',
      label: isThai ? 'โปรไฟล์สาธารณะ' : 'Public Profile',
      sub: isThai ? 'ทุกคนสามารถดูโปรไฟล์ของคุณได้' : 'Anyone can view your profile',
    },
    {
      key: 'showEvents',
      label: isThai ? 'แสดงกิจกรรมกับเพื่อน' : 'Show Events to Friends',
      sub: isThai ? 'เพื่อนสามารถเห็นกิจกรรมที่กำลังจะมาถึง' : 'Friends can see your upcoming events',
    },
    {
      key: 'allowSearch',
      label: isThai ? 'ค้นหาได้จาก Username' : 'Discoverable by Search',
      sub: isThai ? 'คนอื่นสามารถค้นหาคุณได้' : 'Others can find you by username',
    },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{isThai ? 'ความเป็นส่วนตัว' : 'Privacy'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        {!isLoaded ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.xl }} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
              {rows.map((row, i) => (
                <View key={row.key} style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: t.text }]}>{row.label}</Text>
                    <Text style={[styles.sub, { color: t.subtext }]}>{row.sub}</Text>
                  </View>
                  <Switch
                    value={prefs[row.key]}
                    onValueChange={(v) => toggle(row.key, v)}
                    trackColor={{ false: t.divider, true: t.accent }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.note, { color: t.subtext }]}>
              {isThai ? 'การตั้งค่าของคุณถูกบันทึกลงเซิร์ฟเวอร์แล้ว' : 'Your preferences are synced across all devices.'}
            </Text>
          </>
        )}
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
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  label: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: SPACING.sm },
});
