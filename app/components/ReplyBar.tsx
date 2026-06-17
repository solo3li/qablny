import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Mic, Image as ImageIcon, MapPin } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export interface ReplyData {
  id: string;
  text?: string;
  type: string;
  isMe: boolean;
  senderName: string;
}

interface ReplyBarProps {
  reply: ReplyData;
  onCancel: () => void;
}

function getPreviewText(reply: ReplyData): string {
  if (reply.type === 'text' && reply.text) return reply.text;
  if (reply.type === 'voice') return '🎵 رسالة صوتية';
  if (reply.type === 'image') return '📷 صورة';
  if (reply.type === 'video') return '🎬 فيديو';
  if (reply.type === 'location') return '📍 موقع';
  return 'رسالة';
}

export function ReplyBar({ reply, onCancel }: ReplyBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {reply.isMe ? 'أنت' : reply.senderName}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {getPreviewText(reply)}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X color={Colors.textMuted} size={16} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 10,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: Colors.cyan,
  },
  content: {
    flex: 1,
    paddingVertical: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cyan,
    marginBottom: 2,
  },
  preview: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeBtn: {
    padding: 10,
  },
});
