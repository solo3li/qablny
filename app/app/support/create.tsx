import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { axiosClient } from '../../src/api/axiosClient';
import { GlassButton } from '../../components/GlassButton';
import { router } from 'expo-router';

export default function CreateSupportTicketScreen() {
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim()) return alert('الرجاء كتابة عنوان المشكلة');
    setLoading(true);
    try {
      const res = await axiosClient.post('/support/tickets', { subject });
      router.replace(`/support/${res.data.id}` as any);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء فتح التذكرة');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>تذكرة دعم جديدة</Text>
        <Text style={styles.subtitle}>ما هي المشكلة التي تواجهك؟</Text>

        <TextInput
          style={styles.input}
          placeholder="مثال: مشكلة في الدفع، تبليغ عن مستخدم..."
          placeholderTextColor={Colors.textMuted}
          value={subject}
          onChangeText={setSubject}
          maxLength={100}
        />

        <GlassButton
          title={loading ? 'جاري الفتح...' : 'فتح التذكرة'}
          variant="primary"
          onPress={handleSubmit}
          disabled={loading}
          style={styles.btn}
        />
        <GlassButton
          title="إلغاء"
          variant="outline"
          onPress={() => router.back()}
          disabled={loading}
          style={styles.btn}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorderBright,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 24,
    textAlign: 'right'
  },
  btn: { marginBottom: 12, height: 50 }
});
