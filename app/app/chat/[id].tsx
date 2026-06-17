import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Modal, ScrollView, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useChatStore, UIChatMessage as ChatMessage } from '../../src/store/chatStore';
import {
  Send, Languages, ChevronLeft, Phone, Video,
  Mic, Image as ImageIcon, Film, MapPin, X, Play, Pause,
  Plus,
} from 'lucide-react-native';
import { CallModal } from '../../components/CallModal';

// ─── Message Bubbles ──────────────────────────────────────────────────────────

function TextBubble({ msg, friend }: { msg: ChatMessage; friend: any }) {
  return (
    <View>
      <View style={[styles.bubble, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={styles.bubbleText}>{msg.text}</Text>
      </View>
      {!msg.isMe && msg.translation && (
        <View style={styles.translationBox}>
          <Languages color={Colors.cyan} size={11} />
          <Text style={styles.translationText}>{msg.translation}</Text>
        </View>
      )}
    </View>
  );
}

function VoiceBubble({ msg }: { msg: ChatMessage }) {
  const [playing, setPlaying] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      progress.stopAnimation();
    } else {
      setPlaying(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: (msg.duration ?? 10) * 1000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setPlaying(false);
      });
    }
  };

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={[styles.bubble, styles.voiceBubble, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
      <TouchableOpacity style={styles.playBtn} onPress={togglePlay}>
        {playing
          ? <Pause color={msg.isMe ? Colors.cyan : Colors.text} size={20} />
          : <Play color={msg.isMe ? Colors.cyan : Colors.text} size={20} />
        }
      </TouchableOpacity>
      <View style={styles.voiceBarWrap}>
        <View style={styles.voiceTrack}>
          <Animated.View style={[styles.voiceFill, { width: barWidth, backgroundColor: msg.isMe ? Colors.cyan : Colors.textSecondary }]} />
          {/* Waveform dots */}
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[styles.waveBar, { height: 4 + Math.sin(i) * 8 + Math.random() * 6, opacity: 0.5 }]} />
          ))}
        </View>
        <Text style={styles.voiceDur}>{formatDur(msg.duration ?? 0)}</Text>
      </View>
      <Mic color={msg.isMe ? Colors.cyan : Colors.textSecondary} size={16} />
    </View>
  );
}

function ImageBubble({ msg }: { msg: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.mediaBubble} onPress={() => setExpanded(true)}>
        <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImg} resizeMode="cover" />
        {msg.text && (
          <View style={[styles.mediaCaption, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={styles.bubbleText}>{msg.text}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Modal visible={expanded} transparent animationType="fade">
        <TouchableOpacity style={styles.imageModal} onPress={() => setExpanded(false)} activeOpacity={1}>
          <Image source={{ uri: msg.mediaUrl }} style={styles.fullImage} resizeMode="contain" />
          <TouchableOpacity style={styles.closeModal} onPress={() => setExpanded(false)}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function VideoBubble({ msg }: { msg: ChatMessage }) {
  return (
    <TouchableOpacity style={styles.mediaBubble}>
      <View style={styles.videoWrap}>
        <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImg} resizeMode="cover" />
        <View style={styles.videoOverlay}>
          <View style={styles.videoPlayBtn}>
            <Play color={Colors.text} size={28} fill={Colors.text} />
          </View>
          <View style={styles.videoTag}>
            <Film color={Colors.text} size={12} />
            <Text style={styles.videoTagText}>فيديو</Text>
          </View>
        </View>
      </View>
      {msg.text && (
        <View style={[msg.isMe ? styles.bubbleMe : styles.bubbleThem, { borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 10 }]}>
          <Text style={styles.bubbleText}>{msg.text}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function LocationBubble({ msg }: { msg: ChatMessage }) {
  return (
    <TouchableOpacity style={[styles.locationBubble, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
      <View style={styles.mapPlaceholder}>
        {/* Dummy map grid */}
        <LinearGradient colors={['#0d2137', '#0a1929']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.mapGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.mapGridLine} />
          ))}
        </View>
        <View style={styles.mapGridH}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.mapGridLineH} />
          ))}
        </View>
        {/* Pin */}
        <View style={styles.mapPin}>
          <MapPin color={Colors.danger} size={28} fill={Colors.danger} />
        </View>
      </View>
      <View style={styles.locationInfo}>
        <MapPin color={Colors.cyan} size={14} />
        <Text style={styles.locationName}>{msg.locationName}</Text>
      </View>
      <Text style={styles.locationCoords}>
        {msg.locationLat?.toFixed(4)}, {msg.locationLng?.toFixed(4)}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Attachment Menu ──────────────────────────────────────────────────────────

const ATTACH_OPTIONS = [
  { id: 'image', icon: <ImageIcon color={Colors.cyan} size={22} />, label: 'صورة', color: Colors.cyanDim, border: Colors.glassBorderBright },
  { id: 'video', icon: <Film color={Colors.purple} size={22} />, label: 'فيديو', color: Colors.purpleDim, border: Colors.purple + '44' },
  { id: 'voice', icon: <Mic color={Colors.pink} size={22} />, label: 'صوت', color: Colors.pinkDim, border: Colors.pink + '44' },
  { id: 'location', icon: <MapPin color={Colors.gold} size={22} />, label: 'موقع', color: Colors.goldDim, border: Colors.gold + '44' },
];

// Dummy media URLs for simulated sending
const dummyImages = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=80',
  'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
];
const dummyVideos = [
  'https://images.unsplash.com/photo-1682687220067-dced9a881b56?w=400&q=80',
  'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80',
];
const dummyLocations = [
  { name: 'برج خليفة، دبي', lat: 25.1972, lng: 55.2744 },
  { name: 'ميدان التحرير، القاهرة', lat: 30.0444, lng: 31.2357 },
  { name: 'الحمراء، غرناطة', lat: 37.1760, lng: -3.5881 },
];

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { friends, chatMessages, sendMessage, fetchMessages } = useChatStore();
  const friend = friends.find(f => f.id === id);
  const messages = chatMessages[id ?? ''] ?? [];

  React.useEffect(() => {
    if (id && user) {
      fetchMessages(id, user.id);
    }
  }, [id, user]);

  const [input, setInput] = useState('');
  const [showTranslation, setShowTranslation] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callOpen, setCallOpen] = useState(false);
  const recordInterval = useRef<any>(null);
  const listRef = useRef<FlatList>(null);

  const now = () => {
    const d = new Date();
    const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m} ${h < 12 ? 'ص' : 'م'}`;
  };
  const uid = () => Math.random().toString(36).slice(2);

  const handleSendText = () => {
    if (!input.trim() || !id) return;
    sendMessage(id, { id: uid(), type: 'text', text: input.trim(), isMe: true, time: now() });
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleAttach = (type: string) => {
    if (!id) return;
    setShowAttach(false);
    if (type === 'image') {
      const url = dummyImages[Math.floor(Math.random() * dummyImages.length)];
      sendMessage(id, { id: uid(), type: 'image', mediaUrl: url, isMe: true, time: now() });
    } else if (type === 'video') {
      const url = dummyVideos[Math.floor(Math.random() * dummyVideos.length)];
      sendMessage(id, { id: uid(), type: 'video', mediaUrl: url, text: 'فيديو 🎬', isMe: true, time: now() });
    } else if (type === 'location') {
      const loc = dummyLocations[Math.floor(Math.random() * dummyLocations.length)];
      sendMessage(id, { id: uid(), type: 'location', locationName: loc.name, locationLat: loc.lat, locationLng: loc.lng, isMe: true, time: now() });
    }
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const startRecording = () => {
    setRecording(true);
    setRecordSecs(0);
    recordInterval.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
  };

  const stopRecording = () => {
    if (!id) return;
    clearInterval(recordInterval.current);
    const dur = recordSecs;
    setRecording(false);
    setRecordSecs(0);
    if (dur > 0) {
      sendMessage(id, { id: uid(), type: 'voice', duration: dur, isMe: true, time: now() });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const formatRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!friend) return null;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#040710', '#070B14']} style={StyleSheet.absoluteFillObject} />

      {/* ── Header ─────────────────────────────────── */}
      <GlassCard style={styles.header} borderRadius={0} intensity={40}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.text} size={26} />
        </TouchableOpacity>
        <Image source={{ uri: friend.image }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{friend.name}</Text>
          <Text style={[styles.headerStatus, { color: friend.isOnline ? Colors.online : Colors.textMuted }]}>
            {friend.isOnline ? '● متصل الآن' : `● ${friend.lastSeen}`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setCallType('voice'); setCallOpen(true); }}>
            <Phone color={Colors.cyan} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => { setCallType('video'); setCallOpen(true); }}>
            <Video color={Colors.cyan} size={20} />
          </TouchableOpacity>
        </View>
      </GlassCard>

      {/* Translation toggle */}
      <TouchableOpacity style={styles.translateToggle} onPress={() => setShowTranslation(!showTranslation)}>
        <Languages color={showTranslation ? Colors.cyan : Colors.textMuted} size={14} />
        <Text style={[styles.translateText, { color: showTranslation ? Colors.cyan : Colors.textMuted }]}>
          الترجمة {showTranslation ? 'مفعّلة ✓' : 'معطّلة'}
        </Text>
      </TouchableOpacity>

      {/* ── Messages list ──────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: msg }) => (
          <View style={[styles.msgRow, msg.isMe && styles.msgRowMe]}>
            {!msg.isMe && <Image source={{ uri: friend.image }} style={styles.msgAvatar} />}

            <View style={styles.msgContent}>
              {msg.type === 'text' && <TextBubble msg={msg} friend={friend} />}
              {msg.type === 'voice' && <VoiceBubble msg={msg} />}
              {msg.type === 'image' && <ImageBubble msg={msg} />}
              {msg.type === 'video' && <VideoBubble msg={msg} />}
              {msg.type === 'location' && <LocationBubble msg={msg} />}
              <Text style={[styles.timeText, msg.isMe && { textAlign: 'right' }]}>{msg.time}</Text>
            </View>
          </View>
        )}
      />

      {/* ── Attachment Options Sheet ──────────────── */}
      {showAttach && (
        <GlassCard style={styles.attachSheet} borderRadius={20} intensity={60}>
          <View style={styles.attachGrid}>
            {ATTACH_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.id} style={styles.attachItem} onPress={() => handleAttach(opt.id)}>
                <View style={[styles.attachIcon, { backgroundColor: opt.color, borderColor: opt.border }]}>
                  {opt.icon}
                </View>
                <Text style={styles.attachLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      )}

      {/* ── Input Bar ─────────────────────────────── */}
      <View style={styles.inputBarOuter}>
        {recording ? (
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={stopRecording} style={styles.cancelRec}>
              <X color={Colors.danger} size={20} />
            </TouchableOpacity>
            <View style={styles.recordingInfo}>
              <View style={styles.recDot} />
              <Text style={styles.recTime}>{formatRec(recordSecs)}</Text>
              <Text style={styles.recLabel}>جاري التسجيل...</Text>
            </View>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.cyanDim, borderColor: Colors.glassBorderBright }]} onPress={stopRecording}>
              <Send color={Colors.cyan} size={20} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TouchableOpacity
              style={[styles.attachToggleBtn, showAttach && { backgroundColor: Colors.cyanDim, borderColor: Colors.glassBorderBright }]}
              onPress={() => setShowAttach(!showAttach)}
            >
              <Plus color={showAttach ? Colors.cyan : Colors.textMuted} size={22} />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="اكتب رسالة..."
              placeholderTextColor={Colors.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSendText}
              onFocus={() => setShowAttach(false)}
            />

            {input.trim() ? (
              <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.cyanDim, borderColor: Colors.glassBorderBright }]} onPress={handleSendText}>
                <Send color={Colors.cyan} size={20} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendBtn} onPress={startRecording}>
                <Mic color={Colors.textMuted} size={20} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Call Modal */}
      {friend && (
        <CallModal
          visible={callOpen}
          onClose={() => setCallOpen(false)}
          friend={friend}
          callType={callType}
        />
      )}
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerStatus: { fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, alignItems: 'center', justifyContent: 'center' },

  // Translation
  translateToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginVertical: 8, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.glassBorder },
  translateText: { fontSize: 12, fontWeight: '600' },

  // Messages
  messagesList: { padding: 16, gap: 14 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginBottom: 18 },
  msgContent: { maxWidth: '78%', gap: 3 },
  timeText: { fontSize: 11, color: Colors.textMuted, paddingHorizontal: 4 },

  // Text bubble
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, borderBottomRightRadius: 4 },
  bubbleText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  translationBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginLeft: 4 },
  translationText: { fontSize: 12, color: Colors.cyan, fontStyle: 'italic' },

  // Voice bubble
  voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minWidth: 200 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  voiceBarWrap: { flex: 1, gap: 4 },
  voiceTrack: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 2, overflow: 'hidden', position: 'relative' },
  voiceFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, opacity: 0.3 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: Colors.textSecondary },
  voiceDur: { fontSize: 11, color: Colors.textMuted },

  // Media bubble
  mediaBubble: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder },
  mediaImg: { width: 220, height: 160 },
  mediaCaption: { padding: 10 },

  // Video bubble
  videoWrap: { position: 'relative' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoPlayBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  videoTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  videoTagText: { color: Colors.text, fontSize: 11, fontWeight: '600' },

  // Location bubble
  locationBubble: { borderRadius: 16, overflow: 'hidden', width: 230 },
  mapPlaceholder: { height: 130, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  mapGrid: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around' },
  mapGridLine: { width: 1, backgroundColor: 'rgba(0,240,255,0.08)', flex: 1, marginHorizontal: 10 },
  mapGridH: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'column', justifyContent: 'space-around' },
  mapGridLineH: { height: 1, backgroundColor: 'rgba(0,240,255,0.08)', marginVertical: 10 },
  mapPin: { zIndex: 10 },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, paddingBottom: 2 },
  locationName: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1 },
  locationCoords: { fontSize: 11, color: Colors.textMuted, paddingHorizontal: 10, paddingBottom: 10 },

  // Image modal
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '85%' },
  closeModal: { position: 'absolute', top: 52, right: 20, backgroundColor: Colors.surface, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: Colors.glassBorder },

  // Attachment sheet
  attachSheet: { marginHorizontal: 12, marginBottom: 8, padding: 16 },
  attachGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  attachItem: { alignItems: 'center', gap: 8 },
  attachIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  attachLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Input bar
  inputBarOuter: { borderTopWidth: 1, borderTopColor: Colors.glassBorder, backgroundColor: Colors.glassBg },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 16 },
  attachToggleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { flex: 1, color: Colors.text, fontSize: 15, height: 46, backgroundColor: Colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.glassBorder, outlineStyle: 'none' } as any,
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Recording
  recordingBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cancelRec: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dangerDim, borderWidth: 1, borderColor: Colors.danger + '55', alignItems: 'center', justifyContent: 'center' },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger },
  recTime: { fontSize: 16, fontWeight: '700', color: Colors.text },
  recLabel: { fontSize: 13, color: Colors.textMuted },
});
