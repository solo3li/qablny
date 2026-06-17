import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'lucide-react-native';
import { GlassCard } from '../../components/GlassCard';

export default function MatchScreenWeb() {
  return (
    <LinearGradient colors={['#040710', '#070B14']} style={styles.container}>
      <GlassCard style={styles.card}>
        <Video color={Colors.cyan} size={64} style={{ marginBottom: 20 }} />
        <Text style={styles.title}>عذراً، الكاميرا غير مدعومة هنا</Text>
        <Text style={styles.subtitle}>
          ميزة المطابقة ومكالمات الفيديو الحية (LiveKit) تعتمد على تقنيات مخصصة للهواتف الذكية (Native WebRTC).
        </Text>
        <Text style={styles.subtitle}>
          يرجى تشغيل التطبيق على محاكي الأندرويد أو الآيفون باستخدام الأمر:
          {"\n\n"}
          npx expo run:android
        </Text>
      </GlassCard>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    padding: 32,
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  }
});
