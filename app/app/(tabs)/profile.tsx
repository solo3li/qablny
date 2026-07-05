import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../src/store/authStore';
import { axiosClient } from '../../src/api/axiosClient';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { router } from 'expo-router';
import { LogOut, Star, Coins, Users, Video, ChevronRight, Bell, Shield, HelpCircle, Wallet } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, checkAuth } = useAuthStore();
  const [showVip, setShowVip] = useState(false);
  const [vipPlans, setVipPlans] = useState<any[]>([]);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

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

  const handleJoinAgency = async () => {
    if (!inviteCode.trim()) return alert('الرجاء إدخال كود الدعوة');
    try {
      await axiosClient.post('/users/me/agency/join', { inviteCode });
      alert('تم الانضمام للوكالة بنجاح!');
      setShowAgencyModal(false);
      setInviteCode('');
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.Message || 'حدث خطأ، تأكد من صحة كود الدعوة');
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
    { icon: <Users color={Colors.primary} size={20} />, label: 'الوكالات', sub: 'الانضمام لوكالة', onPress: () => setShowAgencyModal(true) },
    { icon: <Bell color={Colors.secondary} size={20} />, label: 'الإشعارات', sub: 'مفعّلة', onPress: () => router.push('/notifications' as any) },
    { icon: <Shield color={Colors.cyan} size={20} />, label: 'الخصوصية والأمان', sub: 'إعدادات الحماية', onPress: () => router.push('/privacy' as any) },
    { icon: <HelpCircle color={Colors.textMuted} size={20} />, label: 'مركز المساعدة', sub: 'نظام التذاكر', onPress: () => router.push('/support' as any) },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Header */}
        <View style={styles.header}>
          {/* Top icons: Notifications + Wallet */}
          <View style={styles.profileTopIcons}>
            <TouchableOpacity style={styles.profileTopIconBtn} onPress={() => router.push('/notifications' as any)}>
              <Bell color={Colors.textMuted} size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileTopIconBtn} onPress={() => router.push('/(tabs)/wallet' as any)}>
              <Wallet color={Colors.primary} size={22} />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.profileImageUrl || 'https://i.pravatar.cc/300' }} style={[styles.avatar, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]} />
            {user.isVip && (
              <View style={[styles.vipRing, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}>
                <Star size={14} color={Colors.primary} fill={Colors.primary} />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.bio}>{(user as any).bio}</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>📍 {(user as any).location}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.locationText}>{(user as any).age} سنة</Text>
          </View>

          {/* Interests */}
          {(user as any).interests && (user as any).interests.length > 0 && (
            <View style={styles.interests}>
              {(user as any).interests.map((i: string) => (
                <View key={i} style={[styles.interestTag, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}>
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
                  {plan.features.map((f: string) => <Text key={f} style={styles.planFeature}>✓ {f}</Text>)}
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
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIcon, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}>
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

      {/* Agency Modal */}
      <Modal visible={showAgencyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent} tint="secondary">
            <Text style={styles.modalTitle}>الانضمام إلى وكالة</Text>
            <Text style={styles.modalSub}>أدخل كود الدعوة الذي حصلت عليه من مدير الوكالة الخاصة بك.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="مثال: TEST1234"
              placeholderTextColor={Colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <GlassButton title="انضمام" variant="primary" onPress={handleJoinAgency} style={{ flex: 1 }} />
              <GlassButton title="إلغاء" variant="outline" onPress={() => setShowAgencyModal(false)} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  profileTopIcons: { flexDirection: 'row', gap: 10, alignSelf: 'flex-end', marginBottom: 12, marginTop: -10 },
  profileTopIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorderBright, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF' },
  vipRing: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.surface, borderRadius: 100, padding: 8, borderWidth: 1, borderColor: Colors.glassBorderBright },
  name: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 6 },
  bio: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 10, fontFamily: 'PlusJakartaSans_500Medium' },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 16 },
  locationText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold' },
  dot: { color: Colors.textMuted },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  interestTag: { backgroundColor: Colors.surface, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.glassBorderBright },
  interestText: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  statsCard: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 24, padding: 20 },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 28 },
  statValue: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  statLabel: { fontSize: 14, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold' },
  statDiv: { width: 2, backgroundColor: Colors.glassBorder, borderRadius: 2 },
  vipBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginBottom: 24, padding: 20 },
  vipBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vipBannerEmoji: { fontSize: 32 },
  vipBannerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  vipBannerSub: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  vipActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 24, marginBottom: 24, padding: 20 },
  vipActiveText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  plansRow: { flexDirection: 'row', gap: 10, marginHorizontal: 24, marginBottom: 24 },
  planCard: { flex: 1, padding: 16, alignItems: 'center' },
  planBest: { borderColor: Colors.primary },
  bestBadge: { backgroundColor: Colors.surface, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  bestText: { color: Colors.primary, fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  planName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 4 },
  planPrice: { fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.primary },
  planPeriod: { fontSize: 13, color: Colors.textMuted, marginBottom: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  planFeatures: { gap: 6, width: '100%', alignItems: 'center' },
  planFeature: { fontSize: 12, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  menuCard: { marginHorizontal: 24, marginBottom: 24, overflow: 'hidden', padding: 0 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  menuSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2, fontFamily: 'PlusJakartaSans_600SemiBold' },
  menuDiv: { height: 2, backgroundColor: Colors.glassBorder, marginHorizontal: 20 },
  logoutBtn: { marginHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 8 },
  modalSub: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalInput: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: Colors.glassBorderBright, borderRadius: 12, padding: 16, color: Colors.text, fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' }
});
