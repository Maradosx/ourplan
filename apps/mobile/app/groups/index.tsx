import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useProStore } from '../../store/proStore';
import { Avatar } from '../../components/ui/Avatar';
import { RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

const FREE_GROUP_LIMIT = 3;
const FRIEND_COLORS = ['#7B62FF', '#46DCB0', '#FF9040', '#FF6190', '#40B4FF', '#FFD700'];

interface GroupMember {
  id: string;
  role: 'owner' | 'member';
  user: { id: string; displayName: string; avatarUrl: string | null; username: string };
}

interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: GroupMember[];
}

export default function GroupsScreen() {
  const { theme: t } = useThemeStore();
  const { user } = useAuthStore();
  const { lang } = useLanguageStore();
  const { isPro } = useProStore();
  const isThai = lang === 'th';

  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myGroups = groups.filter((g) => g.ownerId === user?.id);
  const atLimit = !isPro && myGroups.length >= FREE_GROUP_LIMIT;

  async function handleCreate() {
    if (!newName.trim()) return;
    if (atLimit) {
      Alert.alert(
        isThai ? '✨ ต้องการ Pro' : '✨ Pro Required',
        isThai
          ? `คุณสร้างกลุ่มได้สูงสุด ${FREE_GROUP_LIMIT} กลุ่มสำหรับบัญชีฟรี\nอัปเกรดเป็น Pro เพื่อสร้างได้ไม่จำกัด`
          : `Free accounts can create up to ${FREE_GROUP_LIMIT} groups.\nUpgrade to Pro for unlimited groups.`,
        [
          { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
          { text: isThai ? 'ดู Pro' : 'See Pro', onPress: () => router.push('/pro-upgrade') },
        ]
      );
      return;
    }
    setCreating(true);
    try {
      await api.post('/groups', { name: newName.trim() });
      setNewName('');
      setShowCreate(false);
      await load();
    } catch (e: any) {
      Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Error', e?.response?.data?.message ?? 'Could not create group.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(group: Group) {
    Alert.alert(
      isThai ? 'ลบกลุ่ม' : 'Delete Group',
      isThai ? `ต้องการลบกลุ่ม "${group.name}" ใช่ไหม?` : `Delete "${group.name}"?`,
      [
        { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        {
          text: isThai ? 'ลบ' : 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/groups/${group.id}`);
              await load();
            } catch {}
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{isThai ? 'กลุ่มเพื่อน' : 'Friend Groups'}</Text>
        <TouchableOpacity
          onPress={() => {
            if (atLimit) {
              Alert.alert(
                isThai ? '✨ ต้องการ Pro' : '✨ Pro Required',
                isThai ? `ฟรีสร้างได้ ${FREE_GROUP_LIMIT} กลุ่ม — อัปเกรดเพื่อไม่จำกัด` : `Free: ${FREE_GROUP_LIMIT} groups. Upgrade for unlimited.`,
                [
                  { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
                  { text: isThai ? 'อัปเกรด' : 'Upgrade', onPress: () => router.push('/pro-upgrade') },
                ]
              );
              return;
            }
            setShowCreate(true);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.createBtn, { color: t.accent }]}>+ {isThai ? 'สร้าง' : 'New'}</Text>
        </TouchableOpacity>
      </View>

      {/* Group count info */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: t.subtext }]}>
          {isThai
            ? `กลุ่มของฉัน ${myGroups.length}${isPro ? '' : `/${FREE_GROUP_LIMIT}`} กลุ่ม`
            : `My groups: ${myGroups.length}${isPro ? '' : `/${FREE_GROUP_LIMIT}`}`}
        </Text>
        {!isPro && (
          <TouchableOpacity onPress={() => router.push('/pro-upgrade')}>
            <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800' }}>{isThai ? '⚡ Pro = ไม่จำกัด' : '⚡ Pro = Unlimited'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.xl }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={[styles.emptyTitle, { color: t.text }]}>
            {isThai ? 'ยังไม่มีกลุ่ม' : 'No groups yet'}
          </Text>
          <Text style={[styles.emptySub, { color: t.subtext }]}>
            {isThai ? 'สร้างกลุ่มเพื่อจัดระเบียบเพื่อนของคุณ' : 'Create a group to organize your friends'}
          </Text>
          <TouchableOpacity
            style={[styles.createFirstBtn, { backgroundColor: t.accent }]}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.createFirstBtnText}>{isThai ? '+ สร้างกลุ่มแรก' : '+ Create First Group'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {groups.map((group) => {
            const isOwner = group.ownerId === user?.id;
            return (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, { backgroundColor: t.surface, borderColor: t.divider }]}
                onPress={() => router.push({ pathname: '/groups/[id]', params: { id: group.id } })}
                activeOpacity={0.8}
              >
                <View style={styles.groupCardLeft}>
                  {/* Stacked avatars */}
                  <View style={styles.avatarStack}>
                    {group.members.slice(0, 4).map((m, i) => (
                      <View key={m.id} style={[styles.stackedAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                        <Avatar name={m.user.displayName} uri={m.user.avatarUrl} size={32} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
                      </View>
                    ))}
                    {group.members.length > 4 && (
                      <View style={[styles.moreCount, { backgroundColor: t.accent + '30', marginLeft: -10 }]}>
                        <Text style={[styles.moreCountText, { color: t.accent }]}>+{group.members.length - 4}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.groupName, { color: t.text }]}>{group.name}</Text>
                      {isOwner && (
                        <View style={[styles.ownerBadge, { backgroundColor: t.accent + '18' }]}>
                          <Text style={[styles.ownerBadgeText, { color: t.accent }]}>{isThai ? 'เจ้าของ' : 'Owner'}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.memberCount, { color: t.subtext }]}>
                      {group.members.length} {isThai ? 'คน' : `member${group.members.length !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.groupCardRight}>
                  {isOwner && (
                    <TouchableOpacity
                      onPress={() => handleDelete(group)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={{ color: t.danger, fontSize: 16 }}>🗑</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={[styles.arrow, { color: t.subtext }]}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Create group modal */}
      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCreate(false)} />
        <View style={[styles.modalSheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
          <View style={[styles.modalHandle, { backgroundColor: t.divider }]} />
          <Text style={[styles.modalTitle, { color: t.text }]}>{isThai ? 'สร้างกลุ่มใหม่' : 'New Group'}</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: t.surface, borderColor: t.divider, color: t.text }]}
            value={newName}
            onChangeText={setNewName}
            placeholder={isThai ? 'ชื่อกลุ่ม เช่น ครอบครัว, เพื่อนมหา...' : 'Group name, e.g. Family, College friends...'}
            placeholderTextColor={t.subtext + '80'}
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <TouchableOpacity
            style={[styles.modalCreate, { backgroundColor: t.accent, opacity: !newName.trim() ? 0.5 : 1 }]}
            onPress={handleCreate}
            disabled={creating || !newName.trim()}
            activeOpacity={0.85}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalCreateText}>{isThai ? 'สร้างกลุ่ม' : 'Create Group'}</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
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
  createBtn: { fontSize: 15, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  countText: { fontSize: 13 },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 60 },
  groupCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md,
  },
  groupCardLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  groupCardRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackedAvatar: {},
  moreCount: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  moreCountText: { fontSize: 10, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupName: { fontSize: 15, fontWeight: '700' },
  ownerBadge: { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  ownerBadgeText: { fontSize: 10, fontWeight: '700' },
  memberCount: { fontSize: 12, marginTop: 2 },
  arrow: { fontSize: 20 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  createFirstBtn: { borderRadius: RADIUS.lg, paddingVertical: 13, paddingHorizontal: SPACING.xl, marginTop: SPACING.sm },
  createFirstBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000055' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, paddingBottom: 40, borderTopWidth: 1,
    gap: SPACING.md,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalInput: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15 },
  modalCreate: { borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  modalCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
