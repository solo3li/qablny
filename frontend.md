# 📱 تحليل تطبيق **قابلني** (Qablny)

> تطبيق تعارف ومحادثات مرئية مستوحى من Azar — مبني بـ React Native / Expo

---

## 🧱 Stack التقني

| الطبقة | التقنية |
|--------|---------|
| Framework | **React Native 0.81.5** + **Expo ~54** |
| Navigation | **expo-router ~6** (File-based routing) |
| State Management | **Zustand ^5** |
| UI/Icons | **lucide-react-native**, **expo-blur**, **expo-linear-gradient** |
| Language | **TypeScript** |
| Vector Graphics | **react-native-svg** |

---

## 🗂️ بنية الملفات

```
app/
├── app/                        ← شاشات expo-router
│   ├── _layout.tsx             ← Root layout (Stack navigator)
│   ├── index.tsx               ← Splash screen
│   ├── onboarding.tsx          ← شاشات الترحيب (4 slides)
│   ├── auth/
│   │   └── login.tsx           ← شاشة تسجيل الدخول
│   ├── (tabs)/
│   │   ├── _layout.tsx         ← Tab bar (BlurView)
│   │   ├── index.tsx           ← شاشة المطابقة العشوائية 🎥
│   │   ├── explore.tsx         ← فلاتر البحث 🔍
│   │   ├── messages.tsx        ← قائمة المحادثات 💬
│   │   └── profile.tsx         ← الملف الشخصي + VIP 👤
│   └── chat/
│       └── [id].tsx            ← شاشة المحادثة الكاملة
├── components/
│   ├── CallModal.tsx           ← مودال المكالمات (صوت/فيديو)
│   ├── GlassButton.tsx         ← زر بتأثير الزجاج
│   └── GlassCard.tsx           ← بطاقة بتأثير الزجاج
├── constants/
│   └── Colors.ts               ← نظام الألوان الكامل
└── store/
    └── useAppStore.ts          ← Zustand store مركزي
```

---

## 🗺️ خريطة التنقل (Navigation Flow)

```
index.tsx (Splash ~2.6s)
    ├── isLoggedIn=true  → /(tabs)
    └── isLoggedIn=false → /onboarding
                              └── /auth/login
                                      └── /(tabs)

(tabs):
  ├── [0] index    → شاشة المطابقة العشوائية
  ├── [1] explore  → فلاتر البحث
  ├── [2] messages → قائمة المحادثات → /chat/[id]
  └── [3] profile  → الملف الشخصي
```

> ⚠️ **ملاحظة:** الـ `_layout.tsx` الجذري يستدعي `initDummyAuth()` تلقائياً، مما يعني أن التطبيق **دائماً** يبدأ بمستخدم مسجّل (للتطوير فقط).

---

## 📺 الشاشات — تفصيلي

### 1. `index.tsx` — Splash Screen
- أنيميشن `spring + timing` للشعار
- `glowRing` بأنيميشن تدريجي
- يتنقل تلقائياً بعد **2.6 ثانية** حسب حالة الـ `isLoggedIn`
- **يستخدم emoji 📡** كـ app icon (placeholder)

---

### 2. `onboarding.tsx` — شاشات الترحيب
- **4 slides** أفقية (`FlatList` + `pagingEnabled`)
- كل slide له لون مميز: Cyan → Purple → Pink → Gold
- نقاط تنقل (dots) تتوسع عند الـ active slide
- زر "تخطى" يتجاوز الكل مباشرة إلى `/auth/login`

---

### 3. `auth/login.tsx` — تسجيل الدخول
- شاشة login (الملف موجود لكن لم يُقرأ — بحجم 5KB)
- تتنقل إلى `/(tabs)` بعد الدخول

---

### 4. `(tabs)/index.tsx` — المطابقة العشوائية ⭐
الشاشة الرئيسية والأهم في التطبيق:
- **صورة المستخدم الحالي** تملأ الخلفية (`absoluteFillObject`)
- **LinearGradient** للتعتيم من الأسفل
- **شارة VIP** + الموقع في أعلى الشاشة
- **أزرار الأكشن** في الأسفل:
  - ⏭️ التالي (skip) — `nextMatch()`
  - ❤️ إعجاب — toggle local state
  - 💬 دردشة — زر ghost
  - 🎁 هدية — يفتح modal
- **Gift Modal** — يعرض 8 هدايا بشبكة 4 أعمدة
- يخصم العملات `updateCoins(-cost)` عند إرسال الهدية

---

### 5. `(tabs)/explore.tsx` — فلاتر البحث
- **فلتر الجنس:** 3 خيارات (كل / إناث / ذكور)
- **فلتر الفئة العمرية:** 4 presets جاهزة (18-25, 18-35, 20-40, 25-50)
- **فلتر المنطقة الجغرافية:** 7 مناطق + شارة VIP على هذا الفلتر
- زر "تطبيق الفلاتر" لا يفعل شيئاً حالياً (no-op)
- `ageRange` state محلي فقط — لم يُربط بالـ store

---

### 6. `(tabs)/messages.tsx` — الرسائل
- **Header** مع عداد الرسائل غير المقروءة
- **Search bar** (TextInput بدون وظيفة فلترة فعلية حتى الآن)
- **شريط المتصلين الآن** — FlatList أفقي
- **قائمة المحادثات الكاملة** — GlassCard لكل محادثة
  - Avatar + اسم + آخر رسالة + وقت + badge عدد غير المقروءة
- الضغط على أي محادثة → `/chat/[id]`

---

### 7. `(tabs)/profile.tsx` — الملف الشخصي
- **صورة + اسم + bio + موقع + عمر + تاريخ الانضمام**
- **Interests tags** (5 اهتمامات)
- **إحصائيات:** مطابقات / أصدقاء / عملات
- **VIP Banner:**
  - إذا غير مشترك → زر الاشتراك يفتح 3 خطط
  - إذا مشترك → badge "أنت مشترك في VIP ✨"
- **خطط VIP:** أسبوعي (19 ر.س) / شهري (49 ر.س) / سنوي (299 ر.س)
- **قائمة الإعدادات:** إشعارات / خصوصية / مساعدة (بدون وظيفة)
- **تسجيل الخروج** → `/auth/login`

---

### 8. `chat/[id].tsx` — شاشة المحادثة (الأكبر: 488 سطر)
أغنى شاشة في التطبيق، تدعم **5 أنواع رسائل:**

| النوع | الوصف |
|-------|-------|
| `text` | فقاعة نصية + ترجمة فورية toggle |
| `voice` | مشغّل صوتي + شريط تقدم Animated + موجات |
| `image` | صورة قابلة للتوسع في modal |
| `video` | صورة مصغرة + أيقونة تشغيل |
| `location` | خريطة وهمية (CSS grid) + اسم الموقع + إحداثيات |

**مميزات الشاشة:**
- Header: صورة المحادثة + حالة الاتصال + أزرار المكالمة
- Toggle الترجمة الفورية (يخفي/يظهر الترجمة الإنجليزية)
- شريط الإدخال: نص / مرفقات (صورة، فيديو، صوت، موقع) / تسجيل صوتي
- مؤقت التسجيل الصوتي (live timer)
- **CallModal** للمكالمات الصوتية والمرئية

---

### 9. `components/CallModal.tsx` — مودال المكالمات
- **حالتان:** `ringing` (يرن) → `connected` (متصل)
- **الاتصال التلقائي** بعد 2.5 ثانية (محاكاة)
- **Pulse animations** — 3 حلقات متتالية أثناء الرنين
- **مؤقت المكالمة** — يعدّ الثواني
- **أدوات التحكم:**
  - 🎤 كتم الميكروفون
  - 🔊 مكبر الصوت
  - 📷 تشغيل/إيقاف الكاميرا (فيديو فقط)
  - 🔄 قلب الكاميرا (فيديو فقط)
- **PiP** (picture-in-picture) — صورة ذاتية صغيرة عند اتصال الفيديو
- **أشرطة الإشارة** + "جودة ممتازة"

---

## 🗄️ إدارة الحالة — Zustand Store

### Types المعرّفة:
```typescript
User        // بيانات المستخدم الكامل
Friend      // صديق + حالة الاتصال + آخر رسالة
ChatMessage // 5 أنواع: text/voice/image/video/location
RandomMatch // بيانات المطابقة العشوائية
Gift        // هدية افتراضية
VipPlan     // خطة اشتراك
```

### Actions:
| Action | الوظيفة |
|--------|---------|
| `login(user)` | تسجيل الدخول |
| `logout()` | تسجيل الخروج |
| `updateCoins(amount)` | تعديل رصيد العملات (+/-) |
| `nextMatch()` | الانتقال للمطابقة التالية (circular) |
| `setFilterGender(g)` | تغيير فلتر الجنس |
| `setFilterRegion(r)` | تغيير فلتر المنطقة |
| `sendMessage(friendId, msg)` | إضافة رسالة للمحادثة |

### البيانات الوهمية (Dummy Data):
- **مستخدم:** أحمد محمود، القاهرة، VIP، 3500 عملة
- **8 أصدقاء** من دول عربية مختلفة (مصر، السعودية، لبنان، تونس...)
- **5 مطابقات** في قائمة انتظار دورية
- **8 هدايا** (وردة 10 🪙 ← صاروخ 150 🪙)
- **3 خطط VIP** (أسبوعي / شهري / سنوي)
- **رسائل غنية** لـ 3 محادثات (f1, f2, f3) بجميع أنواع الرسائل

---

## 🎨 نظام التصميم

### نمط التصميم: **Glassmorphism + Dark Mode**

```
Background:   #070B14 (deep navy)
Surface:      rgba(255,255,255,0.06)
Glass border: rgba(255,255,255,0.12)

Accent colors:
  Cyan:   #00F0FF  ← اللون الرئيسي / CTA
  Purple: #7B2FFF  ← ثانوي
  Pink:   #FF2D78  ← للإناث / الإعجاب
  Gold:   #FFD166  ← VIP / الهدايا
  Red:    #FF3B5C  ← الخطر / الإيقاف
  Green:  #00E676  ← الاتصال / الإنترنت
```

### المكونات المشتركة:
- **`GlassCard`** — بطاقة بتأثير زجاجي (BlurView + border + glow)
- **`GlassButton`** — زر بـ 5 variants: `primary / ghost / gold / danger / primary-gradient`

### Tab Bar:
- **BlurView** (intensity=60, dark) بدلاً من خلفية صلبة
- Badge ديناميكي لعدد الرسائل غير المقروءة
- أيقون نشط: خلفية `cyanDim` + border مضيء

---

## ✅ نقاط القوة

1. **تصميم مميز** — Glassmorphism متسق وجذاب في كل الشاشات
2. **شاشة المحادثة غنية** — 5 أنواع رسائل مع UX مختلف لكل نوع
3. **CallModal احترافي** — animations، PiP، timer، حالات متعددة
4. **Zustand بسيط وفعال** — store مركزي نظيف بدون boilerplate
5. **expo-router** — routing ملف-based حديث ومنظم
6. **TypeScript كامل** — types محددة لكل entity
7. **Onboarding مصقول** — 4 slides بتصميم ملون وانتقالات سلسة

---

## ⚠️ نقاط تحتاج تحسين / TODO

### 🔴 وظائف ناقصة
| المشكلة | الملف | التفاصيل |
|---------|-------|----------|
| فلتر البحث لا يعمل | `explore.tsx` | `ageRange` محلي فقط، "تطبيق الفلاتر" no-op |
| Search bar لا يفلتر | `messages.tsx` | `TextInput` بدون `onChangeText` logic |
| إعدادات الملف الشخصي | `profile.tsx` | الـ menu items بدون `onPress` |
| زر "قلب الكاميرا" | `CallModal.tsx` | بدون وظيفة |
| المطابقة العشوائية وهمية | `(tabs)/index.tsx` | صور ثابتة بدلاً من WebRTC |

### 🟡 تحسينات تقنية
| المشكلة | التفاصيل |
|---------|----------|
| `initDummyAuth()` في `_layout.tsx` | يجب إزالته في الإنتاج |
| `outlineStyle: 'none'` as any | Web-specific hack في `chat/[id].tsx` |
| `Math.random()` في waveform | يسبب re-renders غير ضرورية |
| الصور من `i.pravatar.cc` | يجب استبدالها بـ assets حقيقية |
| لا يوجد error boundaries | لا حماية من crashes |
| لا يوجد loading states | بدون skeleton screens |
| الـ `ageRange` state محلي | يجب ربطه بالـ store |

### 🟢 مقترحات للمستقبل
- إضافة **React Native Reanimated** للأنيميشن الأكثر سلاسة
- **react-native-gesture-handler** للـ swipe gestures
- **WebRTC** لمكالمات فيديو حقيقية (agora.io أو livekit)
- **Backend integration** (API calls بدلاً من dummy data)
- **Push notifications** للرسائل الجديدة
- **Deep linking** للمحادثات
- **RTL support** رسمي (اللغة العربية RTL)

---

## 📊 إحصائيات الكود

| الملف | الحجم | السطور |
|-------|-------|--------|
| `chat/[id].tsx` | 24 KB | 488 ✨ |
| `CallModal.tsx` | 11 KB | 279 |
| `profile.tsx` | 10 KB | 203 |
| `useAppStore.ts` | 10 KB | 218 |
| `(tabs)/index.tsx` | 8 KB | 179 |
| `explore.tsx` | 7 KB | 144 |
| `messages.tsx` | 6 KB | 122 |

**المجموع التقريبي:** ~1,700 سطر كود نظيف ومنظم

---

## 🏁 الخلاصة

تطبيق **قابلني** هو نموذج أولي (prototype) متكامل ومصقول بصرياً لتطبيق تعارف مرئي عربي. البنية التقنية سليمة وقابلة للتطوير، والتصميم Glassmorphism مميز ومتسق. الخطوة التالية الأهم هي **ربط Backend حقيقي** وتفعيل الوظائف المعطلة كالفلترة والبحث.
