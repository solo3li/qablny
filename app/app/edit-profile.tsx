import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, TextInput, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Colors } from '../constants/Colors';
import { router } from 'expo-router';
import { ArrowRight, Camera, Save } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { axiosClient } from '../src/api/axiosClient';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const { user, checkAuth } = useAuthStore();
  
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState((user as any)?.bio || '');
  const [age, setAge] = useState((user as any)?.age?.toString() || '');
  const [location, setLocation] = useState((user as any)?.location || '');
  const [interests, setInterests] = useState((user as any)?.interests?.join('، ') || '');
  
  const [profileImage, setProfileImage] = useState(user?.profileImageUrl || null);
  const [loading, setLoading] = useState(false);
  
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, 'avatar.jpg');
      } else {
        const filename = uri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('file', {
          uri: uri.replace('file://', ''),
          name: filename,
          type,
        } as any);
      }

      await axiosClient.put('/users/me/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await checkAuth(); // Refresh user data
    } catch (e) {
      console.error('Image upload failed', e);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const interestsArray = interests.split('،').map((i: string) => i.trim()).filter((i: string) => i);
      
      await axiosClient.put('/users/me', {
        name,
        bio,
        age: parseInt(age, 10) || null,
        location,
        interests: interestsArray.length > 0 ? interestsArray : null
      });
      
      await checkAuth();
      router.back();
    } catch (e) {
      console.error('Profile update failed', e);
      alert('حدث خطأ أثناء تحديث الملف الشخصي');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>تعديل الملف الشخصي</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Avatar Editor */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image 
              source={{ uri: profileImage || 'https://i.pravatar.cc/300' }} 
              style={[styles.avatar, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]} 
            />
            <TouchableOpacity style={styles.cameraBtn} onPress={pickImage} disabled={loading}>
              <Camera size={20} color="#FFF" />
            </TouchableOpacity>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color="#FFF" />
              </View>
            )}
          </View>
        </View>

        {/* Form */}
        <GlassCard style={styles.formCard} tint="light">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="أدخل اسمك"
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>نبذة عنك (Bio)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="اكتب نبذة مختصرة عن نفسك..."
              placeholderTextColor={Colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>العمر</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="25"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>الموقع</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="المدينة، الدولة"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاهتمامات (مفصولة بفاصلة)</Text>
            <TextInput
              style={styles.input}
              value={interests}
              onChangeText={setInterests}
              placeholder="السفر، الرياضة، الموسيقى..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </GlassCard>

        {/* Save Button */}
        <GlassButton
          title={loading ? "جاري الحفظ..." : "حفظ التغييرات"}
          variant="primary"
          icon={!loading ? <Save size={20} color="#FFF" /> : undefined}
          onPress={handleSave}
          disabled={loading}
          style={styles.saveBtn}
        />
        
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.glassBorderBright,
  },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: Colors.glassBorderBright },
  cameraBtn: {
    position: 'absolute',
    bottom: 0, right: 0,
    backgroundColor: Colors.primary,
    width: 36, height: 36,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.bg
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 60,
    alignItems: 'center', justifyContent: 'center'
  },
  
  formCard: { padding: 24, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.textSecondary, marginBottom: 8, marginLeft: 4, textAlign: 'right' },
  input: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1, borderColor: Colors.glassBorder,
    borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    textAlign: 'right'
  },
  textArea: { height: 100, paddingTop: 14 },
  row: { flexDirection: 'row' },
  
  saveBtn: { height: 56 }
});
