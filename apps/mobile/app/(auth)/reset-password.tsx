import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguageStore } from '../../store/languageStore';
import { THEMES, RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

const t = THEMES.midnight;

export default function ResetPasswordScreen() {
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [token, setToken]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [success, setSuccess]       = useState(false);

  async function handleReset() {
    if (!token.trim()) {
      Alert.alert(isThai ? 'ต้องใส่โทเค็น' : 'Token required', isThai ? 'กรุณาใส่โทเค็นรีเซ็ต' : 'Please enter the reset token from your email.');
      return;
    }
    if (password.length < 8) {
      Alert.alert(isThai ? 'รหัสผ่านสั้นเกินไป' : 'Too short', isThai ? 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' : 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      Alert.alert(isThai ? 'รหัสผ่านไม่ตรงกัน' : 'Mismatch', isThai ? 'รหัสผ่านทั้งสองไม่ตรงกัน' : 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), newPassword: password });
      setSuccess(true);
    } catch (e: any) {
      Alert.alert(
        isThai ? 'รีเซ็ตไม่สำเร็จ' : 'Reset Failed',
        e?.response?.data?.message ?? (isThai ? 'โทเค็นไม่ถูกต้องหรือหมดอายุ' : 'Token is invalid or expired.'),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
        <View style={styles.inner}>
          <View style={styles.successWrap}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={[styles.title, { color: t.text }]}>{isThai ? 'รีเซ็ตสำเร็จ!' : 'Password Reset!'}</Text>
            <Text style={[styles.sub, { color: t.subtext, textAlign: 'center' }]}>
              {isThai ? 'รหัสผ่านของคุณถูกอัปเดตแล้ว กรุณาเข้าสู่ระบบใหม่' : 'Your password has been updated. Please sign in again.'}
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: t.accent }]}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{isThai ? 'เข้าสู่ระบบ' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={[styles.backText, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: t.text }]}>{isThai ? 'ตั้งรหัสผ่านใหม่' : 'New Password'}</Text>
            <Text style={[styles.sub, { color: t.subtext }]}>
              {isThai ? 'วางโทเค็นจากอีเมลแล้วตั้งรหัสผ่านใหม่ของคุณ' : 'Paste the token from your email and set a new password.'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* Token */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'โทเค็นรีเซ็ต' : 'RESET TOKEN'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.divider }]}
                value={token}
                onChangeText={setToken}
                placeholder={isThai ? 'วางโทเค็นที่นี่' : 'Paste token here'}
                placeholderTextColor={t.subtext + '80'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* New password */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'รหัสผ่านใหม่' : 'NEW PASSWORD'}</Text>
              <View style={[styles.passWrap, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <TextInput
                  style={[styles.passInput, { color: t.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={t.subtext + '80'}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Text style={{ color: t.subtext, fontSize: 13 }}>
                    {showPass ? (isThai ? 'ซ่อน' : 'Hide') : (isThai ? 'แสดง' : 'Show')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'ยืนยันรหัสผ่าน' : 'CONFIRM PASSWORD'}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: confirm && confirm !== password ? '#FF4D4D' : t.divider }]}
                value={confirm}
                onChangeText={setConfirm}
                placeholder="••••••••"
                placeholderTextColor={t.subtext + '80'}
                secureTextEntry={!showPass}
              />
              {confirm.length > 0 && confirm !== password && (
                <Text style={styles.errorText}>{isThai ? 'รหัสผ่านไม่ตรงกัน' : 'Passwords do not match'}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: t.accent }, isLoading && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isThai ? 'ตั้งรหัสผ่านใหม่' : 'Reset Password'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { padding: SPACING.lg, gap: SPACING.lg, justifyContent: 'center', flexGrow: 1 },
  header: { gap: 8 },
  backBtn: { marginBottom: SPACING.sm },
  backText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 22 },
  form: { gap: SPACING.md },
  field: { gap: 7 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  input: {
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14,
    fontSize: 15, borderWidth: 1,
  },
  passWrap: {
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center',
  },
  passInput: { flex: 1, fontSize: 15 },
  errorText: { fontSize: 12, color: '#FF4D4D', marginTop: 2 },
  btn: {
    borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  successWrap: { alignItems: 'center', gap: SPACING.md },
  successIcon: { fontSize: 56 },
});
