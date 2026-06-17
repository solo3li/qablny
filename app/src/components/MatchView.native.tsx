import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { SkipForward, Flag, Gift, MessageCircle, Heart, Star, X, Search } from 'lucide-react-native';
import { matchSignalR } from '../../src/api/matchSignalR';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks, TrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';

// The URL for the LiveKit Server (must match backend)
const LIVEKIT_URL = 'ws://10.0.2.2:7880';

// A sub-component to render the remote video track
function RemoteVideo() {
  const tracks = useTracks([Track.Source.Camera]);
  // Filter out our own track to only show remote participant
  const remoteTrack = tracks.find((t: any) => t.participant.isLocal === false) as TrackReference | undefined;

  if (remoteTrack && remoteTrack.publication?.track) {
    return (
      <VideoTrack 
        trackRef={remoteTrack} 
        style={StyleSheet.absoluteFillObject} 
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

export default function MatchScreen() {
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
    // Fetch gifts
    axiosClient.get('/gifts').then(res => setGifts(res.data)).catch(console.error);
    matchSignalR.setOnMatchFound(async (room, peer) => {
      setRoomName(room);
      setRemotePeer(peer);
      try {
        const res = await axiosClient.get(`/match/token/${room}`);
        setLivekitToken(res.data.token);
        setIsSearching(false);
      } catch (e) {
        console.error('Failed to get LiveKit token', e);
        setIsSearching(false);
      }
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
      await matchSignalR.enterQueue();
    } catch (e) {
      console.error('Search failed', e);
      setIsSearching(false);
      // Try using standard alert for cross-platform safety, or just fail silently in console if Alert isn't imported
      alert('يجب تسجيل الدخول أولاً لتتمكن من استخدام ميزة المطابقة.');
    }
  };

  const handleSkip = async () => {
    setLiked(false);
    setLivekitToken(null);
    setRemotePeer(null);
    setIsSearching(true);
    await matchSignalR.leaveQueue();
    await matchSignalR.enterQueue();
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

  // 1. Initial State
  if (!isSearching && !livekitToken) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.radarRing} />
        <View style={[styles.radarRing, { width: 300, height: 300, opacity: 0.05 }]} />
        <GlassCard style={{ alignItems: 'center', padding: 40 }} borderRadius={30}>
          <Text style={styles.logo}>📡</Text>
          <Text style={{ color: Colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>مستعد للقاء؟</Text>
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

  // 2. Searching State
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

  // 3. Matched State (LiveKit Video)
  return (
    <View style={styles.container}>
      {/* LiveKit Video Room */}
      {livekitToken ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={livekitToken}
          connect={true}
          audio={true}
          video={true}
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

      {/* Top bar */}
      <View style={styles.topBar}>
        <GlassCard style={styles.topLeft}>
          <Text style={styles.locationText}>📍 {remotePeer?.location || 'غير محدد'}</Text>
        </GlassCard>
        <GlassButton variant="danger" size="sm" icon={<Flag color={Colors.danger} size={16} />} title="إبلاغ" />
      </View>

      {/* Gift floating emoji */}
      {sentGift && (
        <View style={styles.giftFloat}>
          <Text style={styles.giftFloatEmoji}>{sentGift}</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={styles.bottom}>
        {/* Profile info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{remotePeer?.name || 'مستخدم'}, {remotePeer?.age || 20}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.circleBtn, { borderColor: Colors.danger + '55', backgroundColor: Colors.dangerDim }]}
            onPress={handleSkip}
          >
            <SkipForward color={Colors.danger} size={26} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainBtn, { borderColor: Colors.glassBorderBright, backgroundColor: Colors.cyanDim }]}
            onPress={handleSkip}
          >
            <Text style={styles.mainBtnText}>التالي ⚡</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, { borderColor: liked ? Colors.pink + '55' : Colors.glassBorder, backgroundColor: liked ? Colors.pinkDim : Colors.surface }]}
            onPress={() => setLiked(!liked)}
          >
            <Heart color={liked ? Colors.pink : Colors.textSecondary} size={24} fill={liked ? Colors.pink : 'none'} />
          </TouchableOpacity>
        </View>

        {/* Secondary actions */}
        <View style={styles.secondary}>
          <GlassButton
            icon={<Gift color={Colors.gold} size={18} />}
            title="إرسال هدية"
            variant="gold"
            size="sm"
            onPress={() => setGiftsOpen(true)}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Gifts Modal */}
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
