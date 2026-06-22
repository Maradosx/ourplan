import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguageStore } from '../../store/languageStore';
import { THEMES, RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

const t = THEMES.midnight;

export default function ForgotPasswordScreen() {
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [email, setEmail]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent]         = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert(
        isThai ? 'กรุณาใส่อีเมล' : 'Email required',
        isThai ? 'กรุณากรอกอีเมลของคุณ' : 'Please enter your email address.',
      );
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
      // In dev mode the backend returns devToken so we can test without email
      if (data.devToken) setDevToken(data.devToken);
    } catch (e: any) {
      Alert.alert(
        isThai ? 'เกิดข้อผิดพลาด' : 'Error',
        e?.response?.data?.message ?? (isThai ? 'ไม่สามารถส่งอีเมลได้' : 'Could not send reset email.'),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
        <View style={styles.inner}>
          <View style={styles.sentWrap}>
            <Text style={styles.sentIcon}>📬</Text>
            <Text style={[styles.title, { color: t.text }]}>
              {isThai ? 'ส่งแล้ว!' : 'Email Sent!'}
            </Text>
            <Text style={[styles.sub, { color: t.subtext, textAlign: 'center' }]}>
              {isThai
                ? `ถ้าอีเมล "${email}" มีอยู่ในระบบ คุณจะได้รับลิงก์รีเซ็ตรหัสผ่านเร็วๆ นี้`
                : `If "${email}" exists in our system, you'll receive a reset link shortly.`}
            </Text>

            {/* Dev-only: show token directly so you can test */}
            {devToken && (
              <View style={[styles.devBox, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <Text style={[styles.devLabel, { color: t.subtext }]}>🛠 Dev Token (ใช้ในหน้าถัดไป)</Text>
                <Text style={[styles.devToken, { color: t.accent }]} selectable>{devToken}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: t.accent }]}
              onPress={() => router.push('/(auth)/reset-password')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{isThai ? 'ใส่รหัสรีเซ็ต' : 'Enter Reset Code'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.backLinkWrap}>
              <Text style={[styles.backLink, { color: t.subtext }]}>
                {isThai ? '← กลับไปหน้าเข้าสู่ระบบ' : '← Back to Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inner}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={[styles.backText, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: t.text }]}>{isThai ? 'ลืมรหัสผ่าน?' : 'Forgot Password?'}</Text>
          <Text style={[styles.sub, { color: t.subtext }]}>
            {isThai
              ? 'กรอกอีเมลของคุณแล้วเราจะส่งลิงก์รีเซ็ตให้'
              : "Enter your email and we'll send you a reset link."}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: t.subtext }]}>{isThai ? 'อีเมล' : 'EMAIL'}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.divider }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={t.subtext + '80'}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.accent }, isLoading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{isThai ? 'ส่งลิงก์รีเซ็ต' : 'Send Reset Link'}</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: SPACING.lg, justifyContent: 'center', gap: SPACING.lg },
  header: { gap: 8 },
  backBtn: { marginBottom: SPACING.sm },
  backText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  sub: { fontSize: 15, lineHeight: 22 },
  form: { gap: 7 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  input: {
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14,
    fontSize: 15, borderWidth: 1,
  },
  btn: {
    borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  sentWrap: { alignItems: 'center', gap: SPACING.md },
  sentIcon: { fontSize: 56 },
  devBox: {
    width: '100%', borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, gap: 6,
  },
  devLabel: { fontSize: 11, fontWeight: '600' },
  devToken: { fontSize: 12, fontFamily: 'monospace' },
  backLinkWrap: { marginTop: SPACING.xs },
  backLink: { fontSize: 14 },
});
