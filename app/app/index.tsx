import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuthStore } from '../src/store/authStore';

export default function SplashScreen() {
  const { token, isLoading } = useAuthStore();
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
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
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🕊️</Text>
        </View>

        <Text style={styles.appName}>Qablny</Text>
        <Text style={styles.tagline}>لقاءات مبنية على القيمة والجودة.</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>الرجاء الانتظار...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  logoWrap: { alignItems: 'center' },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.bgDeep,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  iconEmoji: { fontSize: 36 },
  appName: {
    fontSize: 40, fontWeight: '300', color: Colors.text,
    letterSpacing: 8, marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  tagline: { fontSize: 14, color: Colors.textSecondary, letterSpacing: 0.5, fontWeight: '400' },
  footer: { position: 'absolute', bottom: 60, alignItems: 'center' },
  footerText: { fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
});
