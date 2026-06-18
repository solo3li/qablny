import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';
import { LiveKitRoom, RoomAudioRenderer, VideoTrack, useTracks, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { axiosClient } from '../src/api/axiosClient';

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
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.cyan} />
    </View>
  );
}

function LocalVideo() {
  const { localParticipant } = useLocalParticipant();
  const track = localParticipant.getTrackPublication(Track.Source.Camera);

  if (track && track.track) {
    return (
      <VideoTrack 
        trackRef={{ participant: localParticipant, source: Track.Source.Camera, publication: track as any }} 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />
    );
  }
  return null;
}

export function LiveKitHandler({ roomName, callType, muted, cameraOn }: { roomName: string, callType: 'voice' | 'video', muted: boolean, cameraOn: boolean }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    axiosClient.get(`/match/token/${roomName}`).then(res => {
      setToken(res.data.token);
    }).catch(console.error);
  }, [roomName]);

  if (!token) return null;

  return (
    <LiveKitRoom
      serverUrl={LIVEKIT_URL}
      token={token}
      connect={true}
      audio={!muted}
      video={cameraOn && callType === 'video'}
      style={{ width: '100%', height: '100%', position: 'absolute' }}
    >
      <RoomAudioRenderer />
      {callType === 'video' && <RemoteVideo />}
      {callType === 'video' && (
        <View style={styles.selfVideoWrap}>
          <LocalVideo />
        </View>
      )}
    </LiveKitRoom>
  );
}

const styles = StyleSheet.create({
  selfVideoWrap: { position: 'absolute', top: 110, right: 16, width: 90, height: 130, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: Colors.glassBorderBright, backgroundColor: Colors.surface },
});
