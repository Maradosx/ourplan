import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { THEMES, RADIUS, SPACING } from '../../constants/theme';

const t = THEMES.midnight;

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, isLoading } = useAuthStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        isThai ? 'ข้อผิดพลาด' : 'Error',
        isThai ? 'กรุณากรอกข้อมูลให้ครบ' : 'Please fill in all fields',
      );
      return;
    }
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      const msg = e.response?.data?.message;
      const display = Array.isArray(msg) ? msg.join('\n') : (msg ?? (isThai ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' : 'Could not connect to server.'));
      Alert.alert(isThai ? 'เข้าสู่ระบบไม่สำเร็จ' : 'Login Failed', display);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Background glow */}
      <View style={styles.bgGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: t.accent }]}>‹ {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: t.accent + '20', borderColor: t.accent + '40' }]}>
            <Text style={{ fontSize: 24 }}>👋</Text>
          </View>
          <Text style={[styles.title, { color: t.text }]}>
            {isThai ? 'ยินดีต้อนรับกลับ' : 'Welcome back'}
          </Text>
          <Text style={[styles.sub, { color: t.subtext }]}>
            {isThai ? 'เข้าสู่ระบบเพื่อดำเนินการต่อ' : 'Sign in to continue to Ourplan'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.subtext }]}>
              {isThai ? 'อีเมล' : 'EMAIL'}
            </Text>
            <View style={[
              styles.inputWrap,
              { backgroundColor: t.surface, borderColor: t.divider },
              focusedField === 'email' && { borderColor: t.accent, backgroundColor: t.surface },
            ]}>
              <Text style={[styles.inputIcon, { color: focusedField === 'email' ? t.accent : t.subtext }]}>✉</Text>
              <TextInput
                style={[styles.input, { color: t.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={t.subtext + '60'}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: t.subtext }]}>
              {isThai ? 'รหัสผ่าน' : 'PASSWORD'}
            </Text>
            <View style={[
              styles.inputWrap,
              { backgroundColor: t.surface, borderColor: t.divider },
              focusedField === 'password' && { borderColor: t.accent },
            ]}>
              <Text style={[styles.inputIcon, { color: focusedField === 'password' ? t.accent : t.subtext }]}>🔑</Text>
              <TextInput
                style={[styles.input, { color: t.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={t.subtext + '60'}
                secureTextEntry={!showPass}
                autoComplete="password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.showPassBtn} activeOpacity={0.7}>
                <Text style={{ color: t.subtext, fontSize: 12, fontWeight: '700' }}>
                  {showPass ? (isThai ? 'ซ่อน' : 'Hide') : (isThai ? 'แสดง' : 'Show')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password')}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgot, { color: t.accent }]}>
              {isThai ? 'ลืมรหัสผ่าน?' : 'Forgot password?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign in button */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.accent }, isLoading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{isThai ? 'เข้าสู่ระบบ' : 'Sign In'}</Text>}
        </TouchableOpacity>

        {/* Sign up link */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.signupWrap}
          activeOpacity={0.7}
        >
          <Text style={[styles.signupText, { color: t.subtext }]}>
            {isThai ? 'ยังไม่มีบัญชี? ' : "Don't have an account? "}
            <Text style={{ color: t.accent, fontWeight: '800' }}>
              {isThai ? 'สมัครสมาชิก' : 'Sign Up'}
            </Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGlow: {
    position: 'absolute', top: -120, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#7B62FF14',
  },
  inner: {
    flex: 1, paddingHorizontal: SPACING.lg,
    justifyContent: 'center', gap: SPACING.lg,
  },
  backBtn: { marginBottom: -SPACING.sm },
  backText: { fontSize: 15, fontWeight: '700' },

  header: { gap: 10, alignItems: 'flex-start' },
  headerIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    marginBottom: 4,
  },
  title: { fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
  sub: { fontSize: 14, lineHeight: 20 },

  form: { gap: SPACING.md },
  field: { gap: 8 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md,
    borderWidth: 1.5, gap: SPACING.sm,
    minHeight: 54,
  },
  inputIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
  showPassBtn: { paddingHorizontal: 4, paddingVertical: 6 },
  forgotWrap: { alignSelf: 'flex-end' },
  forgot: { fontSize: 13, fontWeight: '700' },

  btn: {
    borderRadius: RADIUS.xl, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 10,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  signupWrap: { alignItems: 'center' },
  signupText: { fontSize: 14 },
});
