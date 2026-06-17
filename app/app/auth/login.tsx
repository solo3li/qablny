import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { GlassButton } from '../../components/GlassButton';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
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
      setErrorMsg(err.response?.data || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#040710', '#070B14', '#0A1020']} style={styles.container}>
      <View style={[styles.orb, { top: -60, right: -60 }]} />
      <View style={[styles.orb2, { bottom: -80, left: -60 }]} />

      <View style={styles.header}>
        <Text style={styles.logo}>📡 قابلنى</Text>
        <Text style={styles.subtitle}>تواصل بلا حدود</Text>
      </View>

      {/* Tab switcher */}
      <GlassCard style={styles.tabBar} borderRadius={14}>
        {(['login', 'register'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
            </Text>
          </TouchableOpacity>
        ))}
      </GlassCard>

      {/* Form */}
      <GlassCard style={styles.form} glowColor={Colors.cyan}>
        {tab === 'register' && (
          <View style={styles.inputRow}>
            <User color={Colors.textMuted} size={18} />
            <TextInput style={styles.input} placeholder="الاسم الكامل" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
          </View>
        )}
        <View style={styles.inputRow}>
          <Phone color={Colors.textMuted} size={18} />
          <TextInput style={styles.input} placeholder="الإيميل" placeholderTextColor={Colors.textMuted} keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />
        </View>
        <View style={styles.inputRow}>
          <Lock color={Colors.textMuted} size={18} />
          <TextInput style={styles.input} placeholder="كلمة المرور" placeholderTextColor={Colors.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
        </View>

        {errorMsg ? <Text style={{color: Colors.error, textAlign: 'center'}}>{errorMsg}</Text> : null}

        {tab === 'login' && (
          <TouchableOpacity style={styles.forgot}>
            <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
          </TouchableOpacity>
        )}

        <GlassButton
          title={loading ? 'جاري الدخول...' : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
          size="lg"
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
          title="دخول تجريبي (Dummy) 🧪"
          variant="ghost"
          onPress={() => {
            setEmail('admin@qablny.com');
            setPassword('Password123');
            setTab('login');
          }}
          style={styles.dummyBtn}
        />
      </GlassCard>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  orb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: Colors.cyan, opacity: 0.05 },
  orb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.purple, opacity: 0.07 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: Colors.text, letterSpacing: 1, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.textSecondary },
  tabBar: { flexDirection: 'row', marginBottom: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright },
  tabText: { color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.cyan },
  form: { padding: 24, gap: 14 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
  forgot: { alignItems: 'flex-start' },
  forgotText: { color: Colors.cyan, fontSize: 13 },
  submitBtn: { marginTop: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.glassBorder },
  divText: { color: Colors.textMuted, fontSize: 13 },
  dummyBtn: {},
});
