import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../src/store/authStore';
import { axiosClient } from '../../src/api/axiosClient';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { router } from 'expo-router';
import { LogOut, Star, Coins, Users, Video, ChevronRight, Bell, Shield, HelpCircle } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, checkAuth } = useAuthStore();
  const [showVip, setShowVip] = useState(false);
  const [vipPlans, setVipPlans] = useState<any[]>([]);

  useEffect(() => {
    axiosClient.get('/vip/plans').then(res => setVipPlans(res.data)).catch(console.error);
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      await axiosClient.post(`/vip/subscribe/${planId}`);
      await checkAuth(); // Refresh user data to get VIP status
      setShowVip(false);
      alert('تم الاشتراك بنجاح!');
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء الاشتراك');
    }
  };

  if (!user) return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  const menuItems = [
    { icon: <Bell color={Colors.secondary} size={20} />, label: 'الإشعارات', sub: 'مفعّلة' },
    { icon: <Shield color={Colors.cyan} size={20} />, label: 'الخصوصية والأمان', sub: 'إعدادات الحماية' },
    { icon: <HelpCircle color={Colors.textMuted} size={20} />, label: 'مركز المساعدة', sub: 'أسئلة وإجابات' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.profileImageUrl || 'https://i.pravatar.cc/300' }} style={[styles.avatar, Platform.OS === 'web' ? { boxShadow: Colors.clayShadowBase } as any : null]} />
            {user.isVip && (
              <View style={[styles.vipRing, Platform.OS === 'web' ? { boxShadow: Colors.clayShadowPrimary } as any : null]}>
                <Star size={14} color={Colors.primary} fill={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {user.location}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.locationText}>{user.age} سنة</Text>
          </View>

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <View style={styles.interests}>
              {user.interests.map(i => (
                <View key={i} style={[styles.interestTag, Platform.OS === 'web' ? { boxShadow: Colors.clayShadowBase } as any : null]}>
                  <Text style={styles.interestText}>{i}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats */}
        <GlassCard style={styles.statsCard} tint="light">
          {[
            { label: 'عملات', value: user.coins?.toLocaleString() || '0', emoji: '🪙' },
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
          <GlassCard style={styles.vipBanner} tint="primary">
            <View style={styles.vipBannerContent}>
              <Text style={styles.vipBannerEmoji}>👑</Text>
              <View>
                <Text style={styles.vipBannerTitle}>ترقية إلى VIP</Text>
                <Text style={styles.vipBannerSub}>احصل على مميزات حصرية</Text>
              </View>
            </View>
            <GlassButton title="اشترك" variant="primary" onPress={() => setShowVip(!showVip)} style={{ height: 40, paddingHorizontal: 16 }} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.vipActiveBanner} tint="primary">
            <Star size={18} color={Colors.primary} fill={Colors.primary} />
            <Text style={styles.vipActiveText}>أنت مشترك في VIP ✨</Text>
          </GlassCard>
        )}

        {/* VIP Plans */}
        {showVip && (
          <View style={styles.plansRow}>
            {vipPlans.map(plan => (
              <GlassCard key={plan.id} style={[styles.planCard, plan.isBest && styles.planBest]} tint={plan.isBest ? 'primary' : 'light'}>
                {plan.isBest && <View style={styles.bestBadge}><Text style={styles.bestText}>الأفضل</Text></View>}
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{plan.price} ر.س</Text>
                <Text style={styles.planPeriod}>/ {plan.period}</Text>
                <View style={styles.planFeatures}>
                  {plan.features.map(f => <Text key={f} style={styles.planFeature}>✓ {f}</Text>)}
                </View>
                <GlassButton title="اشترك" variant={plan.isBest ? 'primary' : 'outline'} style={{ marginTop: 12, height: 40, width: '100%' }} onPress={() => handleSubscribe(plan.id)} />
              </GlassCard>
            ))}
          </View>
        )}

        {/* Settings menu */}
        <GlassCard style={styles.menuCard} tint="light">
          {menuItems.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, Platform.OS === 'web' ? { boxShadow: Colors.clayShadowActive } as any : null]}>
                    {item.icon}
                  </View>
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
          icon={<LogOut color="#FFF" size={18} />}
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF' },
  vipRing: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.bgDeep, borderRadius: 100, padding: 8, borderWidth: 1, borderColor: Colors.primary },
  name: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  bio: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 10, fontWeight: '500' },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 16 },
  locationText: { fontSize: 14, color: Colors.textMuted, fontWeight: '700' },
  dot: { color: Colors.textMuted },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  interestTag: { backgroundColor: Colors.bgDeep, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#FFFFFF' },
  interestText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  statsCard: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 24, padding: 20 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 14, color: Colors.textMuted, fontWeight: '700' },
  statDiv: { width: 2, backgroundColor: Colors.glassBorder, borderRadius: 2 },
  vipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 24, padding: 20 },
  vipBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vipBannerEmoji: { fontSize: 32 },
  vipBannerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  vipBannerSub: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  vipActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, marginBottom: 24, padding: 20 },
  vipActiveText: { fontSize: 16, fontWeight: '800', color: Colors.text },
  plansRow: { flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 24 },
  planCard: { flex: 1, padding: 16, alignItems: 'center' },
  planBest: { borderColor: Colors.primary },
  bestBadge: { backgroundColor: Colors.bgDeep, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  bestText: { color: Colors.primary, fontSize: 12, fontWeight: '800' },
  planName: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  planPrice: { fontSize: 26, fontWeight: '800', color: Colors.primary },
  planPeriod: { fontSize: 13, color: Colors.textMuted, marginBottom: 12, fontWeight: '600' },
  planFeatures: { gap: 6, width: '100%', alignItems: 'center' },
  planFeature: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  menuCard: { marginHorizontal: 24, marginBottom: 24, overflow: 'hidden', padding: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 16, fontWeight: '800', color: Colors.text },
  menuSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
  menuDiv: { height: 2, backgroundColor: Colors.glassBorder, marginHorizontal: 20 },
  logoutBtn: { marginHorizontal: 24 },
});
