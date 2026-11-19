import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useAuthStore } from '../../src/store/authStore';
import { axiosClient } from '../../src/api/axiosClient';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { router, Link } from 'expo-router';
import { LogOut, Crown, Coins, Users, Video, ChevronRight, Bell, Shield, HelpCircle, Wallet, Edit2, MapPin, Check, Zap } from 'lucide-react-native';

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
    { icon: <Bell color={Colors.secondary} size={20} />, label: 'الإشعارات', sub: 'مفعّلة', href: '/notifications' },
    { icon: <Shield color={Colors.cyan} size={20} />, label: 'الخصوصية والأمان', sub: 'إعدادات الحماية', href: '/privacy' },
    { icon: <HelpCircle color={Colors.textMuted} size={20} />, label: 'مركز المساعدة', sub: 'نظام التذاكر', href: '/support' },
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
            <TouchableOpacity style={styles.profileTopIconBtn} onPress={() => router.push('/edit-profile' as any)}>
              <Edit2 color={Colors.secondary} size={22} />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.profileImageUrl || 'https://i.pravatar.cc/300' }} style={[styles.avatar, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]} />
            {user.isVip && (
              <View style={[styles.vipRing, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}>
                <Crown size={14} color="#F59E0B" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.bio}>{(user as any).bio}</Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={Colors.textMuted} />
            <Text style={styles.locationText}>{(user as any).location || 'غير محدد'}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.locationText}>{(user as any).age ? `${(user as any).age} سنة` : ''}</Text>
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

        {/* Fluid Open Stats (No Boxy Card) */}
        <View style={styles.fluidStatsRow}>
          <View style={styles.fluidStatItem}>
            <View style={styles.fluidStatIconBox}>
              <Coins size={22} color="#F59E0B" />
            </View>
            <Text style={styles.fluidStatValue}>{user.coins?.toLocaleString() || '0'}</Text>
            <Text style={styles.fluidStatLabel}>رصيد العملات</Text>
          </View>
        </View>

        {/* Fluid Seamless VIP Banner (No boxed borders) */}
        {!user.isVip ? (
          <View style={styles.fluidVipBanner}>
            <LinearGradient
              colors={['rgba(254, 60, 114, 0.08)', 'rgba(255, 101, 132, 0.03)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fluidVipGradient}
            >
              <View style={styles.fluidVipContent}>
                <View style={styles.vipCrownBadge}>
                  <Crown size={22} color="#FE3C72" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fluidVipTitle}>عضوية VIP المتميزة</Text>
                  <Text style={styles.fluidVipSub}>أولوية اتصال ومميزات حصرية</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.fluidVipBtn}
                onPress={() => setShowVip(!showVip)}
                activeOpacity={0.85}
              >
                <Text style={styles.fluidVipBtnText}>{showVip ? 'إغلاق' : 'ترقية الآن'}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.fluidVipActiveBanner}>
            <View style={styles.vipCrownBadgeActive}>
              <Crown size={18} color="#F59E0B" />
            </View>
            <Text style={styles.fluidVipActiveText}>عضويتك VIP نشطة ومفعّلة</Text>
          </View>
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
                  {(plan.features || []).map((f: string) => (
                    <View key={f} style={styles.featureItemRow}>
                      <Check size={13} color={Colors.primary} />
                      <Text style={styles.planFeature}>{f}</Text>
                    </View>
                  ))}
                </View>
                <GlassButton title="اشترك" variant={plan.isBest ? 'primary' : 'outline'} style={{ marginTop: 12, height: 40, width: '100%' }} onPress={() => handleSubscribe(plan.id)} />
              </GlassCard>
            ))}
          </View>
        )}

        {/* Fluid Settings Menu (Seamless borderless list with subtle 0.5px dividers) */}
        <View style={styles.fluidMenuList}>
          {menuItems.map((item, i) => {
            const handlePress = () => {
              if (item.href) {
                router.push(item.href as any);
              } else if (item.onPress) {
                item.onPress();
              }
            };

            return (
              <React.Fragment key={item.label}>
                <TouchableOpacity 
                  style={styles.fluidMenuItem} 
                  onPress={handlePress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuLeft}>
                    <View style={styles.fluidMenuIcon}>
                      {item.icon}
                    </View>
                    <View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSub}>{item.sub}</Text>
                    </View>
                  </View>
                  <ChevronRight color={Colors.textMuted} size={18} />
                </TouchableOpacity>
                {i < menuItems.length - 1 && <View style={styles.fluidMenuDivider} />}
              </React.Fragment>
            );
          })}
        </View>

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
  profileTopIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAECEF', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF' },
  vipRing: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 100, padding: 8, borderWidth: 1, borderColor: '#EAECEF' },
  name: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 6 },
  bio: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 10, fontFamily: 'PlusJakartaSans_500Medium' },
  locationRow: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 16 },
  locationText: { fontSize: 14, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_700Bold' },
  dot: { color: Colors.textMuted },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  interestTag: { backgroundColor: '#FFFFFF', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#EAECEF' },
  interestText: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  // Fluid Open Stats
  fluidStatsRow: {
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fluidStatItem: {
    alignItems: 'center',
    gap: 6,
  },
  fluidStatIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
    }),
  },
  fluidStatValue: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  fluidStatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },

  // Fluid VIP Banner
  fluidVipBanner: {
    marginHorizontal: 24,
    marginBottom: 28,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(254, 60, 114, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(254, 60, 114, 0.12)',
  },
  fluidVipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    gap: 12,
  },
  fluidVipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vipCrownBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(254, 60, 114, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipCrownBadgeActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fluidVipTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
  },
  fluidVipSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 2,
  },
  fluidVipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(254, 60, 114, 0.25)' } as any,
      default: { elevation: 3 },
    }),
  },
  fluidVipBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  fluidVipActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 28,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  fluidVipActiveText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
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

  // Fluid Settings Menu
  fluidMenuList: {
    marginHorizontal: 24,
    marginBottom: 28,
    backgroundColor: 'transparent',
  },
  fluidMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fluidMenuIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)' } as any,
      default: { elevation: 1 },
    }),
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  fluidMenuDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginHorizontal: 8,
  },
  logoutBtn: { marginHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalContent: { padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 8 },
  modalSub: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalInput: { width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: Colors.glassBorderBright, borderRadius: 12, padding: 16, color: Colors.text, fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center', marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' }
});
