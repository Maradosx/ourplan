/**
 * StickerPicker — inline emoji/sticker selector for events.
 * Shows free defaults + owned sticker packs (or all packs if Pro).
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, SafeAreaView, Pressable,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { useProStore } from '../../store/proStore';
import { STICKER_PACKS } from '../../lib/purchases';
import { RADIUS, SPACING } from '../../constants/theme';

// ── Free stickers (always available) ────────────────────────────────────────
const FREE_STICKERS = [
  '📌', '⭐', '🔖', '💡', '🎯', '🔔', '❤️', '🌟',
  '✅', '🏃', '🍎', '🎵', '📅', '🎉', '🌿', '💬',
  '🕐', '🏠', '🌙', '☀️', '🤝', '👑', '🔥', '💫',
  '📍', '🎪', '🌸', '😊', '💪', '🚀', '🎨', '🌈',
];

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
  isThai?: boolean;
}

export function StickerPicker({ value, onChange, isThai = false }: Props) {
  const { theme: t } = useThemeStore();
  const { isPro, isStickerOwned } = useProStore();
  const [open, setOpen] = useState(false);

  function pick(icon: string) {
    onChange(icon === value ? null : icon);
    setOpen(false);
  }

  const label = isThai ? 'ไอคอน' : 'Icon';
  const placeholder = isThai ? 'เพิ่มไอคอน (ไม่บังคับ)' : 'Add icon (optional)';

  return (
    <>
      {/* Trigger row */}
      <TouchableOpacity
        style={[s.trigger, { backgroundColor: t.surface, borderColor: value ? t.accent : t.divider }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        {value ? (
          <>
            <Text style={s.selectedIcon}>{value}</Text>
            <Text style={[s.triggerText, { color: t.text }]}>{value}</Text>
          </>
        ) : (
          <>
            <Text style={s.selectedIcon}>🎭</Text>
            <Text style={[s.triggerText, { color: t.subtext }]}>{placeholder}</Text>
          </>
        )}
        {value ? (
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[s.clear, { color: t.subtext }]}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: t.subtext, fontSize: 16 }}>›</Text>
        )}
      </TouchableOpacity>

      {/* Picker modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.overlay} onPress={() => setOpen(false)} />
        <View style={[s.sheet, { backgroundColor: t.bg }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: t.divider }]} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={[s.sheetTitle, { color: t.text }]}>
              {isThai ? 'เลือกไอคอน' : 'Pick an Icon'}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={[s.sheetClose, { color: t.accent }]}>
                {isThai ? 'เสร็จ' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* No icon option */}
            <TouchableOpacity
              style={[s.noneBtn, { borderColor: !value ? t.accent : t.divider, backgroundColor: !value ? t.accent + '18' : t.surface }]}
              onPress={() => { onChange(null); setOpen(false); }}
              activeOpacity={0.75}
            >
              <Text style={[s.noneBtnText, { color: !value ? t.accent : t.subtext }]}>
                {isThai ? '🚫 ไม่มีไอคอน' : '🚫 No Icon'}
              </Text>
            </TouchableOpacity>

            {/* Free stickers */}
            <Text style={[s.packLabel, { color: t.subtext }]}>
              {isThai ? '✨ ฟรี' : '✨ Free'}
            </Text>
            <View style={s.grid}>
              {FREE_STICKERS.map((sticker) => (
                <TouchableOpacity
                  key={sticker}
                  style={[
                    s.stickerBtn,
                    { backgroundColor: t.surface, borderColor: value === sticker ? t.accent : 'transparent' },
                    value === sticker && { backgroundColor: t.accent + '18' },
                  ]}
                  onPress={() => pick(sticker)}
                  activeOpacity={0.7}
                >
                  <Text style={s.stickerEmoji}>{sticker}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sticker packs */}
            {STICKER_PACKS.map((pack) => {
              const owned = isPro || isStickerOwned(pack.id);
              return (
                <View key={pack.id}>
                  <View style={s.packHeader}>
                    <Text style={[s.packLabel, { color: t.subtext }]}>
                      {pack.icon} {isThai ? pack.labelTh : pack.label}
                    </Text>
                    {!owned && (
                      <View style={[s.lockBadge, { backgroundColor: t.surface, borderColor: t.divider }]}>
                        <Text style={[s.lockText, { color: t.subtext }]}>
                          🔒 {pack.price}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={s.grid}>
                    {pack.stickers.map((sticker, i) => {
                      const visible = owned || i < 3;
                      return (
                        <TouchableOpacity
                          key={sticker + i}
                          style={[
                            s.stickerBtn,
                            { backgroundColor: t.surface, borderColor: value === sticker && owned ? t.accent : 'transparent' },
                            value === sticker && owned && { backgroundColor: t.accent + '18' },
                            !visible && { opacity: 0.35 },
                          ]}
                          onPress={() => owned ? pick(sticker) : undefined}
                          activeOpacity={owned ? 0.7 : 1}
                          disabled={!owned && i >= 3}
                        >
                          <Text style={s.stickerEmoji}>{visible ? sticker : '❓'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!owned && (
                    <Text style={[s.unlockHint, { color: t.subtext }]}>
                      {isThai ? `ซื้อแพ็ก ${isThai ? pack.labelTh : pack.label} ที่ร้านสติกเกอร์` : `Buy this pack in the Sticker Shop`}
                    </Text>
                  )}
                </View>
              );
            })}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
  },
  selectedIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  triggerText: { flex: 1, fontSize: 15 },
  clear: { fontSize: 14 },

  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#00000055',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    maxHeight: '75%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: -4 }, shadowRadius: 20, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700' },
  sheetClose: { fontSize: 15, fontWeight: '700' },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.sm },

  noneBtn: {
    borderRadius: RADIUS.md, borderWidth: 1.5,
    paddingVertical: 10, paddingHorizontal: SPACING.md, alignItems: 'center',
  },
  noneBtnText: { fontSize: 14, fontWeight: '600' },

  packHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  packLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  lockBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  lockText: { fontSize: 11, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stickerBtn: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  stickerEmoji: { fontSize: 24 },

  unlockHint: { fontSize: 11, marginTop: 4, marginBottom: 4 },
});
