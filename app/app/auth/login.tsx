import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { GlassButton } from '../../components/GlassButton';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/Colors';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { User, Lock, Phone } from 'lucide-react-native';

export default function LoginScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const login = useAuthStore(s => s.login);

  const handleSubmit = async () => {
    if (!email || !password || (tab === 'register' && !name)) {
      setErrorMsg('الرجاء إدخال جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      if (tab === 'login') {
        const res = await axiosClient.post('/auth/login', { email, password });
        await login(res.data.accessToken, res.data.user);
      } else {
        const res = await axiosClient.post('/auth/register', { 
          email, 
          password, 
          name,
          age: 20,
          gender: 0,
          location: 'غير محدد'
        });
        await login(res.data.accessToken, res.data.user);
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.message || data?.error || (typeof data === 'string' ? data : 'حدث خطأ في الاتصال بالخادم');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Decorative Orbs */}
        <View style={[styles.orb, { top: -60, right: -60, backgroundColor: Colors.primaryDim }]} />
        <View style={[styles.orb2, { bottom: -80, left: -60, backgroundColor: Colors.secondaryDim }]} />

        <View style={styles.header}>
          <Text style={styles.logo}>💖 قابلنى</Text>
          <Text style={styles.subtitle}>تواصل بلا حدود</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabBar}>
          {(['login', 'register'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <GlassCard tint="light" style={styles.form}>
          {tab === 'register' && (
            <View style={styles.inputRow}>
              <User color={Colors.textMuted} size={20} />
              <TextInput style={styles.input} placeholder="الاسم الكامل" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
            </View>
          )}
          <View style={styles.inputRow}>
            <Phone color={Colors.textMuted} size={20} />
            <TextInput style={styles.input} placeholder="الإيميل" placeholderTextColor={Colors.textMuted} keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />
          </View>
          <View style={styles.inputRow}>
            <Lock color={Colors.textMuted} size={20} />
            <TextInput style={styles.input} placeholder="كلمة المرور" placeholderTextColor={Colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {errorMsg ? <Text style={{color: Colors.danger, textAlign: 'center', fontWeight: '800'}}>{errorMsg}</Text> : null}

          {tab === 'login' && (
            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
            </TouchableOpacity>
          )}

          <GlassButton
            title={loading ? 'جاري الدخول...' : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
            variant="primary"
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitBtn}
          />

          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>أو</Text>
            <View style={styles.divLine} />
          </View>

          <GlassButton
            title="دخول تجريبي (Dummy)"
            variant="outline"
            onPress={() => {
              setEmail('admin@qablny.com');
              setPassword('Password123');
              setTab('login');
            }}
            style={styles.dummyBtn}
          />
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  orb: { position: 'absolute', width: 250, height: 250, borderRadius: 125 },
  orb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 40, fontWeight: '800', color: Colors.primary, letterSpacing: 1, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  
  tabBar: { flexDirection: 'row', marginBottom: 20, padding: 6, backgroundColor: Colors.bgDeep, borderRadius: 100, ...Platform.select({
    web: { boxShadow: `0px 4px 12px rgba(210, 195, 180, 0.3)` },
    default: { shadowColor: '#D0C5B9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
  }) },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 100 },
  tabActive: { backgroundColor: Colors.primaryDim },
  tabText: { color: Colors.textMuted, fontWeight: '700', fontSize: 15 },
  tabTextActive: { color: Colors.primary, fontWeight: '800' },
  
  form: { padding: 24, gap: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgDeep, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1, borderColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: `inset 0px 4px 8px rgba(210, 195, 180, 0.2)` },
    })
  },
  input: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '600' },
  forgot: { alignItems: 'flex-start' },
  forgotText: { color: Colors.secondary, fontSize: 14, fontWeight: '700' },
  submitBtn: { marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 2, backgroundColor: Colors.glassBorder, borderRadius: 2 },
  divText: { color: Colors.textMuted, fontSize: 14, fontWeight: '800' },
  dummyBtn: {},
});
