import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { Colors } from '../constants/Colors';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useCallStore } from '../src/store/callStore';
import { useChatStore } from '../src/store/chatStore';

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useCallStore();
  const { friends } = useChatStore();

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (incomingCall) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const friend = friends.find(f => f.id === incomingCall.callerId);
  const name = friend?.name || 'مستخدم مجهول';
  const image = friend?.profileImageUrl || 'https://i.pravatar.cc/150';
  const typeText = incomingCall.callType === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية';

  return (
    <Modal visible={!!incomingCall} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>مكالمة واردة</Text>
          <Text style={styles.typeText}>{typeText}</Text>
          
          <Animated.View style={[styles.avatarWrap, { transform: [{ scale: pulse }] }]}>
            <Image source={{ uri: image }} style={styles.avatar} />
          </Animated.View>
          
          <Text style={styles.name}>{name}</Text>
          
          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={declineCall}>
              <PhoneOff color="#fff" size={28} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.acceptBtn} onPress={acceptCall}>
              <Phone color="#fff" size={28} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: 4,
  },
  typeText: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.cyan,
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    color: Colors.text,
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
  },
  acceptBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.online,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
