import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Globe, Users, Star } from 'lucide-react-native';

const regions = ['العالم', 'الشرق الأوسط', 'الخليج العربي', 'شمال أفريقيا', 'أوروبا', 'أمريكا الشمالية', 'آسيا'];

export default function ExploreScreen() {
  const { filterGender, filterRegion, setFilterGender, setFilterRegion } = useAppStore();
  const [ageRange, setAgeRange] = useState([18, 35]);

  const genderOptions = [
    { key: 'all', label: 'الكل', emoji: '👥' },
    { key: 'female', label: 'إناث', emoji: '👩' },
    { key: 'male', label: 'ذكور', emoji: '👨' },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>فلاتر البحث</Text>
          <Text style={styles.subtitle}>خصّص تجربة المطابقة الخاصة بك</Text>
        </View>

        {/* Gender Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users color={Colors.cyan} size={18} />
            <Text style={styles.sectionTitle}>الجنس</Text>
          </View>
          <View style={styles.optionsRow}>
            {genderOptions.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionBtn, 
                  filterGender === opt.key && styles.optionBtnActive,
                  Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null
                ]}
                onPress={() => setFilterGender(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, filterGender === opt.key && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Star color={Colors.primary} size={18} />
            <Text style={styles.sectionTitle}>الفئة العمرية</Text>
          </View>
          <GlassCard style={styles.ageCard} tint="light">
            <View style={styles.ageRow}>
              <Text style={styles.ageLabel}>من</Text>
              <View style={[styles.ageValueBox, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}><Text style={styles.ageValue}>{ageRange[0]}</Text></View>
              <Text style={styles.ageLabel}>إلى</Text>
              <View style={[styles.ageValueBox, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}><Text style={styles.ageValue}>{ageRange[1]}</Text></View>
              <Text style={styles.ageLabel}>سنة</Text>
            </View>
            <View style={styles.ageBtns}>
              {[[18,25],[18,35],[20,40],[25,50]].map(r => (
                <TouchableOpacity
                  key={r.join('-')}
                  style={[
                    styles.agePreset, 
                    ageRange[0] === r[0] && ageRange[1] === r[1] && styles.agePresetActive,
                    Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null
                  ]}
                  onPress={() => setAgeRange(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.agePresetText, ageRange[0] === r[0] && ageRange[1] === r[1] && { color: Colors.primary }]}>
                    {r[0]}-{r[1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>

        {/* Region Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>المنطقة الجغرافية</Text>
          </View>
          <View style={styles.regionsGrid}>
            {regions.map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.regionBtn, 
                  filterRegion === r && styles.regionBtnActive,
                  Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null
                ]}
                onPress={() => setFilterRegion(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.regionText, filterRegion === r && styles.regionTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Apply */}
        <GlassButton title="تطبيق الفلاتر ✓" variant="primary" style={styles.applyBtn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 60, paddingHorizontal: 24, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  section: { marginHorizontal: 24, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, flex: 1 },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 24, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorderBright },
  optionBtnActive: { backgroundColor: Colors.cyanDim, borderColor: Colors.cyan },
  optionEmoji: { fontSize: 28 },
  optionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  optionLabelActive: { color: Colors.cyan },
  ageCard: { padding: 20 },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  ageLabel: { fontSize: 15, color: Colors.textSecondary, fontWeight: '700' },
  ageValueBox: { backgroundColor: Colors.surfaceHover, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.glassBorder },
  ageValue: { fontSize: 18, fontWeight: '800', color: Colors.primary },
  ageBtns: { flexDirection: 'row', gap: 8 },
  agePreset: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorderBright },
  agePresetActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  agePresetText: { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  regionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  regionBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 100, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorderBright },
  regionBtnActive: { backgroundColor: Colors.secondaryDim, borderColor: Colors.secondary },
  regionText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '700' },
  regionTextActive: { color: Colors.secondary },
  applyBtn: { marginHorizontal: 24 },
});
