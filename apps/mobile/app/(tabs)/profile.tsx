import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Share, Alert, ActivityIndicator,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useProStore } from '../../store/proStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { ThemeDecor } from '../../components/ui/ThemeDecor';
import { Avatar } from '../../components/ui/Avatar';
import { THEMES, ThemeId, RADIUS, SPACING } from '../../constants/theme';
import { router } from 'expo-router';
import { exportCalendarToShare } from '../../lib/exportCalendar';

export default function ProfileScreen() {
  const { theme: t, themeId } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { lang } = useLanguageStore();
  const { isPro } = useProStore();
  const { schedules, fetchSchedules } = useScheduleStore();

  const isThai = lang === 'th';
  const [exporting, setExporting] = useState(false);

  const profileUrl = `https://ourplan.app/u/${user?.profileSlug ?? user?.username}`;

  const handleShare = async () => {
    await Share.share({ message: `Find me on Ourplan! ${profileUrl}`, url: profileUrl });
  };

  const handleExportCalendar = async () => {
    if (!isPro) {
      Alert.alert(
        isThai ? '✨ ฟีเจอร์ Pro' : '✨ Pro Feature',
        isThai
          ? 'Export ปฏิทินเป็นฟีเจอร์เฉพาะ Pro\nอัปเกรดเพื่อส่งออกกิจกรรมไป Apple / Google Calendar'
          : 'Calendar Export is a Pro feature.\nUpgrade to export your events to Apple / Google Calendar.',
        [
          { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
          { text: isThai ? 'ดู Pro' : 'See Pro', onPress: () => router.push('/pro-upgrade') },
        ],
      );
      return;
    }
    setExporting(true);
    try {
      await fetchSchedules();
      if (schedules.length === 0) {
        Alert.alert(
          isThai ? 'ไม่มีกิจกรรม' : 'No Events',
          isThai ? 'ยังไม่มีกิจกรรมที่จะ Export' : 'You have no events to export yet.',
        );
        return;
      }
      await exportCalendarToShare(schedules, isThai);
    } catch (e: any) {
      Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Export Failed', e?.message ?? 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      isThai ? 'ออกจากระบบ' : 'Sign Out',
      isThai ? 'ต้องการออกจากระบบใช่ไหม?' : 'Are you sure you want to sign out?',
      [
        { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        {
          text: isThai ? 'ออกจากระบบ' : 'Sign Out',
          style: 'destructive',
          onPress: async () => { await logout(); router.replace('/(auth)/welcome'); },
        },
      ],
    );
  };

  const MENU_ITEMS = [
    { icon: '✏️', label: isThai ? 'แก้ไขโปรไฟล์' : 'Edit Profile',     route: '/settings/edit-profile', action: null,                proOnly: false },
    { icon: '🔔', label: isThai ? 'การแจ้งเตือน' : 'Notifications',     route: '/settings/notifications', action: null,               proOnly: false },
    { icon: '🔒', label: isThai ? 'ความเป็นส่วนตัว' : 'Privacy',        route: '/settings/privacy',       action: null,               proOnly: false },
    { icon: '🌐', label: isThai ? 'ภาษา' : 'Language',                  route: '/settings/language',      action: null,               proOnly: false },
    { icon: '📤', label: isThai ? 'Export ปฏิทิน' : 'Export Calendar',  route: null, action: handleExportCalendar,                     proOnly: true },
    { icon: '🎭', label: isThai ? 'ร้านสติกเกอร์' : 'Sticker Shop',     route: '/sticker-shop',           action: null,               proOnly: false },
    { icon: '☕', label: isThai ? 'สนับสนุนเรา' : 'Support Us',          route: '/support-us',             action: null,               proOnly: false },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ThemeDecor />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO PROFILE CARD ─────────────────────────────────────── */}
        <View style={[styles.heroCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
          {/* Accent glow strip */}
          <View style={[styles.heroStrip, { backgroundColor: t.accent }]} />

          <View style={styles.heroBody}>
            {/* Avatar + Pro badge */}
            <View style={styles.avatarWrap}>
              <Avatar name={user?.displayName ?? 'U'} uri={user?.avatarUrl} size={80} color={t.accent} />
              {isPro && (
                <View style={[styles.proBadgeFloat, { backgroundColor: '#FFD700', borderColor: t.surface }]}>
                  <Text style={styles.proBadgeFloatText}>✨</Text>
                </View>
              )}
            </View>

            <Text style={[styles.displayName, { color: t.text }]}>{user?.displayName}</Text>
            <Text style={[styles.username, { color: t.subtext }]}>@{user?.username}</Text>
            {user?.bio ? (
              <Text style={[styles.bio, { color: t.subtext }]}>{user.bio}</Text>
            ) : null}

            {/* Profile link pill */}
            <TouchableOpacity
              style={[styles.linkPill, { backgroundColor: t.accentSoft, borderColor: t.accent + '40' }]}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Text style={[styles.linkText, { color: t.accent }]} numberOfLines={1}>
                🔗 {profileUrl}
              </Text>
            </TouchableOpacity>

            {/* Share button */}
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: t.accent }]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text style={styles.shareBtnText}>
                {isThai ? '↗ แชร์โปรไฟล์' : '↗ Share Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PRO STATUS CARD ────────────────────────────────────────── */}
        {isPro ? (
          <View style={[styles.proCard, { backgroundColor: '#FFD70012', borderColor: '#FFD70055' }]}>
            <View style={styles.proCardLeft}>
              <Text style={styles.proCardEmoji}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.proCardTitle, { color: t.text }]}>Ourplan Pro</Text>
              <Text style={[styles.proCardSub, { color: t.subtext }]}>
                {isThai ? 'ปลดล็อคทุกอย่างแล้ว 🎉' : 'Everything unlocked 🎉'}
              </Text>
            </View>
            <View style={[styles.proBadge, { backgroundColor: '#FFD70030', borderColor: '#FFD700' }]}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.proCard, { backgroundColor: t.accent + '10', borderColor: t.accent + '40' }]}
            onPress={() => router.push('/pro-upgrade')}
            activeOpacity={0.85}
          >
            <View style={[styles.proCardLeft, { backgroundColor: t.accent + '18' }]}>
              <Text style={styles.proCardEmoji}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.proCardTitle, { color: t.text }]}>
                {isThai ? 'อัปเกรดเป็น Pro' : 'Upgrade to Pro'}
              </Text>
              <Text style={[styles.proCardSub, { color: t.subtext }]}>
                {isThai ? 'ทุกธีม + ฟีเจอร์เต็ม · ฿59/เดือน' : 'All themes + full features · ฿59/mo'}
              </Text>
            </View>
            <Text style={[styles.proArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── THEME SECTION ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}
          onPress={() => router.push('/theme-shop')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: t.accent + '18' }]}>
                <Text style={{ fontSize: 16 }}>🎨</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: t.text }]}>
                  {isThai ? 'ธีมแอป' : 'App Theme'}
                </Text>
                <Text style={[styles.cardSub, { color: t.subtext }]}>
                  {THEMES[themeId].mascot} {THEMES[themeId].label}
                  {THEMES[themeId].premium ? ' · ✨ Pro' : isThai ? ' · ฟรี' : ' · Free'}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardArrow, { color: t.subtext }]}>›</Text>
          </View>

          {/* Theme swatch row */}
          <View style={styles.swatchRow}>
            {(Object.keys(THEMES) as ThemeId[]).slice(0, 6).map((id) => (
              <View
                key={id}
                style={[
                  styles.swatch,
                  { backgroundColor: THEMES[id].bg, borderColor: id === themeId ? THEMES[id].accent : THEMES[id].divider },
                  id === themeId && styles.swatchActive,
                ]}
              >
                <Text style={styles.swatchEmoji}>{THEMES[id].mascot}</Text>
                <View style={[styles.swatchStripe, { backgroundColor: THEMES[id].accent }]} />
              </View>
            ))}
            <View style={[styles.swatchMore, { backgroundColor: t.accentSoft }]}>
              <Text style={[styles.swatchMoreText, { color: t.accent }]}>+{Object.keys(THEMES).length - 6}</Text>
            </View>
          </View>

          <View style={[styles.browseBtn, { backgroundColor: t.accentSoft }]}>
            <Text style={[styles.browseBtnText, { color: t.accent }]}>
              {isThai ? 'ดูธีมทั้งหมด →' : 'Browse All Themes →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* ── SETTINGS CARD ──────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: t.accent + '18' }]}>
                <Text style={{ fontSize: 16 }}>⚙️</Text>
              </View>
              <Text style={[styles.cardTitle, { color: t.text }]}>
                {isThai ? 'ตั้งค่า' : 'Settings'}
              </Text>
            </View>
          </View>

          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                i < MENU_ITEMS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.divider },
              ]}
              onPress={() => item.action ? item.action() : router.push(item.route as any)}
              activeOpacity={0.7}
              disabled={exporting && item.proOnly}
            >
              <View style={[styles.menuIconBox, { backgroundColor: t.bg }]}>
                <Text style={styles.menuIconText}>{item.icon}</Text>
              </View>
              <Text style={[styles.menuLabel, { color: t.text }]}>{item.label}</Text>
              {item.proOnly && !isPro && (
                <View style={[styles.proLock, { backgroundColor: '#FFD70018', borderColor: '#FFD70055' }]}>
                  <Text style={styles.proLockText}>PRO</Text>
                </View>
              )}
              {exporting && item.proOnly ? (
                <ActivityIndicator size="small" color={t.accent} />
              ) : (
                <Text style={[styles.menuChevron, { color: t.subtext }]}>›</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SIGN OUT ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: t.surface, borderColor: t.danger + '30' }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>🚪</Text>
          <Text style={[styles.logoutText, { color: t.danger }]}>
            {isThai ? 'ออกจากระบบ' : 'Sign Out'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: t.subtext }]}>Ourplan v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: 110 },

  /* Hero card */
  heroCard: {
    borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden',
  },
  heroStrip: { height: 6 },
  heroBody: {
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  proBadgeFloat: {
    position: 'absolute', bottom: -2, right: -4,
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  proBadgeFloatText: { fontSize: 11 },
  displayName: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  username: { fontSize: 14, marginTop: -4 },
  bio: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  linkPill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderWidth: 1, width: '100%', justifyContent: 'center',
  },
  linkText: { fontSize: 13, fontWeight: '600' },
  shareBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center',
    width: '100%',
    shadowColor: '#7B62FF', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 6,
  },
  shareBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  /* Pro card */
  proCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1.5,
  },
  proCardLeft: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  proCardEmoji: { fontSize: 22 },
  proCardTitle: { fontSize: 15, fontWeight: '800' },
  proCardSub: { fontSize: 12, marginTop: 2 },
  proBadge: {
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5,
  },
  proBadgeText: { color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  proArrow: { fontSize: 22, fontWeight: '700' },

  /* Generic card */
  card: {
    borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 1 },
  cardArrow: { fontSize: 20 },

  /* Theme swatches */
  swatchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  swatch: {
    width: 38, height: 30, borderRadius: 10, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 4, borderWidth: 1.5,
  },
  swatchActive: { transform: [{ scale: 1.1 }] },
  swatchEmoji: { fontSize: 13 },
  swatchStripe: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 },
  swatchMore: {
    width: 38, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchMoreText: { fontSize: 11, fontWeight: '800' },
  browseBtn: { borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center' },
  browseBtnText: { fontSize: 14, fontWeight: '700' },

  /* Settings menu */
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 13,
  },
  menuIconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIconText: { fontSize: 16 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  menuChevron: { fontSize: 20 },
  proLock: {
    borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, marginRight: 4,
  },
  proLockText: { color: '#FFD700', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg, paddingVertical: 14, borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
  version: { fontSize: 12, textAlign: 'center', marginTop: SPACING.xs },
});
