import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const { token, isLoading } = useAuthStore();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ]).start();

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (token) router.replace('/(tabs)');
        else router.replace('/auth/login');
      }
    }, 2600);
    
    return () => clearTimeout(timer);
  }, []);

  const [animationDone, setAnimationDone] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationDone && !isLoading) {
      if (token) router.replace('/(tabs)');
      else router.replace('/auth/login');
    }
  }, [animationDone, isLoading, token]);

  return (
    <LinearGradient colors={Colors.gradMain} style={styles.container}>
      {/* Decorative Orbs */}
      <View style={[styles.orb, { top: '-10%', left: '-20%', backgroundColor: Colors.primary, opacity: 0.05 }]} />
      <View style={[styles.orb, { bottom: '-10%', right: '-20%', backgroundColor: Colors.secondary, opacity: 0.03 }]} />

      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>✨</Text>
        </View>

        <Text style={styles.appName}>قابلنى</Text>
        <Text style={styles.tagline}>نخبة التواصل، وأرقى اللقاءات.</Text>
      </Animated.View>

      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
        <View style={[styles.dot, { backgroundColor: Colors.textMuted }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', width: 400, height: 400, borderRadius: 200 },
  logoWrap: { alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.bgDeep,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primaryDim,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  iconEmoji: { fontSize: 42 },
  appName: {
    fontSize: 40, fontWeight: '800', color: Colors.primary,
    letterSpacing: 3, marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  tagline: { fontSize: 16, color: Colors.secondary, letterSpacing: 1, fontWeight: '500' },
  dots: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 12 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
