import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { SkipForward, Flag, Gift, Heart, X, Search, MessageCircle, UserPlus } from 'lucide-react-native';
import { matchSignalR } from '../../src/api/matchSignalR';
import { router } from 'expo-router';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

// The URL for the LiveKit Server (must match backend)
const LIVEKIT_URL = 'ws://localhost:7880';

// A sub-component to render the remote video track
function RemoteVideo() {
  const tracks = useTracks([Track.Source.Camera]);
  const remoteTrack = tracks.find((t: any) => t.participant.isLocal === false);

  if (remoteTrack && remoteTrack.publication?.track) {
    return (
      <VideoTrack 
        trackRef={remoteTrack} 
        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} 
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.cyan} />
      <Text style={{ color: Colors.textMuted, marginTop: 10 }}>جاري الاتصال بالكاميرا...</Text>
    </View>
  );
}

export default function MatchScreenWeb() {
  const { user } = useAuthStore();
  const [isSearching, setIsSearching] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [remotePeer, setRemotePeer] = useState<any | null>(null);

  const [giftsOpen, setGiftsOpen] = useState(false);
  const [sentGift, setSentGift] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
    axiosClient.get('/gifts').then(res => setGifts(res.data)).catch(console.error);
    matchSignalR.setOnMatchFound((data: any) => {
      setRoomName(data.roomName);
      setRemotePeer(data.matchedUser);
      setLivekitToken(data.liveKitToken);
      setIsSearching(false);
    });

    return () => {
      matchSignalR.leaveQueue();
    };
  }, []);

  const handleStartSearch = async () => {
    setIsSearching(true);
    setLivekitToken(null);
    setRemotePeer(null);
    try {
      await matchSignalR.joinQueue({});
    } catch (e) {
      console.error('Search failed', e);
      setIsSearching(false);
      alert('يجب تسجيل الدخول أولاً لتتمكن من استخدام ميزة المطابقة الكاميرا.');
    }
  };

  const handleSkip = async () => {
    setLiked(false);
    setLivekitToken(null);
    setRemotePeer(null);
    setIsSearching(true);
    await matchSignalR.leaveQueue();
    await matchSignalR.joinQueue({});
  };

  const handleSendGift = async (gift: any) => {
    setSentGift(gift.emoji);
    setGiftsOpen(false);
    setTimeout(() => setSentGift(null), 2000);
    try {
      await axiosClient.post('/gifts/send', { giftId: gift.id, receiverId: remotePeer.id });
    } catch (e) {
      console.error('Gift sending failed', e);
    }
  };

  const handleAddFriend = async () => {
    try {
      await axiosClient.post(`/friends/request/${remotePeer.id}`);
      alert('تم إرسال طلب الصداقة بنجاح!');
    } catch (e: any) {
      console.error('Failed to add friend', e);
      const msg = e.response?.data?.message || e.response?.data?.Message || 'حدث خطأ أثناء إرسال طلب الصداقة';
      alert(msg);
    }
  };

  const handleSendMessage = () => {
    if (remotePeer) {
      // Navigating to messages will unmount and disconnect LiveKit
      router.push({
        pathname: `/chat/${remotePeer.id}`,
        params: { name: remotePeer.name, image: remotePeer.profileImageUrl }
      });
    }
  };

  if (!isSearching && !livekitToken) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.radarRing} />
        <View style={[styles.radarRing, { width: 300, height: 300, opacity: 0.05 }]} />
        <GlassCard style={{ alignItems: 'center', padding: 40 }} borderRadius={30}>
          <Text style={styles.logo}>📡</Text>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>مستعد للقاء؟ (الويب)</Text>
          <Text style={{ color: Colors.textMuted, textAlign: 'center', marginBottom: 30 }}>ابحث عن أصدقاء جدد حول العالم وتواصل معهم بالفيديو فوراً.</Text>
          <GlassButton 
            title="ابدأ البحث 🚀" 
            size="lg" 
            variant="primary" 
            onPress={handleStartSearch} 
            style={{ width: '100%' }}
          />
        </GlassCard>
      </View>
    );
  }

  if (isSearching) {
    return (
      <View style={styles.centerContainer}>
        <View style={[styles.radarRing, styles.pulsing]} />
        <View style={[styles.radarRing, { width: 300, height: 300, opacity: 0.1 }]} />
        <Search color={Colors.cyan} size={60} style={{ marginBottom: 20 }} />
        <Text style={{ color: Colors.cyan, fontSize: 24, fontWeight: 'bold' }}>جاري البحث...</Text>
        <Text style={{ color: Colors.textMuted, marginTop: 10, marginBottom: 40 }}>يتم الآن التوصيل بشخص مناسب لك</Text>
        <GlassButton title="إلغاء البحث" variant="ghost" onPress={() => setIsSearching(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {livekitToken ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={livekitToken}
          connect={true}
          audio={true}
          video={true}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
        >
          <RemoteVideo />
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(4,7,16,0.5)', 'rgba(4,7,16,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.topBar}>
        <GlassCard style={styles.topLeft}>
          <Text style={styles.locationText}>📍 {remotePeer?.location || 'غير محدد'}</Text>
        </GlassCard>
        <GlassButton variant="danger" size="sm" icon={<Flag color={Colors.danger} size={16} />} title="إبلاغ" />
      </View>

      {sentGift && (
        <View style={styles.giftFloat}>
          <Text style={styles.giftFloatEmoji}>{sentGift}</Text>
        </View>
      )}

      <View style={styles.bottom}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{remotePeer?.name || 'مستخدم'}, {remotePeer?.age || 20}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.circleBtn, { borderColor: Colors.danger + '55', backgroundColor: Colors.dangerDim }]} onPress={handleSkip}>
            <SkipForward color={Colors.danger} size={26} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainBtn, { borderColor: Colors.glassBorderBright, backgroundColor: Colors.cyanDim }]} onPress={handleSkip}>
            <Text style={styles.mainBtnText}>التالي ⚡</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.circleBtn, { borderColor: Colors.cyan + '55', backgroundColor: Colors.cyanDim }]} onPress={handleAddFriend}>
            <UserPlus color={Colors.cyan} size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.secondary}>
          <GlassButton icon={<Gift color={Colors.gold} size={18} />} title="إرسال هدية" variant="gold" size="sm" onPress={() => setGiftsOpen(true)} style={{ flex: 1 }} />
          <GlassButton icon={<MessageCircle color={Colors.text} size={18} />} title="رسالة" variant="ghost" size="sm" onPress={handleSendMessage} style={{ flex: 1 }} />
        </View>
      </View>

      <Modal visible={giftsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.giftsSheet} borderRadius={24}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎁 أرسل هدية</Text>
              <TouchableOpacity onPress={() => setGiftsOpen(false)}>
                <X color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.giftsGrid}>
              {gifts.map(g => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)}>
                  <Text style={styles.giftEmoji}>{g.emoji || '🎁'}</Text>
                  <Text style={styles.giftName}>{g.name}</Text>
                  <View style={styles.giftCost}>
                    <Text style={styles.giftCostText}>🪙 {g.coinCost}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  radarRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.cyan, opacity: 0.1 },
  pulsing: { backgroundColor: Colors.primary },
  logo: { fontSize: 60, marginBottom: 10 },
  topBar: { position: 'absolute', top: 56, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  locationText: { color: Colors.text, fontSize: 13 },
  giftFloat: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 100 },
  giftFloatEmoji: { fontSize: 80 },
  bottom: { position: 'absolute', bottom: 80, left: 16, right: 16, gap: 16 },
  userInfo: { gap: 10 },
  userName: { fontSize: 28, fontWeight: '800', color: Colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circleBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtnText: { color: Colors.cyan, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  secondary: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  giftsSheet: { margin: 12, padding: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  giftItem: { width: '48%', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  giftEmoji: { fontSize: 34 },
  giftName: { color: Colors.textSecondary, fontSize: 14 },
  giftCost: { backgroundColor: '#332b00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  giftCostText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
});
