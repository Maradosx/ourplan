import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { Avatar } from '../../components/ui/Avatar';
import { RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

export default function EditProfileScreen() {
  const { theme: t } = useThemeStore();
  const { user, setUser } = useAuthStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);   // local preview URI
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null); // data URL to upload
  const [saving, setSaving] = useState(false);

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isThai ? 'ต้องการสิทธิ์' : 'Permission needed',
          isThai ? 'กรุณาอนุญาตการเข้าถึงรูปภาพ' : 'Please allow photo library access to change your profile picture.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        if (asset.base64) {
          setAvatarBase64(`data:image/jpeg;base64,${asset.base64}`);
        } else {
          // Fallback: read via FileSystem
          try {
            const FileSystem = require('expo-file-system');
            const b64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setAvatarBase64(`data:image/jpeg;base64,${b64}`);
          } catch {
            // Preview works but base64 unavailable — won't save to server
          }
        }
      }
    } catch (e: any) {
      Alert.alert(
        isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        e?.message ?? 'Could not open image picker.',
      );
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert(isThai ? 'ข้อผิดพลาด' : 'Error', isThai ? 'ชื่อที่แสดงห้ามว่าง' : 'Display name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
      };
      if (avatarBase64) body.avatarUrl = avatarBase64;

      const { data: updated } = await api.patch('/users/me', body);
      setUser({ ...user!, ...updated });
      Alert.alert(
        isThai ? 'บันทึกแล้ว!' : 'Saved!',
        isThai ? 'อัปเดตโปรไฟล์เรียบร้อย' : 'Your profile has been updated.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Error', e?.response?.data?.message ?? e?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  const avatarDisplay = avatarUri ?? user?.avatarUrl;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.cancel, { color: t.subtext }]}>{isThai ? 'ยกเลิก' : 'Cancel'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{isThai ? 'แก้ไขโปรไฟล์' : 'Edit Profile'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          {saving
            ? <ActivityIndicator size="small" color={t.accent} />
            : <Text style={[styles.save, { color: t.accent }]}>{isThai ? 'บันทึก' : 'Save'}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarWrap}>
            {avatarDisplay
              ? <Image source={{ uri: avatarDisplay }} style={styles.avatarImg} />
              : <Avatar name={user?.displayName ?? 'U'} size={88} color={t.accent} />
            }
            <View style={[styles.cameraOverlay, { backgroundColor: t.accent }]}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: t.subtext }]}>
            {avatarUri
              ? (isThai ? 'รูปใหม่เลือกแล้ว — กด บันทึก' : 'New photo selected — tap Save')
              : (isThai ? 'แตะเพื่อเปลี่ยนรูป' : 'Tap to change photo')}
          </Text>
        </View>

        {/* Fields */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={[styles.field, { borderBottomColor: t.divider }]}>
            <Text style={[styles.fieldLabel, { color: t.subtext }]}>{isThai ? 'ชื่อที่แสดง' : 'Display Name'}</Text>
            <TextInput
              style={[styles.input, { color: t.text }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={isThai ? 'ชื่อของคุณ' : 'Your name'}
              placeholderTextColor={t.subtext + '80'}
              maxLength={40}
            />
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.subtext }]}>{isThai ? 'แนะนำตัว' : 'Bio'}</Text>
            <TextInput
              style={[styles.input, styles.bioInput, { color: t.text }]}
              value={bio}
              onChangeText={setBio}
              placeholder={isThai ? 'แนะนำตัวเองสั้นๆ...' : 'Tell people about yourself...'}
              placeholderTextColor={t.subtext + '80'}
              maxLength={160}
              multiline
              numberOfLines={3}
            />
            <Text style={[styles.charCount, { color: t.subtext }]}>{bio.length}/160</Text>
          </View>
        </View>

        {/* Read-only */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={[styles.field, { borderBottomColor: t.divider }]}>
            <Text style={[styles.fieldLabel, { color: t.subtext }]}>Username</Text>
            <Text style={[styles.readOnly, { color: t.subtext }]}>@{user?.username}</Text>
          </View>
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: t.subtext }]}>Email</Text>
            <Text style={[styles.readOnly, { color: t.subtext }]}>{user?.email}</Text>
          </View>
        </View>
        <Text style={[styles.note, { color: t.subtext }]}>
          {isThai ? 'ชื่อผู้ใช้และอีเมลไม่สามารถเปลี่ยนได้' : 'Username and email cannot be changed.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1,
  },
  cancel: { fontSize: 15, fontWeight: '500', minWidth: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  save: { fontSize: 15, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  scroll: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 60 },
  avatarSection: { alignItems: 'center', gap: SPACING.sm },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  cameraIcon: { fontSize: 14 },
  avatarHint: { fontSize: 13 },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  field: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4, borderBottomWidth: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  input: { fontSize: 15 },
  bioInput: { minHeight: 60, textAlignVertical: 'top' },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  readOnly: { fontSize: 15 },
  note: { fontSize: 12, textAlign: 'center' },
});
