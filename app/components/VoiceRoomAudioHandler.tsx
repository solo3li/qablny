import React, { useEffect } from 'react';
import { View } from 'react-native';
import { LiveKitRoom, useRoomContext, useLocalParticipant } from '@livekit/react-native';
import { useVoiceRoomStore } from '../src/store/voiceRoomStore';

function AudioControllerNative() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { isSeated, isMuted, setActiveSpeakers } = useVoiceRoomStore();

  useEffect(() => {
    if (!room) return;

    const handleActiveSpeakers = (speakers: any[]) => {
      const activeIds = speakers.map(s => s.identity);
      setActiveSpeakers(activeIds);
    };

    room.on('activeSpeakersChanged', handleActiveSpeakers);

    return () => {
      room.off('activeSpeakersChanged', handleActiveSpeakers);
    };
  }, [room, setActiveSpeakers]);

  useEffect(() => {
    if (localParticipant) {
      const shouldPublish = isSeated && !isMuted;
      localParticipant.setMicrophoneEnabled(shouldPublish).catch(() => {});
    }
  }, [localParticipant, isSeated, isMuted]);

  return null;
}

export function VoiceRoomAudioHandler() {
  const { currentRoom, livekitToken, livekitServerUrl } = useVoiceRoomStore();

  if (!currentRoom || !livekitToken || !livekitServerUrl) {
    return null;
  }

  return (
    <View style={{ display: 'none' }}>
      <LiveKitRoom
        serverUrl={livekitServerUrl}
        token={livekitToken}
        connect={true}
        audio={true}
        video={false}
      >
        <AudioControllerNative />
      </LiveKitRoom>
    </View>
  );
}
