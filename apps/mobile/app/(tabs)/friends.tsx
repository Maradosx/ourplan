import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Share, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useProStore } from '../../store/proStore';
import { Avatar } from '../../components/ui/Avatar';
import { RADIUS, SPACING } from '../../constants/theme';
import { ThemeDecor } from '../../components/ui/ThemeDecor';
import { api } from '../../lib/api';
import { useLanguageStore } from '../../store/languageStore';

const FREE_FRIEND_LIMIT = 20;

interface Friend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  profileSlug: string;
  friendshipId?: string;
}

const FRIEND_COLORS = ['#7B62FF', '#46DCB0', '#FF9040', '#FF6190', '#40B4FF', '#FFD700'];

export default function FriendsScreen() {
  const { theme: t } = useThemeStore();
  const { user } = useAuthStore();
  const { lang } = useLanguageStore();
  const { isPro } = useProStore();
  const isThai = lang === 'th';

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tab, setTab] = useState<'friends' | 'search'>('friends');

  const profileUrl = `https://ourplan.app/u/${user?.profileSlug ?? user?.username}`;
  const nearLimit = !isPro && friends.length >= FREE_FRIEND_LIMIT - 3;

  const load = async () => {
    setIsLoading(true);
    try {
      const [fr, pe] = await Promise.all([api.get('/friends'), api.get('/friends/pending')]);
      setFriends(fr.data);
      setPending(pe.data);
    } catch {}
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (tab !== 'search') return;
    if (search.length < 2) { setSearchResults([]); return; }
    const t2 = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(search)}`);
        setSearchResults(data);
      } catch {}
      finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(t2);
  }, [search, tab]);

  const handleAccept = async (friendshipId: string) => {
    try {
      await api.post(`/friends/${friendshipId}/accept`);
      await load();
    } catch { Alert.alert('Error', 'Could not accept request'); }
  };

  const handleDecline = async (friendshipId: string) => {
    try {
      await api.post(`/friends/${friendshipId}/decline`);
      await load();
    } catch {}
  };

  const handleAddFriend = async (targetId: string) => {
    if (!isPro && friends.length >= FREE_FRIEND_LIMIT) {
      Alert.alert(
        isThai ? '✨ ต้องการ Pro' : '✨ Pro Required',
        isThai
          ? `คุณมีเพื่อนครบ ${FREE_FRIEND_LIMIT} คนแล้ว\nอัปเกรดเป็น Pro เพื่อเพิ่มได้ไม่จำกัด`
          : `You've reached the ${FREE_FRIEND_LIMIT}-friend limit.\nUpgrade to Pro for unlimited friends.`,
        [
          { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
          { text: isThai ? 'ดู Pro' : 'See Pro', onPress: () => router.push('/pro-upgrade') },
        ],
      );
      return;
    }
    try {
      await api.post(`/friends/request/${targetId}`);
      Alert.alert(isThai ? 'ส่งคำขอแล้ว' : 'Request Sent', isThai ? 'ส่งคำขอเพื่อนแล้ว!' : 'Friend request sent!');
      setSearchResults((prev) => prev.filter((u) => u.id !== targetId));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not send request');
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `Add me on Ourplan! ${profileUrl}`, url: profileUrl });
  };

  const filteredFriends = friends.filter((f) =>
    f.displayName.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase()),
  );

  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <ThemeDecor />

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: t.text }]}>
              {isThai ? 'เพื่อน' : 'Friends'}
            </Text>
            <Text style={[styles.sub, { color: t.subtext }]}>
              {friends.length}
              {isPro
                ? (isThai ? ' คน · ไม่จำกัด' : ' connected · unlimited')
                : (isThai ? `/${FREE_FRIEND_LIMIT} คน` : `/${FREE_FRIEND_LIMIT} connected`)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.groupsBtn, { backgroundColor: t.accent + '18', borderColor: t.accent + '40' }]}
            onPress={() => router.push('/groups')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 14 }}>👥</Text>
            <Text style={[styles.groupsBtnText, { color: t.accent }]}>
              {isThai ? 'กลุ่ม' : 'Groups'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── INVITE CARD ─────────────────────────────────────────── */}
        <View style={[styles.inviteCard, { backgroundColor: t.accent + '10', borderColor: t.accent + '35' }]}>
          <View style={[styles.inviteIconBox, { backgroundColor: t.accent + '20' }]}>
            <Text style={{ fontSize: 20 }}>📨</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.inviteTitle, { color: t.text }]}>
              {isThai ? 'เชิญเพื่อน' : 'Invite Friends'}
            </Text>
            <Text style={[styles.inviteLink, { color: t.accent }]} numberOfLines={1}>
              {profileUrl}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.inviteBtn, { backgroundColor: t.accent }]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.inviteBtnText}>
              {isThai ? '↗ แชร์' : '↗ Share'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── PRO LIMIT WARNING ───────────────────────────────────── */}
        {nearLimit && (
          <TouchableOpacity
            style={[styles.limitCard, { backgroundColor: t.accent + '10', borderColor: t.accent + '45' }]}
            onPress={() => router.push('/pro-upgrade')}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.limitTitle, { color: t.text }]}>
                {isThai
                  ? `เพื่อน ${friends.length}/${FREE_FRIEND_LIMIT} คนแล้ว`
                  : `${friends.length}/${FREE_FRIEND_LIMIT} friends`}
              </Text>
              <Text style={[styles.limitSub, { color: t.subtext }]}>
                {isThai ? 'Pro: เพื่อนไม่จำกัด →' : 'Go Pro for unlimited →'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── TAB SWITCHER ────────────────────────────────────────── */}
        <View style={[styles.tabTrack, { backgroundColor: t.surface, borderColor: t.divider }]}>
          {(['friends', 'search'] as const).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.tabBtn,
                tab === key && { backgroundColor: t.accent },
              ]}
              onPress={() => { setTab(key); setSearch(''); setSearchResults([]); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabLabel, { color: tab === key ? '#fff' : t.subtext }]}>
                {key === 'friends'
                  ? (isThai ? '👤 เพื่อนของฉัน' : '👤 My Friends')
                  : (isThai ? '🔍 เพิ่มใหม่' : '🔍 Add New')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── PENDING REQUESTS ────────────────────────────────────── */}
        {tab === 'friends' && pending.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {isThai ? 'คำขอที่รอ' : 'Pending Requests'}
              </Text>
              <View style={[styles.countPill, { backgroundColor: t.accent + '20' }]}>
                <Text style={[styles.countPillText, { color: t.accent }]}>{pending.length}</Text>
              </View>
            </View>
            {pending.map((p, i) => (
              <View key={p.id} style={[styles.personCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/user/[slug]', params: { slug: p.profileSlug || p.username } })}
                >
                  <Avatar name={p.displayName} uri={p.avatarUrl} size={46} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.personName, { color: t.text }]}>{p.displayName}</Text>
                  <Text style={[styles.personUser, { color: t.subtext }]}>@{p.username}</Text>
                </View>
                <View style={styles.pendingActions}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: t.alt ?? t.accent }]}
                    onPress={() => handleAccept(p.friendshipId!)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.acceptText}>{isThai ? 'ยอมรับ' : 'Accept'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.declineBtn, { borderColor: t.divider }]}
                    onPress={() => handleDecline(p.friendshipId!)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.declineText, { color: t.subtext }]}>
                      {isThai ? 'ปฏิเสธ' : 'Decline'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── MY FRIENDS LIST ─────────────────────────────────────── */}
        {tab === 'friends' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {isThai ? 'เพื่อนของคุณ' : 'Your Friends'}
              </Text>
            </View>

            {/* Search within friends */}
            <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.divider }]}>
              <Text style={{ color: t.subtext, fontSize: 15 }}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: t.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder={isThai ? 'ค้นหาเพื่อน...' : 'Search friends...'}
                placeholderTextColor={t.subtext + '70'}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: t.subtext, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {isLoading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator color={t.accent} size="large" />
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <Text style={styles.emptyIcon}>{search ? '🔍' : '👋'}</Text>
                <Text style={[styles.emptyTitle, { color: t.text }]}>
                  {search
                    ? (isThai ? 'ไม่พบผลลัพธ์' : 'No results found')
                    : (isThai ? 'ยังไม่มีเพื่อน' : 'No friends yet')}
                </Text>
                <Text style={[styles.emptySub, { color: t.subtext }]}>
                  {search
                    ? (isThai ? 'ลองชื่ออื่น' : 'Try a different name')
                    : (isThai ? 'ใช้แท็บ "เพิ่มใหม่" เพื่อค้นหาผู้คน' : 'Use "Add New" tab to find people')}
                </Text>
              </View>
            ) : (
              filteredFriends.map((f, i) => (
                <View key={f.id} style={[styles.personCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/user/[slug]', params: { slug: f.profileSlug || f.username } })}
                  >
                    <Avatar name={f.displayName} uri={f.avatarUrl} size={48} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: t.text }]}>{f.displayName}</Text>
                    <Text style={[styles.personUser, { color: t.subtext }]}>@{f.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.viewBtn, { backgroundColor: t.accentSoft }]}
                    onPress={() => router.push({ pathname: '/user/[slug]', params: { slug: f.profileSlug || f.username } })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.viewBtnText, { color: t.accent }]}>
                      {isThai ? 'ดูโปรไฟล์' : 'View'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── SEARCH NEW USERS ────────────────────────────────────── */}
        {tab === 'search' && (
          <View style={styles.section}>
            <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.divider }]}>
              <Text style={{ color: t.subtext, fontSize: 15 }}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: t.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder={isThai ? 'ค้นหาด้วยชื่อหรือ username...' : 'Search by name or username...'}
                placeholderTextColor={t.subtext + '70'}
                autoFocus
                autoCapitalize="none"
              />
              {isSearching
                ? <ActivityIndicator size="small" color={t.accent} />
                : search.length > 0
                  ? (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ color: t.subtext, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  )
                  : null}
            </View>

            {search.length < 2 && (
              <View style={[styles.emptyState, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={[styles.emptySub, { color: t.subtext }]}>
                  {isThai ? 'พิมพ์อย่างน้อย 2 ตัวอักษร' : 'Type at least 2 characters to search'}
                </Text>
              </View>
            )}

            {search.length >= 2 && !isSearching && searchResults.length === 0 && (
              <View style={[styles.emptyState, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={[styles.emptyTitle, { color: t.text }]}>
                  {isThai ? 'ไม่พบผู้ใช้' : 'No users found'}
                </Text>
                <Text style={[styles.emptySub, { color: t.subtext }]}>
                  {isThai ? 'ลองค้นหาด้วยชื่ออื่น' : 'Try searching with a different name'}
                </Text>
              </View>
            )}

            {searchResults.map((u, i) => {
              const isAlreadyFriend = friendIds.has(u.id);
              return (
                <View key={u.id} style={[styles.personCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: '/user/[slug]', params: { slug: u.profileSlug || u.username } })}
                  >
                    <Avatar name={u.displayName} uri={u.avatarUrl} size={48} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: t.text }]}>{u.displayName}</Text>
                    <Text style={[styles.personUser, { color: t.subtext }]}>@{u.username}</Text>
                  </View>
                  {isAlreadyFriend ? (
                    <View style={[styles.friendedTag, { backgroundColor: (t.alt ?? t.accent) + '18' }]}>
                      <Text style={[styles.friendedTagText, { color: t.alt ?? t.accent }]}>
                        {isThai ? '✓ เพื่อนแล้ว' : '✓ Friends'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: t.accent }]}
                      onPress={() => handleAddFriend(u.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addBtnText}>{isThai ? '+ เพิ่ม' : '+ Add'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: SPACING.md, paddingBottom: 110, gap: SPACING.md },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  sub: { fontSize: 13, marginTop: 2 },
  groupsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
  },
  groupsBtnText: { fontSize: 13, fontWeight: '700' },

  /* Invite card */
  inviteCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1.5,
  },
  inviteIconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  inviteTitle: { fontSize: 14, fontWeight: '800' },
  inviteLink: { fontSize: 12, fontWeight: '500' },
  inviteBtn: {
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#7B62FF', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 4,
  },
  inviteBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  /* Limit warning */
  limitCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  limitTitle: { fontSize: 13, fontWeight: '700' },
  limitSub: { fontSize: 12, marginTop: 2 },

  /* Pill tab switcher */
  tabTrack: {
    flexDirection: 'row', marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg, borderWidth: 1, padding: 4, gap: 4,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md,
  },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  /* Sections */
  section: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  countPill: {
    borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  countPillText: { fontSize: 12, fontWeight: '800' },

  /* Search bar */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 14 },

  /* Person card */
  personCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  personName: { fontSize: 15, fontWeight: '700' },
  personUser: { fontSize: 12, marginTop: 2 },

  /* Pending actions */
  pendingActions: { flexDirection: 'row', gap: SPACING.xs },
  acceptBtn: { borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 },
  acceptText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  declineBtn: { borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  declineText: { fontSize: 12, fontWeight: '600' },

  /* Action buttons */
  viewBtn: { borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  viewBtnText: { fontSize: 13, fontWeight: '700' },
  addBtn: {
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#7B62FF', shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  friendedTag: { borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8 },
  friendedTagText: { fontSize: 12, fontWeight: '700' },

  /* Empty / loading states */
  centeredState: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  emptyState: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
