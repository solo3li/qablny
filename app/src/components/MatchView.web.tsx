import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Gift, PhoneOff, Mic, RefreshCcw, MoreVertical, Search, Heart } from 'lucide-react-native';
import { matchSignalR } from '../../src/api/matchSignalR';
import { router } from 'expo-router';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

const LIVEKIT_URL = 'wss://livekit.178.62.192.74.nip.io';

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
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: Colors.textMuted, marginTop: 10, fontFamily: 'PlusJakartaSans_500Medium' }}>جاري الاتصال بالكاميرا...</Text>
    </View>
  );
}

function LocalVideo() {
  const tracks = useTracks([Track.Source.Camera]);
  const localTrack = tracks.find((t: any) => t.participant.isLocal === true);

  if (localTrack && localTrack.publication?.track) {
    return (
      <VideoTrack 
        trackRef={localTrack} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
    );
  }

  return (
    <View style={{ width: '100%', height: '100%', backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="small" color={Colors.text} />
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
  const [gifts, setGifts] = useState<any[]>([
    { id: 1, name: 'وردة', emoji: '🌹', coinCost: 10 },
    { id: 2, name: 'تاج', emoji: '👑', coinCost: 50 },
    { id: 3, name: 'صاروخ', emoji: '🚀', coinCost: 100 },
    { id: 4, name: 'ماسة', emoji: '💎', coinCost: 500 },
  ]);
  const [messages, setMessages] = useState<{sender: string, text: string, type?: 'chat'|'system'}[]>([
    { sender: 'أحمد', text: 'مرحباً! 👋', type: 'chat' },
    { sender: 'سارة', text: 'انضمت', type: 'system' },
    { sender: 'نور', text: 'أرسلت قلوب ❤️', type: 'system' }
  ]);

  useEffect(() => {
    // We could fetch real gifts from the API, leaving static for now based on design
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

  const handleEndCall = async () => {
    setLivekitToken(null);
    setRemotePeer(null);
    await matchSignalR.leaveQueue();
  };

  const handleSendGift = async (gift: any) => {
    setSentGift(gift.emoji);
    setGiftsOpen(false);
    setTimeout(() => setSentGift(null), 3000);
    try {
      if (remotePeer) {
        await axiosClient.post('/gifts/send', { giftId: gift.id, receiverId: remotePeer.id });
      }
    } catch (e) {
      console.error('Gift sending failed', e);
    }
  };

  if (!isSearching && !livekitToken) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.radarRing} />
        <View style={[styles.radarRing, { width: 300, height: 300, opacity: 0.05 }]} />
        <GlassCard style={{ alignItems: 'center', padding: 40 }} >
          <Text style={styles.logo}>✨</Text>
          <Text style={{ color: Colors.text, fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold', marginVertical: 10 }}>مكالمة حية - قابل</Text>
          <Text style={{ color: Colors.textMuted, textAlign: 'center', marginBottom: 30 }}>تواصل بالفيديو مع أصدقاء جدد حول العالم.</Text>
          <GlassButton 
            title="ابدأ البحث" 
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
        <Search color={Colors.primary} size={60} style={{ marginBottom: 20 }} />
        <Text style={{ color: Colors.primary, fontSize: 24, fontFamily: 'PlusJakartaSans_700Bold' }}>جارٍ البحث...</Text>
        <Text style={{ color: Colors.textMuted, marginTop: 10, marginBottom: 40 }}>يتم الآن التوصيل بشخص مناسب لك</Text>
        <GlassButton title="إلغاء البحث" variant="outline" onPress={() => setIsSearching(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background Remote Video */}
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
          
          {/* PIP Local Video */}
          <View style={styles.pipContainer}>
            <LocalVideo />
            <View style={styles.pipMicIcon}>
              <Mic color="#fff" size={14} />
            </View>
          </View>
          <RoomAudioRenderer />
        </LiveKitRoom>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.8)']}
        style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
      />

      {/* Top Navigation / Status Area */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navIconBtn} onPress={handleEndCall}>
          <Text style={{color: '#fff', fontSize: 20}}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>مكالمة مباشرة</Text>
          <Text style={styles.timeText}>00:00</Text>
        </View>
        
        <TouchableOpacity style={styles.navIconBtn}>
          <MoreVertical color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Floating Gift Animation */}
      {sentGift && (
        <View style={styles.giftFloat}>
          <Text style={styles.giftFloatEmoji}>{sentGift}</Text>
        </View>
      )}

      {/* Interactive Overlay Area (Bottom) */}
      <View style={styles.bottomOverlay}>
        
        {/* Chat Stream (Mock) */}
        <View style={styles.chatStream}>
          {messages.map((m, i) => (
            <View key={i} style={styles.chatMessageRow}>
              {m.type === 'system' ? (
                 <View style={styles.systemMessageBadge}>
                   <Heart color={Colors.secondary} size={12} fill={Colors.secondary} />
                   <Text style={styles.systemMessageText}>{m.sender} {m.text}</Text>
                 </View>
              ) : (
                <>
                  <View style={styles.chatAvatarPlaceholder} />
                  <Text style={styles.chatSender}>{m.sender}:</Text>
                  <Text style={styles.chatText}>{m.text}</Text>
                </>
              )}
            </View>
          ))}
        </View>

        {/* Controls Row */}
        <View style={styles.controlsRow}>
          {/* Left Controls */}
          <View style={styles.leftControls}>
            <TouchableOpacity style={styles.glassBtn}>
              <MessageCircle color="#fff" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.glassBtn}>
              <RefreshCcw color="#fff" size={22} />
            </TouchableOpacity>
          </View>

          {/* Primary Actions */}
          <View style={styles.primaryActions}>
            <TouchableOpacity style={styles.giftBtn} onPress={() => setGiftsOpen(true)}>
              <LinearGradient colors={[Colors.secondary, Colors.primary]} style={styles.giftBtnGradient}>
                <Gift color="#fff" size={28} />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
              <PhoneOff color="#fff" size={28} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Gift Tray Bottom Sheet */}
      <Modal visible={giftsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setGiftsOpen(false)} />
          <View style={styles.giftTray}>
            <View style={styles.trayHeader}>
              <Text style={styles.trayTitle}>إرسال هدية</Text>
              <View style={styles.coinBadge}>
                <Text style={styles.coinIcon}>🪙</Text>
                <Text style={styles.coinCount}>1,250</Text>
              </View>
            </View>
            
            <View style={styles.giftsGrid}>
              {gifts.map((g) => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)}>
                  <View style={styles.giftEmojiBox}>
                    <Text style={styles.giftEmoji}>{g.emoji}</Text>
                  </View>
                  <Text style={styles.giftName}>{g.name}</Text>
                  <Text style={styles.giftCostText}>🪙 {g.coinCost}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.closeTrayBtn} onPress={() => setGiftsOpen(false)}>
              <Text style={styles.closeTrayText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 },
  radarRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.primary, opacity: 0.1 },
  pulsing: { opacity: 0.2 },
  logo: { fontSize: 60, marginBottom: 10 },

  // Top Nav
  topNav: { position: 'absolute', top: 40, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 30 },
  navIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, marginRight: 8 },
  liveText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, marginRight: 8 },
  timeText: { color: 'rgba(255,255,255,0.8)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },

  // PIP Local Video
  pipContainer: { position: 'absolute', top: 100, right: 20, width: 100, height: 150, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', backgroundColor: '#000', zIndex: 30, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.4, shadowRadius: 12 },
  pipMicIcon: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 12 },

  // Gift float
  giftFloat: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 100 },
  giftFloatEmoji: { fontSize: 100, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 10}, textShadowRadius: 20 },

  // Bottom Overlay
  bottomOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, zIndex: 40 },
  
  // Chat
  chatStream: { height: 120, justifyContent: 'flex-end', marginBottom: 16 },
  chatMessageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chatAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 8 },
  chatSender: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', marginRight: 4 },
  chatText: { color: '#fff', fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  systemMessageBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  systemMessageText: { color: Colors.onSecondaryContainer, fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginLeft: 6 },

  // Controls Row
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leftControls: { flexDirection: 'row', gap: 12 },
  glassBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  primaryActions: { flexDirection: 'row', gap: 16 },
  giftBtn: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', shadowColor: Colors.secondary, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.4, shadowRadius: 10 },
  giftBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  endCallBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.error, shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.4, shadowRadius: 10 },

  // Gift Tray
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  giftTray: { backgroundColor: 'rgba(255,255,255,0.95)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  trayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  trayTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  coinIcon: { fontSize: 16, marginRight: 4 },
  coinCount: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  giftItem: { width: '23%', alignItems: 'center', marginBottom: 20 },
  giftEmojiBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: {width:0,height:2}, shadowOpacity: 0.1, shadowRadius: 4 },
  giftEmoji: { fontSize: 32 },
  giftName: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.text },
  giftCostText: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.primary },
  closeTrayBtn: { backgroundColor: Colors.surface, paddingVertical: 14, borderRadius: 24, alignItems: 'center', marginTop: 10 },
  closeTrayText: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: Colors.text },
});
