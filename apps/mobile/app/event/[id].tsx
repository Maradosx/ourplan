import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useThemeStore } from '../../store/themeStore';
import { useScheduleStore, Schedule } from '../../store/scheduleStore';
import { useLanguageStore } from '../../store/languageStore';
import { CATEGORY_COLORS, RADIUS, SPACING } from '../../constants/theme';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { formatTime } from '../../lib/dateUtils';
import { api } from '../../lib/api';

const CATEGORY_ICONS: Record<string, string> = {
  Work: '💼', Health: '🏃', Errand: '🛒', Social: '🎉', Travel: '✈️', Other: '📌',
};

function getVisibilityLabels(isThai: boolean) {
  return {
    private: { icon: '🔒', label: isThai ? 'เฉพาะฉัน' : 'Only me' },
    friends: { icon: '👥', label: isThai ? 'เพื่อน' : 'Friends' },
    public:  { icon: '🌐', label: isThai ? 'ทุกคน' : 'Everyone' },
  };
}

function getDurationLabel(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalMins = Math.round(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t } = useThemeStore();
  const { deleteSchedule } = useScheduleStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';
  const [event, setEvent] = useState<Schedule | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    api.get(`/schedules/${id}`)
      .then(({ data }) => setEvent(data))
      .catch(() => setEvent(null))
      .finally(() => setIsFetching(false));
  }, [id]);

  if (isFetching) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.center}><ActivityIndicator color={t.accent} /></View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: t.subtext }]}>{isThai ? 'ไม่พบกิจกรรม' : 'Event not found'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Go back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const catColor = CATEGORY_COLORS[event.category];
  const VISIBILITY_LABELS = getVisibilityLabels(isThai);
  const vis = VISIBILITY_LABELS[event.visibility] ?? VISIBILITY_LABELS.private;
  const duration = getDurationLabel(event.startDatetime, event.endDatetime);
  const date = new Date(event.startDatetime).toLocaleDateString(isThai ? 'th-TH' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleDelete = () => {
    Alert.alert(
      isThai ? 'ลบกิจกรรม' : 'Delete Event',
      isThai ? `ลบ "${event.title}" ใช่ไหม?` : `Delete "${event.title}"?`,
      [
      { text: isThai ? 'ยกเลิก' : 'Cancel', style: 'cancel' },
      {
        text: isThai ? 'ลบ' : 'Delete', style: 'destructive', onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteSchedule(event.id);
            router.back();
          } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Could not delete event';
            Alert.alert('Error', String(msg));
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.backBtn, { color: t.accent }]}>← {isThai ? 'กลับ' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>{isThai ? 'รายละเอียด' : 'Event Detail'}</Text>
        <TouchableOpacity onPress={handleDelete} disabled={isDeleting} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {isDeleting
            ? <ActivityIndicator size="small" color={t.danger} />
            : <Text style={[styles.deleteBtn, { color: t.danger }]}>{isThai ? 'ลบ' : 'Delete'}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Hero card */}
        <View style={[styles.heroStrip, { backgroundColor: catColor + '18', borderColor: catColor + '30' }]}>
          {/* Decorative circles */}
          <View style={[styles.heroBubble, { width: 120, height: 120, borderRadius: 60, backgroundColor: catColor + '12', top: -30, right: -20 }]} />
          <View style={[styles.heroBubble, { width: 70, height: 70, borderRadius: 35, backgroundColor: catColor + '10', bottom: -20, right: 60 }]} />
          {/* Category icon big (or custom sticker icon) */}
          <Text style={styles.heroBigIcon}>{event.icon ?? CATEGORY_ICONS[event.category]}</Text>
          {/* Badge row */}
          <View style={styles.heroBadgeWrap}>
            <View style={[styles.heroCatPill, { backgroundColor: catColor + '25', borderColor: catColor + '50' }]}>
              <View style={[styles.heroCatDot, { backgroundColor: catColor }]} />
              <Text style={[styles.heroCatLabel, { color: catColor }]}>{event.category}</Text>
            </View>
            <View style={[styles.durationBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.durationText, { color: catColor }]}>⏱ {duration}</Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: t.text }]}>{event.title}</Text>
          <Text style={[styles.heroDate, { color: catColor }]}>{date}</Text>
        </View>

        {/* Time card */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: t.subtext }]}>{isThai ? 'วันที่' : 'Date'}</Text>
              <Text style={[styles.infoValue, { color: t.text }]}>{date}</Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: t.divider }]} />
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>⏰</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: t.subtext }]}>{isThai ? 'เวลา' : 'Time'}</Text>
              <Text style={[styles.infoValue, { color: t.text }]}>
                {formatTime(event.startDatetime)} – {formatTime(event.endDatetime)}
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        {event.location ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: t.subtext }]}>{isThai ? 'สถานที่' : 'Location'}</Text>
                <Text style={[styles.infoValue, { color: t.text }]}>{event.location}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Notes */}
        {event.description ? (
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📝</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: t.subtext }]}>{isThai ? 'บันทึก' : 'Notes'}</Text>
                <Text style={[styles.infoValue, { color: t.text }]}>{event.description}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Visibility */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.divider }]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>{vis.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: t.subtext }]}>{isThai ? 'การมองเห็น' : 'Visibility'}</Text>
              <Text style={[styles.infoValue, { color: t.text }]}>{vis.label}</Text>
            </View>
          </View>
        </View>

        {/* Edit button */}
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: catColor }]}
          onPress={() => router.push({ pathname: '/event/edit/[id]', params: { id: event.id } })}
          activeOpacity={0.85}
        >
          <Text style={styles.editBtnText}>{isThai ? 'แก้ไขกิจกรรม' : 'Edit Event'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16 },
  backLink: { fontSize: 15, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1,
  },
  backBtn: { fontSize: 15, fontWeight: '600', minWidth: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  deleteBtn: { fontSize: 14, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  body: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: 60 },
  heroStrip: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.sm,
    borderWidth: 1, overflow: 'hidden', position: 'relative',
  },
  heroBubble: { position: 'absolute' },
  heroBigIcon: { fontSize: 52, marginBottom: 4 },
  heroBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  heroCatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  heroCatDot: { width: 8, height: 8, borderRadius: 4 },
  heroCatLabel: { fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '800', lineHeight: 30, letterSpacing: -0.4 },
  heroDate: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
  card: { borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  infoIcon: { fontSize: 20, marginTop: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500', lineHeight: 20 },
  divider: { height: 1 },
  durationBadge: { borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'center' },
  durationText: { fontSize: 12, fontWeight: '700' },
  editBtn: {
    marginTop: SPACING.sm, borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 5,
  },
  editBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
