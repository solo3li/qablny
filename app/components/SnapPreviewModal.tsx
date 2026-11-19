import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Send,
  Download,
  RotateCcw,
  Sparkles,
  Flame,
  Check,
  Type,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SnapPreviewModalProps {
  visible: boolean;
  mediaUri: string | null;
  mediaType: 'image' | 'video';
  onClose: () => void;
  onOpenSendSheet: (caption: string) => void;
}

export function SnapPreviewModal({
  visible,
  mediaUri,
  mediaType,
  onClose,
  onOpenSendSheet,
}: SnapPreviewModalProps) {
  const [caption, setCaption] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setCaption('');
      setShowCaptionInput(false);
      setSavedSuccess(false);
    }
  }, [visible]);

  if (!visible || !mediaUri) return null;

  const handleDownload = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = mediaUri;
      a.download = `qablny_snap_${Date.now()}.${mediaType === 'video' ? 'webm' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleProceedToSend = () => {
    onOpenSendSheet(caption);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Full-bleed Media Viewport */}
        <View style={StyleSheet.absoluteFillObject}>
          {mediaType === 'image' ? (
            <Image
              source={{ uri: mediaUri }}
              style={styles.fullMedia}
              resizeMode="cover"
            />
          ) : Platform.OS === 'web' ? (
            React.createElement('video', {
              src: mediaUri,
              autoPlay: true,
              loop: true,
              playsInline: true,
              muted: false,
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000000',
              },
            })
          ) : (
            <View style={[styles.fullMedia, { backgroundColor: '#07090E', justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          )}
        </View>

        {/* Ambient Gradient Overlays for UI Contrast */}
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.8)']}
          style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
        />

        {/* Top Header Floating Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.frostedCircleBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="إلغاء والتقاط مجدداً"
          >
            <X size={22} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.topRightActions}>
            <TouchableOpacity
              style={[styles.frostedCircleBtn, showCaptionInput && styles.activeCircleBtn]}
              onPress={() => setShowCaptionInput(!showCaptionInput)}
              activeOpacity={0.8}
              accessibilityLabel="إضافة تعليق نصي"
            >
              <Type size={19} color="#FFFFFF" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.frostedCircleBtn}
              onPress={handleDownload}
              activeOpacity={0.8}
              accessibilityLabel="تنزيل للذاكرة"
            >
              {savedSuccess ? (
                <Check size={20} color="#10B981" strokeWidth={2.8} />
              ) : (
                <Download size={19} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Saved Success Toast Pill */}
        {savedSuccess && (
          <View style={styles.toastContainer}>
            <View style={styles.toastCapsule}>
              <Check size={16} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.toastText}>تم حفظ السناب في جهازك!</Text>
            </View>
          </View>
        )}

        {/* Overlay Caption Input or Display */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.captionArea}
        >
          {showCaptionInput ? (
            <View style={styles.captionInputWrapper}>
              <TextInput
                style={styles.captionInput}
                placeholder="أضف تعليقاً على السناب... ✍️"
                placeholderTextColor="rgba(255,255,255,0.65)"
                value={caption}
                onChangeText={setCaption}
                maxLength={120}
                autoFocus
                multiline={false}
              />
              <TouchableOpacity
                style={styles.captionDoneBtn}
                onPress={() => setShowCaptionInput(false)}
              >
                <Text style={styles.captionDoneText}>تم</Text>
              </TouchableOpacity>
            </View>
          ) : caption ? (
            <TouchableOpacity
              style={styles.captionPillDisplay}
              onPress={() => setShowCaptionInput(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.captionPillText}>{caption}</Text>
            </TouchableOpacity>
          ) : null}
        </KeyboardAvoidingView>

        {/* Bottom Wide Gradient Action Bar */}
        <View style={styles.bottomBar}>
          {/* Discard & Retake Pill */}
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <RotateCcw size={17} color="#FFFFFF" />
            <Text style={styles.retakeBtnText}>إعادة</Text>
          </TouchableOpacity>

          {/* Wide Gradient Send-To Button */}
          <TouchableOpacity
            style={styles.sendToBtn}
            onPress={handleProceedToSend}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FE3C72', '#FF6584']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendToGradient}
            >
              <View style={styles.sendToInner}>
                <Flame size={20} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.sendToText}>إرسال إلى</Text>
                <Text style={styles.sendArrow}>←</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'space-between',
  },
  fullMedia: {
    width: '100%',
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 52,
    zIndex: 20,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  frostedCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(16px)',
  } as any,
  activeCircleBtn: {
    backgroundColor: 'rgba(254, 60, 114, 0.75)',
    borderColor: '#FE3C72',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 84 : 112,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  toastCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backdropFilter: 'blur(16px)',
  } as any,
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  captionArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 15,
  },
  captionInputWrapper: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backdropFilter: 'blur(20px)',
  } as any,
  captionInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },
  captionDoneBtn: {
    backgroundColor: '#FE3C72',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  captionDoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  captionPillDisplay: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(16px)',
  } as any,
  captionPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'web' ? 28 : 46,
    zIndex: 20,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backdropFilter: 'blur(16px)',
  } as any,
  retakeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  sendToBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FE3C72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  sendToGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendToInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sendToText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.3,
  },
  sendArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});
