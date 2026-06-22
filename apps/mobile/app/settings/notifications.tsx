import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { api } from '../../lib/api';
import { RADIUS, SPACING } from '../../constants/theme';

const CACHE_KEY = 'ourplan_notification_prefs';

const DEFAULT_PREFS = {
  event_reminder: true,
  friend_request: true,
  friend_accept:  true,
  group_invite:   true,
};

export default function NotificationsScreen() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [prefs, setPrefs]       = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from backend on mount (fall back to AsyncStorage cache)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me/preferences');
        const serverPrefs = data.notificationPrefs ?? DEFAULT_PREFS;
        setPrefs({ ...DEFAULT_PREFS, ...serverPrefs });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serverPrefs));
      } catch {
        // Offline — load from cache
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {}
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  async function toggle(key: string, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    // Debounce backend save (300ms after last toggle)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.patch('/users/me/preferences', { notificationPrefs: updated });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      } catch {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      }
    }, 300);
  }

  const ITEMS = [
    { key: 'event_reminder', label: isThai ? 'เตือนกิจกรรม'          : 'Event Reminders',   sub: isThai ? 'แจ้งเตือนก่อนกิจกรรมเริ่ม'                : 'Notify before your events start'      },
    { key: 'friend_request', label: isThai ? 'คำขอเป็นเพื่อน'        : 'Friend Requests',   sub: isThai ? 'เมื่อมีคนส่งคำขอมาหาคุณ'                  : 'When someone adds you'                },
    { key: 'friend_accept',  label: isThai ? 'คำขอได้รับการยอมรับ'    : 'Request Accepted',  sub: isThai ? 'เมื่อคำขอของคุณได้รับการยอมรับ'            : 'When your request is accepted'        },
    { key: 'group_invite',   label: isThai ? 'คำเชิญเข้ากลุ่ม'       : 'Group Invites',     sub: isThai ? 'เมื่อได้รับคำเชิญเข้ากลุ่ม'               : 'When invited to a group plan'         },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{isThai ? 'การแจ้งเตือน' : 'Notifications'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        {!isLoaded ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.xl }} />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
              {ITEMS.map((item, i) => (
                <View
                  key={item.key}
                  style={[styles.row, i < ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.divider }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: t.text }]}>{item.label}</Text>
                    <Text style={[styles.sub, { color: t.subtext }]}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={prefs[item.key]}
                    onValueChange={(v) => toggle(item.key, v)}
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  label: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 12, marginTop: 2 },
  note: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
