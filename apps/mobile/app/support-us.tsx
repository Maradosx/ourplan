import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { TIP_OPTIONS } from '../lib/purchases';
import { useProStore } from '../store/proStore';
import { RADIUS, SPACING } from '../constants/theme';

export default function SupportUsScreen() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const { tipDev } = useProStore();
  const isThai = lang === 'th';

  const [loading, setLoading] = useState<string | null>(null);
  const [thanked, setThanked] = useState(false);

  const handleTip = async (tipId: 'small' | 'medium' | 'large') => {
    setLoading(tipId);
    try {
      const ok = await tipDev(tipId);
      if (ok) setThanked(true);
    } catch (e: any) {
      if (!e?.message?.includes('cancel'))
        Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Failed', e?.message ?? 'Please try again.');
    } finally { setLoading(null); }
  };

  /* ── Thank you screen ─────────────────────── */
  if (thanked) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
            <Text style={[s.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.thankedWrap}>
          <Text style={{ fontSize: 72 }}>🥹</Text>
          <Text style={[s.thankedTitle, { color: t.text }]}>
            {isThai ? 'ขอบคุณมากครับ!' : 'Thank you so much!'}
          </Text>
          <Text style={[s.thankedSub, { color: t.subtext }]}>
            {isThai
              ? 'การสนับสนุนของคุณช่วยให้เราพัฒนา Ourplan ต่อไปได้ 💜'
              : "Your support helps us keep building Ourplan 💜"}
          </Text>
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: t.accent }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnText}>{isThai ? 'กลับหน้าหลัก' : 'Back to App'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      {/* Warm blobs */}
      <View style={[s.blob, { backgroundColor: t.accent + '15', top: -40, right: -40, width: 200, height: 200, borderRadius: 100 }]} />
      <View style={[s.blob, { backgroundColor: '#FF6190' + '10', bottom: 60, left: -60, width: 220, height: 220, borderRadius: 110 }]} />

      <View style={[s.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={[s.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: t.text }]}>
          {isThai ? 'สนับสนุนเรา' : 'Support Us'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.heroEmoji}>☕</Text>
          <Text style={[s.heroTitle, { color: t.text }]}>
            {isThai ? 'ซื้อกาแฟให้เราหน่อย?' : 'Buy us a coffee?'}
          </Text>
          <Text style={[s.heroSub, { color: t.subtext }]}>
            {isThai
              ? 'Ourplan พัฒนาโดยทีมเล็กๆ ที่รัก\nการช่วยให้คนวางแผนด้วยกันได้ง่ายขึ้น'
              : 'Ourplan is built by a small team who love\nhelping people plan time together.'}
          </Text>
        </View>

        {/* Story card */}
        <View style={[s.storyCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <Text style={s.storyIcon}>💌</Text>
          <Text style={[s.storyText, { color: t.subtext }]}>
            {isThai
              ? '"เราสร้าง Ourplan เพราะอยากให้การนัดเพื่อนง่ายขึ้น ไม่ต้องถามวนซ้ำๆ ว่า \'ว่างไหม?\'\n\nถ้าคุณชอบแอปนี้ แค่กาแฟถ้วยเดียวก็ช่วยให้เราพัฒนาต่อไปได้มาก 🙏"'
              : '"We built Ourplan because coordinating with friends felt unnecessarily hard. No more \'are you free?\' back-and-forth.\n\nIf you enjoy the app, even a small tip helps us keep going 🙏"'}
          </Text>
          <Text style={[s.storyAuthor, { color: t.subtext + '80' }]}>
            — {isThai ? 'ทีม Ourplan' : 'The Ourplan Team'}
          </Text>
        </View>

        {/* Tip options */}
        <Text style={[s.sectionLabel, { color: t.subtext }]}>
          {isThai ? 'เลือกจำนวน' : 'CHOOSE AN AMOUNT'}
        </Text>

        {TIP_OPTIONS.map((tip) => {
          const isLoading = loading === tip.id;
          return (
            <TouchableOpacity
              key={tip.id}
              style={[s.tipCard, { backgroundColor: t.surface, borderColor: t.divider }]}
              onPress={() => handleTip(tip.id)}
              disabled={!!loading}
              activeOpacity={0.85}
            >
              <Text style={s.tipEmoji}>{tip.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.tipLabel, { color: t.text }]}>
                  {isThai ? tip.labelTh : tip.label}
                </Text>
                <Text style={[s.tipDesc, { color: t.subtext }]}>
                  {TIP_DESCRIPTIONS[tip.id][isThai ? 'th' : 'en']}
                </Text>
              </View>
              <View style={[s.tipPriceWrap, { backgroundColor: t.accentSoft }]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={t.accent} />
                ) : (
                  <Text style={[s.tipPrice, { color: t.accent }]}>{tip.price}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* No pressure note */}
        <View style={[s.noPressureCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <Text style={[s.noPressureText, { color: t.subtext }]}>
            {isThai
              ? '🤍 ไม่มีแรงกดดัน ใช้แอปฟรีได้เต็มที่ tip เป็นแค่ตัวเลือกพิเศษเท่านั้น'
              : '🤍 No pressure at all. The app is fully free to use. Tips are completely optional.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const TIP_DESCRIPTIONS: Record<string, { en: string; th: string }> = {
  small:  { en: 'A quick thanks 🙏',              th: 'ขอบคุณเล็กน้อย 🙏' },
  medium: { en: 'Keeps us caffeinated ☕',        th: 'ช่วยให้เราตื่นตัว ☕' },
  large:  { en: 'You made our day! 🎉',            th: 'คุณทำให้วันนี้ดีมาก! 🎉' },
};

const s = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute' },
  topBar: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 14, borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  thankedWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  thankedTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  thankedSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: SPACING.xl, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hero: { alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.sm },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  storyCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.sm, borderWidth: 1,
  },
  storyIcon: { fontSize: 28 },
  storyText: { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  storyAuthor: { fontSize: 12, textAlign: 'right', marginTop: 4 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: -4,
  },

  tipCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  tipEmoji: { fontSize: 32, width: 40, textAlign: 'center' },
  tipLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  tipDesc: { fontSize: 12 },
  tipPriceWrap: {
    borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, minWidth: 60, alignItems: 'center',
  },
  tipPrice: { fontSize: 16, fontWeight: '800' },

  noPressureCard: {
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  noPressureText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
