import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { Avatar } from '../../components/ui/Avatar';
import { EventCard } from '../../components/schedule/EventCard';
import { RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

interface PublicUser {
  id: string;
  displayName: string;
  username: string;
  profileSlug: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface PublicSchedule {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: any;
  startDatetime: string;
  endDatetime: string;
  location: string | null;
  visibility: 'friends' | 'public';
  isRecurring: boolean;
  colorTag: string | null;
  createdAt: string;
}

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export default function UserProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { theme: t } = useThemeStore();
  const { user: me } = useAuthStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    load();
  }, [slug]);

  async function load() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const [profRes, schedRes, statusRes] = await Promise.all([
        api.get(`/users/${slug}`),
        api.get(`/users/${slug}/schedules`),
        api.get(`/users/${slug}/friend-status`),
      ]);
      setProfile(profRes.data);
      setSchedules(schedRes.data);
      setFriendStatus(statusRes.data.status);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert(
          isThai ? 'ไม่พบผู้ใช้' : 'Not found',
          isThai ? 'โปรไฟล์นี้ไม่มีอยู่' : 'This profile does not exist.',
        );
        router.back();
      } else {
        setLoadError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFriendAction() {
    if (!profile) return;
    setIsActing(true);
    try {
      if (friendStatus === 'none') {
        await api.post(`/friends/request/${profile.id}`);
        setFriendStatus('pending_sent');
      } else if (friendStatus === 'pending_received') {
        // Find the friendship where the requester is the profile user
        const pendingRes = await api.get('/friends/pending');
        const pending = pendingRes.data.find((p: any) => p.id === profile.id);
        if (pending) {
          await api.post(`/friends/${pending.friendshipId}/accept`);
          setFriendStatus('friends');
        }
      }
    } catch (e: any) {
      Alert.alert(
        isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        e?.response?.data?.message ?? (isThai ? 'มีบางอย่างผิดพลาด' : 'Something went wrong'),
      );
    } finally {
      setIsActing(false);
    }
  }

  function getFriendBtnConfig(): Record<FriendStatus, { label: string; bg: string; disabled?: boolean }> {
    return {
      none:             { label: isThai ? '+ เพิ่มเพื่อน'       : '+ Add Friend',      bg: t.accent },
      pending_sent:     { label: isThai ? 'ส่งคำขอแล้ว'         : 'Request Sent',      bg: t.subtext, disabled: true },
      pending_received: { label: isThai ? 'ยอมรับคำขอ'          : 'Accept Request',    bg: t.alt },
      friends:          { label: isThai ? '✓ เพื่อนกันแล้ว'     : '✓ Friends',         bg: t.alt, disabled: true },
    };
  }
  const btn = getFriendBtnConfig()[friendStatus];

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: t.divider }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.backBtn, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.text }]}>{isThai ? 'โปรไฟล์' : 'Profile'}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <View style={[styles.errorCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <Text style={styles.errorIcon}>📡</Text>
            <Text style={[styles.errorTitle, { color: t.text }]}>
              {isThai ? 'โหลดโปรไฟล์ไม่สำเร็จ' : 'Could not load profile'}
            </Text>
            <Text style={[styles.errorSub, { color: t.subtext }]}>
              {isThai
                ? 'ตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง'
                : 'Check your connection and try again.'}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: t.accent }]}
              onPress={() => load()}
              activeOpacity={0.85}
            >
              <Text style={styles.retryBtnText}>{isThai ? 'ลองใหม่' : 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const isSelf = me?.id === profile.id;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backBtn, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>{isThai ? 'โปรไฟล์' : 'Profile'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Profile hero */}
        <View style={[styles.heroCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <Avatar name={profile.displayName} uri={profile.avatarUrl} size={80} color={t.accent} />
          <Text style={[styles.displayName, { color: t.text }]}>{profile.displayName}</Text>
          <Text style={[styles.username, { color: t.subtext }]}>@{profile.username}</Text>
          {profile.bio ? <Text style={[styles.bio, { color: t.subtext }]}>{profile.bio}</Text> : null}

          {!isSelf && (
            <TouchableOpacity
              style={[styles.friendBtn, { backgroundColor: btn.bg, opacity: btn.disabled || isActing ? 0.6 : 1 }]}
              onPress={handleFriendAction}
              disabled={!!btn.disabled || isActing}
              activeOpacity={0.85}
            >
              {isActing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.friendBtnText}>{btn.label}</Text>
              }
            </TouchableOpacity>
          )}

          {isSelf && (
            <TouchableOpacity
              style={[styles.friendBtn, { backgroundColor: t.accentSoft }]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.85}
            >
              <Text style={[styles.friendBtnText, { color: t.accent }]}>{isThai ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Upcoming schedule */}
        {schedules.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.text }]}>{isThai ? 'แผนที่กำลังจะมาถึง' : 'Upcoming Plans'}</Text>
            {schedules.map((s) => (
              <EventCard key={s.id} item={s as any} />
            ))}
          </View>
        )}

        {schedules.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <Text style={styles.emptyIcon}>🗓</Text>
            <Text style={[styles.emptyText, { color: t.subtext }]}>
              {isThai ? 'ไม่มีแผนที่เป็นสาธารณะ' : 'No upcoming public plans'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1,
  },
  backBtn: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 60 },
  heroCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  displayName: { fontSize: 22, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 },
  username: { fontSize: 14 },
  bio: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  friendBtn: {
    marginTop: SPACING.xs, borderRadius: RADIUS.lg,
    paddingVertical: 12, paddingHorizontal: SPACING.xl,
    alignItems: 'center', minWidth: 160,
  },
  friendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptyCard: {
    borderRadius: RADIUS.lg, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: 14 },
  errorCard: {
    borderRadius: RADIUS.xl, padding: SPACING.xl, marginHorizontal: SPACING.lg,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  errorIcon: { fontSize: 40 },
  errorTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  errorSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.lg,
    paddingVertical: 12, paddingHorizontal: SPACING.xl, minWidth: 140, alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
