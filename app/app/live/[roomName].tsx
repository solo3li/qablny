import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  LiveKitRoom, 
  VideoTrack, 
  useRoomContext, 
  useTracks,
  useDataChannel,
  useLocalParticipant
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { Colors } from '../../constants/Colors';
import { axiosClient as api } from '../../src/api/axiosClient';
import { X, Send, Heart, Gift, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

function RoomView({ isHost, roomName, roomId }: { isHost: boolean, roomName: string, roomId?: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');
  
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: true });
  const allCameraTracks = useTracks([Track.Source.Camera]);
  const hostTrack = allCameraTracks[0];

  const { send } = useDataChannel(roomName, (msg) => {
    try {
      const decoded = new TextDecoder().decode(msg.payload);
      const data = JSON.parse(decoded);
      setMessages(prev => [...prev, data]);
    } catch(e) {}
  });

  useEffect(() => {
    if (isHost && localParticipant) {
      (async () => {
        try {
          const perm = await Audio.requestPermissionsAsync();
          if (perm.status === 'granted') {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
            });
          }
          await localParticipant.setCameraEnabled(true);
          await localParticipant.setMicrophoneEnabled(true);
        } catch (e) {
          console.error('Permission error:', e);
        }
      })();
    }
    return () => {
      if (isHost && roomId) {
        api.post(`/live/${roomId}/end`).catch(() => {});
      }
    };
  }, [isHost, localParticipant, roomId]);

  const handleSend = () => {
    if (!chatText.trim()) return;
    const msg = { id: Date.now().toString(), text: chatText, sender: localParticipant?.identity || 'Me' };
    setMessages(prev => [...prev, msg]);
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
    setChatText('');
  };

  const handleEndStream = async () => {
    if (isHost && roomId) {
      try {
        await api.post(`/live/${roomId}/end`);
      } catch (e) {}
    }
    room.disconnect();
    router.back();
  };

  const handleSendGift = () => {
    const msg = { id: Date.now().toString(), type: 'gift', sender: localParticipant?.identity || 'Me' };
    setMessages(prev => [...prev, msg]);
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
  };

  return (
    <View style={styles.container}>
      {/* Video Background */}
      {hostTrack ? (
        <VideoTrack trackRef={hostTrack} style={styles.video} />
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for host...</Text>
        </View>
      )}

      {/* Top Gradient for Header Readability */}
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={styles.topGradient} />

      {/* Overlays */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.hostInfo}>
            <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
            <View style={styles.hostTextWrap}>
              <Text style={styles.roomTitle} numberOfLines={1}>{isHost ? 'My Stream' : 'Live Stream'}</Text>
              <Text style={styles.hostSubtitle} numberOfLines={1}>Room: {roomName.substring(0,8)}...</Text>
            </View>
          </View>
          
          <View style={styles.rightActions}>
            <View style={styles.viewersBadge}>
              <Users color="#FFF" size={14} />
              <Text style={styles.viewersText}>1</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleEndStream}>
              <X color="#FFF" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Chat Area with Bottom Gradient */}
        <KeyboardAvoidingView 
          style={styles.bottomArea} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']} style={styles.bottomGradient} pointerEvents="none" />
          
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            inverted={false}
            renderItem={({ item }) => (
              <View style={styles.chatMessage}>
                <Text style={styles.chatSender}>{item.sender.substring(0,10)}</Text>
                {item.type === 'gift' ? (
                  <View style={styles.giftMessageWrap}>
                    <Gift color="#FCD34D" size={16} />
                    <Text style={styles.giftMessageText}>Sent a gift!</Text>
                  </View>
                ) : (
                  <Text style={styles.chatText}>{item.text}</Text>
                )}
              </View>
            )}
            onContentSizeChange={(w, h) => { /* scroll to bottom logic */ }}
          />

          <View style={styles.inputContainer}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Say something..."
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={chatText}
                onChangeText={setChatText}
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Send color={Colors.primary} size={18} />
              </TouchableOpacity>
            </View>
            {!isHost && (
              <TouchableOpacity style={styles.giftButton} onPress={handleSendGift}>
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.giftButtonGrad}>
                  <Gift color="#FFF" size={20} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

export default function LiveRoomScreen() {
  const { roomName, isHost, roomId } = useLocalSearchParams();
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    if (roomName) {
      api.get(`/live/token/${roomName}`).then(res => {
        setToken(res.data.token);
        setServerUrl(res.data.serverUrl);
      }).catch(console.error);
    }
  }, [roomName]);

  if (!token || !serverUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{color: '#FFF', fontFamily: 'PlusJakartaSans_500Medium'}}>Connecting to stream...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={isHost === 'true'}
      >
        <RoomView 
          isHost={isHost === 'true'} 
          roomName={roomName as string} 
          roomId={roomId as string} 
        />
      </LiveKitRoom>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#000', width: '100%', height: '100%' },
  container: { flex: 1, width: '100%', height: '100%', position: 'relative' },
  video: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
  waitingContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  waitingText: { color: '#FFF', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16 },
  
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 10 },
  
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.3)', padding: 6, paddingRight: 16, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  liveBadge: { backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  liveText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  hostTextWrap: { justifyContent: 'center' },
  roomTitle: { color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  hostSubtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10 },
  
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewersBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  viewersText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  bottomArea: { flex: 0.6, justifyContent: 'flex-end', position: 'relative' },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, top: 0 },
  
  chatList: { flex: 1, paddingHorizontal: 16, marginBottom: 16, zIndex: 2 },
  chatListContent: { justifyContent: 'flex-end', flexGrow: 1, paddingBottom: 10 },
  chatMessage: { backgroundColor: 'rgba(0,0,0,0.4)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 8, maxWidth: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chatSender: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 2 },
  chatText: { color: '#FFF', fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },
  giftMessageWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  giftMessageText: { color: '#FCD34D', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, zIndex: 2, gap: 12 },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 100, paddingLeft: 20, paddingRight: 6, height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', height: '100%' },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  giftButton: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', elevation: 5, shadowColor: '#F59E0B', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  giftButtonGrad: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
});
