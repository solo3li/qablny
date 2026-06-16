import { create } from 'zustand';

export type Gender = 'male' | 'female';
export type MessageType = 'text' | 'voice' | 'image' | 'video' | 'location';

export interface User {
  id: string;
  name: string;
  bio: string;
  image: string;
  coins: number;
  isVip: boolean;
  age: number;
  gender: Gender;
  location: string;
  interests: string[];
  joinedDate: string;
  totalMatches: number;
  friends: number;
}

export interface Friend {
  id: string;
  name: string;
  image: string;
  lastMessage: string;
  lastSeen: string;
  isOnline: boolean;
  unread: number;
  gender: Gender;
  location: string;
  age: number;
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  // text
  text?: string;
  translation?: string;
  // voice
  duration?: number; // seconds
  // image/video
  mediaUrl?: string;
  // location
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  isMe: boolean;
  time: string;
}

export interface RandomMatch {
  id: string;
  name: string;
  image: string;
  age: number;
  location: string;
  gender: Gender;
  interests: string[];
  isVip: boolean;
}

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

export interface VipPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  isBest: boolean;
}

interface AppState {
  user: User | null;
  friends: Friend[];
  currentMatch: RandomMatch | null;
  matchQueue: RandomMatch[];
  gifts: Gift[];
  vipPlans: VipPlan[];
  chatMessages: Record<string, ChatMessage[]>;
  isLoggedIn: boolean;
  filterGender: 'all' | 'male' | 'female';
  filterRegion: string;
  login: (user: User) => void;
  logout: () => void;
  updateCoins: (amount: number) => void;
  nextMatch: () => void;
  setFilterGender: (g: 'all' | 'male' | 'female') => void;
  setFilterRegion: (r: string) => void;
  sendMessage: (friendId: string, msg: ChatMessage) => void;
}

// ─── DUMMY DATA ──────────────────────────────────────────────────────────────

const dummyUser: User = {
  id: 'u1',
  name: 'أحمد محمود',
  bio: 'أحب السفر والتعرف على ثقافات جديدة. موسيقى 🎵 وكتب 📚',
  image: 'https://i.pravatar.cc/300?img=11',
  coins: 3500,
  isVip: true,
  age: 26,
  gender: 'male',
  location: 'القاهرة، مصر',
  interests: ['موسيقى', 'سفر', 'برمجة', 'أفلام', 'رياضة'],
  joinedDate: 'يناير 2024',
  totalMatches: 248,
  friends: 34,
};

const dummyFriends: Friend[] = [
  { id: 'f1', name: 'سارة الأحمد', image: 'https://i.pravatar.cc/300?img=5', lastMessage: 'كيف حالك اليوم؟ 😊', lastSeen: 'الآن', isOnline: true, unread: 3, gender: 'female', location: 'الرياض', age: 23 },
  { id: 'f2', name: 'محمد العلي', image: 'https://i.pravatar.cc/300?img=12', lastMessage: 'تمام نلتقي بكرة إن شاء الله!', lastSeen: 'منذ 5 دقائق', isOnline: true, unread: 0, gender: 'male', location: 'دبي', age: 28 },
  { id: 'f3', name: 'نور الهدى', image: 'https://i.pravatar.cc/300?img=20', lastMessage: 'شكراً كتير على الهدية 🎁❤️', lastSeen: 'منذ ساعة', isOnline: false, unread: 1, gender: 'female', location: 'بيروت', age: 25 },
  { id: 'f4', name: 'خالد الزهراني', image: 'https://i.pravatar.cc/300?img=33', lastMessage: 'شفت المباراة؟ كانت قمة! ⚽', lastSeen: 'منذ 3 ساعات', isOnline: false, unread: 0, gender: 'male', location: 'جدة', age: 30 },
  { id: 'f5', name: 'ليلى كريمي', image: 'https://i.pravatar.cc/300?img=47', lastMessage: 'هههه كلامك صح 😂', lastSeen: 'أمس', isOnline: true, unread: 7, gender: 'female', location: 'تونس', age: 22 },
  { id: 'f6', name: 'عمر الفاروق', image: 'https://i.pravatar.cc/300?img=53', lastMessage: 'بالتوفيق في الشغل الجديد', lastSeen: 'أمس', isOnline: false, unread: 0, gender: 'male', location: 'المغرب', age: 27 },
  { id: 'f7', name: 'هند الصالح', image: 'https://i.pravatar.cc/300?img=41', lastMessage: '🖼️ أرسلت صورة', lastSeen: 'منذ يومين', isOnline: false, unread: 2, gender: 'female', location: 'الكويت', age: 24 },
  { id: 'f8', name: 'يوسف المنصور', image: 'https://i.pravatar.cc/300?img=61', lastMessage: '🎵 رسالة صوتية', lastSeen: 'منذ أسبوع', isOnline: false, unread: 0, gender: 'male', location: 'بغداد', age: 29 },
];

const matchQueue: RandomMatch[] = [
  { id: 'm1', name: 'رنا كمال', image: 'https://i.pravatar.cc/400?img=44', age: 24, location: 'الإسكندرية', gender: 'female', interests: ['فن', 'قراءة', 'سفر'], isVip: true },
  { id: 'm2', name: 'كريم حسن', image: 'https://i.pravatar.cc/400?img=15', age: 27, location: 'عمّان', gender: 'male', interests: ['موسيقى', 'رياضة', 'ألعاب'], isVip: false },
  { id: 'm3', name: 'دانا علوي', image: 'https://i.pravatar.cc/400?img=29', age: 22, location: 'بيروت', gender: 'female', interests: ['طبخ', 'صور', 'أفلام'], isVip: true },
  { id: 'm4', name: 'تامر ناصر', image: 'https://i.pravatar.cc/400?img=18', age: 31, location: 'أبوظبي', gender: 'male', interests: ['برمجة', 'سفر', 'كتب'], isVip: false },
  { id: 'm5', name: 'ياسمين فاروق', image: 'https://i.pravatar.cc/400?img=36', age: 25, location: 'القاهرة', gender: 'female', interests: ['رسم', 'موسيقى', 'يوغا'], isVip: true },
];

const gifts: Gift[] = [
  { id: 'g1', name: 'وردة', emoji: '🌹', cost: 10 },
  { id: 'g2', name: 'قلب', emoji: '❤️', cost: 20 },
  { id: 'g3', name: 'تاج', emoji: '👑', cost: 50 },
  { id: 'g4', name: 'الماس', emoji: '💎', cost: 100 },
  { id: 'g5', name: 'نجمة', emoji: '⭐', cost: 30 },
  { id: 'g6', name: 'كيك', emoji: '🎂', cost: 25 },
  { id: 'g7', name: 'هدية', emoji: '🎁', cost: 40 },
  { id: 'g8', name: 'صاروخ', emoji: '🚀', cost: 150 },
];

const vipPlans: VipPlan[] = [
  { id: 'v1', name: 'أسبوعي', price: 19, period: 'أسبوع', features: ['فلترة حسب الجنس', 'إخفاء الإعلانات', 'شارة VIP'], isBest: false },
  { id: 'v2', name: 'شهري', price: 49, period: 'شهر', features: ['كل مميزات الأسبوعي', 'اختيار المنطقة', 'أولوية في المطابقة', '500 عملة مجاناً'], isBest: true },
  { id: 'v3', name: 'سنوي', price: 299, period: 'سنة', features: ['كل الميزات', '5000 عملة مجاناً', 'دعم أولوية 24/7', 'بث مباشر'], isBest: false },
];

// Rich chat messages with all types
const chatMessages: Record<string, ChatMessage[]> = {
  f1: [
    { id: 'c1', type: 'text', text: 'مرحبا! كيف حالك؟', isMe: false, time: '10:00 ص', translation: 'Hello! How are you?' },
    { id: 'c2', type: 'text', text: 'الحمد لله، تمام! وأنتِ؟', isMe: true, time: '10:01 ص' },
    { id: 'c3', type: 'voice', duration: 12, isMe: false, time: '10:02 ص' },
    { id: 'c4', type: 'text', text: 'شغال على مشروع جديد', isMe: true, time: '10:03 ص' },
    { id: 'c5', type: 'image', mediaUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80', isMe: false, time: '10:04 ص', text: 'شوف هالمنظر الحلو 😍' },
    { id: 'c6', type: 'text', text: 'ماشاء الله جميل جداً! وين ده؟', isMe: true, time: '10:05 ص' },
    { id: 'c7', type: 'location', locationName: 'برج خليفة، دبي', locationLat: 25.1972, locationLng: 55.2744, isMe: false, time: '10:06 ص' },
    { id: 'c8', type: 'video', mediaUrl: 'https://images.unsplash.com/photo-1682687220067-dced9a881b56?w=400&q=80', isMe: true, time: '10:10 ص', text: 'فيديو من عندنا' },
    { id: 'c9', type: 'voice', duration: 27, isMe: true, time: '10:20 ص' },
    { id: 'c10', type: 'text', text: 'كيف حالك اليوم؟ 😊', isMe: false, time: '10:30 ص', translation: 'How are you today? 😊' },
  ],
  f2: [
    { id: 'c1', type: 'text', text: 'هلا أخوي!', isMe: false, time: '9:00 ص' },
    { id: 'c2', type: 'voice', duration: 8, isMe: true, time: '9:01 ص' },
    { id: 'c3', type: 'image', mediaUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=80', isMe: false, time: '9:05 ص', text: 'شوف المباراة 🔥' },
    { id: 'c4', type: 'text', text: 'تمام نلتقي بكرة إن شاء الله!', isMe: false, time: '9:10 ص' },
  ],
  f3: [
    { id: 'c1', type: 'image', mediaUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80', isMe: true, time: '8:00 ص' },
    { id: 'c2', type: 'text', text: 'شكراً كتير على الهدية 🎁❤️', isMe: false, time: '8:05 ص' },
    { id: 'c3', type: 'location', locationName: 'مطعم الريف، بيروت', locationLat: 33.8938, locationLng: 35.5018, isMe: false, time: '8:10 ص' },
  ],
};

// ─── STORE ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  friends: dummyFriends,
  currentMatch: matchQueue[0],
  matchQueue,
  gifts,
  vipPlans,
  chatMessages,
  isLoggedIn: false,
  filterGender: 'all',
  filterRegion: 'العالم',

  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false }),
  updateCoins: (amount) => set((state) => ({
    user: state.user ? { ...state.user, coins: state.user.coins + amount } : null,
  })),
  nextMatch: () => set((state) => {
    const idx = state.matchQueue.findIndex(m => m.id === state.currentMatch?.id);
    const next = state.matchQueue[(idx + 1) % state.matchQueue.length];
    return { currentMatch: next };
  }),
  setFilterGender: (g) => set({ filterGender: g }),
  setFilterRegion: (r) => set({ filterRegion: r }),
  sendMessage: (friendId, msg) => set((state) => ({
    chatMessages: {
      ...state.chatMessages,
      [friendId]: [...(state.chatMessages[friendId] ?? []), msg],
    },
  })),
}));

export const initDummyAuth = () => {
  useAppStore.getState().login(dummyUser);
};
