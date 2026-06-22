import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { THEMES } from '../../constants/theme';

// ─── Per-theme scene strips ───────────────────────────────────────────────────

function MatchaScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Background circles */}
      <View style={[s.circle, { width: 80, height: 80, borderRadius: 40, backgroundColor: th.accent + '15', top: -30, right: 40 }]} />
      <View style={[s.circle, { width: 50, height: 50, borderRadius: 25, backgroundColor: th.alt + '10', top: -10, right: 0 }]} />
      {/* Scattered leaves */}
      <Text style={[s.float, { top: 4, left: 16, fontSize: 16 }]}>🌿</Text>
      <Text style={[s.float, { top: 10, left: 50, fontSize: 12, opacity: 0.7 }]}>🍃</Text>
      <Text style={[s.float, { top: 2, left: 80, fontSize: 14 }]}>🌱</Text>
      <Text style={[s.float, { top: 8, left: 120, fontSize: 18, opacity: 0.8 }]}>🍵</Text>
      <Text style={[s.float, { top: 3, left: 155, fontSize: 12, opacity: 0.6 }]}>🌿</Text>
      {/* Bear mascot right side */}
      <Text style={[s.float, { top: -4, right: 12, fontSize: 40 }]}>🐻</Text>
      {/* Steam */}
      <Text style={[s.float, { top: 6, left: 195, fontSize: 10, color: th.accent + '80' }]}>∿∿</Text>
      {/* Tagline */}
      <Text style={[s.tagline, { color: th.accent + 'AA', left: 16, bottom: 4 }]}>cozy café vibes ☕</Text>
    </View>
  );
}

function SakuraScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Moon glow */}
      <View style={[s.circle, { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFE88030', top: -15, right: 60 }]} />
      {/* Petals */}
      {['🌸', '🌸', '🌸', '🌸', '🌸', '🌸'].map((e, i) => (
        <Text key={i} style={[s.float, {
          fontSize: [16, 12, 18, 13, 15, 11][i],
          top: [2, 12, 0, 8, 4, 14][i],
          left: [10, 40, 70, 100, 130, 160][i],
          opacity: [0.9, 0.6, 1, 0.7, 0.8, 0.5][i],
        }]}>{e}</Text>
      ))}
      {/* Stars */}
      {['✦', '✧', '✦', '✧'].map((st, i) => (
        <Text key={i} style={[s.float, { fontSize: [8, 6, 7, 9][i], color: '#FFD700', top: [5, 16, 2, 12][i], left: [55, 85, 115, 145][i] }]}>{st}</Text>
      ))}
      {/* Fairy */}
      <Text style={[s.float, { top: -6, right: 10, fontSize: 38 }]}>🧚</Text>
      <Text style={[s.float, { top: 0, right: 55, fontSize: 24 }]}>🌕</Text>
      <Text style={[s.tagline, { color: th.accent + 'AA', left: 16, bottom: 4 }]}>kawaii night sky 🌸</Text>
    </View>
  );
}

function OceanScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Water glow */}
      <View style={[s.circle, { width: 100, height: 100, borderRadius: 50, backgroundColor: th.accent + '12', top: -40, right: 20 }]} />
      {/* Bubbles */}
      {[14, 10, 18, 12, 16, 8].map((sz, i) => (
        <View key={i} style={[s.circle, {
          width: sz, height: sz, borderRadius: sz / 2,
          borderWidth: 1.5, borderColor: th.accent + '60', backgroundColor: 'transparent',
          top: [4, 14, 2, 10, 6, 16][i], left: [20, 55, 90, 125, 160, 30][i],
        }]} />
      ))}
      {/* Sea creatures */}
      <Text style={[s.float, { top: -4, right: 10, fontSize: 38 }]}>🐬</Text>
      <Text style={[s.float, { top: 4, right: 55, fontSize: 18 }]}>🐠</Text>
      <Text style={[s.float, { top: 8, right: 90, fontSize: 14 }]}>🐡</Text>
      <Text style={[s.float, { top: 3, left: 180, fontSize: 16 }]}>🌊</Text>
      <Text style={[s.tagline, { color: th.accent + 'AA', left: 16, bottom: 4 }]}>deep sea vibes 🌊</Text>
    </View>
  );
}

function CandyScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Rainbow dots arc */}
      {['#FF3DA6', '#FF8C00', '#FFD700', '#00CC66', '#3DA6FF', '#9B4DFF'].map((c, i) => (
        <View key={i} style={[s.circle, { width: 10, height: 10, borderRadius: 5, backgroundColor: c, top: 6 + i * 4, left: 10 + i * 20, opacity: 0.85 }]} />
      ))}
      {/* Candy items */}
      <Text style={[s.float, { top: 0, left: 140, fontSize: 20 }]}>🍭</Text>
      <Text style={[s.float, { top: 5, left: 168, fontSize: 16 }]}>🍬</Text>
      <Text style={[s.float, { top: 2, left: 196, fontSize: 18 }]}>🧁</Text>
      {/* Sparkles */}
      <Text style={[s.float, { top: 4, left: 120, fontSize: 13 }]}>✨</Text>
      <Text style={[s.float, { top: 12, left: 60, fontSize: 11 }]}>✨</Text>
      {/* Big candy mascot */}
      <Text style={[s.float, { top: -6, right: 10, fontSize: 40 }]}>🍭</Text>
      <Text style={[s.float, { top: 3, right: 55, fontSize: 20 }]}>🌈</Text>
      <Text style={[s.tagline, { color: th.accent + 'CC', left: 16, bottom: 4 }]}>sugar rush energy 🍬</Text>
    </View>
  );
}

function NeonScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Grid lines */}
      <View style={[s.line, { backgroundColor: th.accent + '25', top: 14, left: 0, right: 0, height: 1 }]} />
      <View style={[s.line, { backgroundColor: th.alt + '20', top: 28, left: 0, right: 0, height: 1 }]} />
      <View style={[s.line, { backgroundColor: th.accent + '15', left: 80, top: 0, bottom: 0, width: 1 }]} />
      <View style={[s.line, { backgroundColor: th.alt + '15', left: 160, top: 0, bottom: 0, width: 1 }]} />
      {/* Star dots */}
      {[6, 4, 7, 3, 5].map((sz, i) => (
        <View key={i} style={[s.circle, {
          width: sz, height: sz, borderRadius: sz / 2, backgroundColor: th.accent,
          top: [4, 16, 8, 18, 6][i], left: [30, 70, 110, 150, 190][i],
          opacity: [1, 0.6, 0.8, 0.5, 0.7][i],
          shadowColor: th.accent, shadowOpacity: 1, shadowRadius: 4,
        }]} />
      ))}
      {/* Neon items */}
      <Text style={[s.float, { top: -6, right: 10, fontSize: 40 }]}>⚡</Text>
      <Text style={[s.float, { top: 2, right: 56, fontSize: 18 }]}>🌌</Text>
      <Text style={[s.float, { top: 6, right: 88, fontSize: 14 }]}>🛸</Text>
      <Text style={[s.float, { top: 4, right: 118, fontSize: 16 }]}>💫</Text>
      <Text style={[s.tagline, { color: th.accent + 'CC', left: 16, bottom: 4 }]}>cyberpunk universe ⚡</Text>
    </View>
  );
}

function BlossomScene({ th }: { th: typeof THEMES.midnight }) {
  return (
    <View style={[s.strip, { backgroundColor: th.bg }]}>
      {/* Soft glow circles */}
      <View style={[s.circle, { width: 90, height: 90, borderRadius: 45, backgroundColor: th.accent + '20', top: -40, right: 30 }]} />
      <View style={[s.circle, { width: 50, height: 50, borderRadius: 25, backgroundColor: th.alt + '15', top: -15, right: 0 }]} />
      {/* Petal shower */}
      {['🌸', '🌸', '🌸', '🌸', '🌸', '🌸', '🌸', '🌸'].map((e, i) => (
        <Text key={i} style={[s.float, {
          fontSize: [18, 13, 20, 15, 22, 12, 17, 14][i],
          top: [2, 14, 0, 9, 4, 18, 6, 12][i],
          left: [10, 38, 66, 95, 128, 160, 195, 220][i],
          opacity: [0.9, 0.65, 1, 0.75, 0.85, 0.55, 0.8, 0.7][i],
        }]}>{e}</Text>
      ))}
      {/* Stars */}
      {['✦', '✧', '✦', '✧', '✦'].map((st, i) => (
        <Text key={i} style={[s.float, { fontSize: [8, 6, 7, 9, 7][i], color: th.accent, top: [6, 18, 3, 14, 8][i], left: [55, 88, 118, 150, 185][i], opacity: 0.85 }]}>{st}</Text>
      ))}
      {/* Mascots */}
      <Text style={[s.float, { top: -5, right: 10, fontSize: 38 }]}>🌷</Text>
      <Text style={[s.float, { top: 0, right: 54, fontSize: 28 }]}>🐰</Text>
      <Text style={[s.float, { top: 4, right: 96, fontSize: 20 }]}>🌸</Text>
      <Text style={[s.tagline, { color: th.accent + 'BB', left: 16, bottom: 4 }]}>spring in full bloom 🌷</Text>
    </View>
  );
}

// ─── Map ──────────────────────────────────────────────────────────────────────

const SCENE_MAP: Record<string, React.FC<{ th: typeof THEMES.midnight }>> = {
  blossom: BlossomScene,
  matchaBear: MatchaScene,
  sakuraNight: SakuraScene,
  oceanBuddy: OceanScene,
  candyPop: CandyScene,
  neonGalaxy: NeonScene,
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function ThemeDecor() {
  const { themeId } = useThemeStore();
  const th = THEMES[themeId] as typeof THEMES.midnight;

  // Show decoration for blossom (teaser) and all premium themes
  if (!th.premium && themeId !== 'blossom') return null;

  const Scene = SCENE_MAP[themeId];
  if (!Scene) return null;

  return <Scene th={th} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  strip: {
    height: 52, overflow: 'hidden', position: 'relative',
    marginBottom: 4,
  },
  circle: { position: 'absolute' },
  line: { position: 'absolute' },
  float: { position: 'absolute' },
  tagline: { position: 'absolute', fontSize: 10, fontWeight: '700', fontStyle: 'italic' },
});
