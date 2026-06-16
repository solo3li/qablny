import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { initDummyAuth } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogOut, Star, Coins, Users, Video, ChevronRight, Bell, Shield, HelpCircle } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, vipPlans } = useAppStore();
  const [showVip, setShowVip] = useState(false);

  useEffect(() => {
    if (!user) initDummyAuth();
  }, [user]);

  if (!user) return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.cyan} size="large" />
    </View>
  );

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  const menuItems = [
    { icon: <Bell color={Colors.cyan} size={20} />, label: 'الإشعارات', sub: 'مفعّلة' },
    { icon: <Shield color={Colors.purple} size={20} />, label: 'الخصوصية والأمان', sub: 'إعدادات الحماية' },
    { icon: <HelpCircle color={Colors.textSecondary} size={20} />, label: 'مركز المساعدة', sub: 'أسئلة وإجابات' },
  ];

  return (
    <LinearGradient colors={['#040710', '#070B14']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.image }} style={styles.avatar} />
            {user.isVip && (
              <View style={styles.vipRing}>
                <Star size={14} color={Colors.gold} fill={Colors.gold} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {user.location}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.locationText}>{user.age} سنة</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.locationText}>منذ {user.joinedDate}</Text>
          </View>

          {/* Interests */}
          <View style={styles.interests}>
            {user.interests.map(i => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestText}>{i}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <GlassCard style={styles.statsCard}>
          {[
            { label: 'مطابقات', value: user.totalMatches, emoji: '🎥' },
            { label: 'أصدقاء', value: user.friends, emoji: '👥' },
            { label: 'عملات', value: user.coins.toLocaleString(), emoji: '🪙' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.stat}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              {i < 2 && <View style={styles.statDiv} />}
            </React.Fragment>
          ))}
        </GlassCard>

        {/* VIP section */}
        {!user.isVip ? (
          <GlassCard style={styles.vipBanner} glowColor={Colors.gold} borderRadius={20}>
            <View style={styles.vipBannerContent}>
              <Text style={styles.vipBannerEmoji}>👑</Text>
              <View>
                <Text style={styles.vipBannerTitle}>ترقية إلى VIP</Text>
                <Text style={styles.vipBannerSub}>احصل على مميزات حصرية</Text>
              </View>
            </View>
            <GlassButton title="اشترك" variant="gold" size="sm" onPress={() => setShowVip(!showVip)} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.vipActiveBanner} glowColor={Colors.gold}>
            <Star size={18} color={Colors.gold} fill={Colors.gold} />
            <Text style={styles.vipActiveText}>أنت مشترك في VIP ✨</Text>
          </GlassCard>
        )}

        {/* VIP Plans */}
        {showVip && (
          <View style={styles.plansRow}>
            {vipPlans.map(plan => (
              <GlassCard key={plan.id} style={[styles.planCard, plan.isBest && styles.planBest]} glowColor={plan.isBest ? Colors.gold : undefined} borderRadius={18}>
                {plan.isBest && <View style={styles.bestBadge}><Text style={styles.bestText}>الأفضل</Text></View>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price} ر.س</Text>
                <Text style={styles.planPeriod}>/ {plan.period}</Text>
                <View style={styles.planFeatures}>
                  {plan.features.map(f => <Text key={f} style={styles.planFeature}>✓ {f}</Text>)}
                </View>
                <GlassButton title="اشترك" variant={plan.isBest ? 'gold' : 'ghost'} size="sm" style={{ marginTop: 12 }} />
              </GlassCard>
            ))}
          </View>
        )}

        {/* Settings menu */}
        <GlassCard style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIcon}>{item.icon}</View>
                  <View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuSub}>{item.sub}</Text>
                  </View>
                </View>
                <ChevronRight color={Colors.textMuted} size={18} />
              </TouchableOpacity>
              {i < menuItems.length - 1 && <View style={styles.menuDiv} />}
            </React.Fragment>
          ))}
        </GlassCard>

        {/* Logout */}
        <GlassButton
          title="تسجيل الخروج"
          variant="danger"
          icon={<LogOut color={Colors.danger} size={18} />}
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: Colors.glassBorderBright },
  vipRing: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.goldDim, borderRadius: 14, padding: 6, borderWidth: 1, borderColor: Colors.gold + '99' },
  name: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  bio: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 10 },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 16 },
  locationText: { fontSize: 13, color: Colors.textMuted },
  dot: { color: Colors.textMuted },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  interestTag: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.glassBorder },
  interestText: { color: Colors.textSecondary, fontSize: 13 },
  statsCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, padding: 20 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted },
  statDiv: { width: 1, backgroundColor: Colors.glassBorder },
  vipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 16, padding: 16 },
  vipBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vipBannerEmoji: { fontSize: 32 },
  vipBannerTitle: { fontSize: 16, fontWeight: '700', color: Colors.gold },
  vipBannerSub: { fontSize: 13, color: Colors.textMuted },
  vipActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 16, padding: 16 },
  vipActiveText: { fontSize: 15, fontWeight: '700', color: Colors.gold },
  plansRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16 },
  planCard: { flex: 1, padding: 14, alignItems: 'center' },
  planBest: { borderColor: Colors.gold },
  bestBadge: { backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  bestText: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
  planName: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  planPrice: { fontSize: 24, fontWeight: '800', color: Colors.gold },
  planPeriod: { fontSize: 12, color: Colors.textMuted, marginBottom: 10 },
  planFeatures: { gap: 4, width: '100%' },
  planFeature: { fontSize: 11, color: Colors.textSecondary },
  menuCard: { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  menuDiv: { height: 1, backgroundColor: Colors.glassBorder, marginHorizontal: 16 },
  logoutBtn: { marginHorizontal: 16 },
});
