import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguageStore } from '../../store/languageStore';
import { THEMES, RADIUS, SPACING } from '../../constants/theme';

const t = THEMES.midnight;

export default function WelcomeScreen() {
  const { lang, setLang } = useLanguageStore();
  const isThai = lang === 'th';

  const features = isThai
    ? [
        { icon: '🗓', text: 'จัดการตารางส่วนตัวอย่างสวยงาม' },
        { icon: '👥', text: 'ดูตารางของเพื่อนแบบเรียลไทม์' },
        { icon: '⚡', text: 'หาเวลานัดหมายที่เหมาะที่สุด' },
      ]
    : [
        { icon: '🗓', text: 'Personal schedule, beautifully organized' },
        { icon: '👥', text: "See your friends' availability in real-time" },
        { icon: '⚡', text: 'Find the perfect time to hang out' },
      ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Background decorations */}
      <View style={styles.bgDecor1} />
      <View style={styles.bgDecor2} />
      <View style={styles.bgDecor3} />

      {/* Language toggle */}
      <View style={styles.langRow}>
        {(['en', 'th'] as const).map((l, i) => (
          <TouchableOpacity
            key={l}
            style={[
              styles.langBtn,
              lang === l && { backgroundColor: t.accent + '20', borderColor: t.accent },
              lang !== l && { borderColor: 'transparent' },
            ]}
            onPress={() => setLang(l)}
            activeOpacity={0.75}
          >
            <Text style={[styles.langText, { color: lang === l ? t.accent : t.subtext }]}>
              {l.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>

        {/* ── Logo area ── */}
        <View style={styles.logoArea}>
          <View style={styles.logoOuter}>
            <View style={[styles.logoInner, { backgroundColor: t.accent }]}>
              <Text style={styles.logoEmoji}>📅</Text>
            </View>
          </View>
          <Text style={[styles.appName, { color: t.text }]}>Ourplan</Text>
          <Text style={[styles.tagline, { color: t.subtext }]}>
            {isThai ? 'วางแผนด้วยกัน ใช้ชีวิตได้ดีกว่า' : 'Schedule together, live better.'}
          </Text>
        </View>

        {/* ── Feature list ── */}
        <View style={styles.featureList}>
          {features.map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureRow,
                { borderColor: t.divider, backgroundColor: t.surface },
              ]}
            >
              <View style={[styles.featureIconBox, { backgroundColor: t.accent + '18' }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={[styles.featureText, { color: t.subtext }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA Buttons ── */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btnPrimary, { backgroundColor: t.accent }]}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>
              {isThai ? 'เริ่มต้นใช้งาน' : 'Get Started'}
            </Text>
            <Text style={styles.btnPrimaryArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: t.divider }]}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: t.subtext }]}>
              {isThai ? 'มีบัญชีอยู่แล้ว? ' : 'Already have an account? '}
              <Text style={{ color: t.accent, fontWeight: '800' }}>
                {isThai ? 'เข้าสู่ระบบ' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Background decorations
  bgDecor1: {
    position: 'absolute', top: -100, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#7B62FF18',
  },
  bgDecor2: {
    position: 'absolute', bottom: 80, left: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#46DCB010',
  },
  bgDecor3: {
    position: 'absolute', top: '40%', right: -50,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#7B62FF08',
  },

  // Language toggle
  langRow: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: SPACING.sm + 2, marginRight: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.full,
    padding: 3, gap: 2,
  },
  langBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full, borderWidth: 1.5,
  },
  langText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },

  content: {
    flex: 1, paddingHorizontal: SPACING.lg,
    justifyContent: 'center', gap: SPACING.xl,
  },

  // Logo
  logoArea: { alignItems: 'center', gap: SPACING.sm },
  logoOuter: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: '#7B62FF15',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#7B62FF30',
  },
  logoInner: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B62FF', shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: { fontSize: 38 },
  appName: { fontSize: 40, fontWeight: '900', letterSpacing: -1.5, marginTop: 4 },
  tagline: { fontSize: 15, textAlign: 'center', lineHeight: 22 },

  // Features
  featureList: { gap: SPACING.sm - 2 },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  featureIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, flex: 1, lineHeight: 20 },

  // Buttons
  buttons: { gap: SPACING.sm },
  btnPrimary: {
    borderRadius: RADIUS.lg, paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    shadowColor: '#7B62FF', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 }, shadowRadius: 16,
    elevation: 10,
  },
  btnPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  btnPrimaryArrow: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 1 },
  btnSecondary: {
    borderRadius: RADIUS.lg, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1,
  },
  btnSecondaryText: { fontSize: 14 },
});
