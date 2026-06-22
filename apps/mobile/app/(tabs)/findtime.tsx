import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useProStore } from '../../store/proStore';
import { ThemeDecor } from '../../components/ui/ThemeDecor';
import { Avatar } from '../../components/ui/Avatar';
import { RADIUS, SPACING } from '../../constants/theme';
import { api } from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FreeSlot {
  dateISO: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  allFree: boolean;
  freeCount: number;
  totalCount: number;
  participants: { id: string; displayName: string; avatarUrl: string | null }[];
}

interface DayGroup {
  dateISO: string;
  slots: FreeSlot[];
  totalHours: number;
  allFree: boolean;
  minFreeCount: number;
  totalCount: number;
  participants: FreeSlot['participants'];
}

interface Friend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FRIEND_COLORS = ['#7B62FF', '#46DCB0', '#FF9040', '#FF6190', '#40B4FF'];

const DAY_OPTIONS = [7, 14, 30] as const;
type DayOption = typeof DAY_OPTIONS[number];

const DURATION_OPTIONS = [
  { value: 30,  labelEn: '30m',  labelTh: '30น.' },
  { value: 60,  labelEn: '1h',   labelTh: '1ชม.' },
  { value: 120, labelEn: '2h',   labelTh: '2ชม.' },
  { value: 180, labelEn: '3h',   labelTh: '3ชม.' },
] as const;
type DurationValue = typeof DURATION_OPTIONS[number]['value'];

// Time-window quick presets — free for everyone
const WINDOW_PRESETS = [
  { labelEn: 'Morning',   labelTh: 'เช้า',         icon: '🌅', start: 6,  end: 12 },
  { labelEn: 'Afternoon', labelTh: 'บ่าย',         icon: '☀️', start: 12, end: 18 },
  { labelEn: 'Evening',   labelTh: 'เย็น',         icon: '🌇', start: 17, end: 22 },
  { labelEn: 'Work day',  labelTh: 'ทั้งวันทำงาน', icon: '🏢', start: 8,  end: 22 },
  { labelEn: 'All Day',   labelTh: 'ทั้งวัน',      icon: '🌐', start: 6,  end: 23 },
] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

type SortMode = 'date' | 'most' | 'least';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlotDate(dateISO: string, isThai: boolean): string {
  try {
    const d = new Date(dateISO + 'T00:00:00');
    return d.toLocaleDateString(isThai ? 'th-TH' : 'en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
  } catch { return dateISO; }
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function groupByDay(slots: FreeSlot[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const slot of slots) {
    const existing = map.get(slot.dateISO);
    if (existing) {
      existing.slots.push(slot);
      existing.totalHours = Math.round((existing.totalHours + slot.durationHours) * 10) / 10;
      if (!slot.allFree) existing.allFree = false;
      if (slot.freeCount < existing.minFreeCount) existing.minFreeCount = slot.freeCount;
    } else {
      map.set(slot.dateISO, {
        dateISO: slot.dateISO,
        slots: [slot],
        totalHours: slot.durationHours,
        allFree: slot.allFree,
        minFreeCount: slot.freeCount,
        totalCount: slot.totalCount,
        participants: slot.participants,
      });
    }
  }
  return Array.from(map.values());
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type ThemeType = {
  text: string; subtext: string; accent: string; accentSoft: string;
  alt: string; warn: string; surface: string; bg: string; divider: string;
  card: string; [key: string]: any;
};

function SectionLabel({
  icon, title, badge, t,
}: {
  icon: string;
  title: string;
  badge?: { text: string; color: string };
  t: ThemeType;
}) {
  return (
    <View style={slStyles.wrap}>
      <View style={[slStyles.iconCircle, { backgroundColor: t.accentSoft, borderColor: t.accent + '30' }]}>
        <Text style={slStyles.iconText}>{icon}</Text>
      </View>
      <Text style={[slStyles.title, { color: t.text }]}>{title}</Text>
      {badge && (
        <View style={[slStyles.badge, { backgroundColor: badge.color + '15', borderColor: badge.color + '40' }]}>
          <Text style={[slStyles.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      )}
    </View>
  );
}

const slStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm, gap: 10,
  },
  iconCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  iconText: { fontSize: 13 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: -0.1 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1.5,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function FindTimeScreen() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();
  const { isPro } = useProStore();
  const isThai = lang === 'th';

  const [slots, setSlots]               = useState<FreeSlot[]>([]);
  const [sortedGroups, setSortedGroups] = useState<DayGroup[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [searched, setSearched]         = useState(false);
  const [sortMode, setSortMode]         = useState<SortMode>('date');

  const [friends, setFriends]                     = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [days, setDays]                           = useState<DayOption>(7);
  const [minDuration, setMinDuration]             = useState<DurationValue>(60);
  const [loadingFriends, setLoadingFriends]       = useState(false);

  // Time window — FREE for everyone
  const [windowStart, setWindowStart] = useState(8);
  const [windowEnd, setWindowEnd]     = useState(22);

  useEffect(() => {
    setLoadingFriends(true);
    api.get('/friends')
      .then(({ data }) => setFriends(data))
      .catch(() => {})
      .finally(() => setLoadingFriends(false));
  }, []);

  useEffect(() => {
    const groups = groupByDay(slots);
    if (sortMode === 'most') {
      groups.sort((a, b) => b.totalHours - a.totalHours || a.dateISO.localeCompare(b.dateISO));
    } else if (sortMode === 'least') {
      groups.sort((a, b) => a.totalHours - b.totalHours || a.dateISO.localeCompare(b.dateISO));
    } else {
      groups.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
    }
    setSortedGroups(groups);
  }, [slots, sortMode]);

  const toggleFriend = (id: string) =>
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = selectedFriendIds.size === 0;

  const findFreeSlots = async () => {
    setIsLoading(true);
    setSearched(true);
    try {
      const params: Record<string, string> = {
        days: String(days),
        minDuration: String(isPro ? minDuration : 60),
        windowStart: String(windowStart),
        windowEnd: String(windowEnd),
      };
      if (selectedFriendIds.size > 0) {
        params.friendIds = Array.from(selectedFriendIds).join(',');
      }
      const { data } = await api.get('/schedules/free-slots', { params });
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const SORT_OPTIONS: { key: SortMode; labelEn: string; labelTh: string }[] = [
    { key: 'date',  labelEn: 'By date',       labelTh: 'ตามวันที่' },
    { key: 'most',  labelEn: 'Most free ↓',   labelTh: 'ว่างมาก ↓' },
    { key: 'least', labelEn: 'Least free ↑',  labelTh: 'ว่างน้อย ↑' },
  ];

  const windowDuration = windowEnd - windowStart;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <ThemeDecor />

        {/* ─── Header ────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: t.text }]}>
              {isThai ? 'หาเวลาว่าง' : 'Find Time'}
            </Text>
            <Text style={[styles.sub, { color: t.subtext }]}>
              {isThai
                ? `ค้นหา ${days} วัน · ${formatHour(windowStart)}–${formatHour(windowEnd)}`
                : `${days}-day search · ${formatHour(windowStart)}–${formatHour(windowEnd)}`}
            </Text>
          </View>
          <View style={[styles.headerIcon, { backgroundColor: t.accentSoft, borderColor: t.accent + '30' }]}>
            <Text style={{ fontSize: 22 }}>⚡</Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1 — PEOPLE
        ══════════════════════════════════════════════════════════════════════ */}
        <SectionLabel
          icon="👥"
          title={isThai ? 'เลือกคน' : 'Select People'}
          badge={{ text: isThai ? 'ฟรี' : 'FREE', color: '#20BF8A' }}
          t={t as ThemeType}
        />

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: t.text }]}>
              {isThai ? 'ว่างตรงกันกับใคร?' : 'Who are you planning with?'}
            </Text>
            <Text style={[styles.peopleSummary, { color: t.accent }]}>
              {allSelected
                ? (isThai ? 'ทุกคน' : 'Everyone')
                : `${selectedFriendIds.size} ${isThai ? 'คน' : selectedFriendIds.size === 1 ? 'person' : 'people'}`}
            </Text>
          </View>

          {loadingFriends ? (
            <ActivityIndicator size="small" color={t.accent} style={{ marginTop: SPACING.sm }} />
          ) : friends.length === 0 ? (
            <TouchableOpacity
              style={[styles.addFriendRow, { backgroundColor: t.bg, borderColor: t.accent + '30' }]}
              onPress={() => router.push('/(tabs)/friends')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15 }}>👥</Text>
              <Text style={[styles.addFriendText, { color: t.accent }]}>
                {isThai ? '+ เพิ่มเพื่อนเพื่อใช้ฟีเจอร์นี้' : '+ Add friends to use this feature'}
              </Text>
              <Text style={{ color: t.accent }}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.friendChipsWrap}>
              {/* All chip */}
              <TouchableOpacity
                style={[
                  styles.friendChip,
                  { borderColor: t.divider, backgroundColor: t.bg },
                  allSelected && { backgroundColor: t.accent + '18', borderColor: t.accent },
                ]}
                onPress={() => setSelectedFriendIds(new Set())}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13 }}>👥</Text>
                <Text style={[styles.chipName, { color: allSelected ? t.accent : t.subtext }]}>
                  {isThai ? 'ทุกคน' : 'All'}
                </Text>
                {allSelected && <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800' }}>✓</Text>}
              </TouchableOpacity>

              {/* Friend chips */}
              {friends.map((f, i) => {
                const sel = selectedFriendIds.has(f.id);
                const color = FRIEND_COLORS[i % FRIEND_COLORS.length];
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.friendChip,
                      { borderColor: t.divider, backgroundColor: t.bg },
                      sel && { backgroundColor: color + '18', borderColor: color },
                    ]}
                    onPress={() => toggleFriend(f.id)}
                    activeOpacity={0.75}
                  >
                    <Avatar name={f.displayName} uri={f.avatarUrl} size={18} color={color} />
                    <Text style={[styles.chipName, { color: sel ? color : t.subtext }]} numberOfLines={1}>
                      {f.displayName}
                    </Text>
                    {sel && <Text style={{ color, fontSize: 11, fontWeight: '800' }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2 — TIME WINDOW  (FREE FOR EVERYONE)
        ══════════════════════════════════════════════════════════════════════ */}
        <SectionLabel
          icon="🕐"
          title={isThai ? 'ช่วงเวลาที่ต้องการค้นหา' : 'Daily Time Window'}
          badge={{ text: isThai ? 'ฟรี ทุกคน' : 'FREE', color: '#20BF8A' }}
          t={t as ThemeType}
        />

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <Text style={[styles.cardSub, { color: t.subtext }]}>
            {isThai
              ? 'ค้นหาเฉพาะช่วงเวลาที่คุณต้องการในแต่ละวัน'
              : 'Only look for slots within these hours each day'}
          </Text>

          {/* Big time display */}
          <View style={[styles.timeDisplay, { backgroundColor: t.bg, borderColor: t.divider }]}>
            <View style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: t.subtext }]}>
                {isThai ? 'เริ่ม' : 'FROM'}
              </Text>
              <Text style={[styles.timeBig, { color: t.text }]}>{formatHour(windowStart)}</Text>
            </View>

            <View style={styles.timeMiddle}>
              <View style={[styles.timeLine, { backgroundColor: t.accent + '40' }]} />
              <View style={[styles.timeChip, { backgroundColor: t.accent + '20', borderColor: t.accent + '40' }]}>
                <Text style={[styles.timeChipText, { color: t.accent }]}>
                  {windowDuration}h
                </Text>
              </View>
              <View style={[styles.timeLine, { backgroundColor: t.accent + '40' }]} />
            </View>

            <View style={styles.timeBlock}>
              <Text style={[styles.timeLabel, { color: t.subtext }]}>
                {isThai ? 'ถึง' : 'TO'}
              </Text>
              <Text style={[styles.timeBig, { color: t.text }]}>{formatHour(windowEnd)}</Text>
            </View>
          </View>

          {/* Visual bar showing selected window */}
          <View style={[styles.windowBar, { backgroundColor: t.divider }]}>
            <View style={[styles.windowBarFill, {
              backgroundColor: t.accent,
              left: `${(windowStart / 24) * 100}%` as any,
              width: `${(windowDuration / 24) * 100}%` as any,
            }]} />
          </View>
          <View style={styles.windowBarLabels}>
            <Text style={[styles.windowBarLabelText, { color: t.subtext }]}>0:00</Text>
            <Text style={[styles.windowBarLabelText, { color: t.subtext }]}>6:00</Text>
            <Text style={[styles.windowBarLabelText, { color: t.subtext }]}>12:00</Text>
            <Text style={[styles.windowBarLabelText, { color: t.subtext }]}>18:00</Text>
            <Text style={[styles.windowBarLabelText, { color: t.subtext }]}>24:00</Text>
          </View>

          {/* Quick presets */}
          <View style={styles.presetGrid}>
            {WINDOW_PRESETS.map((p, i) => {
              const active = p.start === windowStart && p.end === windowEnd;
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.presetBtn,
                    { borderColor: t.divider, backgroundColor: t.bg },
                    active && { backgroundColor: t.accent + '18', borderColor: t.accent },
                  ]}
                  onPress={() => { setWindowStart(p.start); setWindowEnd(p.end); }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                  <Text style={[styles.presetLabel, { color: active ? t.accent : t.subtext }]}>
                    {isThai ? p.labelTh : p.labelEn}
                  </Text>
                  <Text style={[styles.presetHours, { color: active ? t.accent + 'BB' : t.divider }]}>
                    {p.start}–{p.end}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fine-tune start hour */}
          <View style={[styles.sectionDivider, { backgroundColor: t.divider }]} />
          <Text style={[styles.fineTuneTitle, { color: t.subtext }]}>
            {isThai ? 'ปรับเวลาเริ่มต้น' : 'Fine-tune start'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourRow}
          >
            {HOUR_OPTIONS.filter(h => h < windowEnd).map(h => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.hourChip,
                  { borderColor: t.divider, backgroundColor: t.bg },
                  windowStart === h && { backgroundColor: t.accent, borderColor: t.accent },
                ]}
                onPress={() => setWindowStart(h)}
                activeOpacity={0.75}
              >
                <Text style={[styles.hourChipText, { color: windowStart === h ? '#fff' : t.subtext }]}>
                  {formatHour(h)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Fine-tune end hour */}
          <Text style={[styles.fineTuneTitle, { color: t.subtext, marginTop: SPACING.sm }]}>
            {isThai ? 'ปรับเวลาสิ้นสุด' : 'Fine-tune end'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hourRow}
          >
            {HOUR_OPTIONS.filter(h => h > windowStart).map(h => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.hourChip,
                  { borderColor: t.divider, backgroundColor: t.bg },
                  windowEnd === h && { backgroundColor: t.accent, borderColor: t.accent },
                ]}
                onPress={() => setWindowEnd(h)}
                activeOpacity={0.75}
              >
                <Text style={[styles.hourChipText, { color: windowEnd === h ? '#fff' : t.subtext }]}>
                  {formatHour(h)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3 — SEARCH SETTINGS
        ══════════════════════════════════════════════════════════════════════ */}
        <SectionLabel
          icon="⚙️"
          title={isThai ? 'ตั้งค่าการค้นหา' : 'Search Settings'}
          t={t as ThemeType}
        />

        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          {/* ── Date range (7d free, 14d/30d Pro) ── */}
          <View style={styles.optionBlock}>
            <View style={styles.optionTitleRow}>
              <Text style={[styles.optionTitle, { color: t.subtext }]}>
                {isThai ? 'ช่วงวันที่ค้นหา' : 'DATE RANGE'}
              </Text>
              <View style={[styles.freeMini, { backgroundColor: '#20BF8A15', borderColor: '#20BF8A40' }]}>
                <Text style={[styles.freeMiniText, { color: '#20BF8A' }]}>
                  {isThai ? '7 วัน ฟรี' : '7-day free'}
                </Text>
              </View>
            </View>
            <View style={styles.segRow}>
              {DAY_OPTIONS.map((d) => {
                const locked = d > 7 && !isPro;
                const active = days === d && !locked;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.seg,
                      { borderColor: t.divider, backgroundColor: t.bg },
                      active && { backgroundColor: t.accent, borderColor: t.accent },
                      locked && { opacity: 0.42 },
                    ]}
                    onPress={() => { if (locked) { router.push('/pro-upgrade'); return; } setDays(d); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.segText, { color: active ? '#fff' : locked ? t.subtext : t.text }]}>
                      {locked ? '🔒 ' : ''}{isThai ? `${d} วัน` : `${d}d`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionDivider, { backgroundColor: t.divider }]} />

          {/* ── Min Duration — ALL PRO ── */}
          <View style={styles.optionBlock}>
            <View style={styles.optionTitleRow}>
              <Text style={[styles.optionTitle, { color: t.subtext }]}>
                {isThai ? 'ว่างตรงกันขั้นต่ำ' : 'MIN OVERLAP'}
              </Text>
              <TouchableOpacity
                style={[styles.proMini, { backgroundColor: '#FFD70015', borderColor: '#FFD70050' }]}
                onPress={() => !isPro && router.push('/pro-upgrade')}
                activeOpacity={0.8}
              >
                <Text style={[styles.proMiniText, { color: '#FFD700' }]}>⚡ PRO</Text>
              </TouchableOpacity>
            </View>

            {!isPro ? (
              /* ── Pro gate card ── */
              <TouchableOpacity
                style={[styles.proGate, { backgroundColor: t.bg, borderColor: '#FFD70028' }]}
                onPress={() => router.push('/pro-upgrade')}
                activeOpacity={0.85}
              >
                <View style={[styles.proGateLeft, { backgroundColor: '#FFD70015', borderColor: '#FFD70030' }]}>
                  <Text style={styles.proGateIcon}>⏱</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.proGateTitle, { color: t.text }]}>
                    {isThai ? 'กำหนดเวลาขั้นต่ำเอง' : 'Custom minimum duration'}
                  </Text>
                  <Text style={[styles.proGateSub, { color: t.subtext }]}>
                    {isThai
                      ? 'ปัจจุบัน: ค้นหาช่วงขั้นต่ำ 1 ชม.'
                      : 'Currently searching 1h minimum slots'}
                  </Text>
                </View>
                <View style={[styles.proGateBtn, { backgroundColor: '#FFD700' }]}>
                  <Text style={styles.proGateBtnText}>
                    {isThai ? 'Pro' : 'Pro'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              /* ── Pro duration selector ── */
              <View style={styles.segRow}>
                {DURATION_OPTIONS.map((opt) => {
                  const active = minDuration === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.seg,
                        { borderColor: t.divider, backgroundColor: t.bg },
                        active && { backgroundColor: t.accent, borderColor: t.accent },
                      ]}
                      onPress={() => setMinDuration(opt.value)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.segText, { color: active ? '#fff' : t.text }]}>
                        {isThai ? opt.labelTh : opt.labelEn}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* ── Find Button ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.findBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
          onPress={findFreeSlots}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.findBtnInner}>
              <Text style={styles.findBtnIcon}>🔍</Text>
              <View>
                <Text style={styles.findBtnText}>
                  {isThai ? 'หาเวลาว่าง' : 'Find Free Slots'}
                </Text>
                <Text style={styles.findBtnSub}>
                  {isThai
                    ? `${days} วัน · ${formatHour(windowStart)}–${formatHour(windowEnd)}`
                    : `${days} days · ${formatHour(windowStart)}–${formatHour(windowEnd)}`}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Results ─────────────────────────────────────────────────────────── */}
        {searched && (
          <View style={styles.results}>

            {/* Results header */}
            <View style={styles.resultsHeaderRow}>
              <Text style={[styles.resultsTitle, { color: t.text }]}>
                {isThai ? 'ช่วงเวลาว่าง' : 'Available Slots'}
              </Text>
              {!isLoading && slots.length > 0 && (
                <View style={[styles.resultsBadge, { backgroundColor: t.accentSoft }]}>
                  <Text style={[styles.resultsBadgeText, { color: t.accent }]}>
                    {isThai
                      ? `${sortedGroups.length} วัน · ${slots.length} ช่วง`
                      : `${sortedGroups.length}d · ${slots.length} slots`}
                  </Text>
                </View>
              )}
            </View>

            {/* Sort chips */}
            {!isLoading && sortedGroups.length > 1 && (
              <View style={styles.sortRow}>
                <Text style={[styles.sortLabel, { color: t.subtext }]}>
                  {isThai ? 'เรียง:' : 'Sort:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {SORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sortChip,
                        { borderColor: t.divider, backgroundColor: t.bg },
                        sortMode === opt.key && { backgroundColor: t.accent + '18', borderColor: t.accent },
                      ]}
                      onPress={() => setSortMode(opt.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.sortChipText, { color: sortMode === opt.key ? t.accent : t.subtext }]}>
                        {isThai ? opt.labelTh : opt.labelEn}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {isLoading ? (
              <ActivityIndicator color={t.accent} style={{ marginTop: SPACING.xl }} />
            ) : slots.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: t.surface, borderColor: t.divider }]}>
                <Text style={styles.emptyIcon}>😔</Text>
                <Text style={[styles.emptyTitle, { color: t.text }]}>
                  {isThai ? 'ไม่พบช่วงเวลาว่าง' : 'No free slots found'}
                </Text>
                <Text style={[styles.emptySub, { color: t.subtext }]}>
                  {isThai
                    ? 'ลองขยายช่วงวันที่ หรือปรับช่วงเวลา'
                    : 'Try a wider date range or time window'}
                </Text>
              </View>
            ) : (
              sortedGroups.map((group) => {
                const bc = group.allFree ? t.alt : t.warn;
                const overlapLabel = group.minFreeCount === group.totalCount
                  ? (isThai ? '✓ ทุกคนว่าง' : '✓ All free')
                  : (isThai
                      ? `${group.minFreeCount}/${group.totalCount} คน`
                      : `${group.minFreeCount}/${group.totalCount} free`);
                return (
                  <View key={group.dateISO} style={[styles.slotCard, { backgroundColor: t.surface }]}>
                    <View style={[styles.slotStrip, { backgroundColor: bc }]} />
                    <View style={styles.slotBody}>

                      {/* Day header */}
                      <View style={styles.slotTop}>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.slotBadge, { backgroundColor: bc + '28' }]}>
                            <Text style={[styles.slotBadgeText, { color: bc }]}>{overlapLabel}</Text>
                          </View>
                          <Text style={[styles.slotDay, { color: t.text }]}>
                            {formatSlotDate(group.dateISO, isThai)}
                          </Text>
                        </View>
                        <View style={[styles.durBadge, { backgroundColor: t.accentSoft }]}>
                          <Text style={[styles.durBadgeLabel, { color: t.accent }]}>
                            {isThai ? 'รวม' : 'TOTAL'}
                          </Text>
                          <Text style={[styles.durText, { color: t.accent }]}>{group.totalHours}h</Text>
                        </View>
                      </View>

                      <View style={[styles.sectionDivider, { backgroundColor: t.divider }]} />

                      {/* Per-slot rows */}
                      {group.slots.map((slot, si) => (
                        <View key={si} style={styles.slotRow}>
                          <View style={[styles.slotDot, { backgroundColor: bc }]} />
                          <Text style={[styles.slotTime, { color: t.text }]}>
                            {slot.startTime} – {slot.endTime}
                          </Text>
                          <View style={[styles.slotDurChip, { backgroundColor: t.accentSoft }]}>
                            <Text style={[styles.slotDurText, { color: t.accent }]}>
                              {slot.durationHours}h
                            </Text>
                          </View>
                        </View>
                      ))}

                      {/* Avatars */}
                      <View style={styles.avatarRow}>
                        {group.participants.slice(0, 5).map((p, pi) => (
                          <View
                            key={p.id}
                            style={{ marginLeft: pi === 0 ? 0 : -8, zIndex: group.participants.length - pi }}
                          >
                            <Avatar
                              name={p.displayName}
                              uri={p.avatarUrl}
                              size={22}
                              color={FRIEND_COLORS[pi % FRIEND_COLORS.length]}
                            />
                          </View>
                        ))}
                        {group.participants.length > 5 && (
                          <View style={[styles.moreAvatar, { backgroundColor: t.surface, borderColor: t.divider }]}>
                            <Text style={[styles.moreAvatarText, { color: t.subtext }]}>
                              +{group.participants.length - 5}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.avatarLabel, { color: t.subtext }]}>
                          {group.minFreeCount === group.totalCount
                            ? (isThai ? 'ทุกคนว่าง' : 'Everyone free')
                            : (isThai
                                ? `${group.minFreeCount} จาก ${group.totalCount} คน`
                                : `${group.minFreeCount} of ${group.totalCount} free`)}
                        </Text>
                      </View>

                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.sm,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  sub: { fontSize: 13, marginTop: 3 },
  headerIcon: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  // Card shell
  card: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, lineHeight: 17 },
  peopleSummary: { fontSize: 12, fontWeight: '700' },

  // People
  addFriendRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1.5, padding: SPACING.sm + 2,
  },
  addFriendText: { flex: 1, fontSize: 13, fontWeight: '600' },
  friendChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  friendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1.5,
  },
  chipName: { fontSize: 12, fontWeight: '600', maxWidth: 80 },

  // Time window — big display
  timeDisplay: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.lg, borderWidth: 1,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    marginTop: 2,
  },
  timeBlock: { flex: 1, alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  timeBig: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  timeMiddle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  timeLine: { flex: 1, height: 1.5 },
  timeChip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  timeChipText: { fontSize: 12, fontWeight: '800' },

  // Visual window bar
  windowBar: {
    height: 6, borderRadius: 3, overflow: 'hidden',
    marginTop: 2, position: 'relative',
  },
  windowBarFill: {
    position: 'absolute', height: '100%', borderRadius: 3,
  },
  windowBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 3,
  },
  windowBarLabelText: { fontSize: 9, fontWeight: '600' },

  // Presets
  presetGrid: { flexDirection: 'row', gap: 6 },
  presetBtn: {
    flex: 1, alignItems: 'center', gap: 3,
    borderRadius: RADIUS.lg, borderWidth: 1.5, paddingVertical: 10,
  },
  presetLabel: { fontSize: 11, fontWeight: '700' },
  presetHours: { fontSize: 9, fontWeight: '600' },

  // Hour chips
  hourRow: { gap: 6, paddingBottom: 2 },
  hourChip: {
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: RADIUS.md, borderWidth: 1.5,
  },
  hourChipText: { fontSize: 12, fontWeight: '700' },
  fineTuneTitle: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6,
  },

  // Section divider
  sectionDivider: { height: 1, marginVertical: 2 },

  // Settings card
  optionBlock: { gap: SPACING.sm },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  freeMini: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  freeMiniText: { fontSize: 10, fontWeight: '800' },
  proMini: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  proMiniText: { fontSize: 10, fontWeight: '800' },
  segRow: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1.5 },
  segText: { fontSize: 12, fontWeight: '700' },

  // Pro gate
  proGate: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, borderWidth: 1.5, padding: SPACING.sm,
  },
  proGateLeft: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  proGateIcon: { fontSize: 20 },
  proGateTitle: { fontSize: 13, fontWeight: '700' },
  proGateSub: { fontSize: 11, marginTop: 1 },
  proGateBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  proGateBtnText: {
    color: '#000', fontSize: 12, fontWeight: '800', letterSpacing: 0.3,
  },

  // Find button
  findBtn: {
    marginHorizontal: SPACING.lg, marginBottom: SPACING.lg,
    borderRadius: RADIUS.xl, paddingVertical: 17, alignItems: 'center',
    shadowOpacity: 0.35, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 10,
  },
  findBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  findBtnIcon: { fontSize: 20 },
  findBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  findBtnSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },

  // Results
  results: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  resultsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  resultsTitle: { fontSize: 17, fontWeight: '700' },
  resultsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  resultsBadgeText: { fontSize: 12, fontWeight: '700' },

  sortRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  sortLabel: { fontSize: 12, fontWeight: '600', flexShrink: 0 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  sortChipText: { fontSize: 11, fontWeight: '700' },

  emptyState: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', gap: SPACING.sm, borderWidth: 1,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Slot cards
  slotCard: {
    borderRadius: RADIUS.lg, overflow: 'hidden', flexDirection: 'row',
    marginBottom: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
  },
  slotStrip: { width: 5 },
  slotBody: { flex: 1, padding: SPACING.md, gap: SPACING.sm },
  slotTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  slotBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, alignSelf: 'flex-start', marginBottom: 5 },
  slotBadgeText: { fontSize: 10, fontWeight: '800' },
  slotDay: { fontSize: 14, fontWeight: '700' },
  durBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, alignItems: 'center', gap: 2 },
  durBadgeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  durText: { fontSize: 14, fontWeight: '800' },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  slotDot: { width: 7, height: 7, borderRadius: 3.5 },
  slotTime: { flex: 1, fontSize: 13, fontWeight: '600' },
  slotDurChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
  slotDurText: { fontSize: 11, fontWeight: '700' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarLabel: { fontSize: 12, marginLeft: 4 },
  moreAvatar: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginLeft: -8,
  },
  moreAvatarText: { fontSize: 8, fontWeight: '700' },
});
