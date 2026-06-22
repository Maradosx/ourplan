import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../store/themeStore';
import { useProStore } from '../store/proStore';
import { useLanguageStore } from '../store/languageStore';
import { STICKER_PACKS } from '../lib/purchases';
import { RADIUS, SPACING } from '../constants/theme';

export default function StickerShopScreen() {
  const { theme: t } = useThemeStore();
  const { isPro, isStickerOwned, buyStickers } = useProStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';

  const [loading, setLoading] = useState<string | null>(null);

  const handleBuy = async (packId: string) => {
    // Pro users own all packs automatically
    if (isPro) return;

    const pack = STICKER_PACKS.find(p => p.id === packId);
    if (!pack) return;

    Alert.alert(
      `${pack.icon} ${isThai ? pack.labelTh : pack.label}`,
      `${isThai ? pack.descriptionTh : pack.description}\n\n${isThai ? 'ปลดล็อคในราคา' : 'Unlock for'} ${pack.price}?`,
      [
        { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
        {
          text: `${isThai ? 'ซื้อ' : 'Buy'} ${pack.price}`,
          onPress: async () => {
            setLoading(packId);
            try {
              const ok = await buyStickers(packId);
              if (ok) {
                Alert.alert(
                  isThai ? `${pack.icon} ปลดล็อคแล้ว!` : `${pack.icon} Unlocked!`,
                  isThai ? 'ใช้สติกเกอร์ได้ตอนสร้าง Event' : 'Use stickers when creating events!',
                );
              }
            } catch (e: any) {
              if (!e?.message?.includes('cancel'))
                Alert.alert(isThai ? 'เกิดข้อผิดพลาด' : 'Purchase Failed', e?.message ?? 'Please try again.');
            } finally { setLoading(null); }
          },
        },
      ],
    );
  };

  const isOwned = (packId: string) => isPro || isStickerOwned(packId);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <View style={[s.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={[s.back, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: t.text }]}>
          {isThai ? 'ร้านสติกเกอร์' : 'Sticker Shop'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor: t.accentSoft }]}>
          <Text style={s.heroEmoji}>🎭</Text>
          <Text style={[s.heroTitle, { color: t.text }]}>
            {isThai ? 'ไอคอน Event ที่สนุกขึ้น' : 'Make Events More Fun'}
          </Text>
          <Text style={[s.heroSub, { color: t.subtext }]}>
            {isThai ? 'ใช้แทนไอคอนปกติ ตอนสร้าง Event' : 'Custom icons when creating events'}
          </Text>
        </View>

        {/* Pro includes all banner */}
        {!isPro && (
          <TouchableOpacity
            style={[s.proBanner, { backgroundColor: t.accent + '18', borderColor: t.accent + '50' }]}
            onPress={() => router.push('/pro-upgrade')}
            activeOpacity={0.85}
          >
            <Text style={s.proBannerEmoji}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.proBannerTitle, { color: t.text }]}>
                {isThai ? 'Pro รวมทุกชุดอยู่แล้ว!' : 'Pro includes all packs!'}
              </Text>
              <Text style={[s.proBannerSub, { color: t.subtext }]}>
                {isThai ? 'ประหยัดกว่า สมัคร Pro แทน →' : 'Better value — subscribe to Pro →'}
              </Text>
            </View>
            <Text style={[s.proBannerArrow, { color: t.accent }]}>›</Text>
          </TouchableOpacity>
        )}

        {isPro && (
          <View style={[s.proOwnedBanner, { backgroundColor: t.alt + '18', borderColor: t.alt + '40' }]}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <Text style={[s.proOwnedText, { color: t.alt }]}>
              {isThai ? 'Pro: คุณมีทุกชุดแล้ว!' : 'Pro: You own all packs!'}
            </Text>
          </View>
        )}

        {/* Packs grid */}
        <Text style={[s.sectionLabel, { color: t.subtext }]}>
          {isThai ? 'แพ็กสติกเกอร์' : 'STICKER PACKS'}
        </Text>

        {STICKER_PACKS.map((pack) => {
          const owned = isOwned(pack.id);
          const isLoading = loading === pack.id;

          return (
            <View
              key={pack.id}
              style={[
                s.packCard,
                { backgroundColor: t.surface, borderColor: owned ? t.alt + '60' : t.divider },
                owned && { shadowColor: t.alt, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
              ]}
            >
              {/* Pack header */}
              <View style={s.packTop}>
                <View style={[s.packIconWrap, { backgroundColor: t.accentSoft }]}>
                  <Text style={s.packIcon}>{pack.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.packName, { color: t.text }]}>
                    {isThai ? pack.labelTh : pack.label}
                  </Text>
                  <Text style={[s.packDesc, { color: t.subtext }]}>
                    {isThai ? pack.descriptionTh : pack.description}
                  </Text>
                </View>
                {owned && (
                  <View style={[s.ownedBadge, { backgroundColor: t.alt + '22' }]}>
                    <Text style={[s.ownedBadgeText, { color: t.alt }]}>
                      {isThai ? '✓ มีแล้ว' : '✓ Owned'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Sticker preview */}
              <View style={[s.stickerGrid, { backgroundColor: t.card, borderColor: t.divider }]}>
                {pack.stickers.map((st, i) => (
                  <Text key={i} style={[s.sticker, !owned && i >= 6 && s.stickerBlur]}>
                    {!owned && i >= 6 ? '❓' : st}
                  </Text>
                ))}
              </View>

              {/* Action */}
              {!owned && (
                <TouchableOpacity
                  style={[s.buyBtn, { backgroundColor: t.accent }]}
                  onPress={() => handleBuy(pack.id)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.buyBtnText}>
                      {isThai ? `ซื้อ ${pack.price}` : `Buy ${pack.price}`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: 14, borderBottomWidth: 1,
  },
  back: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: SPACING.lg, gap: SPACING.md },

  hero: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm,
  },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: 13, textAlign: 'center' },

  proBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  proBannerEmoji: { fontSize: 24 },
  proBannerTitle: { fontSize: 14, fontWeight: '700' },
  proBannerSub: { fontSize: 12, marginTop: 2 },
  proBannerArrow: { fontSize: 22, fontWeight: '700' },

  proOwnedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  proOwnedText: { fontSize: 14, fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: -4,
  },

  packCard: {
    borderRadius: RADIUS.xl, padding: SPACING.md, gap: SPACING.md,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3,
  },
  packTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  packIconWrap: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  packIcon: { fontSize: 26 },
  packName: { fontSize: 15, fontWeight: '700' },
  packDesc: { fontSize: 12, marginTop: 2 },
  ownedBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  ownedBadgeText: { fontSize: 12, fontWeight: '700' },

  stickerGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    borderRadius: RADIUS.lg, padding: SPACING.sm,
    borderWidth: 1, gap: 2,
  },
  sticker: { fontSize: 26, padding: 4 },
  stickerBlur: { opacity: 0.4 },

  buyBtn: {
    borderRadius: RADIUS.lg, paddingVertical: 12, alignItems: 'center',
    shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
