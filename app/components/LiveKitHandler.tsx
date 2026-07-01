import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { LiveKitRoom, useTracks, VideoView, useLocalParticipant, useRoomContext } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { axiosClient } from '../src/api/axiosClient';

// Use 10.0.2.2 for Android emulator
const LIVEKIT_URL = 'wss://livekit.qablny.online';

function RemoteVideo() {
  const tracks = useTracks([Track.Source.Camera]);
  const remoteTrack = tracks.find((t: any) => t.participant.isLocal === false);

  if (remoteTrack && remoteTrack.publication?.track) {
    return (
      <VideoTrackRenderer track={remoteTrack.publication.track as any} />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.cyan} />
    </View>
  );
}

function VideoTrackRenderer({ track }: { track: any }) {
  return (
    <VideoView videoTrack={track} style={{ width: '100%', height: '100%', position: 'absolute' }} objectFit="cover" />
  );
}

function LocalVideo() {
  const { localParticipant } = useLocalParticipant();
  const track = localParticipant.getTrackPublication(Track.Source.Camera);

  if (track && track.track) {
    return (
      <VideoTrackRenderer track={track.track} />
    );
  }
  return null;
}

// Wrapper to manage camera and mic state
function RoomControls({ muted, cameraOn, speaker }: { muted: boolean, cameraOn: boolean, speaker: boolean }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const audioTracks = useTracks([Track.Source.Microphone]);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!muted).catch(console.warn);
      localParticipant.setCameraEnabled(cameraOn).catch(console.warn);
    }
  }, [muted, cameraOn, localParticipant]);

  // Mute incoming audio if speaker is false (صامت)
  useEffect(() => {
    audioTracks.forEach(trackRef => {
      if (!trackRef.participant.isLocal && trackRef.publication?.track) {
        try {
          // On Web, track is an HTMLAudioElement wrapper
          const t = trackRef.publication.track as any;
          if (t.mediaStreamTrack) {
            t.mediaStreamTrack.enabled = speaker;
          }
        } catch (e) { console.error('Failed to mute track', e); }
      }
    });
  }, [speaker, audioTracks]);

  return null;
}

export function LiveKitHandler({ roomName, callType, muted, cameraOn, speaker }: { roomName: string, callType: 'voice' | 'video', muted: boolean, cameraOn: boolean, speaker: boolean }) {
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
      audio={true} // Enabled by default, then controlled by RoomControls
      video={callType === 'video'} // Start with video if video call
      style={{ width: '100%', height: '100%', position: 'absolute' }}
    >
      <RoomControls muted={muted} cameraOn={cameraOn && callType === 'video'} speaker={speaker} />
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
