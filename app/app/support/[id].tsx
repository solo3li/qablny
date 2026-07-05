import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { GlassCard } from '../../components/GlassCard';
import { chatSignalR } from '../../src/api/chatSignalR';
import { axiosClient, uploadMedia } from '../../src/api/axiosClient';
import { ChevronLeft, Send, Mic, Image as ImageIcon, Check, X, ShieldCheck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { WaveformPlayer } from '../../components/WaveformPlayer';

export default function SupportTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [ticketStatus, setTicketStatus] = useState('Open');
  const [isClosing, setIsClosing] = useState(false);

  // Recording states
  const [recording, setRecording] = useState(false);
  const [recordingObj, setRecordingObj] = useState<Audio.Recording | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordInterval = useRef<any>(null);

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    setupSignalR();
    return () => {
      chatSignalR.leaveTicketGroup(id);
      chatSignalR.setOnReceiveSupportMessage(() => {});
    };
  }, [id]);

  const fetchMessages = async () => {
    try {
      const res = await axiosClient.get(`/support/tickets/${id}/messages`);
      setMessages(res.data);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setupSignalR = async () => {
    await chatSignalR.connect();
    await chatSignalR.joinTicketGroup(id);
    chatSignalR.setOnReceiveSupportMessage((msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
  };

  const handleSendText = async () => {
    if (!input.trim()) return;
    const txt = input.trim();
    setInput('');
    try {
      // Assuming MessageType 0 is Text
      await chatSignalR.sendSupportMessage(id, false, 0, txt, null, null);
    } catch (e) {
      console.error('Error sending support message', e);
    }
  };

  const attachImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, quality: 0.8,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const url = await uploadMedia(result.assets[0], 'image');
        // MessageType 2 is Image
        await chatSignalR.sendSupportMessage(id, false, 2, 'صورة مرفقة', null, url);
      }
    } catch (e) { console.error('Attach error', e); }
  };

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
    } catch (err) { console.error(err); }
  };

  const stopRecording = async () => {
    clearInterval(recordInterval.current);
    const dur = recordSecs;
    setRecording(false); setRecordSecs(0);

    if (recordingObj) {
      try {
        await recordingObj.stopAndUnloadAsync();
        const uri = recordingObj.getURI();
        setRecordingObj(null);
        if (dur > 0 && uri) {
          const assetToUpload = Platform.OS === 'web' 
            ? await (await fetch(uri)).blob() 
            : { uri, type: 'audio/m4a' };
            
          const url = await uploadMedia(assetToUpload, 'audio');
          // MessageType 1 is Voice
          await chatSignalR.sendSupportMessage(id, false, 1, 'مقطع صوتي', dur, url);
        }
      } catch (err) { console.error(err); }
    }
  };

  const cancelRecording = async () => {
    clearInterval(recordInterval.current);
    setRecording(false); setRecordSecs(0);
    if (recordingObj) { try { await recordingObj.stopAndUnloadAsync(); } catch(e){} setRecordingObj(null); }
  };

  const closeTicket = async () => {
    setIsClosing(true);
    try {
      await axiosClient.post(`/support/tickets/${id}/close`);
      setTicketStatus('Closed');
    } catch (e) {
      console.error(e);
    } finally {
      setIsClosing(false);
    }
  };

  const renderBubble = ({ item: msg }: { item: any }) => {
    const isMe = !msg.isAdmin; // user sent it
    const dt = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        {!isMe && (
          <View style={styles.adminAvatar}>
            <ShieldCheck color="#fff" size={16} />
          </View>
        )}
        <View style={styles.msgContent}>
          {msg.type === 0 && (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, isMe && { color: '#ffffff' }]}>{msg.content}</Text>
            </View>
          )}
          {msg.type === 1 && msg.mediaUrl && (
            <View style={[isMe ? styles.bubbleMe : styles.bubbleThem, { padding: 8, borderRadius: 18 }]}>
              <WaveformPlayer uri={msg.mediaUrl} durationSeconds={msg.durationSeconds || 0} isMe={isMe} />
            </View>
          )}
          {msg.type === 2 && msg.mediaUrl && (
            <View style={styles.mediaBubble}>
              <Image source={{ uri: msg.mediaUrl }} style={styles.mediaImg} resizeMode="cover" />
            </View>
          )}

          <View style={[styles.timeRow, isMe && styles.timeRowMe]}>
            <Text style={styles.timeText}>{dt}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlassCard style={styles.header} intensity={90}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color={Colors.text} size={26} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>تذكرة #{id.slice(0,6)}</Text>
          <Text style={styles.headerStatus}>{ticketStatus === 'Open' ? 'مفتوح' : 'مغلق'}</Text>
        </View>
        {ticketStatus === 'Open' && (
          <TouchableOpacity onPress={closeTicket} disabled={isClosing} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>{isClosing ? '...' : 'إغلاق التذكرة'}</Text>
          </TouchableOpacity>
        )}
      </GlassCard>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderBubble}
          contentContainerStyle={styles.messagesList}
        />
      )}

      {/* Input Area */}
      <View style={styles.inputAreaOuter}>
        <View style={styles.inputBarOuter}>
          {recording ? (
            <View style={styles.inputBar}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRec}>
                <X color={Colors.danger} size={20} />
              </TouchableOpacity>
              <View style={styles.recordingInfo}>
                <View style={styles.recDot} />
                <Text style={styles.recTime}>{recordSecs}s</Text>
                <Text style={styles.recLabel}>جاري التسجيل...</Text>
              </View>
              <TouchableOpacity style={styles.sendBtn} onPress={stopRecording}>
                <Send color={Colors.primary} size={20} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachToggleBtn} onPress={attachImage}>
                <ImageIcon color={Colors.textMuted} size={22} />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="اكتب رسالتك للدعم الفني..."
                placeholderTextColor={Colors.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSendText}
                multiline
              />

              {input.trim() ? (
                <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.primary }]} onPress={handleSendText}>
                  <Send color={'#ffffff'} size={20} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.sendBtn} onPress={startRecording}>
                  <Mic color={Colors.textMuted} size={20} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 12, gap: 10, borderBottomWidth: 2, borderBottomColor: Colors.glassBorder },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  headerStatus: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  closeBtn: { backgroundColor: Colors.surfaceHover, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  closeBtnText: { color: Colors.danger, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  messagesList: { padding: 16, gap: 14, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowMe: { flexDirection: 'row-reverse' },
  adminAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  msgContent: { maxWidth: '78%', gap: 3 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleThem: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.glassBorder, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: Colors.primary, borderWidth: 1, borderColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { color: Colors.text, fontSize: 15, lineHeight: 22 },
  mediaBubble: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder },
  mediaImg: { width: 220, height: 160 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  timeRowMe: { justifyContent: 'flex-end' },
  timeText: { fontSize: 11, color: Colors.textMuted },
  
  inputAreaOuter: { padding: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.glassBorder },
  inputBarOuter: { flexDirection: 'column' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  attachToggleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surfaceHover, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: Colors.surfaceHover, borderRadius: 22, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, color: Colors.text, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', textAlign: 'right' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2, backgroundColor: Colors.surfaceHover },
  
  cancelRec: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recordingInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  recTime: { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  recLabel: { color: Colors.textMuted, fontSize: 14 },
});
