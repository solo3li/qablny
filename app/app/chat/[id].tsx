import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Modal,
  Animated, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/store/authStore';
import { useChatStore, UIChatMessage as ChatMessage, ReadStatus } from '../../src/store/chatStore';
import { useCallStore } from '../../src/store/callStore';
import { WaveformPlayer } from '../../components/WaveformPlayer';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ReplyBar, ReplyData } from '../../components/ReplyBar';
import { chatSignalR } from '../../src/api/chatSignalR';
import {
  Send, Languages, ChevronLeft, Phone, Video,
  Mic, Image as ImageIcon, Film, MapPin, X, Play,
  Plus, Check, CornerUpLeft, Pencil, Trash2,
} from 'lucide-react-native';
import { uploadMedia } from '../../src/api/axiosClient';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

// ─── Read Receipt ─────────────────────────────────────────────────────────────

function ReadReceipt({ status }: { status?: ReadStatus }) {
  if (!status || status === 'sending') {
    return <Text style={styles.receiptSending}>○</Text>;
  }
  if (status === 'sent') {
    return <Check color="#6B7A99" size={11} strokeWidth={2.5} />;
  }
  const color = status === 'read' ? Colors.cyan : '#6B7A99';
  return (
    <View style={styles.receiptDouble}>
      <View style={styles.checkA}><Check color={color} size={11} strokeWidth={2.5} /></View>
      <View style={styles.checkB}><Check color={color} size={11} strokeWidth={2.5} /></View>
    </View>
  );
}

// ─── Reply Quote ──────────────────────────────────────────────────────────────

function ReplyQuote({ replyTo }: { replyTo: ChatMessage['replyTo'] }) {
  if (!replyTo) return null;
  const preview =
    replyTo.type === 'text' ? replyTo.text :
    replyTo.type === 'voice' ? '🎵 رسالة صوتية' :
    replyTo.type === 'image' ? '📷 صورة' :
    replyTo.type === 'video' ? '🎬 فيديو' :
    replyTo.type === 'location' ? '📍 موقع' : 'رسالة';

  return (
    <View style={styles.replyQuote}>
      <View style={styles.replyAccent} />
      <View style={styles.replyQuoteContent}>
        <Text style={styles.replyQuoteName}>{replyTo.isMe ? 'أنت' : replyTo.senderName}</Text>
        <Text style={styles.replyQuoteText} numberOfLines={1}>{preview}</Text>
      </View>
    </View>
  );
}

// ─── Message Bubbles ──────────────────────────────────────────────────────────

function TextBubble({ msg }: { msg: ChatMessage }) {
  return (
    <View style={[styles.bubble, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
      {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
      <Text style={styles.bubbleText}>{msg.text}</Text>
      {msg.isEdited && <Text style={styles.editedLabel}>تم التعديل</Text>}
    </View>
  );
}

function VoiceBubble({ msg }: { msg: ChatMessage }) {
  // Uploading state — local only
  if (msg.isUploading) {
    return (
      <View style={[styles.bubble, styles.bubbleMe, styles.uploadingRow]}>
        <ActivityIndicator color={Colors.cyan} size="small" />
        <Text style={styles.uploadingText}>🎙 جاري الرفع...</Text>
      </View>
    );
  }
  if (!msg.mediaUrl) {
    // This should not happen in production — backend always sends mediaUrl
    return null;
  }
  return (
    <View style={msg.isMe ? styles.bubbleMe : styles.bubbleThem}>
      {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
      <WaveformPlayer uri={msg.mediaUrl} durationSeconds={msg.duration} isMe={msg.isMe} />
    </View>
  );
}

function ImageBubble({ msg }: { msg: ChatMessage }) {
  const [expanded, setExpanded] = useState(false);
  if (msg.isUploading || !msg.mediaUrl) {
    return (
      <View style={[styles.bubble, styles.bubbleMe, styles.uploadingRow]}>
        <ActivityIndicator color={Colors.cyan} size="small" />
        <Text style={styles.uploadingText}>📷 جاري الرفع...</Text>
      </View>
    );
  }
  return (
    <>
      <TouchableOpacity style={styles.mediaBubble} onPress={() => setExpanded(true)}>
        {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
        <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImg} resizeMode="cover" />
        {msg.text ? (
          <View style={[styles.mediaCaption, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
            <Text style={styles.bubbleText}>{msg.text}</Text>
          </View>
        ) : null}
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
  if (msg.isUploading || !msg.mediaUrl) {
    return (
      <View style={[styles.bubble, styles.bubbleMe, styles.uploadingRow]}>
        <ActivityIndicator color={Colors.purple} size="small" />
        <Text style={styles.uploadingText}>🎬 جاري الرفع...</Text>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.mediaBubble}>
      {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
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
    </TouchableOpacity>
  );
}

function LocationBubble({ msg }: { msg: ChatMessage }) {
  return (
    <TouchableOpacity style={[styles.locationBubble, msg.isMe ? styles.bubbleMe : styles.bubbleThem]}>
      {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}
      <View style={styles.mapPlaceholder}>
        <LinearGradient colors={['#0d2137', '#0a1929']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.mapGrid}>
          {Array.from({ length: 6 }).map((_, i) => <View key={i} style={styles.mapGridLine} />)}
        </View>
        <View style={styles.mapGridH}>
          {Array.from({ length: 4 }).map((_, i) => <View key={i} style={styles.mapGridLineH} />)}
        </View>
        <View style={styles.mapPin}><MapPin color={Colors.danger} size={28} fill={Colors.danger} /></View>
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

// ─── Context Menu ─────────────────────────────────────────────────────────────

function MessageContextMenu({
  msg, friendName, onReply, onEdit, onDelete, onClose,
}: {
  msg: ChatMessage; friendName: string;
  onReply: () => void; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  const previewText =
    msg.type === 'text' ? msg.text :
    msg.type === 'voice' ? '🎵 رسالة صوتية' :
    msg.type === 'image' ? '📷 صورة' :
    msg.type === 'video' ? '🎬 فيديو' : '📍 موقع';

  return (
    <Pressable style={styles.contextOverlay} onPress={onClose}>
      <View style={[styles.contextMenu, msg.isMe ? styles.contextMenuMe : styles.contextMenuThem]}>
        <View style={styles.contextPreview}>
          <Text style={styles.contextPreviewName}>{msg.isMe ? 'أنت' : friendName}</Text>
          <Text style={styles.contextPreviewText} numberOfLines={2}>{previewText}</Text>
        </View>
        <View style={styles.contextDivider} />

        <TouchableOpacity style={styles.contextItem} onPress={() => { onReply(); onClose(); }}>
          <CornerUpLeft color={Colors.cyan} size={16} />
          <Text style={styles.contextItemText}>رد</Text>
        </TouchableOpacity>

        {msg.isMe && msg.type === 'text' && (
          <TouchableOpacity style={styles.contextItem} onPress={() => { onEdit(); onClose(); }}>
            <Pencil color={Colors.gold} size={16} />
            <Text style={[styles.contextItemText, { color: Colors.gold }]}>تعديل</Text>
          </TouchableOpacity>
        )}

        {msg.isMe && !msg.isUploading && (
          <TouchableOpacity style={styles.contextItem} onPress={() => { onDelete(); onClose(); }}>
            <Trash2 color={Colors.danger} size={16} />
            <Text style={[styles.contextItemText, { color: Colors.danger }]}>حذف</Text>
          </TouchableOpacity>
        )}
      </View>
    </Pressable>
  );
}

// ─── Attachment Options ───────────────────────────────────────────────────────

const ATTACH_OPTIONS = [
  { id: 'image', icon: <ImageIcon color={Colors.cyan} size={22} />, label: 'صورة', color: Colors.cyanDim, border: Colors.glassBorderBright },
  { id: 'video', icon: <Film color={Colors.purple} size={22} />, label: 'فيديو', color: Colors.purpleDim, border: Colors.purple + '44' },
  { id: 'location', icon: <MapPin color={Colors.gold} size={22} />, label: 'موقع', color: Colors.goldDim, border: Colors.gold + '44' },
];

const dummyLocations = [
  { name: 'برج خليفة، دبي', lat: 25.1972, lng: 55.2744 },
  { name: 'ميدان التحرير، القاهرة', lat: 30.0444, lng: 31.2357 },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { id, name, image } = useLocalSearchParams<{ id: string; name?: string; image?: string }>();
  const { user } = useAuthStore();
  const {
    friends, chatMessages, sendMessage, addLocalMessage, replaceLocalMessage,
    fetchMessages, typingUsers, voiceUsers, onlineUsers, markMessagesRead,
    deleteMessage, editMessage,
  } = useChatStore();

  const storeFriend = friends.find(f => f.id === id);
  const friend = storeFriend || (name ? { id, name, profileImageUrl: image, isOnline: true, lastSeen: 'الآن', unread: 0 } : null);
  const messages = chatMessages[id ?? ''] ?? [];
  const isTyping = typingUsers[id ?? ''] ?? false;
  const isRecordingVoice = voiceUsers[id ?? ''] ?? false; // other user recording

  // Use global real-time online status if available
  const realTimeStatus = id ? onlineUsers[id] : null;
  const isOnline = realTimeStatus ? realTimeStatus.isOnline : (storeFriend?.isOnline ?? (friend as any).isOnline);
  const lastSeen = realTimeStatus ? realTimeStatus.lastSeen : (storeFriend?.lastSeen ?? (friend as any).lastSeen);

  React.useEffect(() => {
    if (id && user) {
      fetchMessages(id, user.id);
      useChatStore.getState().initSignalR(user.id);
      markMessagesRead(id);
    }
  }, [id, user]);

  const { initiateCall } = useCallStore();

  // ── Local state ──
  const [input, setInput] = useState('');
  const [showTranslation, setShowTranslation] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingObj, setRecordingObj] = useState<Audio.Recording | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyData | null>(null);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  const recordInterval = useRef<any>(null);
  const listRef = useRef<FlatList>(null);

  const now = () => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  const handleInputChange = (text: string) => {
    setInput(text);
    if (id) chatSignalR.notifyTyping(id);
  };

  // ── Send text ──
  const handleSendText = () => {
    if (!input.trim() || !id) return;

    if (editingMsgId) {
      editMessage(id, editingMsgId, input.trim());
      setEditingMsgId(null);
      setInput('');
      return;
    }

    const msg: ChatMessage = {
      id: uid(), type: 'text', text: input.trim(),
      isMe: true, time: now(),
      replyTo: replyTo
        ? { id: replyTo.id, text: replyTo.text, type: replyTo.type, isMe: replyTo.isMe, senderName: replyTo.senderName }
        : undefined,
    };
    sendMessage(id, msg);
    setInput('');
    setReplyTo(null);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  // ── Reply ──
  const handleReply = (msg: ChatMessage) => {
    setReplyTo({
      id: msg.id, text: msg.text, type: msg.type,
      isMe: msg.isMe,
      senderName: (storeFriend?.name || name) ?? 'مستخدم',
    });
  };

  // ── Edit ──
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setInput(msg.text || '');
  };
  const handleCancelEdit = () => { setEditingMsgId(null); setInput(''); };

  // ── Delete ──
  const handleDelete = (msg: ChatMessage) => {
    Alert.alert('حذف الرسالة', 'هل تريد حذف هذه الرسالة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => id && deleteMessage(id, msg.id) },
    ]);
  };

  // ── Attach media ──
  const handleAttach = async (type: string) => {
    if (!id) return;
    setShowAttach(false);

    if (type === 'image' || type === 'video') {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true, quality: 0.8,
        });
        if (!result.canceled && result.assets?.length > 0) {
          const asset = result.assets[0];
          const localId = uid();
          // 1. Show local uploading placeholder
          addLocalMessage(id, {
            id: localId, type: type as any,
            isMe: true, time: now(), isUploading: true, readStatus: 'sending',
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

          // 2. Upload
          const uploadedUrl = await uploadMedia(asset, type as any);

          // 3. Send to API (this fires SignalR to the other user)
          const finalMsg: ChatMessage = {
            id: uid(), type: type as any, mediaUrl: uploadedUrl,
            text: type === 'video' ? '🎬 فيديو' : '',
            isMe: true, time: now(), readStatus: 'sending',
            replyTo: replyTo
              ? { id: replyTo.id, text: replyTo.text, type: replyTo.type, isMe: replyTo.isMe, senderName: (storeFriend?.name || name) ?? '' }
              : undefined,
          };
          // Replace placeholder + send
          replaceLocalMessage(id, localId, { ...finalMsg });
          setReplyTo(null);
          // Send to backend (without re-adding to UI)
          await sendMessage(id, { ...finalMsg, _skipLocalAdd: true } as any);
        }
      } catch (e) { console.error('Attach error', e); }

    } else if (type === 'location') {
      const loc = dummyLocations[Math.floor(Math.random() * dummyLocations.length)];
      sendMessage(id, { id: uid(), type: 'location', locationName: loc.name, locationLat: loc.lat, locationLng: loc.lng, isMe: true, time: now() });
    }
  };

  // ── Voice recording ──
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') { alert('نحتاج إذن الميكروفون'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecordingObj(recording);
      setRecording(true);
      setRecordSecs(0);
      recordInterval.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
      if (id) chatSignalR.startRecording(id);
    } catch (err) { console.error('Recording error', err); }
  };

  const cancelRecording = async () => {
    clearInterval(recordInterval.current);
    setRecording(false); setRecordSecs(0);
    if (id) chatSignalR.stopRecording(id);
    if (recordingObj) { try { await recordingObj.stopAndUnloadAsync(); } catch (e) {} setRecordingObj(null); }
  };

  const stopRecording = async () => {
    if (!id) return;
    clearInterval(recordInterval.current);
    const dur = recordSecs;
    setRecording(false); setRecordSecs(0);
    chatSignalR.stopRecording(id);

    if (recordingObj) {
      try {
        await recordingObj.stopAndUnloadAsync();
        const uri = recordingObj.getURI();
        setRecordingObj(null);

        if (dur > 0 && uri) {
          const localId = uid();

          // 1. Show local uploading placeholder ONLY in my UI
          addLocalMessage(id, {
            id: localId, type: 'voice', duration: dur,
            isMe: true, time: now(), isUploading: true, readStatus: 'sending',
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);

          // 2. Upload
          let assetToUpload: any;
          if (Platform.OS === 'web') {
            const res = await fetch(uri); const blob = await res.blob(); assetToUpload = blob;
          } else {
            assetToUpload = { uri, type: 'audio/m4a' };
          }
          const uploadedUrl = await uploadMedia(assetToUpload, 'audio');

          // 3. Send to backend with real URL → triggers SignalR to receiver with correct URL
          const finalMsg: ChatMessage = {
            id: uid(), type: 'voice', mediaUrl: uploadedUrl, duration: dur,
            isMe: true, time: now(), readStatus: 'sending',
            replyTo: replyTo
              ? { id: replyTo.id, text: replyTo.text, type: replyTo.type, isMe: replyTo.isMe, senderName: (storeFriend?.name || name) ?? '' }
              : undefined,
          };
          // Replace placeholder with real waveform
          replaceLocalMessage(id, localId, { ...finalMsg });
          setReplyTo(null);
          // Send to backend (without re-adding to UI)
          await sendMessage(id, { ...finalMsg, _skipLocalAdd: true } as any);
        }
      } catch (err) { console.error('Stop recording error', err); }
    }
  };

  const formatRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (!friend) return null;

  const avatarUri = (storeFriend?.profileImageUrl || image) ?? 'https://i.pravatar.cc/150';
  const friendName = storeFriend?.name || name || 'مستخدم';

  // ── Telegram-style dynamic status ──
  let headerStatus = '';
  let statusColor = Colors.textMuted;
  if (isRecordingVoice) {
    headerStatus = 'يسجل مقطع صوتي...';
    statusColor = Colors.pink;
  } else if (isTyping) {
    headerStatus = 'يكتب الآن...';
    statusColor = Colors.cyan;
  } else if (isOnline) {
    headerStatus = '● متصل الآن';
    statusColor = Colors.online;
  } else {
    headerStatus = `آخر ظهور: ${lastSeen || 'غير معروف'}`;
    statusColor = Colors.textMuted;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#040710', '#070B14']} style={StyleSheet.absoluteFillObject} />

      {/* Context Menu */}
      {contextMsg && (
        <MessageContextMenu
          msg={contextMsg} friendName={friendName}
          onReply={() => { handleReply(contextMsg); setContextMsg(null); }}
          onEdit={() => { handleStartEdit(contextMsg); setContextMsg(null); }}
          onDelete={() => { handleDelete(contextMsg); setContextMsg(null); }}
          onClose={() => setContextMsg(null)}
        />
      )}

      {/* ── Header ─────────────────────────────── */}
      <GlassCard style={styles.header} borderRadius={0} intensity={40}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.avatarWrapHeader}>
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          {isOnline && <View style={styles.headerOnlineDot} />}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{friendName}</Text>
          <Text style={[styles.headerStatus, { color: statusColor }]}>{headerStatus}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => initiateCall(friend.id, 'voice')}>
            <Phone color={Colors.cyan} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => initiateCall(friend.id, 'video')}>
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

      {/* ── Messages ────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: msg }) => (
          <Pressable onLongPress={() => setContextMsg(msg)} delayLongPress={350}>
            <View style={[styles.msgRow, msg.isMe && styles.msgRowMe]}>
              {!msg.isMe && <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />}
              <View style={styles.msgContent}>
                {msg.type === 'text' && <TextBubble msg={msg} />}
                {msg.type === 'voice' && <VoiceBubble msg={msg} />}
                {msg.type === 'image' && <ImageBubble msg={msg} />}
                {msg.type === 'video' && <VideoBubble msg={msg} />}
                {msg.type === 'location' && <LocationBubble msg={msg} />}

                {/* Time + receipt */}
                {!msg.isUploading && (
                  <View style={[styles.timeRow, msg.isMe && styles.timeRowMe]}>
                    <Text style={styles.timeText}>{msg.time}</Text>
                    {msg.isMe && <ReadReceipt status={msg.readStatus} />}
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
        ListFooterComponent={() => isTyping ? <TypingIndicator name={friendName} /> : null}
      />

      {/* ── Attachment Sheet ────────────────────── */}
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

      {/* ── Input Area ──────────────────────────── */}
      <View style={styles.inputAreaOuter}>
        {editingMsgId && (
          <View style={styles.editBar}>
            <Pencil color={Colors.gold} size={14} />
            <Text style={styles.editBarText}>تعديل الرسالة</Text>
            <TouchableOpacity onPress={handleCancelEdit}>
              <X color={Colors.textMuted} size={16} />
            </TouchableOpacity>
          </View>
        )}
        {!editingMsgId && replyTo && (
          <ReplyBar reply={replyTo} onCancel={() => setReplyTo(null)} />
        )}

        <View style={styles.inputBarOuter}>
          {recording ? (
            <View style={styles.inputBar}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRec}>
                <X color={Colors.danger} size={20} />
              </TouchableOpacity>
              <View style={styles.recordingInfo}>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{formatRec(recordSecs)}</Text>
                <Text style={styles.recLabel}>جاري التسجيل...</Text>
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: Colors.cyanDim, borderColor: Colors.glassBorderBright }]}
                onPress={stopRecording}
              >
                <Send color={Colors.cyan} size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputBar}>
              {!editingMsgId && (
                <TouchableOpacity
                  style={[styles.attachToggleBtn, showAttach && { backgroundColor: Colors.cyanDim, borderColor: Colors.glassBorderBright }]}
                  onPress={() => setShowAttach(!showAttach)}
                >
                  <Plus color={showAttach ? Colors.cyan : Colors.textMuted} size={22} />
                </TouchableOpacity>
              )}

              <TextInput
                style={[styles.input, editingMsgId && styles.inputEdit]}
                placeholder={editingMsgId ? 'تعديل الرسالة...' : 'اكتب رسالة...'}
                placeholderTextColor={Colors.textMuted}
                value={input}
                onChangeText={handleInputChange}
                onSubmitEditing={handleSendText}
                onFocus={() => setShowAttach(false)}
                multiline
              />

              {input.trim() ? (
                <TouchableOpacity
                  style={[styles.sendBtn, {
                    backgroundColor: editingMsgId ? 'rgba(255,209,102,0.15)' : Colors.cyanDim,
                    borderColor: editingMsgId ? Colors.gold : Colors.glassBorderBright,
                  }]}
                  onPress={handleSendText}
                >
                  {editingMsgId
                    ? <Check color={Colors.gold} size={20} strokeWidth={2.5} />
                    : <Send color={Colors.cyan} size={20} />
                  }
                </TouchableOpacity>
              ) : !editingMsgId ? (
                <TouchableOpacity style={styles.sendBtn} onPress={startRecording}>
                  <Mic color={Colors.textMuted} size={20} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  avatarWrapHeader: { position: 'relative' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21 },
  headerOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.online, borderWidth: 2, borderColor: '#070B14' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerStatus: { fontSize: 12, marginTop: 1 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, alignItems: 'center', justifyContent: 'center' },

  translateToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginVertical: 8, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: Colors.glassBorder },
  translateText: { fontSize: 12, fontWeight: '600' },

  messagesList: { padding: 16, gap: 14, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginBottom: 22 },
  msgContent: { maxWidth: '78%', gap: 3 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  timeRowMe: { justifyContent: 'flex-end' },
  timeText: { fontSize: 11, color: Colors.textMuted },

  // Read receipts
  receiptSending: { fontSize: 11, color: Colors.textMuted },
  receiptDouble: { width: 22, height: 13, position: 'relative' },
  checkA: { position: 'absolute', left: 0, top: 0 },
  checkB: { position: 'absolute', left: 7, top: 0 },

  // Reply quote
  replyQuote: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 },
  replyAccent: { width: 3, backgroundColor: Colors.cyan },
  replyQuoteContent: { flex: 1, paddingHorizontal: 8, paddingVertical: 5 },
  replyQuoteName: { fontSize: 11, fontWeight: '700', color: Colors.cyan, marginBottom: 2 },
  replyQuoteText: { fontSize: 12, color: Colors.textSecondary },

  // Context menu
  contextOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.55)' },
  contextMenu: { position: 'absolute', top: '35%', backgroundColor: '#0D1529', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder, minWidth: 160, maxWidth: 220 },
  contextMenuMe: { right: 16 },
  contextMenuThem: { left: 60 },
  contextPreview: { padding: 12, paddingBottom: 8 },
  contextPreviewName: { fontSize: 11, fontWeight: '700', color: Colors.cyan, marginBottom: 3 },
  contextPreviewText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  contextDivider: { height: 1, backgroundColor: Colors.glassBorder, marginHorizontal: 12 },
  contextItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 16 },
  contextItemText: { fontSize: 14, fontWeight: '600', color: Colors.text },

  // Bubbles
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, borderBottomRightRadius: 4 },
  bubbleText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  editedLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 3, fontStyle: 'italic' },
  translationBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, marginLeft: 4 },
  translationText: { fontSize: 12, color: Colors.cyan, fontStyle: 'italic' },

  // Uploading
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160, paddingVertical: 12 },
  uploadingText: { color: Colors.textSecondary, fontSize: 13 },

  // Media
  mediaBubble: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder },
  mediaImg: { width: 220, height: 160 },
  mediaCaption: { padding: 10 },
  videoWrap: { position: 'relative' },
  videoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoPlayBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  videoTag: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  videoTagText: { color: Colors.text, fontSize: 11, fontWeight: '600' },

  // Location
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

  // Input area
  inputAreaOuter: { borderTopWidth: 1, borderTopColor: Colors.glassBorder, backgroundColor: Colors.glassBg },
  inputBarOuter: {},
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 16 },
  attachToggleBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { flex: 1, color: Colors.text, fontSize: 15, minHeight: 44, maxHeight: 120, backgroundColor: Colors.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.glassBorder, outlineStyle: 'none' } as any,
  inputEdit: { borderColor: Colors.gold + '60', backgroundColor: 'rgba(255,209,102,0.05)' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Edit bar
  editBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,209,102,0.08)', borderBottomWidth: 1, borderBottomColor: Colors.gold + '30' },
  editBarText: { flex: 1, color: Colors.gold, fontSize: 13, fontWeight: '600' },

  // Recording
  cancelRec: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.dangerDim, borderWidth: 1, borderColor: Colors.danger + '55', alignItems: 'center', justifyContent: 'center' },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger },
  recTime: { fontSize: 16, fontWeight: '700', color: Colors.text },
  recLabel: { fontSize: 13, color: Colors.textMuted },
});
