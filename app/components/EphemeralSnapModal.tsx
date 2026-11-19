import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Flame, Eye } from 'lucide-react-native';
import { useChatStore } from '../src/store/chatStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EphemeralSnapModalProps {
  visible: boolean;
  mediaUrl: string | null;
  caption?: string | null;
  senderName?: string;
  senderAvatar?: string;
  durationSeconds?: number;
  messageId: string;
  friendId: string;
  onClose: () => void;
}

export function EphemeralSnapModal({
  visible,
  mediaUrl,
  caption,
  senderName = 'صديق',
  senderAvatar,
  durationSeconds = 10,
  messageId,
  friendId,
  onClose,
}: EphemeralSnapModalProps) {
  const { markSnapOpened } = useChatStore();
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const isVideo = mediaUrl?.includes('.mp4') || mediaUrl?.includes('.webm') || mediaUrl?.includes('.mov');

  useEffect(() => {
    if (visible && mediaUrl) {
      setSecondsLeft(durationSeconds);
      progressAnim.setValue(1);

      // Start Countdown Bar Animation
      const anim = Animated.timing(progressAnim, {
        toValue: 0,
        duration: durationSeconds * 1000,
        useNativeDriver: false,
      });
      anim.start();

      // Interval for second count
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, Math.ceil(durationSeconds - elapsed));
        setSecondsLeft(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          handleFinish();
        }
      }, 200);

      return () => {
        clearInterval(interval);
        anim.stop();
      };
    }
  }, [visible, mediaUrl, durationSeconds]);

  const handleFinish = () => {
    if (messageId && friendId) {
      markSnapOpened(messageId, friendId).catch(() => {});
    }
    onClose();
  };

  if (!visible || !mediaUrl) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleFinish}>
      <View style={styles.container}>
        {/* Full-bleed Media Viewport */}
        <View style={StyleSheet.absoluteFillObject}>
          {isVideo && Platform.OS === 'web' ? (
            React.createElement('video', {
              src: mediaUrl,
              autoPlay: true,
              playsInline: true,
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
            <Image
              source={{ uri: mediaUrl }}
              style={styles.fullImage}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Top Vignette Gradient for Readability */}
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topVignette}
        />

        {/* Top Countdown Progress Bar */}
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        {/* Top HUD Row */}
        <View style={styles.topHudRow}>
          {/* Sender Profile Group */}
          <View style={styles.senderGroup}>
            <Image
              source={{ uri: senderAvatar || 'https://i.pravatar.cc/150' }}
              style={styles.senderAvatar}
            />
            <View>
              <View style={styles.senderNameRow}>
                <Text style={styles.senderName}>{senderName}</Text>
                <View style={styles.streakIndicator}>
                  <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.streakText}>سناب</Text>
                </View>
              </View>
              <Text style={styles.ephemeralNotice}>مشاهدة لمرة واحدة ⏱️ {secondsLeft}ث</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleFinish}
            activeOpacity={0.8}
            accessibilityLabel="إغلاق السناب"
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Bottom Caption Pill (if any) */}
        {caption ? (
          <View style={styles.bottomCaptionWrapper}>
            <View style={styles.captionPill}>
              <Text style={styles.captionText}>{caption}</Text>
            </View>
          </View>
        ) : null}
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
  fullImage: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
    pointerEvents: 'none',
  },
  progressBarBackground: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 14 : 44,
    left: 14,
    right: 14,
    height: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    zIndex: 25,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FE3C72',
    borderRadius: 2,
  },
  topHudRow: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 26 : 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  senderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(12px)',
  } as any,
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FE3C72',
  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  streakIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FE3C72',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  ephemeralNotice: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(12px)',
  } as any,
  bottomCaptionWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 36 : 56,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 30,
  },
  captionPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(16px)',
    maxWidth: '90%',
  } as any,
  captionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },
});
