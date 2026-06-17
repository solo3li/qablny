import React from 'react';
import { CallModal } from './CallModal';
import { useCallStore } from '../src/store/callStore';
import { useChatStore } from '../src/store/chatStore';

export function ActiveCallModal() {
  const { activeCall, endCall } = useCallStore();
  const { friends } = useChatStore();

  if (!activeCall) return null;

  const friend = friends.find(f => f.id === activeCall.friendId);
  const friendData = friend 
    ? { name: friend.name, image: friend.profileImageUrl, isOnline: friend.isOnline }
    : { name: 'مستخدم مجهول', image: 'https://i.pravatar.cc/150', isOnline: true }; // Fallback if friend not loaded

  return (
    <CallModal
      visible={!!activeCall}
      onClose={endCall}
      friend={friendData as any}
      callType={activeCall.callType}
    />
  );
}
