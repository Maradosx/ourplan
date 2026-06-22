/**
 * RevenueCat purchases wrapper
 * ครอบคลุม: Premium Themes · Pro Subscription · Sticker Packs · Tip Jar
 */

import { Platform } from 'react-native';

// ─── API Keys ─────────────────────────────────────────────────────────────────
const RC_IOS_KEY     = 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const RC_ANDROID_KEY = 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
export const IS_CONFIGURED = !RC_IOS_KEY.includes('XXXX');

// ─── 1. Premium Themes ────────────────────────────────────────────────────────
export const PRODUCT_IDS: Record<string, string> = {
  matchaBear:  'com.anonymous.ourplan.theme.matchabear',
  sakuraNight: 'com.anonymous.ourplan.theme.sakuranight',
  oceanBuddy:  'com.anonymous.ourplan.theme.oceanbuddy',
  candyPop:    'com.anonymous.ourplan.theme.candypop',
  neonGalaxy:  'com.anonymous.ourplan.theme.neongalaxy',
};

// ─── 2. Pro Subscription ──────────────────────────────────────────────────────
export const PRO_PRODUCTS = {
  monthly: 'com.anonymous.ourplan.pro.monthly',
  yearly:  'com.anonymous.ourplan.pro.yearly',
};

export const PRO_PRICES = {
  monthly: { thb: '฿59',  label: 'per month', labelTh: 'ต่อเดือน',  saving: '' },
  yearly:  { thb: '฿499', label: 'per year',  labelTh: 'ต่อปี',     saving: 'Save 30%', savingTh: 'ประหยัด 30%' },
};

export const PRO_FEATURES = [
  {
    icon: '🎨',
    title: 'All Themes & Stickers',   titleTh: 'ทุกธีม + ทุก Sticker',
    sub: '5 premium themes + all sticker packs', subTh: 'ธีม Premium 5 ชุด + สติกเกอร์ทุกแพ็ก',
  },
  {
    icon: '👥',
    title: 'Unlimited Friends',        titleTh: 'เพื่อนไม่จำกัด',
    sub: 'Free tier: up to 20 friends', subTh: 'ฟรี: สูงสุด 20 คน',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Unlimited Groups',         titleTh: 'กลุ่มไม่จำกัด',
    sub: 'Free tier: up to 3 groups',  subTh: 'ฟรี: สูงสุด 3 กลุ่ม',
  },
  {
    icon: '📤',
    title: 'Export Calendar',          titleTh: 'Export ปฏิทิน',
    sub: 'Apple Calendar & Google Calendar', subTh: 'ส่งออกไป Apple / Google Calendar',
  },
  {
    icon: '⚡',
    title: 'Advanced Find Time',       titleTh: 'Find Time ขั้นสูง',
    sub: 'Extended date range up to 30 days & longer durations', subTh: 'ขยายช่วงวันสูงสุด 30 วัน และตั้งระยะเวลานานขึ้น',
  },
  {
    icon: '✨',
    title: 'Pro Badge',                titleTh: 'ป้าย Pro บนโปรไฟล์',
    sub: 'Stand out on your profile',  subTh: 'โดดเด่นบนโปรไฟล์ของคุณ',
  },
  {
    icon: '🔮',
    title: 'Early Access',             titleTh: 'Early Access',
    sub: 'New features before everyone else', subTh: 'ฟีเจอร์ใหม่ก่อนใคร',
  },
];

// ─── 3. Sticker Packs ─────────────────────────────────────────────────────────
export interface StickerPack {
  id: string;
  label: string; labelTh: string;
  icon: string;
  description: string; descriptionTh: string;
  price: string;
  stickers: string[];
  productId: string;
}

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'foodDrinks',
    label: 'Food & Drinks',         labelTh: 'อาหาร & เครื่องดื่ม',
    icon: '🍕',
    description: 'Meals, cafes & everything yummy',
    descriptionTh: 'อาหาร คาเฟ่ และของอร่อยทุกอย่าง',
    price: '฿29',
    stickers: ['🍕','🍜','🧋','🍣','🥗','🍰','🍸','🧇','🍔','🌮','🍦','☕','🍱','🥐','🍩','🍇'],
    productId: 'com.anonymous.ourplan.stickers.food',
  },
  {
    id: 'travel',
    label: 'Travel & Adventure',    labelTh: 'ท่องเที่ยว & ผจญภัย',
    icon: '✈️',
    description: 'For the wanderers and explorers',
    descriptionTh: 'สำหรับคนชอบเดินทาง',
    price: '฿29',
    stickers: ['✈️','🏖️','🗺️','🏕️','🚂','🏔️','🛳️','🎡','🌍','🗼','🏰','🚡','🚁','🏝️','🌋','⛺'],
    productId: 'com.anonymous.ourplan.stickers.travel',
  },
  {
    id: 'workStudy',
    label: 'Work & Study',          labelTh: 'งาน & การเรียน',
    icon: '💼',
    description: 'Stay focused and productive',
    descriptionTh: 'โฟกัสและมีประสิทธิภาพ',
    price: '฿29',
    stickers: ['💼','📚','💻','🎯','📊','🖥️','✏️','📝','🔬','📐','🧠','🏆','📎','🗂️','⌨️','🖊️'],
    productId: 'com.anonymous.ourplan.stickers.work',
  },
  {
    id: 'partyFun',
    label: 'Party & Fun',           labelTh: 'ปาร์ตี้ & สนุก',
    icon: '🎉',
    description: 'Celebrate every moment',
    descriptionTh: 'ฉลองทุกช่วงเวลา',
    price: '฿29',
    stickers: ['🎉','🎊','🎂','🥳','🎁','🎈','🪄','🎭','🎮','🎵','🎤','🎬','🪅','🎠','🎯','🕹️'],
    productId: 'com.anonymous.ourplan.stickers.party',
  },
  {
    id: 'healthFitness',
    label: 'Health & Fitness',      labelTh: 'สุขภาพ & ออกกำลังกาย',
    icon: '💪',
    description: 'Stay active, stay healthy',
    descriptionTh: 'แข็งแรงและมีสุขภาพดี',
    price: '฿29',
    stickers: ['💪','🏃','🧘','⚽','🏊','🚴','🏋️','🥊','🤸','🏅','🧗','🎽','🥗','💊','🩺','🛌'],
    productId: 'com.anonymous.ourplan.stickers.health',
  },
  {
    id: 'natureAnimals',
    label: 'Nature & Animals',      labelTh: 'ธรรมชาติ & สัตว์',
    icon: '🌸',
    description: 'Flowers, pets & the great outdoors',
    descriptionTh: 'ดอกไม้ สัตว์เลี้ยง และธรรมชาติ',
    price: '฿29',
    stickers: ['🌸','🌲','🐶','🐱','🦋','🌺','🌈','🐠','🦁','🐘','🦊','🌻','🍀','🐢','🦜','🌿'],
    productId: 'com.anonymous.ourplan.stickers.nature',
  },
  {
    id: 'moodsVibes',
    label: 'Moods & Vibes',         labelTh: 'อารมณ์ & ความรู้สึก',
    icon: '😊',
    description: 'Express every feeling',
    descriptionTh: 'แสดงความรู้สึกทุกอย่าง',
    price: '฿29',
    stickers: ['😊','🥰','😂','🤩','😴','😤','🥺','🤔','💭','💤','🤯','🥶','🫶','💖','😎','🙌'],
    productId: 'com.anonymous.ourplan.stickers.moods',
  },
  {
    id: 'dailyLife',
    label: 'Daily Life',            labelTh: 'ชีวิตประจำวัน',
    icon: '🏠',
    description: 'Home, errands & everyday moments',
    descriptionTh: 'บ้าน ธุระ และช่วงเวลาประจำวัน',
    price: '฿29',
    stickers: ['🏠','🛒','💊','🧹','📱','💳','🔑','🚗','☕','🛁','🍳','📦','🪴','🧺','🔌','🪥'],
    productId: 'com.anonymous.ourplan.stickers.daily',
  },
];

// ─── 4. Tip Jar ───────────────────────────────────────────────────────────────
export const TIP_OPTIONS = [
  {
    id: 'small'  as const,
    label: 'Small Thank You',  labelTh: 'ขอบคุณเล็กน้อย',
    emoji: '☕',  price: '฿29',
    productId: 'com.anonymous.ourplan.tip.small',
  },
  {
    id: 'medium' as const,
    label: 'Big Coffee',        labelTh: 'กาแฟถ้วยใหญ่',
    emoji: '☕☕', price: '฿59',
    productId: 'com.anonymous.ourplan.tip.medium',
  },
  {
    id: 'large'  as const,
    label: "You're Amazing!",   labelTh: 'คุณสุดยอดมาก!',
    emoji: '🍱',  price: '฿149',
    productId: 'com.anonymous.ourplan.tip.large',
  },
];

// ─── RC Instance (lazy) ───────────────────────────────────────────────────────
let RC: any = null;
function getRC() {
  if (RC) return RC;
  try { RC = require('react-native-purchases').default; return RC; }
  catch { return null; }
}

export function initPurchases() {
  if (!IS_CONFIGURED) return;
  const rc = getRC();
  if (!rc) return;
  try {
    rc.setLogLevel?.('ERROR');
    rc.configure({ apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY });
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function findPackage(productId: string): Promise<any | null> {
  const rc = getRC();
  if (!rc || !IS_CONFIGURED) return null;
  try {
    const offerings = await rc.getOfferings();
    return offerings.current?.availablePackages?.find(
      (p: any) => p.product.identifier === productId,
    ) ?? null;
  } catch { return null; }
}

// ─── Theme purchases ──────────────────────────────────────────────────────────
export async function purchaseThemeProduct(themeId: string): Promise<boolean> {
  if (!IS_CONFIGURED || __DEV__) return true;
  const pkg = await findPackage(PRODUCT_IDS[themeId]);
  if (!pkg) throw new Error('Product not found. Please try again later.');
  const rc = getRC();
  if (!rc) return false;
  const { customerInfo } = await rc.purchasePackage(pkg);
  const pid = PRODUCT_IDS[themeId];
  return !!customerInfo.entitlements.active[pid] ||
    Object.values(customerInfo.allPurchasedProductIdentifiers).includes(pid);
}

export async function restorePurchases(): Promise<string[]> {
  if (!IS_CONFIGURED) return [];
  const rc = getRC();
  if (!rc) return [];
  try {
    const { customerInfo } = await rc.restorePurchases();
    return Object.entries(PRODUCT_IDS)
      .filter(([, pid]) => Object.values(customerInfo.allPurchasedProductIdentifiers).includes(pid))
      .map(([id]) => id);
  } catch { return []; }
}

// ─── Pro Subscription ─────────────────────────────────────────────────────────
export async function purchaseProPlan(plan: 'monthly' | 'yearly'): Promise<boolean> {
  if (!IS_CONFIGURED || __DEV__) return true;
  const pkg = await findPackage(PRO_PRODUCTS[plan]);
  if (!pkg) throw new Error('Pro plan not available. Please try again later.');
  const rc = getRC();
  if (!rc) return false;
  try {
    const { customerInfo } = await rc.purchasePackage(pkg);
    return !!customerInfo.entitlements.active['pro'];
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function checkProStatus(): Promise<boolean> {
  if (!IS_CONFIGURED) return false;
  const rc = getRC();
  if (!rc) return false;
  try {
    const info = await rc.getCustomerInfo();
    return !!info.entitlements.active['pro'];
  } catch { return false; }
}

export async function restoreProAndThemes(): Promise<{ isPro: boolean; themeIds: string[] }> {
  if (!IS_CONFIGURED) return { isPro: false, themeIds: [] };
  const rc = getRC();
  if (!rc) return { isPro: false, themeIds: [] };
  try {
    const { customerInfo } = await rc.restorePurchases();
    const isPro = !!customerInfo.entitlements.active['pro'];
    const themeIds = Object.entries(PRODUCT_IDS)
      .filter(([, pid]) => Object.values(customerInfo.allPurchasedProductIdentifiers).includes(pid))
      .map(([id]) => id);
    return { isPro, themeIds };
  } catch { return { isPro: false, themeIds: [] }; }
}

// ─── Sticker Packs ────────────────────────────────────────────────────────────
export async function purchaseStickerPack(packId: string): Promise<boolean> {
  if (!IS_CONFIGURED || __DEV__) return true;
  const pack = STICKER_PACKS.find(p => p.id === packId);
  if (!pack) throw new Error('Pack not found');
  const pkg = await findPackage(pack.productId);
  if (!pkg) throw new Error('Product not available');
  const rc = getRC();
  if (!rc) return false;
  try {
    const { customerInfo } = await rc.purchasePackage(pkg);
    return Object.values(customerInfo.allPurchasedProductIdentifiers).includes(pack.productId);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function getOwnedStickerPacks(): Promise<string[]> {
  if (!IS_CONFIGURED) return [];
  const rc = getRC();
  if (!rc) return [];
  try {
    const info = await rc.getCustomerInfo();
    return STICKER_PACKS
      .filter(p => Object.values(info.allPurchasedProductIdentifiers).includes(p.productId))
      .map(p => p.id);
  } catch { return []; }
}

// ─── Tip Jar ──────────────────────────────────────────────────────────────────
export async function sendTip(tipId: 'small' | 'medium' | 'large'): Promise<boolean> {
  if (!IS_CONFIGURED || __DEV__) return true;
  const tip = TIP_OPTIONS.find(t => t.id === tipId);
  if (!tip) throw new Error('Tip option not found');
  const pkg = await findPackage(tip.productId);
  if (!pkg) throw new Error('Tip product not available');
  const rc = getRC();
  if (!rc) return false;
  try {
    await rc.purchasePackage(pkg);
    return true;
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}
