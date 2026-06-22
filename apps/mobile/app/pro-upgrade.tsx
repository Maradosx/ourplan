import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../store/themeStore';
import { useProStore } from '../store/proStore';
import { useLanguageStore } from '../store/languageStore';
import { PRO_FEATURES, PRO_PRICES } from '../lib/purchases';
import { RADIUS, SPACING } from '../constants/theme';

export default function ProUpgradeScreen() {
  const { theme: t } = useThemeStore();
  const { isPro, purchasePro, restoreAll } = useProStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [plan, setPlan]       = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /* ── Already Pro ─────────────────────────────── */
  if (isPro) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
            <Text style={[s.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={s.alreadyWrap}>
          <Text style={s.bigEmoji}>✨</Text>
          <View style={[s.proPill, { backgroundColor: '#FFD70020', borderColor: '#FFD700' }]}>
            <Text style={s.proPillText}>OURPLAN PRO</Text>
          </View>
          <Text style={[s.alreadyTitle, { color: t.text }]}>
            {isThai ? 'คุณเป็น Pro แล้ว!' : "You're already Pro!"}
          </Text>
          <Text style={[s.alreadySub, { color: t.subtext }]}>
            {isThai ? 'ขอบคุณที่สนับสนุน Ourplan 🙏' : 'Thank you for supporting Ourplan 🙏'}
          </Text>
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: t.accent }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnText}>{isThai ? 'เยี่ยมเลย!' : 'Awesome!'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Purchase handler ────────────────────────── */
  const handlePurchase = async () => {
    setLoading(true);
    try {
      const ok = await purchasePro(plan);
      if (ok) {
        Alert.alert(
          isThai ? '🎉 ยินดีต้อนรับสู่ Pro!' : '🎉 Welcome to Pro!',
          isThai ? 'ปลดล็อคทุกฟีเจอร์แล้ว!' : 'All features unlocked. Enjoy!',
        );
        router.back();
      }
    } catch (e: any) {
      if (!e?.message?.includes('cancel'))
        Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Purchase Failed', e?.message ?? 'Please try again.');
    } finally { setLoading(false); }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { isPro: restored } = await restoreAll();
      if (restored) {
        Alert.alert('✅ Restored!', isThai ? 'กู้คืน Pro สำเร็จ!' : 'Your Pro subscription has been restored!');
        router.back();
      } else {
        Alert.alert(isThai ? 'ไม่พบการสมัคร' : 'Nothing found', isThai ? 'ไม่พบ Pro subscription ก่อนหน้านี้' : 'No previous Pro subscription found.');
      }
    } catch {}
    finally { setRestoring(false); }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      {/* Glow blobs */}
      <View style={[s.blob, { backgroundColor: t.accent + '18', top: -60, right: -60, width: 260, height: 260, borderRadius: 130 }]} />
      <View style={[s.blob, { backgroundColor: '#FFD70012', bottom: 80, left: -50, width: 180, height: 180, borderRadius: 90 }]} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={[s.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.bigEmoji}>✨</Text>
          <View style={[s.proPill, { backgroundColor: '#FFD70020', borderColor: '#FFD700' }]}>
            <Text style={s.proPillText}>OURPLAN PRO</Text>
          </View>
          <Text style={[s.heroTitle, { color: t.text }]}>
            {isThai ? 'ปลดล็อคทุกอย่าง' : 'Unlock Everything'}
          </Text>
          <Text style={[s.heroSub, { color: t.subtext }]}>
            {isThai ? 'ฟีเจอร์เต็ม ไม่มีข้อจำกัด' : 'Full features. No limits.'}
          </Text>
        </View>

        {/* Plan toggle */}
        <View style={[s.planToggle, { backgroundColor: t.surface, borderColor: t.divider }]}>
          {(['monthly', 'yearly'] as const).map((p) => {
            const active = plan === p;
            return (
              <TouchableOpacity
                key={p}
                style={[s.planBtn, active && { backgroundColor: t.accent }]}
                onPress={() => setPlan(p)}
                activeOpacity={0.8}
              >
                <Text style={[s.planPrice, { color: active ? '#fff' : t.text }]}>
                  {PRO_PRICES[p].thb}
                </Text>
                <Text style={[s.planPer, { color: active ? '#ffffffcc' : t.subtext }]}>
                  {isThai ? PRO_PRICES[p].labelTh : PRO_PRICES[p].label}
                </Text>
                {PRO_PRICES[p].saving ? (
                  <View style={[s.saveBadge, { backgroundColor: active ? '#ffffff30' : t.alt + '22' }]}>
                    <Text style={[s.saveText, { color: active ? '#fff' : t.alt }]}>
                      {isThai ? (('savingTh' in PRO_PRICES[p] ? (PRO_PRICES[p] as any).savingTh : PRO_PRICES[p].saving)) : PRO_PRICES[p].saving}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feature list */}
        <View style={[s.featCard, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <Text style={[s.featCardTitle, { color: t.text }]}>
            {isThai ? 'สิ่งที่คุณได้รับ' : "What you get"}
          </Text>
          {PRO_FEATURES.map((f, i) => (
            <View
              key={i}
              style={[
                s.featRow,
                i < PRO_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.divider },
              ]}
            >
              <Text style={s.featIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.featTitle, { color: t.text }]}>
                  {isThai ? f.titleTh : f.title}
                </Text>
                <Text style={[s.featSub, { color: t.subtext }]}>
                  {isThai ? f.subTh : f.sub}
                </Text>
              </View>
              <Text style={{ fontSize: 18 }}>✅</Text>
            </View>
          ))}
        </View>

        {/* Value callout */}
        <View style={[s.valueCard, { backgroundColor: t.alt + '18', borderColor: t.alt + '40' }]}>
          <Text style={[s.valueText, { color: t.text }]}>
            {isThai
              ? '💡 ซื้อธีมแยก 5 ชุด = ฿245 • Pro รายปี = ฿499 รวมทุกอย่าง'
              : '💡 5 themes alone = ฿245 • Pro yearly = ฿499 for everything'}
          </Text>
        </View>

        {/* Subscribe button */}
        <TouchableOpacity
          style={[s.subBtn, { backgroundColor: t.accent }]}
          onPress={handlePurchase}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={s.subBtnTitle}>
                {isThai ? 'สมัคร Ourplan Pro' : 'Subscribe to Ourplan Pro'}
              </Text>
              <Text style={s.subBtnSub}>
                {PRO_PRICES[plan].thb} {isThai ? PRO_PRICES[plan].labelTh : PRO_PRICES[plan].label}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[s.legal, { color: t.subtext }]}>
          {isThai
            ? 'ยกเลิกได้ตลอดเวลา · ต่ออายุอัตโนมัติ · ชำระผ่าน App Store'
            : 'Cancel anytime · Auto-renews · Charged through App Store'}
        </Text>

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={s.restoreBtn}>
          {restoring
            ? <ActivityIndicator size="small" color={t.subtext} />
            : <Text style={[s.restoreText, { color: t.subtext }]}>
                {isThai ? 'กู้คืนการสมัคร' : 'Restore Purchase'}
              </Text>}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute' },
  topBar: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
  },
  back: { fontSize: 15, fontWeight: '600' },

  alreadyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.xl, gap: SPACING.md,
  },
  alreadyTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  alreadySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.lg,
    paddingVertical: 14, paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },

  hero: { alignItems: 'center', paddingVertical: SPACING.lg, gap: SPACING.sm },
  bigEmoji: { fontSize: 52 },
  proPill: {
    borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1.5,
  },
  proPillText: { color: '#FFD700', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  heroSub: { fontSize: 15, textAlign: 'center' },

  planToggle: {
    flexDirection: 'row', borderRadius: RADIUS.xl, borderWidth: 1,
    overflow: 'hidden', padding: 4, gap: 4,
  },
  planBtn: {
    flex: 1, borderRadius: RADIUS.lg, alignItems: 'center',
    paddingVertical: 14, gap: 4,
  },
  planPrice: { fontSize: 22, fontWeight: '900' },
  planPer: { fontSize: 12 },
  saveBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  saveText: { fontSize: 11, fontWeight: '700' },

  featCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: 0,
  },
  featCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: SPACING.sm },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: 12,
  },
  featIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  featTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  featSub: { fontSize: 12, lineHeight: 16 },

  valueCard: {
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  valueText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },

  subBtn: {
    borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center',
    shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20, elevation: 10,
  },
  subBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  subBtnSub: { color: '#ffffff99', fontSize: 12 },

  legal: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreText: { fontSize: 13, textDecorationLine: 'underline' },
});
