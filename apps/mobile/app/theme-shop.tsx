import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { THEMES, ThemeId, RADIUS, SPACING } from '../constants/theme';

// Thai descriptions for each theme
const THEME_DESC_TH: Record<string, string> = {
  midnight:   'ท้องฟ้าสีม่วงเข้ม คลาสสิกและสง่างาม',
  daylight:   'สดใสและสะอาด เหมาะกับการทำงาน',
  blossom:    'กลีบดอกไม้สีชมพูอ่อน หวานและเรียบง่าย',
  matchaBear: 'บรรยากาศคาเฟ่ญี่ปุ่น โทนสีเขียวป่าอบอุ่น',
  sakuraNight:'ดอกซากุระใต้แสงดาว สไตล์คาวาอี้ญี่ปุ่น',
  oceanBuddy: 'แสงกลางมหาสมุทรลึก สงบและเปล่งประกาย',
  candyPop:   'พลังงานรุ้งหวานแสบ สนุกและสดใส',
  neonGalaxy: 'จักรวาลไซเบอร์พังก์ นีออนสะดุดตาบนพื้นดำ',
};

const { width } = Dimensions.get('window');
const FREE_W = (width - SPACING.md * 2 - SPACING.md) / 2;
const PREM_W = width - SPACING.md * 2;

const ALL_IDS = Object.keys(THEMES) as ThemeId[];

export default function ThemeShopScreen() {
  const { theme: t, themeId, setTheme, isUnlocked, purchaseTheme, restoreThemes } = useThemeStore();
  const { lang } = useLanguageStore();
  const isThai = lang === 'th';
  const [loading, setLoading] = useState<ThemeId | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function handleSelect(id: ThemeId) {
    if (isUnlocked(id)) {
      await setTheme(id);
      return;
    }
    const th = THEMES[id];
    const desc = isThai ? THEME_DESC_TH[id] ?? th.description : th.description;
    Alert.alert(
      `${th.mascot} ${th.label}`,
      `${desc}\n\n${isThai ? `ปลดล็อคในราคา ฿${th.price}?` : `Unlock for ฿${th.price}?`}`,
      [
        { text: isThai ? 'ไว้ทีหลัง' : 'Maybe later', style: 'cancel' },
        {
          text: `${isThai ? 'ซื้อ' : 'Buy'} ฿${th.price}`,
          onPress: async () => {
            setLoading(id);
            try {
              await purchaseTheme(id);
              await setTheme(id);
              Alert.alert(
                isThai ? 'ปลดล็อคแล้ว! 🎉' : 'Unlocked! 🎉',
                isThai ? `${th.mascot} ${th.label} เป็นของคุณแล้ว!` : `${th.mascot} ${th.label} is yours!`,
              );
            } catch (e: any) {
              if (!e?.message?.includes('cancelled') && !e?.message?.includes('cancel')) {
                Alert.alert(
                  isThai ? 'การซื้อล้มเหลว' : 'Purchase failed',
                  e?.message ?? (isThai ? 'กรุณาลองใหม่อีกครั้ง' : 'Please try again.'),
                );
              }
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const restored = await restoreThemes();
      if (restored.length > 0) {
        Alert.alert(
          'Restored! ✅',
          isThai
            ? `กู้คืนสำเร็จ ${restored.length} ธีม`
            : `Restored ${restored.length} theme${restored.length > 1 ? 's' : ''}.`,
        );
      } else {
        Alert.alert(
          isThai ? 'ไม่มีอะไรคืนค่า' : 'Nothing to restore',
          isThai ? 'ไม่พบการซื้อก่อนหน้านี้' : 'No previous purchases found.',
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? (isThai ? 'ไม่สามารถกู้คืนการซื้อได้' : 'Could not restore purchases.'));
    } finally {
      setRestoring(false);
    }
  }

  const free = ALL_IDS.filter(id => !THEMES[id].premium);
  const premium = ALL_IDS.filter(id => THEMES[id].premium);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.bg }]}>
      <View style={[s.header, { borderBottomColor: t.divider }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Text style={[s.back, { color: t.accent }]}>{isThai ? '← กลับ' : '← Back'}</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: t.text }]}>{isThai ? 'ธีม' : 'Themes'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: t.accentSoft }]}>
          <Text style={s.heroEmoji}>🎨</Text>
          <Text style={[s.heroTitle, { color: t.text }]}>{isThai ? 'ปรับแต่งเป็นของคุณ' : 'Make it yours'}</Text>
          <Text style={[s.heroSub, { color: t.subtext }]}>{isThai ? 'แต่ละธีมมีโลกของตัวเอง' : 'Each theme has its own world'}</Text>
        </View>

        {/* Free */}
        <Text style={[s.sectionLabel, { color: t.subtext }]}>{isThai ? 'ฟรี' : 'FREE'}</Text>
        <View style={s.freeRow}>
          {free.filter(id => id !== 'blossom').map(id => (
            <FreeCard key={id} id={id} active={themeId === id} isThai={isThai} onPress={() => handleSelect(id)} />
          ))}
        </View>

        {/* Blossom — featured free teaser */}
        <BlossomTeaser active={themeId === 'blossom'} isThai={isThai} onPress={() => handleSelect('blossom')} />

        {/* Premium */}
        <View style={s.premHeader}>
          <Text style={[s.sectionLabel, { color: t.subtext, marginHorizontal: 0 }]}>{isThai ? 'พรีเมียม' : 'PREMIUM'}</Text>
          <View style={[s.goldTag, { backgroundColor: '#FFD700' }]}>
            <Text style={s.goldTagText}>{isThai ? '฿49 · ตลอดชีพ' : '฿49 · Lifetime'}</Text>
          </View>
        </View>

        {premium.map((id, i) => (
          <PremiumCard
            key={id} id={id}
            active={themeId === id}
            unlocked={isUnlocked(id)}
            onPress={() => handleSelect(id)}
            loading={loading === id}
            isThai={isThai}
            highlight={
              i === 0 ? (isThai ? '🔥 ยอดนิยม' : '🔥 Most Popular') :
              i === 2 ? (isThai ? '⭐ แนะนำโดยทีม' : '⭐ Staff Pick') : undefined
            }
          />
        ))}

        <Text style={[s.footNote, { color: t.subtext }]}>
          {isThai ? 'ซื้อครั้งเดียว · เป็นของคุณตลอดไป' : 'One-time purchase · Yours forever'}
        </Text>

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={s.restoreBtn} activeOpacity={0.7}>
          {restoring
            ? <ActivityIndicator size="small" color={t.subtext} />
            : <Text style={[s.restoreText, { color: t.subtext }]}>{isThai ? 'กู้คืนการซื้อ' : 'Restore Purchases'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Free Card ────────────────────────────────────────────────────────────────

function FreeCard({ id, active, isThai, onPress }: { id: ThemeId; active: boolean; isThai: boolean; onPress: () => void }) {
  const th = THEMES[id];
  return (
    <TouchableOpacity
      style={[s.freeCard, { backgroundColor: th.bg, borderColor: active ? th.accent : 'transparent' }]}
      onPress={onPress} activeOpacity={0.85}
    >
      <View style={[s.freePrev, { backgroundColor: th.surface }]}>
        <View style={[s.freeBar, { backgroundColor: th.bg }]}>
          <View style={[s.freeDot, { backgroundColor: th.accent }]} />
          <View style={[s.freeLine, { backgroundColor: th.text + '50', width: 32 }]} />
        </View>
        {[th.accent, th.alt].map((c, i) => (
          <View key={i} style={[s.freeItem, { backgroundColor: th.card }]}>
            <View style={[s.freeItemBar, { backgroundColor: c }]} />
            <View style={[s.freeLine, { backgroundColor: th.text + '60', width: 36, marginTop: 2 }]} />
          </View>
        ))}
        <Text style={s.freeMascotSmall}>{th.mascot}</Text>
      </View>
      {active && <View style={[s.freeCheck, { backgroundColor: th.accent }]}><Text style={s.freeCheckTxt}>✓</Text></View>}
      <View style={[s.freeFooter, { backgroundColor: th.surface }]}>
        <Text style={[s.freeLabel, { color: th.text }]}>{th.label}</Text>
        <Text style={[s.freeTag, { color: active ? th.accent : th.subtext }]}>
          {active ? (isThai ? 'ใช้งานอยู่' : 'Active') : (isThai ? 'ฟรี' : 'Free')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Premium Card ─────────────────────────────────────────────────────────────

interface PCardProps { id: ThemeId; active: boolean; unlocked: boolean; onPress: ()=>void; loading: boolean; highlight?: string; isThai: boolean }

function PremiumCard({ id, active, unlocked, onPress, loading, highlight, isThai }: PCardProps) {
  const th = THEMES[id];
  const Illustration = ILLUSTRATIONS[id];
  const thTyped = th as Theme;
  const desc = isThai ? THEME_DESC_TH[id] ?? thTyped.description : thTyped.description;

  return (
    <View style={[s.premCard, { backgroundColor: th.bg, borderColor: active ? th.accent : th.accent + '50' },
      active && { shadowColor: th.accent, shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width:0,height:0 }, elevation: 16 },
    ]}>
      {/* Illustration panel */}
      <View style={[s.illPanel, { backgroundColor: th.bg }]}>
        <Illustration th={thTyped} />
        {/* Badges */}
        <View style={s.badgeRow}>
          {highlight && <View style={[s.hlBadge, { backgroundColor: th.accent }]}><Text style={s.hlBadgeTxt}>{highlight}</Text></View>}
          <View style={[s.premBadge, { borderColor: '#FFD700' }]}><Text style={s.premBadgeTxt}>✨ {isThai ? 'พรีเมียม' : 'PREMIUM'}</Text></View>
        </View>
        {active && <View style={[s.activePill, { backgroundColor: th.accent }]}><Text style={s.activePillTxt}>✓ {isThai ? 'ใช้งานอยู่' : 'Active'}</Text></View>}
      </View>

      {/* Info row */}
      <View style={[s.premInfo, { backgroundColor: th.surface }]}>
        <Text style={[s.premMascot]}>{th.mascot}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.premName, { color: th.text }]}>{th.label}</Text>
          <Text style={[s.premDesc, { color: th.subtext }]} numberOfLines={1}>{desc}</Text>
        </View>
        <View style={s.premPalette}>
          {[th.accent, th.alt, th.surface, th.card].map((c, i) => (
            <View key={i} style={[s.palDot, { backgroundColor: c, borderColor: th.divider }]} />
          ))}
        </View>
      </View>

      {/* Action */}
      <View style={[s.premAction, { backgroundColor: th.surface, borderTopColor: th.divider }]}>
        {loading ? (
          <View style={[s.actionBtn, { backgroundColor: th.accent + '70' }]}>
            <Text style={s.actionBtnTxt}>{isThai ? 'กำลังปลดล็อค...' : 'Unlocking...'}</Text>
          </View>
        ) : unlocked ? (
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: active ? th.accent : th.accentSoft }]} onPress={onPress}>
            <Text style={[s.actionBtnTxt, !active && { color: th.accent }]}>
              {active ? `✓ ${isThai ? 'ธีมที่ใช้อยู่' : 'Currently Active'}` : (isThai ? 'ใช้ธีมนี้' : 'Apply This Theme')}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={s.buyRow}>
            <View>
              <Text style={[s.buyLabel, { color: th.subtext }]}>{isThai ? 'ปลดล็อคครั้งเดียว' : 'One-time unlock'}</Text>
              <Text style={[s.buyPrice, { color: th.text }]}>฿49</Text>
            </View>
            <TouchableOpacity style={[s.buyBtn, { backgroundColor: th.accent }]} onPress={onPress} activeOpacity={0.85}>
              <Text style={s.buyBtnTxt}>{isThai ? 'ซื้อเลย →' : 'Buy Now →'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Blossom Teaser Card ──────────────────────────────────────────────────────

function BlossomTeaser({ active, isThai, onPress }: { active: boolean; isThai: boolean; onPress: () => void }) {
  const th = THEMES['blossom' as ThemeId];
  return (
    <TouchableOpacity
      style={[s.blossomCard, { backgroundColor: th.bg, borderColor: active ? th.accent : th.accent + '60' },
        active && { shadowColor: th.accent, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
      ]}
      onPress={onPress} activeOpacity={0.88}
    >
      {/* Illustration */}
      <View style={[s.blossomIll, { backgroundColor: th.bg }]}>
        {/* Soft glow circles */}
        <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: th.accent + '18', top: -60, right: -30 }} />
        <View style={{ position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: th.alt + '15', top: -20, left: -20 }} />
        {/* Petal rain */}
        {['🌸','🌸','🌸','🌸','🌸','🌸','🌸','🌸','🌸','🌸'].map((e, i) => (
          <Text key={i} style={{
            position: 'absolute',
            fontSize: [22, 16, 26, 14, 20, 18, 24, 13, 19, 15][i],
            top: [10, 25, 5, 40, 15, 35, 2, 45, 20, 50][i],
            left: [10, 45, 80, 20, 115, 155, 200, 90, 240, 175][i],
            opacity: [0.9, 0.7, 1, 0.6, 0.85, 0.75, 0.95, 0.5, 0.8, 0.65][i],
          }}>{e}</Text>
        ))}
        {/* Stars */}
        {['✦', '✧', '✦', '✧', '✦'].map((st, i) => (
          <Text key={i} style={{ position: 'absolute', fontSize: [9, 7, 8, 6, 10][i], color: th.accent, top: [8, 32, 16, 44, 5][i], left: [60, 130, 190, 70, 140][i], opacity: 0.8 }}>{st}</Text>
        ))}
        {/* Branch + bunny mascot */}
        <Text style={{ position: 'absolute', bottom: 8, left: 14, fontSize: 52 }}>🌷</Text>
        <Text style={{ position: 'absolute', bottom: 10, left: 72, fontSize: 40 }}>🐰</Text>
        <Text style={{ position: 'absolute', bottom: 14, left: 124, fontSize: 28 }}>🌸</Text>
        {/* "FREE" teaser badge */}
        <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: th.accent + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: th.accent + '60' }}>
          <Text style={{ color: th.accent, fontSize: 11, fontWeight: '800' }}>🌷 {isThai ? 'ฟรี พิเศษสุด' : 'FREE EXCLUSIVE'}</Text>
        </View>
        {/* Teaser hint */}
        <View style={{ position: 'absolute', bottom: 10, right: 14 }}>
          <Text style={{ color: th.accent + 'CC', fontSize: 10, fontWeight: '700', fontStyle: 'italic', textAlign: 'right' }}>{isThai ? 'ซากุระบานสะพรั่ง' : 'spring in full bloom'}</Text>
          <Text style={{ color: th.subtext, fontSize: 9, textAlign: 'right', marginTop: 1 }}>{isThai ? 'ธีมฟรีที่มีเสน่ห์ที่สุด ✨' : 'the only free theme with magic ✨'}</Text>
        </View>
        {active && <View style={[s.activePill, { backgroundColor: th.accent, bottom: 10, left: '50%', transform: [{ translateX: -30 }] }]}><Text style={s.activePillTxt}>✓ {isThai ? 'ใช้งานอยู่' : 'Active'}</Text></View>}
      </View>

      {/* Footer */}
      <View style={[s.blossomFooter, { backgroundColor: th.surface }]}>
        <Text style={{ fontSize: 28, marginRight: 8 }}>🌷</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.premName, { color: th.text, fontSize: 16 }]}>{th.label}</Text>
          <Text style={[s.premDesc, { color: th.subtext }]}>{th.description}</Text>
        </View>
        <View style={[s.blossomTag, { borderColor: th.accent + '80' }]}>
          <Text style={{ color: th.accent, fontSize: 12, fontWeight: '800' }}>
            {active ? `✓ ${isThai ? 'ใช้งานอยู่' : 'Active'}` : (isThai ? 'ฟรี' : 'Free')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Illustrations ────────────────────────────────────────────────────────────

import type { Theme } from '../constants/theme';
type IllProps = { th: Theme };

function MatchaBearIll({ th }: IllProps) {
  return (
    <View style={il.root}>
      {/* Background forest circles */}
      <View style={[il.circle, { width:200, height:200, borderRadius:100, backgroundColor: th.accent+'15', top:-60, right:-40 }]} />
      <View style={[il.circle, { width:120, height:120, borderRadius:60, backgroundColor: th.alt+'10', bottom:-20, left:-30 }]} />
      {/* Steam lines */}
      <View style={il.steamRow}>
        {['∿','∿∿','∿'].map((s,i)=>(
          <Text key={i} style={[il.steam, { color: th.accent+'60', fontSize: 10+i*2 }]}>{s}</Text>
        ))}
      </View>
      {/* Matcha cup */}
      <View style={[il.cup, { backgroundColor: th.card, borderColor: th.accent }]}>
        <View style={[il.cupLiquid, { backgroundColor: th.accent }]} />
        <Text style={il.cupLeaf}>🍃</Text>
      </View>
      {/* Big bear */}
      <Text style={[il.bigEmoji, { bottom: 16, left: 20 }]}>🐻</Text>
      {/* Scatter leaves */}
      {['🌿','🍃','🌱','🍵'].map((e, i) => (
        <Text key={i} style={[il.scatter, { top: [20,50,30,55][i], right: [20,60,110,80][i], fontSize: [18,14,16,20][i], opacity: 0.8 }]}>{e}</Text>
      ))}
      {/* Label */}
      <Text style={[il.tagline, { color: th.accent, right: 16, bottom: 20 }]}>cozy café vibes</Text>
    </View>
  );
}

function SakuraNightIll({ th }: IllProps) {
  return (
    <View style={[il.root, { backgroundColor: th.bg }]}>
      {/* Moon glow */}
      <View style={[il.circle, { width:90, height:90, borderRadius:45, backgroundColor: th.accent+'20', top:10, right:20 }]} />
      <View style={[il.circle, { width:60, height:60, borderRadius:30, backgroundColor: '#FFE88050', top:22, right:32 }]} />
      <Text style={[il.scatter, { top:15, right:30, fontSize:36 }]}>🌕</Text>
      {/* Petals scattered */}
      {['🌸','🌸','🌸','🌸','🌸','🌸','🌸'].map((e,i)=>(
        <Text key={i} style={[il.scatter, {
          top: [15,35,55,20,65,45,10][i], left: [10,30,60,80,20,110,140][i],
          fontSize: [20,14,18,12,16,22,13][i], opacity:[0.9,0.6,0.8,0.5,0.7,1,0.4][i],
        }]}>{e}</Text>
      ))}
      {/* Stars */}
      {['✦','✧','✦','✧','✦'].map((star,i)=>(
        <Text key={i} style={[il.scatter, { color: '#FFD700', fontSize:[8,6,10,7,9][i], top:[8,60,25,70,50][i], left:[50,15,100,140,160][i] }]}>{star}</Text>
      ))}
      {/* Main girl */}
      <Text style={[il.bigEmoji, { bottom:12, left:14, fontSize:56 }]}>🧚</Text>
      <Text style={[il.tagline, { color: th.accent, right:16, bottom:18 }]}>kawaii night sky</Text>
    </View>
  );
}

function OceanBuddyIll({ th }: IllProps) {
  return (
    <View style={[il.root, { backgroundColor: th.bg }]}>
      {/* Deep water glow */}
      <View style={[il.circle, { width:220, height:220, borderRadius:110, backgroundColor: th.accent+'12', bottom:-80, left:-40 }]} />
      <View style={[il.circle, { width:100, height:100, borderRadius:50, backgroundColor: th.alt+'15', top:10, right:10 }]} />
      {/* Bubbles */}
      {[20,28,16,22,18,12,24].map((sz,i)=>(
        <View key={i} style={[il.bubble, { width:sz, height:sz, borderRadius:sz/2, borderColor: th.accent+'60',
          top:[10,30,50,20,60,40,15][i], left:[20,60,100,140,30,110,160][i] }]} />
      ))}
      {/* Sea creatures */}
      <Text style={[il.bigEmoji, { bottom:14, left:16, fontSize:58 }]}>🐬</Text>
      {['🐠','🐡','🦑','🌊'].map((e,i)=>(
        <Text key={i} style={[il.scatter, { fontSize:[20,16,18,24][i], top:[20,50,30,60][i], right:[16,60,30,90][i], opacity:0.85 }]}>{e}</Text>
      ))}
      {/* Seaweed bottom */}
      <Text style={[il.scatter, { bottom:8, right:20, fontSize:28 }]}>🌿</Text>
      <Text style={[il.tagline, { color: th.accent, right:16, bottom:18 }]}>deep sea vibes</Text>
    </View>
  );
}

function CandyPopIll({ th }: IllProps) {
  return (
    <View style={[il.root, { backgroundColor: th.bg }]}>
      {/* Rainbow arc — colored dots */}
      {['#FF3DA6','#FF8C00','#FFD700','#00CC66','#3DA6FF','#9B4DFF'].map((c,i)=>(
        <View key={i} style={{ position:'absolute', top: 8 + i*7, left: 30 + i*18, width:12, height:12, borderRadius:6, backgroundColor: c, opacity:0.85 }} />
      ))}
      {/* Big candy */}
      <Text style={[il.bigEmoji, { bottom:12, left:14, fontSize:56 }]}>🍭</Text>
      {/* Scattered sweets */}
      {['🍬','🍩','🧁','🍦','⭐','🌈','🎀'].map((e,i)=>(
        <Text key={i} style={[il.scatter, {
          fontSize:[18,16,22,18,14,20,16][i],
          top:[10,40,15,55,30,50,8][i], right:[16,50,100,20,80,130,60][i], opacity:0.9
        }]}>{e}</Text>
      ))}
      {/* Sparkles */}
      {['✨','✨','✨'].map((e,i)=>(
        <Text key={i} style={[il.scatter, { fontSize:14, top:[60,20,45][i], left:[60,140,100][i] }]}>{e}</Text>
      ))}
      <Text style={[il.tagline, { color: th.accent, right:16, bottom:18 }]}>sugar rush energy</Text>
    </View>
  );
}

function NeonGalaxyIll({ th }: IllProps) {
  return (
    <View style={[il.root, { backgroundColor: th.bg }]}>
      {/* Neon grid lines */}
      <View style={[il.neonLine, { backgroundColor: th.accent+'30', top:30, left:0, right:0, height:1 }]} />
      <View style={[il.neonLine, { backgroundColor: th.alt+'30', top:60, left:0, right:0, height:1 }]} />
      <View style={[il.neonLine, { backgroundColor: th.accent+'20', left:60, top:0, bottom:0, width:1 }]} />
      <View style={[il.neonLine, { backgroundColor: th.alt+'20', left:130, top:0, bottom:0, width:1 }]} />
      {/* Stars constellation */}
      {[8,5,7,4,6,9,5].map((sz,i)=>(
        <View key={i} style={{ position:'absolute', width:sz, height:sz, borderRadius:sz/2, backgroundColor: th.accent,
          top:[15,45,25,65,35,10,55][i], left:[40,80,120,50,160,100,20][i], opacity:[1,0.6,0.8,0.5,0.7,0.9,0.4][i] }} />
      ))}
      {/* Neon lightning */}
      <Text style={[il.bigEmoji, { bottom:12, left:14, fontSize:58 }]}>⚡</Text>
      {['🌌','🛸','💫','🔮'].map((e,i)=>(
        <Text key={i} style={[il.scatter, { fontSize:[22,18,16,20][i], top:[10,45,25,60][i], right:[14,55,100,30][i] }]}>{e}</Text>
      ))}
      {/* Neon glow dots */}
      {[th.accent, th.alt, th.accent, th.alt].map((c,i)=>(
        <View key={i} style={{ position:'absolute', width:6, height:6, borderRadius:3, backgroundColor:c,
          shadowColor:c, shadowOpacity:1, shadowRadius:8,
          top:[70,20,50,40][i], left:[40,160,100,20][i] }} />
      ))}
      <Text style={[il.tagline, { color: th.accent, right:16, bottom:18 }]}>cyberpunk universe</Text>
    </View>
  );
}

const ILLUSTRATIONS: Record<string, React.FC<IllProps>> = {
  matchaBear: MatchaBearIll,
  sakuraNight: SakuraNightIll,
  oceanBuddy: OceanBuddyIll,
  candyPop: CandyPopIll,
  neonGalaxy: NeonGalaxyIll,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:SPACING.md, paddingVertical:14, borderBottomWidth:1 },
  back: { fontSize:15, fontWeight:'600', minWidth:60 },
  headerTitle: { fontSize:17, fontWeight:'700' },
  scroll: { paddingBottom:60 },
  hero: { alignItems:'center', paddingVertical:SPACING.xl },
  heroEmoji: { fontSize:44, marginBottom:8 },
  heroTitle: { fontSize:22, fontWeight:'800' },
  heroSub: { fontSize:13, marginTop:4 },
  sectionLabel: { fontSize:11, fontWeight:'700', letterSpacing:1.2, marginHorizontal:SPACING.md, marginBottom:SPACING.sm, marginTop:SPACING.md },
  premHeader: { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:SPACING.md, marginTop:SPACING.md, marginBottom:SPACING.sm },
  goldTag: { borderRadius:RADIUS.full, paddingHorizontal:10, paddingVertical:3 },
  goldTagText: { fontSize:11, fontWeight:'800', color:'#000' },
  footNote: { textAlign:'center', fontSize:12, marginTop:SPACING.xl, marginBottom:4 },
  restoreBtn: { alignItems:'center', paddingVertical:12, marginBottom:SPACING.lg },
  restoreText: { fontSize:13, textDecorationLine:'underline' },

  // Free cards
  freeRow: { flexDirection:'row', gap:SPACING.md, paddingHorizontal:SPACING.md, marginBottom:SPACING.md },
  freeCard: { width:FREE_W, borderRadius:RADIUS.xl, overflow:'hidden', borderWidth:2.5, shadowColor:'#000', shadowOpacity:0.14, shadowOffset:{width:0,height:4}, shadowRadius:10, elevation:5 },
  freePrev: { height:120, padding:8, position:'relative' },
  freeBar: { flexDirection:'row', alignItems:'center', gap:5, borderRadius:8, padding:5, marginBottom:5 },
  freeDot: { width:7, height:7, borderRadius:3.5 },
  freeLine: { height:4, borderRadius:2 },
  freeItem: { flexDirection:'row', alignItems:'center', borderRadius:6, padding:5, marginBottom:3 },
  freeItemBar: { width:3, height:16, borderRadius:2, marginRight:5 },
  freeMascotSmall: { position:'absolute', bottom:6, right:8, fontSize:26 },
  freeCheck: { position:'absolute', top:8, right:8, width:20, height:20, borderRadius:10, alignItems:'center', justifyContent:'center', zIndex:10 },
  freeCheckTxt: { color:'#fff', fontSize:11, fontWeight:'700' },
  freeFooter: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:10, paddingVertical:8 },
  freeLabel: { fontSize:12, fontWeight:'700' },
  freeTag: { fontSize:11, fontWeight:'600' },

  // Blossom teaser
  blossomCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 6 }, shadowRadius: 16, elevation: 8 },
  blossomIll: { height: 120, overflow: 'hidden', position: 'relative' },
  blossomFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  blossomTag: { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5 },

  // Premium cards
  premCard: { marginHorizontal:SPACING.md, marginBottom:SPACING.md, borderRadius:RADIUS.xl, overflow:'hidden', borderWidth:2, shadowColor:'#000', shadowOpacity:0.25, shadowOffset:{width:0,height:8}, shadowRadius:20, elevation:10 },
  illPanel: { height:160, overflow:'hidden', position:'relative' },
  badgeRow: { position:'absolute', top:12, left:12, right:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  hlBadge: { borderRadius:RADIUS.full, paddingHorizontal:10, paddingVertical:4 },
  hlBadgeTxt: { color:'#fff', fontSize:11, fontWeight:'700' },
  premBadge: { borderRadius:RADIUS.full, paddingHorizontal:10, paddingVertical:4, borderWidth:1, backgroundColor:'#FFD70015' },
  premBadgeTxt: { color:'#FFD700', fontSize:11, fontWeight:'800' },
  activePill: { position:'absolute', bottom:10, right:12, borderRadius:RADIUS.full, paddingHorizontal:12, paddingVertical:4 },
  activePillTxt: { color:'#fff', fontSize:11, fontWeight:'700' },
  premInfo: { flexDirection:'row', alignItems:'center', paddingHorizontal:SPACING.md, paddingVertical:12, gap:10 },
  premMascot: { fontSize:36 },
  premName: { fontSize:18, fontWeight:'800', letterSpacing:-0.3 },
  premDesc: { fontSize:12, marginTop:2 },
  premPalette: { flexDirection:'column', gap:3 },
  palDot: { width:14, height:14, borderRadius:7, borderWidth:1 },
  premAction: { paddingHorizontal:SPACING.md, paddingBottom:SPACING.md, paddingTop:SPACING.sm, borderTopWidth:1 },
  actionBtn: { borderRadius:RADIUS.lg, paddingVertical:13, alignItems:'center' },
  actionBtnTxt: { color:'#fff', fontSize:14, fontWeight:'700' },
  buyRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  buyLabel: { fontSize:11 },
  buyPrice: { fontSize:24, fontWeight:'800' },
  buyBtn: { borderRadius:RADIUS.lg, paddingVertical:13, paddingHorizontal:SPACING.lg },
  buyBtnTxt: { color:'#fff', fontSize:14, fontWeight:'700' },
});

const il = StyleSheet.create({
  root: { flex:1, position:'relative', overflow:'hidden' },
  circle: { position:'absolute' },
  neonLine: { position:'absolute' },
  bigEmoji: { position:'absolute', fontSize:56 },
  scatter: { position:'absolute' },
  steam: { marginHorizontal:2 },
  steamRow: { position:'absolute', top:16, left:80, flexDirection:'row', alignItems:'flex-end' },
  cup: { position:'absolute', bottom:20, left:90, width:40, height:30, borderRadius:6, borderWidth:2, overflow:'hidden', alignItems:'center', justifyContent:'flex-end' },
  cupLiquid: { position:'absolute', bottom:0, left:0, right:0, height:14, opacity:0.8 },
  cupLeaf: { fontSize:10, marginBottom:2 },
  bubble: { position:'absolute', borderWidth:1.5, backgroundColor:'transparent' },
  tagline: { position:'absolute', fontSize:11, fontWeight:'700', fontStyle:'italic', opacity:0.8 },
});
