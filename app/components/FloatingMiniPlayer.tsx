import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Mic, MicOff, Maximize2, X, Volume2 } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { useVoiceRoomStore } from '../src/store/voiceRoomStore';
import { axiosClient } from '../src/api/axiosClient';

export function FloatingMiniPlayer() {
  const router = useRouter();
  const segments = useSegments();
  const {
    currentRoom,
    isMinimized,
    isMuted,
    isSeated,
    setMinimized,
    setMuted,
    leaveRoom,
  } = useVoiceRoomStore();

  // Equalizer animated bar values
  const bar1 = useRef(new Animated.Value(6)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!currentRoom || !isMinimized) return;

    const animateBar = (val: Animated.Value, minH: number, maxH: number, dur: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: maxH,
            duration: dur,
            useNativeDriver: false,
          }),
          Animated.timing(val, {
            toValue: minH,
            duration: dur,
            useNativeDriver: false,
          }),
        ])
      );
    };

    const anim1 = animateBar(bar1, 4, 16, 450);
    const anim2 = animateBar(bar2, 6, 20, 350);
    const anim3 = animateBar(bar3, 4, 15, 520);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [currentRoom, isMinimized]);

  // If room is not minimized or we are currently on the room screen, don't show floating mini player
  const isInRoomScreen = segments[0] === 'room';
  if (!currentRoom || !isMinimized || isInRoomScreen) {
    return null;
  }

  const handleMaximize = () => {
    setMinimized(false);
    router.push(`/room/${currentRoom.id}` as any);
  };

  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setMuted(nextMute);
    if (isSeated) {
      try {
        const mySeat = useVoiceRoomStore.getState().mySeatIndex;
        if (mySeat) {
          await axiosClient.post(`/rooms/${currentRoom.id}/seats/${mySeat}/mute`, {
            isMuted: nextMute,
          });
        }
      } catch (e) {
        console.warn('Failed to toggle mute:', e);
      }
    }
  };

  const handleClose = async () => {
    try {
      await axiosClient.post(`/rooms/${currentRoom.id}/leave`);
    } catch (e) {
      // ignore
    }
    leaveRoom();
  };

  const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    currentRoom.hostName || 'Host'
  )}&background=FE3C72&color=fff&size=100`;

  const bottomOffset = Platform.OS === 'ios' ? 94 : 80;

  return (
    <View
      style={[
        styles.container,
        { bottom: bottomOffset },
        Platform.OS === 'web'
          ? ({
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            } as any)
          : null,
      ]}
    >
      <TouchableOpacity
        style={styles.touchableArea}
        onPress={handleMaximize}
        activeOpacity={0.9}
      >
        {/* Host Avatar */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: currentRoom.hostAvatar || fallbackAvatar }}
            style={styles.avatar}
          />
          <View style={styles.livePulseDot} />
        </View>

        {/* Info */}
        <View style={styles.infoCol}>
          <Text style={styles.title} numberOfLines={1}>
            {currentRoom.title}
          </Text>
          <View style={styles.metaRow}>
            {/* Equalizer waves */}
            <View style={styles.equalizer}>
              <Animated.View style={[styles.eqBar, { height: bar1 }]} />
              <Animated.View style={[styles.eqBar, { height: bar2 }]} />
              <Animated.View style={[styles.eqBar, { height: bar3 }]} />
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentRoom.hostName} · {currentRoom.listenersCount} مستمع
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {/* Quick Mute Toggle */}
        <TouchableOpacity
          style={[styles.actionBtn, isMuted && styles.actionBtnActive]}
          onPress={handleToggleMute}
          activeOpacity={0.7}
        >
          {isMuted ? (
            <MicOff size={18} color="#EF4444" strokeWidth={2.2} />
          ) : (
            <Mic size={18} color={Colors.primary} strokeWidth={2.2} />
          )}
        </TouchableOpacity>

        {/* Maximize */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleMaximize}
          activeOpacity={0.7}
        >
          <Maximize2 size={18} color="#1A1D1E" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Leave/Close */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.closeBtn]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <X size={18} color="#6C757D" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(254, 60, 114, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  touchableArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F3F5',
  },
  livePulseDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 2,
    textAlign: 'left',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equalizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    marginRight: 6,
    gap: 2,
  },
  eqBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
    textAlign: 'left',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  closeBtn: {
    backgroundColor: '#F1F3F5',
  },
});
