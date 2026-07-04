import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { LiveKitHandler } from '../../components/LiveKitHandler';
import { GiftModal } from '../../components/GiftModal';
import { axiosClient } from '../../src/api/axiosClient';
import { matchSignalR } from '../../src/api/matchSignalR';
import { Mic, MicOff, Video, VideoOff, X, Gift, UserPlus, SkipForward } from 'lucide-react-native';

export default function MatchRoomScreen() {
  const { roomName, token, partnerId, partnerName } = useLocalSearchParams();
  const router = useRouter();

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const handleEndCall = async () => {
    Alert.alert('إنهاء', 'هل أنت متأكد من إنهاء المكالمة؟', [
      { text: 'لا', style: 'cancel' },
      { 
        text: 'نعم', 
        style: 'destructive',
        onPress: async () => {
          await matchSignalR.leaveQueue();
          router.back();
        }
      }
    ]);
  };

  const handleSkip = async () => {
    // Start searching for next person
    await matchSignalR.skip();
    router.back();
  };

  const handleSendGift = async (gift: any) => {
    try {
      await axiosClient.post('/monetization/gifts/send', {
        giftId: gift.id,
        receiverId: partnerId
      });
      setShowGiftModal(false);
      Alert.alert('نجاح', `تم إرسال ${gift.emoji} إلى ${partnerName} بنجاح!`);
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'تعذر إرسال الهدية');
    }
  };

  const handleAddFriend = async () => {
    try {
      await axiosClient.post(`/users/${partnerId}/friend-requests`);
      Alert.alert('تم', 'تم إرسال طلب الصداقة بنجاح');
    } catch (err: any) {
      Alert.alert('خطأ', 'تعذر إرسال طلب الصداقة');
    }
  };

  if (!roomName || !token) {
    return <View style={styles.container}><Text>Error loading room</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Video Stream */}
      <LiveKitHandler
        roomName={roomName as string}
        callType="video"
        muted={muted}
        cameraOn={cameraOn}
        speaker={speakerOn}
        initialToken={token as string}
      />

      {/* Header Controls */}
      <View style={styles.header}>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>{partnerName || 'مجهول'}</Text>
          <TouchableOpacity onPress={handleAddFriend} style={styles.addFriendBtn}>
            <UserPlus color="#FFF" size={16} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <SkipForward color="#FFF" size={20} />
          <Text style={styles.skipText}>تخطي</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setMuted(!muted)}>
          {muted ? <MicOff color={Colors.danger} size={24} /> : <Mic color="#FFF" size={24} />}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlBtn} onPress={() => setCameraOn(!cameraOn)}>
          {cameraOn ? <Video color="#FFF" size={24} /> : <VideoOff color={Colors.danger} size={24} />}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.giftBtn]} onPress={() => setShowGiftModal(true)}>
          <Gift color="#FFD700" size={24} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.endBtn]} onPress={handleEndCall}>
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      {/* Gift Modal */}
      <GiftModal
        visible={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onSendGift={handleSendGift}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  partnerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  partnerName: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  addFriendBtn: {
    backgroundColor: Colors.primary,
    padding: 6,
    borderRadius: 12,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  skipText: {
    color: '#FFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  giftBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  endBtn: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  }
});
