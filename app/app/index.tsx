import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../src/store/authStore';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const { token, isLoading } = useAuthStore();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(glowOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Minimum splash duration of 2.5s for branding, plus wait for auth to finish loading
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (token) router.replace('/(tabs)');
        else router.replace('/auth/login');
      }
    }, 2600);
    
    // If auth finishes loading AFTER the 2.6s timer, redirect immediately
    if (!isLoading && opacity._value === 1) {
       // This handles the case where checkAuth takes longer than 2.6s
       // but we don't want to overcomplicate the animation logic.
       // Actually a robust way is a combined effect.
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Use a second effect to handle the redirect safely when both conditions are met
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
    <LinearGradient colors={['#040710', '#070B14', '#0A1020']} style={styles.container}>
      {/* Glow background orbs */}
      <View style={[styles.orb, { top: '20%', left: '10%', backgroundColor: Colors.purple, opacity: 0.12 }]} />
      <View style={[styles.orb, { bottom: '25%', right: '5%', backgroundColor: Colors.cyan, opacity: 0.08 }]} />

      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />

        {/* Icon circle */}
        <View style={styles.iconCircle}>
          <View style={styles.iconInner}>
            <Text style={styles.iconEmoji}>📡</Text>
          </View>
        </View>

        <Text style={styles.appName}>قابلنى</Text>
        <Text style={styles.tagline}>تواصل. تعرّف. تميّز.</Text>
      </Animated.View>

      {/* Loading dots */}
      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, i === 1 && { backgroundColor: Colors.cyan }]} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  logoWrap: { alignItems: 'center' },
  glowRing: {
    position: 'absolute',
    width: 160, height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: Colors.cyan,
    shadowColor: Colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.cyanDim,
    borderWidth: 1, borderColor: Colors.glassBorderBright,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  iconInner: { alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 52 },
  appName: {
    fontSize: 42, fontWeight: '800', color: Colors.text,
    letterSpacing: 2, marginBottom: 8,
  },
  tagline: { fontSize: 15, color: Colors.textSecondary, letterSpacing: 1 },
  dots: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder },
});
