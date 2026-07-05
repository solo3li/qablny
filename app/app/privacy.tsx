import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { Shield } from 'lucide-react-native';

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Shield color={Colors.cyan} size={48} />
          <Text style={styles.title}>الخصوصية والأمان</Text>
        </View>
        <Text style={styles.text}>
          نحن في "قابلني" نأخذ خصوصيتك وأمانك على محمل الجد. يتم تشفير جميع المحادثات وتأمين البيانات.
        </Text>
        <Text style={styles.text}>
          لأي استفسارات إضافية، يمكنك التواصل معنا عبر مركز المساعدة لإنشاء تذكرة دعم فني.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, paddingTop: 40 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginTop: 12 },
  text: { fontSize: 16, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 26, marginBottom: 16, textAlign: 'center' },
});
