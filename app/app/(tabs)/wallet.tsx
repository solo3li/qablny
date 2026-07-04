import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Wallet, Gift, Star, ArrowUpRight, Zap } from 'lucide-react-native';

const packages = [
  { id: 1, coins: 100, price: '0.99', popular: false },
  { id: 2, coins: 500, price: '3.99', popular: true },
  { id: 3, coins: 1200, price: '8.99', popular: false },
  { id: 4, coins: 3000, price: '19.99', popular: false },
];

export default function WalletScreen() {
  const { user } = useAppStore();
  const [loading, setLoading] = useState<number | null>(null);

  // Mock purchase handler
  const handlePurchase = (pkg: any) => {
    setLoading(pkg.id);
    setTimeout(() => {
      setLoading(null);
      Alert.alert('تم الشراء بنجاح!', `تمت إضافة ${pkg.coins} عملة إلى رصيدك.`);
      // In reality, this would call POST /api/monetization/coins/purchase
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>المحفظة</Text>
          <Text style={styles.subtitle}>اشحن رصيدك لدعم المضيفين المفضلين لديك</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceContainer}>
          <GlassCard style={styles.balanceCard} tint="primary">
            <View style={styles.balanceHeader}>
              <Wallet color="#FFF" size={24} />
              <Text style={styles.balanceTitle}>رصيدك الحالي</Text>
            </View>
            <View style={styles.balanceAmountRow}>
              <Text style={styles.balanceAmount}>{user?.coins || 0}</Text>
              <Text style={styles.balanceCurrency}>عملة</Text>
            </View>
            <TouchableOpacity style={styles.historyBtn}>
              <Text style={styles.historyText}>سجل العمليات</Text>
              <ArrowUpRight color={Colors.cyan} size={16} />
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>باقات العملات</Text>
          <View style={styles.packagesGrid}>
            {packages.map((pkg) => (
              <View key={pkg.id} style={styles.packageWrapper}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handlePurchase(pkg)}
                  style={[
                    styles.packageCard,
                    pkg.popular && styles.packageCardPopular,
                    Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null
                  ]}
                >
                  {pkg.popular && (
                    <View style={styles.popularBadge}>
                      <Star color="#FFF" size={12} fill="#FFF" />
                      <Text style={styles.popularText}>الأكثر مبيعاً</Text>
                    </View>
                  )}
                  <View style={styles.coinsRow}>
                    <Zap color={pkg.popular ? '#FFF' : Colors.primary} size={24} fill={pkg.popular ? '#FFF' : Colors.primary} />
                    <Text style={[styles.coinsText, pkg.popular && { color: '#FFF' }]}>{pkg.coins}</Text>
                  </View>
                  <Text style={[styles.priceText, pkg.popular && { color: '#FFF' }]}>${pkg.price}</Text>
                  <View style={[styles.buyBtn, pkg.popular && styles.buyBtnPopular]}>
                    <Text style={[styles.buyBtnText, pkg.popular && { color: Colors.primary }]}>
                      {loading === pkg.id ? 'جاري...' : 'شراء'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* VIP Section */}
        <View style={styles.section}>
          <GlassCard style={styles.vipCard} tint="light">
            <View style={styles.vipContent}>
              <View style={styles.vipHeader}>
                <Star color={Colors.primary} size={24} fill={Colors.primary} />
                <Text style={styles.vipTitle}>باقة الـ VIP</Text>
              </View>
              <Text style={styles.vipDesc}>احصل على مميزات حصرية، علامة توثيق، وتخفيض 20% على كل الهدايا.</Text>
            </View>
            <GlassButton title="اشترك الآن" variant="primary" style={{ width: '100%' }} />
          </GlassCard>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold' },
  
  balanceContainer: { paddingHorizontal: 24, marginBottom: 30 },
  balanceCard: { padding: 24, backgroundColor: Colors.text, borderRadius: 24 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  balanceTitle: { fontSize: 16, color: '#FFF', fontFamily: 'PlusJakartaSans_600SemiBold' },
  balanceAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 20 },
  balanceAmount: { fontSize: 48, color: '#FFF', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  balanceCurrency: { fontSize: 16, color: Colors.cyan, fontFamily: 'PlusJakartaSans_700Bold' },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  historyText: { fontSize: 14, color: Colors.cyan, fontFamily: 'PlusJakartaSans_600SemiBold' },

  section: { paddingHorizontal: 24, marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 16 },
  packagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  packageWrapper: { width: '47%' },
  packageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    alignItems: 'center',
    position: 'relative',
  },
  packageCardPopular: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  popularText: { color: '#FFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 8 },
  coinsText: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  priceText: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 16 },
  buyBtn: {
    backgroundColor: Colors.surfaceHover,
    width: '100%',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  buyBtnPopular: {
    backgroundColor: '#FFF',
  },
  buyBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },

  vipCard: { padding: 20 },
  vipContent: { marginBottom: 16 },
  vipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  vipTitle: { fontSize: 18, color: Colors.text, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  vipDesc: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 22 },
});
