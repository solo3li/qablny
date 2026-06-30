import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Modal, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { useCallStore } from '../src/store/callStore';
import { LiveKitHandler } from './LiveKitHandler';
import { GiftModal } from './GiftModal';
import { Colors } from '../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX,
  Camera, CameraOff, RotateCcw, Minimize2, Gift
} from 'lucide-react-native';
import { axiosClient } from '../src/api/axiosClient';

interface CallModalProps {
  visible: boolean;
  onClose: () => void;
  friend: {
    name: string;
    image: string;
    isOnline: boolean;
  };
  callType: 'voice' | 'video';
}

export function CallModal({ visible, onClose, friend, callType }: CallModalProps) {
  const { callStatus, activeCall, incomingGift } = useCallStore();
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [cameraOn, setCameraOn] = useState(callType === 'video');
  const [minimized, setMinimized] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [sentGift, setSentGift] = useState<string | null>(null);

  // Pulse animation rings
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;

  // Gift animation
  const giftScale = useRef(new Animated.Value(0)).current;

  // Timer ref
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (incomingGift) {
      Animated.sequence([
        Animated.spring(giftScale, { toValue: 1.5, friction: 3, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(giftScale, { toValue: 0, duration: 500, useNativeDriver: true })
      ]).start();
    }
  }, [incomingGift]);

  useEffect(() => {
    if (!visible) {
      setSeconds(0);
      setMuted(false);
      setSpeaker(true);
      setCameraOn(callType === 'video');
      return;
    }

    // Start pulse animations if ringing
    const startPulse = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1.8, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    };
    
    if (callStatus === 'ringing') {
      startPulse(pulse1, 0);
      startPulse(pulse2, 400);
      startPulse(pulse3, 800);
    } else {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse3.stopAnimation();
    }

    // Timer for connected state
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => {
      clearInterval(timerRef.current);
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse3.stopAnimation();
    };
  }, [visible, callStatus]);

  const handleEnd = () => {
    clearInterval(timerRef.current);
    onClose();
  };

  const handleSendGift = async (gift: any) => {
    setSentGift(gift.emoji);
    setGiftsOpen(false);
    setTimeout(() => setSentGift(null), 2000);
    try {
      await axiosClient.post('/gifts/send', { giftId: gift.id, receiverId: activeCall?.friendId });
    } catch (e) {
      console.error('Gift sending failed', e);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        {/* Background */}
        <LinearGradient
          colors={Colors.gradMain}
          style={StyleSheet.absoluteFillObject}
        />

        {/* LiveKit Handler */}
        {callStatus === 'connected' && activeCall?.roomName && (
          <LiveKitHandler roomName={activeCall.roomName} callType={callType} muted={muted} cameraOn={cameraOn} speaker={speaker} />
        )}

        {/* Video call blurred background overlay (only if no actual video feed yet, or just to darken) */}
        {callType === 'video' && callStatus === 'connected' && (
          <View style={styles.videoBgOverlay} />
        )}

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.minimizeBtn} onPress={handleEnd}>
            <Minimize2 color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
          <Text style={styles.callTypeLabel}>
            {callType === 'video' ? '📹 مكالمة فيديو' : '📞 مكالمة صوتية'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Center: Avatar + Status (Hide if connected video call because LiveKit renders it) */}
        {!(callType === 'video' && callStatus === 'connected') && (
          <View style={styles.center}>
            {/* Pulse rings (only while ringing) */}
            {callStatus === 'ringing' && (
            <View style={styles.pulseWrap}>
              {[pulse1, pulse2, pulse3].map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.pulseRing,
                    { transform: [{ scale: anim }], opacity: anim.interpolate({ inputRange: [1, 1.8], outputRange: [0.5, 0] }) }
                  ]}
                />
              ))}
            </View>
          )}

            {/* Avatar */}
            <View style={[styles.avatarWrap, callStatus === 'connected' && styles.avatarConnected]}>
              <Image source={{ uri: friend.image }} style={styles.avatar} />
              {callStatus === 'connected' && (
                <View style={styles.connectedRing} />
              )}
            </View>

          <Text style={styles.name}>{friend.name}</Text>

            {/* Status / timer */}
            {callStatus === 'ringing' ? (
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>جاري الاتصال...</Text>
              </View>
            ) : (
              <Text style={styles.timer}>{formatTime(seconds)}</Text>
            )}

            {/* Signal bars (connected) */}
            {callStatus === 'connected' && (
              <View style={styles.signalBars}>
                {[4, 6, 8, 10, 12].map((h, i) => (
                  <View key={i} style={[styles.signalBar, { height: h, opacity: i < 4 ? 1 : 0.3 }]} />
                ))}
                <Text style={styles.signalText}>جودة ممتازة</Text>
              </View>
            )}
          </View>
        )}

        {/* Self video (video call only, simulated off if camera off - LiveKit handles actual local video in LiveKitHandler) */}
        {callType === 'video' && callStatus === 'connected' && !cameraOn && (
          <View style={styles.selfVideoWrap}>
            <View style={styles.selfVideoOff}>
              <CameraOff color={Colors.textMuted} size={22} />
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {/* Row 1: secondary controls */}
          <View style={styles.secondaryControls}>
            <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]} onPress={() => setMuted(!muted)}>
              {muted
                ? <MicOff color={Colors.danger} size={22} />
                : <Mic color={Colors.text} size={22} />
              }
              <Text style={[styles.ctrlLabel, muted && { color: Colors.danger }]}>{muted ? 'صامت' : 'ميكروفون'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.ctrlBtn, !speaker && styles.ctrlBtnActive]} onPress={() => setSpeaker(!speaker)}>
              {speaker
                ? <Volume2 color={Colors.text} size={22} />
                : <VolumeX color={Colors.danger} size={22} />
              }
              <Text style={[styles.ctrlLabel, !speaker && { color: Colors.danger }]}>{speaker ? 'مكبر' : 'صامت'}</Text>
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity style={[styles.ctrlBtn, !cameraOn && styles.ctrlBtnActive]} onPress={() => setCameraOn(!cameraOn)}>
                {cameraOn
                  ? <Camera color={Colors.text} size={22} />
                  : <CameraOff color={Colors.danger} size={22} />
                }
                <Text style={[styles.ctrlLabel, !cameraOn && { color: Colors.danger }]}>{cameraOn ? 'كاميرا' : 'معطّلة'}</Text>
              </TouchableOpacity>
            )}

            {callType === 'video' && (
              <TouchableOpacity style={styles.ctrlBtn}>
                <RotateCcw color={Colors.text} size={22} />
                <Text style={styles.ctrlLabel}>قلب</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.ctrlBtn} onPress={() => setGiftsOpen(true)}>
              <Gift color={Colors.primaryContainer} size={22} />
              <Text style={styles.ctrlLabel}>هدية</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: End call */}
          <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
            <PhoneOff color="#fff" size={30} />
          </TouchableOpacity>
        </View>

        {sentGift && (
          <View style={[styles.giftFloat, { top: '30%' }]}>
            <Text style={styles.giftFloatEmoji}>{sentGift}</Text>
          </View>
        )}

        {/* Incoming Gift Animation */}
        {incomingGift && (
          <Animated.View style={[styles.giftFloat, { transform: [{ scale: giftScale }] }]}>
            <Text style={[styles.giftFloatEmoji, { fontSize: 120, textShadowColor: Colors.primaryContainer, textShadowRadius: 20 }]}>
              {incomingGift}
            </Text>
          </Animated.View>
        )}

        <GiftModal
          visible={giftsOpen}
          onClose={() => setGiftsOpen(false)}
          onSendGift={handleSendGift}
        />
      </View>
    </Modal>
  );
}

const AVATAR_SIZE = 130;
const RING_SIZE = 220;

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center' },

  videoBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  videoBgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.75)' },

  topBar: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 10 },
  minimizeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  callTypeLabel: { color: Colors.textSecondary, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
  giftFloat: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 100 },
  giftFloatEmoji: { fontSize: 80 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },

  pulseWrap: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2, borderColor: Colors.cyan },

  avatarWrap: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 3, borderColor: Colors.glassBorder, overflow: 'hidden' },
  avatarConnected: { borderColor: Colors.cyan },
  avatar: { width: '100%', height: '100%' },
  connectedRing: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: (AVATAR_SIZE + 6) / 2, borderWidth: 2, borderColor: Colors.online },

  name: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.online },
  statusText: { fontSize: 15, color: Colors.textSecondary },
  timer: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.cyan, letterSpacing: 2 },

  signalBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  signalBar: { width: 6, borderRadius: 3, backgroundColor: Colors.online },
  signalText: { color: Colors.online, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginLeft: 6 },

  // Self video pip
  selfVideoWrap: { position: 'absolute', top: 110, right: 16, width: 90, height: 130, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: Colors.glassBorderBright },
  selfVideo: { width: '100%', height: '100%' },
  selfVideoOff: { width: '100%', height: '100%', backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },

  // Controls
  controls: { width: '100%', paddingBottom: 60, paddingHorizontal: 20, gap: 28, alignItems: 'center' },
  secondaryControls: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center' },
  ctrlBtn: { alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, minWidth: 80 },
  ctrlBtnActive: { backgroundColor: Colors.danger + '1A', borderColor: Colors.danger + '55' },
  ctrlLabel: { color: Colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center' },
});
