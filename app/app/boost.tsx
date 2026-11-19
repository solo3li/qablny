import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Platform, ActivityIndicator, Alert 
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowRight, Zap, Globe, Clock, CheckCircle2, 
  ShieldCheck, Flame, Coins, Check 
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { GlassButton } from '../components/GlassButton';
import { GlassCard } from '../components/GlassCard';
import { matchSignalR } from '../src/api/matchSignalR';
import { useAuthStore } from '../src/store/authStore';

export default function BoostScreen() {
  const { user, checkAuth } = useAuthStore();
  const [isBoosted, setIsBoosted] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const fetchStatus = async () => {
    try {
      setChecking(true);
      const res = await matchSignalR.getBoostStatus();
      if (res?.isBoosted) {
        setIsBoosted(true);
        setExpiresIn(res.expiresInSeconds || 0);
      } else {
        setIsBoosted(false);
        setExpiresIn(0);
      }
    } catch (e) {
      console.warn('Failed to fetch boost status', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleActivateBoost = async () => {
    if (loading) return;
    try {
      setLoading(true);
      const res = await matchSignalR.boost();
      setIsBoosted(true);
      setExpiresIn(res.expiresInSeconds || 1800);
      await checkAuth();
      const msg = res.message || 'تم تفعيل ميزة البوست بنجاح! لديك الأولوية القصوى في طابور المطابقة.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('نجاح', msg);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'حدث خطأ أثناء تفعيل البوست';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('تنبيه', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const minutesRemaining = Math.max(1, Math.round(expiresIn / 60));

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
              (document.activeElement as HTMLElement)?.blur?.();
            }
            router.back();
          }}
          accessibilityLabel="رجوع"
        >
          <ArrowRight color={Colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ميزة البوست</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={Colors.gradPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIconBadge}
          >
            <Zap color="#FFFFFF" size={40} fill="#FFFFFF" />
          </LinearGradient>

          <Text style={styles.heroTitle}>أولوية المطابقة القصوى</Text>
          <Text style={styles.heroSubtitle}>
            ضاعف فرصك في التواصل بالفيديو وكن دائماً في صدارة طابور المطابقة العشوائية أمام جميع المستخدمين.
          </Text>

          {/* Status Badge */}
          {checking ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
          ) : isBoosted ? (
            <View style={styles.activeBanner}>
              <View style={styles.activePill}>
                <Flame size={18} color="#10B981" fill="#10B981" />
                <Text style={styles.activePillText}>البوست نشط الآن</Text>
              </View>
              {expiresIn > 0 && (
                <Text style={styles.activeTimerText}>متبقي تقريباً {minutesRemaining} دقيقة أولوية</Text>
              )}
            </View>
          ) : (
            <View style={styles.inactivePill}>
              <Clock size={16} color={Colors.textSecondary} />
              <Text style={styles.inactivePillText}>غير مفعّل حالياً</Text>
            </View>
          )}
        </View>

        {/* Benefits Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>مميزات التفعيل</Text>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrap}>
              <Zap size={20} color={Colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>القفز إلى مقدمة الطابور</Text>
              <Text style={styles.benefitDesc}>يتم إدراجك في أعلى قائمة المطابقة فوراً دون أي انتظار.</Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrap}>
              <Globe size={20} color={Colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>تفضيل التوافق الجغرافي</Text>
              <Text style={styles.benefitDesc}>منح الأفضلية للفلاتر المختارة سواء الجنس أو المنطقة.</Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrap}>
              <ShieldCheck size={20} color={Colors.primary} />
            </View>
            <View style={styles.benefitTextWrap}>
              <Text style={styles.benefitTitle}>حماية ضد الخصم المزدوج</Text>
              <Text style={styles.benefitDesc}>في حال كان البوست مفعّلاً، لا يتم خصم عملات إضافية قبل انتهاء المدة.</Text>
            </View>
          </View>
        </View>

        {/* Balance Card & Action */}
        <View style={styles.bottomSection}>
          <View style={styles.coinBalanceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Coins size={22} color="#F59E0B" />
              <Text style={styles.balanceLabel}>رصيدك الحالي:</Text>
            </View>
            <Text style={styles.balanceValue}>{user?.coins ?? 0} عملة</Text>
          </View>

          {isBoosted ? (
            <GlassButton
              title="البوست مفعّل بالفعل"
              variant="outline"
              disabled={true}
              style={{ width: '100%', borderColor: Colors.online }}
            />
          ) : (
            <GlassButton
              title={loading ? 'جاري التفعيل...' : 'تفعيل البوست الآن (100 عملة)'}
              variant="primary"
              loading={loading}
              onPress={handleActivateBoost}
              style={{ width: '100%' }}
            />
          )}

          <TouchableOpacity 
            style={styles.rechargeLink} 
            onPress={() => router.push('/(tabs)/wallet' as any)}
          >
            <Text style={styles.rechargeLinkText}>تحتاج للمزيد من العملات؟ اشحن محفظتك هنا</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EAECEF',
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: { boxShadow: Colors.shadowCard } as any,
      default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16 },
    }),
  },
  heroIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: Colors.shadowGlow } as any,
      default: { elevation: 6, shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 12 },
    }),
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  activeBanner: {
    alignItems: 'center',
    gap: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  activePillText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#10B981',
  },
  activeTimerText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  inactivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  inactivePillText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
    marginBottom: 4,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: 18,
    padding: 16,
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 1 },
    }),
  },
  benefitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EAECEF',
    padding: 20,
    gap: 16,
    ...Platform.select({
      web: { boxShadow: Colors.shadowCard } as any,
      default: { elevation: 2 },
    }),
  },
  coinBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEF',
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
  },
  rechargeLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  rechargeLinkText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
