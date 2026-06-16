import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { Colors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1', emoji: '🎥',
    title: 'تواصل فيديو فوري',
    desc: 'تحدث وجهاً لوجه مع أشخاص حقيقيين من كل أنحاء العالم بلمسة واحدة.',
    color: Colors.cyan,
  },
  {
    id: '2', emoji: '🔍',
    title: 'ابحث بذكاء',
    desc: 'فلترة دقيقة حسب الجنس والمنطقة الجغرافية لمطابقة تناسب ذوقك.',
    color: Colors.purple,
  },
  {
    id: '3', emoji: '🌐',
    title: 'ترجمة لحظية',
    desc: 'تجاوز حاجز اللغة مع ترجمة فورية للرسائل لأكثر من 50 لغة.',
    color: Colors.pink,
  },
  {
    id: '4', emoji: '🎁',
    title: 'أرسل هدايا ✨',
    desc: 'عبّر عن مشاعرك بهدايا افتراضية مبهرة وارتقِ إلى مستوى VIP.',
    color: Colors.gold,
  },
];

export default function OnboardingScreen() {
  const [activeIdx, setActiveIdx] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const next = () => {
    if (activeIdx < slides.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIdx + 1, animated: true });
      setActiveIdx(activeIdx + 1);
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <LinearGradient colors={['#040710', '#070B14']} style={styles.container}>
      {/* Background orbs */}
      <View style={[styles.orb, { backgroundColor: slides[activeIdx].color, top: -80, right: -80 }]} />

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i.id}
        onMomentumScrollEnd={e => setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.emojiCircle, { borderColor: item.color + '55', shadowColor: item.color }]}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIdx && { backgroundColor: slides[activeIdx].color, width: 24 }]} />
        ))}
      </View>

      <View style={styles.footer}>
        <GlassButton
          title={activeIdx === slides.length - 1 ? 'ابدأ الآن 🚀' : 'التالي'}
          variant={activeIdx === slides.length - 1 ? 'primary' : 'ghost'}
          size="lg"
          onPress={next}
          style={styles.btn}
        />
        {activeIdx < slides.length - 1 && (
          <GlassButton title="تخطى" variant="ghost" size="sm" onPress={() => router.push('/auth/login')} />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.08 },
  slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emojiCircle: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.surface, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 36, shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
  },
  emoji: { fontSize: 62 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },
  desc: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder },
  footer: { padding: 24, paddingBottom: 48, gap: 12, alignItems: 'center' },
  btn: { width: '100%' },
});
