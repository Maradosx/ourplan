import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { Avatar } from '../../components/ui/Avatar';
import { RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

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

interface Friend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export default function GroupDetailScreen() {
  const { theme: t } = useThemeStore();
  const { user } = useAuthStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';
  const { id } = useLocalSearchParams<{ id: string }>();

  const [group, setGroup] = useState<Group | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groupsRes, friendsRes] = await Promise.all([
        api.get('/groups'),
        api.get('/friends'),
      ]);
      const found = groupsRes.data.find((g: Group) => g.id === id);
      setGroup(found ?? null);
      setFriends(friendsRes.data);
    } catch {}
    finally { setIsLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!group && !isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={[styles.header, { borderBottomColor: t.divider }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: t.subtext }]}>{isThai ? 'ไม่พบกลุ่ม' : 'Group not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = group?.ownerId === user?.id;
  const memberIds = new Set(group?.members.map((m) => m.user.id) ?? []);
  const addableFriends = friends.filter((f) => !memberIds.has(f.id));

  async function handleAddMember(friendId: string) {
    if (!group) return;
    setAddingId(friendId);
    try {
      await api.post(`/groups/${group.id}/members`, { userId: friendId });
      await load();
      if (addableFriends.length <= 1) setShowAddMember(false);
    } catch (e: any) {
      Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Error', e?.response?.data?.message ?? 'Could not add member.');
    } finally {
      setAddingId(null);
    }
  }

  async function handleRemoveMember(memberId: string, name: string) {
    if (!group) return;
    Alert.alert(
      isThai ? 'นำออกจากกลุ่ม' : 'Remove Member',
      isThai ? `นำ ${name} ออกจากกลุ่มใช่ไหม?` : `Remove ${name} from this group?`,
      [
        { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        {
          text: isThai ? 'นำออก' : 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/groups/${group.id}/members/${memberId}`);
              await load();
            } catch {}
          },
        },
      ]
    );
  }

  async function handleRename() {
    if (!group || !newName.trim()) return;
    setRenaming(true);
    try {
      await api.patch(`/groups/${group.id}`, { name: newName.trim() });
      setShowRename(false);
      await load();
    } catch (e: any) {
      Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Error', e?.response?.data?.message ?? 'Could not rename.');
    } finally {
      setRenaming(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>{group?.name}</Text>
          {isOwner && (
            <TouchableOpacity onPress={() => { setNewName(group?.name ?? ''); setShowRename(true); }}>
              <Text style={{ color: t.subtext, fontSize: 13 }}> ✏️</Text>
            </TouchableOpacity>
          )}
        </View>
        {isOwner && addableFriends.length > 0 && (
          <TouchableOpacity onPress={() => setShowAddMember(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[styles.addBtn, { color: t.accent }]}>+ {isThai ? 'เพิ่ม' : 'Add'}</Text>
          </TouchableOpacity>
        )}
        {(!isOwner || addableFriends.length === 0) && <View style={{ width: 60 }} />}
      </View>

      {isLoading ? (
        <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.xl }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <Text style={[styles.sectionLabel, { color: t.subtext }]}>
            {group?.members.length} {isThai ? 'สมาชิก' : 'members'}
          </Text>

          {group?.members.map((m, i) => (
            <View key={m.id} style={[styles.memberRow, { backgroundColor: t.surface, borderColor: t.divider }]}>
              <Avatar name={m.user.displayName} uri={m.user.avatarUrl} size={44} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.memberName, { color: t.text }]}>{m.user.displayName}</Text>
                  {m.role === 'owner' && (
                    <View style={[styles.ownerBadge, { backgroundColor: t.accent + '18' }]}>
                      <Text style={[styles.ownerBadgeText, { color: t.accent }]}>{isThai ? 'เจ้าของ' : 'Owner'}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.memberUser, { color: t.subtext }]}>@{m.user.username}</Text>
              </View>
              {isOwner && m.role !== 'owner' && (
                <TouchableOpacity
                  onPress={() => handleRemoveMember(m.user.id, m.user.displayName)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ color: t.danger, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add member modal */}
      <Modal visible={showAddMember} transparent animationType="slide" onRequestClose={() => setShowAddMember(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddMember(false)} />
        <View style={[styles.sheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
          <View style={[styles.sheetHandle, { backgroundColor: t.divider }]} />
          <Text style={[styles.sheetTitle, { color: t.text }]}>
            {isThai ? 'เพิ่มสมาชิก' : 'Add Members'}
          </Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {addableFriends.length === 0 ? (
              <Text style={[styles.noFriends, { color: t.subtext }]}>
                {isThai ? 'เพื่อนทุกคนอยู่ในกลุ่มนี้แล้ว' : 'All friends are already in this group'}
              </Text>
            ) : (
              addableFriends.map((f, i) => (
                <View key={f.id} style={[styles.friendRow, { borderBottomColor: t.divider }]}>
                  <Avatar name={f.displayName} uri={f.avatarUrl} size={40} color={FRIEND_COLORS[i % FRIEND_COLORS.length]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: t.text }]}>{f.displayName}</Text>
                    <Text style={[styles.memberUser, { color: t.subtext }]}>@{f.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addFriendBtn, { backgroundColor: t.accent }]}
                    onPress={() => handleAddMember(f.id)}
                    disabled={addingId === f.id}
                    activeOpacity={0.85}
                  >
                    {addingId === f.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.addFriendBtnText}>{isThai ? '+ เพิ่ม' : '+ Add'}</Text>}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={[styles.sheetClose, { borderColor: t.divider }]} onPress={() => setShowAddMember(false)}>
            <Text style={[styles.sheetCloseText, { color: t.subtext }]}>{isThai ? 'ปิด' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Rename modal */}
      <Modal visible={showRename} transparent animationType="fade" onRequestClose={() => setShowRename(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowRename(false)} />
        <View style={[styles.sheet, { backgroundColor: t.bg, borderColor: t.divider }]}>
          <View style={[styles.sheetHandle, { backgroundColor: t.divider }]} />
          <Text style={[styles.sheetTitle, { color: t.text }]}>{isThai ? 'เปลี่ยนชื่อกลุ่ม' : 'Rename Group'}</Text>
          <TextInput
            style={[styles.renameInput, { backgroundColor: t.surface, borderColor: t.divider, color: t.text }]}
            value={newName}
            onChangeText={setNewName}
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleRename}
          />
          <TouchableOpacity
            style={[styles.addFriendBtn, { backgroundColor: t.accent, paddingVertical: 13, borderRadius: RADIUS.lg }]}
            onPress={handleRename}
            disabled={renaming || !newName.trim()}
            activeOpacity={0.85}
          >
            {renaming
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addFriendBtnText}>{isThai ? 'บันทึก' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  addBtn: { fontSize: 15, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  body: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 60 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '700' },
  ownerBadge: { borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2 },
  ownerBadgeText: { fontSize: 10, fontWeight: '700' },
  memberUser: { fontSize: 12, marginTop: 2 },
  emptyTitle: { fontSize: 16 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#00000055' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: SPACING.lg, paddingBottom: 40, borderTopWidth: 1, gap: SPACING.md,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  noFriends: { fontSize: 14, textAlign: 'center', padding: SPACING.lg },
  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, borderBottomWidth: 1,
  },
  addFriendBtn: { borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  addFriendBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sheetClose: { paddingVertical: 12, alignItems: 'center', borderTopWidth: 1 },
  sheetCloseText: { fontSize: 15, fontWeight: '500' },
  renameInput: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15 },
});
