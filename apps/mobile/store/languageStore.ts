import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'th';

const STRINGS = {
  en: {
    home: 'Home', calendar: 'Calendar', friends: 'Friends',
    findTime: 'Find Time', profile: 'Profile',
    editProfile: 'Edit Profile', notifications: 'Notifications',
    privacy: 'Privacy', language: 'Language', signOut: 'Sign Out',
    appTheme: 'App Theme', settings: 'Settings',
    shareProfile: 'Share Profile Link',
    browseThemes: 'Browse All Themes →',
    today: 'Today', noEvents: 'No events',
    addEvent: 'Add Event', save: 'Save', cancel: 'Cancel', done: 'Done',
  },
  th: {
    home: 'หน้าหลัก', calendar: 'ปฏิทิน', friends: 'เพื่อน',
    findTime: 'หาเวลา', profile: 'โปรไฟล์',
    editProfile: 'แก้ไขโปรไฟล์', notifications: 'การแจ้งเตือน',
    privacy: 'ความเป็นส่วนตัว', language: 'ภาษา', signOut: 'ออกจากระบบ',
    appTheme: 'ธีมแอป', settings: 'ตั้งค่า',
    shareProfile: 'แชร์ลิงก์โปรไฟล์',
    browseThemes: 'ดูธีมทั้งหมด →',
    today: 'วันนี้', noEvents: 'ไม่มีกิจกรรม',
    addEvent: 'เพิ่มกิจกรรม', save: 'บันทึก', cancel: 'ยกเลิก', done: 'เสร็จ',
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

interface LanguageStore {
  lang: Lang;
  t: (key: StringKey) => string;
  setLang: (lang: Lang) => Promise<void>;
  loadLang: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  lang: 'en',
  t: (key) => STRINGS[get().lang][key],

  setLang: async (lang) => {
    await AsyncStorage.setItem('ourplan_lang', lang);
    set({ lang, t: (key) => STRINGS[lang][key] });
  },

  loadLang: async () => {
    const saved = await AsyncStorage.getItem('ourplan_lang');
    if (saved === 'th' || saved === 'en') {
      const lang = saved as Lang;
      set({ lang, t: (key) => STRINGS[lang][key] });
    }
  },
}));
