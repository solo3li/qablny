import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  LiveKitRoom, 
  VideoTrack, 
  useRoomContext, 
  useTracks,
  useParticipant,
  useDataChannel,
  useLocalParticipant
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { Colors } from '../../constants/Colors';
import { axiosClient as api } from '../../src/api/axiosClient';
import { X, Send, Heart, Gift } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

function RoomView({ isHost, roomName, roomId }: { isHost: boolean, roomName: string, roomId?: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatText, setChatText] = useState('');
  
  // Viewers will see the host's camera
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone], { onlySubscribed: true });
  // Wait, if it's host, they should see their own local track, and viewers see remote.
  // Actually, useTracks(Track.Source.Camera) returns all camera tracks.
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
      localParticipant.setCameraEnabled(true);
      localParticipant.setMicrophoneEnabled(true);
    }
  }, [isHost, localParticipant]);

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
      } catch (e) {
        console.log(e);
      }
    }
    room.disconnect();
    router.back();
  };

  const handleSendGift = () => {
    // Send a fun heart animation via data channel as a "gift" for now
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
        <View style={[styles.video, { backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{color: '#FFF'}}>Waiting for host...</Text>
        </View>
      )}

      {/* Overlays */}
      <View style={styles.overlay}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.hostInfo}>
            <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>
            <Text style={styles.roomTitle}>{roomName}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={handleEndStream}>
            <X color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <KeyboardAvoidingView 
          style={styles.bottomArea} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            style={styles.chatList}
            inverted={false}
            renderItem={({ item }) => (
              <View style={styles.chatMessage}>
                <Text style={styles.chatSender}>{item.sender}: </Text>
                {item.type === 'gift' ? (
                  <Text style={{color: '#FCD34D', fontWeight: 'bold'}}>Sent a gift! 🎁</Text>
                ) : (
                  <Text style={styles.chatText}>{item.text}</Text>
                )}
              </View>
            )}
            onContentSizeChange={(w, h) => { /* scroll to bottom logic */ }}
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={chatText}
              onChangeText={setChatText}
              onSubmitEditing={handleSend}
            />
            {!isHost && (
              <TouchableOpacity style={styles.giftButton} onPress={handleSendGift}>
                <Gift color="#FFF" size={20} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Send color="#FFF" size={20} />
            </TouchableOpacity>
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
        <Text style={{color: '#FFF'}}>Connecting...</Text>
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={true}
      video={isHost === 'true'} // Host publishes video automatically
    >
      <RoomView 
        isHost={isHost === 'true'} 
        roomName={roomName as string} 
        roomId={roomId as string} 
      />
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 16, paddingTop: 60 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hostInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(0,0,0,0.4)', padding: 8, borderRadius: 20 },
  liveBadge: { backgroundColor: Colors.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  roomTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 14, marginRight: 8 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  bottomArea: { flex: 0.5, justifyContent: 'flex-end', gap: 16 },
  chatList: { flex: 1, marginBottom: 16 },
  chatMessage: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 4 },
  chatSender: { color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' },
  chatText: { color: '#FFF' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, height: 44, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 22, paddingHorizontal: 16, color: '#FFF' },
  giftButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondary, justifyContent: 'center', alignItems: 'center' },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' }
});
