import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { THEMES, RADIUS, SPACING } from '../../constants/theme';

const t = THEMES.midnight;

const FIELD_ICONS: Record<string, string> = {
  displayName: '✏️',
  username: '@',
  email: '✉',
  password: '🔑',
};

export default function RegisterScreen() {
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { register, isLoading } = useAuthStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    const { displayName, username, email, password } = form;
    if (!displayName || !username || !email || !password) {
      Alert.alert(
        isThai ? 'ข้อผิดพลาด' : 'Error',
        isThai ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all fields',
      );
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        isThai ? 'ข้อผิดพลาด' : 'Error',
        isThai ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'Password must be at least 8 characters',
      );
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
      Alert.alert(
        isThai ? 'ชื่อผู้ใช้ไม่ถูกต้อง' : 'Invalid Username',
        isThai
          ? 'ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ เท่านั้น'
          : 'Username can only contain letters, numbers, and underscores.',
      );
      return;
    }
    try {
      await register({
        displayName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
      });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const display = Array.isArray(msg)
        ? msg.join('\n')
        : (msg ?? (isThai ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Could not connect to server.'));
      Alert.alert(isThai ? 'สมัครสมาชิกไม่สำเร็จ' : 'Registration Failed', display);
    }
  };

  type FieldKey = keyof typeof form;
  const fields: {
    key: FieldKey;
    label: string;
    placeholder: string;
    secure?: boolean;
    keyboard?: any;
    autoCap?: 'none' | 'words';
  }[] = isThai
    ? [
        { key: 'displayName', label: 'ชื่อที่แสดง', placeholder: 'เช่น อธิษฐ์ บุญพินิจ', autoCap: 'words' },
        { key: 'username', label: 'ชื่อผู้ใช้', placeholder: 'เช่น athitbp', autoCap: 'none' },
        { key: 'email', label: 'อีเมล', placeholder: 'you@example.com', keyboard: 'email-address', autoCap: 'none' },
        { key: 'password', label: 'รหัสผ่าน', placeholder: '••••••••', secure: true, autoCap: 'none' },
      ]
    : [
        { key: 'displayName', label: 'DISPLAY NAME', placeholder: 'e.g. Athit Boonpinit', autoCap: 'words' },
        { key: 'username', label: 'USERNAME', placeholder: 'e.g. athitbp', autoCap: 'none' },
        { key: 'email', label: 'EMAIL', placeholder: 'you@example.com', keyboard: 'email-address', autoCap: 'none' },
        { key: 'password', label: 'PASSWORD', placeholder: '••••••••', secure: true, autoCap: 'none' },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Background glow */}
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back + Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={[styles.backText, { color: t.accent }]}>
                ‹ {isThai ? 'กลับ' : 'Back'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.headerIcon, { backgroundColor: t.accent + '20', borderColor: t.accent + '40' }]}>
              <Text style={{ fontSize: 24 }}>✨</Text>
            </View>
            <Text style={[styles.title, { color: t.text }]}>
              {isThai ? 'สร้างบัญชี' : 'Create account'}
            </Text>
            <Text style={[styles.sub, { color: t.subtext }]}>
              {isThai ? 'เข้าร่วม Ourplan แล้วเริ่มวางแผน' : 'Join Ourplan and start planning together'}
            </Text>
          </View>

          {/* Profile URL preview */}
          <View style={[styles.linkPreview, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <Text style={[styles.linkLabel, { color: t.subtext }]}>
              {isThai ? 'ลิงก์โปรไฟล์:' : 'Your profile link:'}
            </Text>
            <Text style={[styles.linkValue, { color: t.accent }]}>
              ourplan.app/u/{form.username || (isThai ? 'username' : 'username')}
            </Text>
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            {fields.map((f) => {
              const focused = focusedField === f.key;
              return (
                <View key={f.key} style={styles.field}>
                  <Text style={[styles.label, { color: t.subtext }]}>{f.label}</Text>
                  <View style={[
                    styles.inputWrap,
                    { backgroundColor: t.surface, borderColor: t.divider },
                    focused && { borderColor: t.accent },
                  ]}>
                    <Text style={[styles.inputIcon, { color: focused ? t.accent : t.subtext }]}>
                      {FIELD_ICONS[f.key]}
                    </Text>
                    <TextInput
                      style={[styles.input, { color: t.text }]}
                      value={form[f.key]}
                      onChangeText={set(f.key)}
                      placeholder={f.placeholder}
                      placeholderTextColor={t.subtext + '60'}
                      secureTextEntry={f.secure && !showPass}
                      autoCapitalize={f.autoCap ?? 'none'}
                      keyboardType={f.keyboard}
                      onFocus={() => setFocusedField(f.key)}
                      onBlur={() => setFocusedField(null)}
                    />
                    {f.secure && (
                      <TouchableOpacity
                        onPress={() => setShowPass(!showPass)}
                        style={styles.showPassBtn}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: t.subtext, fontSize: 12, fontWeight: '700' }}>
                          {showPass ? (isThai ? 'ซ่อน' : 'Hide') : (isThai ? 'แสดง' : 'Show')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: t.accent }, isLoading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isThai ? 'สร้างบัญชี' : 'Create Account'}</Text>}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[styles.terms, { color: t.subtext }]}>
            {isThai ? 'การสมัครสมาชิกถือว่าคุณยอมรับ ' : 'By signing up you agree to our '}
            <Text style={{ color: t.accent, fontWeight: '600' }}>
              {isThai ? 'เงื่อนไขการให้บริการ' : 'Terms of Service'}
            </Text>
            {isThai ? ' และ ' : ' and '}
            <Text style={{ color: t.accent, fontWeight: '600' }}>
              {isThai ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute', top: -100, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#7B62FF12',
  },
  inner: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 },

  header: { gap: 8 },
  backBtn: { marginBottom: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    marginBottom: 4,
  },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  sub: { fontSize: 14, lineHeight: 20 },

  linkPreview: {
    borderRadius: RADIUS.lg, padding: SPACING.md,
    borderWidth: 1, gap: 4,
  },
  linkLabel: { fontSize: 11, fontWeight: '600' },
  linkValue: { fontSize: 14, fontWeight: '800' },

  form: { gap: SPACING.md },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
    borderWidth: 1.5, gap: SPACING.sm, minHeight: 54,
  },
  inputIcon: { fontSize: 15, width: 20, textAlign: 'center' },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  showPassBtn: { paddingHorizontal: 4, paddingVertical: 6 },

  btn: {
    borderRadius: RADIUS.xl, paddingVertical: 17, alignItems: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 10,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  terms: { fontSize: 12, textAlign: 'center', lineHeight: 19 },
});
