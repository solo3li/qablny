import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Check, X, UserPlus } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  senderBio?: string;
  createdAt: string;
}

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  loading?: boolean;
}

export function FriendRequestCard({ request, onAccept, onReject, loading }: FriendRequestCardProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const pulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      {/* User Info */}
      <View style={styles.userRow}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: request.senderImage || `https://i.pravatar.cc/100?u=${request.senderId}` }}
            style={styles.avatar}
          />
          <View style={styles.badgeIcon}>
            <UserPlus color={Colors.cyan} size={10} />
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{request.senderName}</Text>
          {request.senderBio ? (
            <Text style={styles.bio} numberOfLines={1}>{request.senderBio}</Text>
          ) : (
            <Text style={styles.date}>{formatDate(request.createdAt)}</Text>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => { pulse(); onReject(request.id); }}
          disabled={loading}
          activeOpacity={0.7}
        >
          <X color={Colors.danger} size={16} />
          <Text style={[styles.btnText, { color: Colors.danger }]}>رفض</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => { pulse(); onAccept(request.id); }}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Check color={Colors.bg} size={16} strokeWidth={2.5} />
          <Text style={[styles.btnText, { color: Colors.bg }]}>قبول</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.cyan + '40',
  },
  badgeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.cyanDim,
    borderWidth: 1,
    borderColor: Colors.glassBorderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },
  bio: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.cyan,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
