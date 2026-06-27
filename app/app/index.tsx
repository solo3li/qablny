import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../src/store/authStore';

export default function SplashScreen() {
  const { token, isLoading } = useAuthStore();
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 6 }),
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
    <View style={styles.container}>
      {/* Decorative Orbs */}
      <View style={[styles.orb, { top: '10%', left: '-20%', backgroundColor: Colors.primaryDim }]} />
      <View style={[styles.orb, { bottom: '5%', right: '-10%', backgroundColor: Colors.secondaryDim, width: 200, height: 200 }]} />

      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>💖</Text>
        </View>

        <Text style={styles.appName}>Qablny</Text>
        <Text style={styles.tagline}>صنع بحب، للقاءات لطيفة.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
        <View style={[styles.dot, { backgroundColor: Colors.cyan }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  logoWrap: { alignItems: 'center' },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.bgDeep,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1, borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: `0px 12px 24px -8px rgba(210, 195, 180, 0.5)` },
      default: { shadowColor: '#D0C5B9', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 }
    })
  },
  iconEmoji: { fontSize: 44 },
  appName: {
    fontSize: 42, fontWeight: '800', color: Colors.primary,
    letterSpacing: 2, marginBottom: 16,
  },
  tagline: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 60, flexDirection: 'row', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, opacity: 0.8 },
});
