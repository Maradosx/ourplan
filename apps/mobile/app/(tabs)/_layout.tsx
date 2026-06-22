import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  home:     { active: 'home',          inactive: 'home-outline' },
  calendar: { active: 'calendar',      inactive: 'calendar-outline' },
  friends:  { active: 'people',        inactive: 'people-outline' },
  findtime: { active: 'flash',         inactive: 'flash-outline' },
  profile:  { active: 'person-circle', inactive: 'person-circle-outline' },
};

function TabIcon({
  name, focused, color, size,
}: {
  name: string;
  focused: boolean;
  color: string;
  size: number;
}) {
  const icons = TAB_ICONS[name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
  const isFindTime = name === 'findtime';

  if (isFindTime) {
    return (
      <View style={[
        ftStyles.centerBtn,
        { backgroundColor: focused ? color : color + '22', borderColor: color + '44' },
      ]}>
        <Ionicons
          name={focused ? icons.active : icons.inactive}
          size={22}
          color={focused ? '#fff' : color}
        />
      </View>
    );
  }

  return (
    <View style={styles.iconWrap}>
      {focused && (
        <View style={[styles.activePill, { backgroundColor: color + '18' }]} />
      )}
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={size}
        color={color}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { theme: t } = useThemeStore();
  const { lang } = useLanguageStore();

  const labels = lang === 'th'
    ? { home: 'หน้าหลัก', calendar: 'ปฏิทิน', friends: 'เพื่อน', findTime: 'หาเวลา', profile: 'โปรไฟล์' }
    : { home: 'Home', calendar: 'Calendar', friends: 'Friends', findTime: 'Find Time', profile: 'Profile' };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.tab,
          borderTopColor: t.divider,
          borderTopWidth: 1,
          height: 86,
          paddingBottom: 18,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: -4 },
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.subtext,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: labels.home,
          tabBarIcon: ({ focused, color, size }) =>
            <TabIcon name="home" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: labels.calendar,
          tabBarIcon: ({ focused, color, size }) =>
            <TabIcon name="calendar" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: labels.friends,
          tabBarIcon: ({ focused, color, size }) =>
            <TabIcon name="friends" focused={focused} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="findtime"
        options={{
          title: labels.findTime,
          tabBarIcon: ({ focused, color, size }) =>
            <TabIcon name="findtime" focused={focused} color={color} size={size} />,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 0.2,
            marginTop: 6,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: labels.profile,
          tabBarIcon: ({ focused, color, size }) =>
            <TabIcon name="profile" focused={focused} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center', justifyContent: 'center',
    width: 48, height: 32, position: 'relative',
  },
  activePill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 12,
  },
});

const ftStyles = StyleSheet.create({
  centerBtn: {
    width: 46, height: 46, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#7B62FF', shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    elevation: 8,
    marginTop: -8,
  },
});
