import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  X,
  Flame,
  Hourglass,
  Check,
  Send,
  Users,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { axiosClient } from '../src/api/axiosClient';
import { useChatStore, Friend } from '../src/store/chatStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SendStreakSheetProps {
  visible: boolean;
  mediaUri: string | null;
  mediaType: 'image' | 'video';
  caption: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendStreakSheet({
  visible,
  mediaUri,
  mediaType,
  caption,
  onClose,
  onSuccess,
}: SendStreakSheetProps) {
  const { friends, fetchFriends } = useChatStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchFriends().catch(() => {});
      setErrorMsg(null);
      setSendSuccess(false);
    }
  }, [visible]);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    return (friends || []).filter((f) =>
      f.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [friends, search]);

  // Identify friends with active streaks
  const activeStreakFriends = useMemo(() => {
    return (friends || []).filter((f) => (f.streakCount ?? 0) > 0 && !f.isStreakBroken);
  }, [friends]);

  const allActiveSelected = useMemo(() => {
    if (activeStreakFriends.length === 0) return false;
    return activeStreakFriends.every((f) => selectedIds.has(f.id));
  }, [activeStreakFriends, selectedIds]);

  // Toggle selection of a single friend
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Quick Action: Select / Deselect all active streak friends
  const toggleSelectAllActiveStreaks = () => {
    const next = new Set(selectedIds);
    if (allActiveSelected) {
      activeStreakFriends.forEach((f) => next.delete(f.id));
    } else {
      activeStreakFriends.forEach((f) => next.add(f.id));
    }
    setSelectedIds(next);
  };

  // Helper: Convert dataUrl or local URI to FormData for upload
  const uploadMediaFile = async (): Promise<string> => {
    if (!mediaUri) throw new Error('لا يوجد وسائط للرفع');

    // If mediaUri is already an uploaded http/https URL:
    if (mediaUri.startsWith('http://') || mediaUri.startsWith('https://')) {
      return mediaUri;
    }

    const formData = new FormData();
    if (Platform.OS === 'web') {
      // Fetch data URI or blob
      const res = await fetch(mediaUri);
      const blob = await res.blob();
      const ext = mediaType === 'video' ? 'webm' : 'jpg';
      const file = new File([blob], `snap_${Date.now()}.${ext}`, {
        type: mediaType === 'video' ? 'video/webm' : 'image/jpeg',
      });
      formData.append('file', file);
    } else {
      const ext = mediaType === 'video' ? 'mp4' : 'jpg';
      formData.append('file', {
        uri: mediaUri,
        name: `snap_${Date.now()}.${ext}`,
        type: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);
    }

    const uploadRes = await axiosClient.post('/streaks/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return uploadRes.data.url;
  };

  // Send action
  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setIsSending(true);
    setErrorMsg(null);

    try {
      // 1. Upload temporary media to MinIO
      const uploadedUrl = await uploadMediaFile();

      // 2. Call backend streaks send endpoint
      await axiosClient.post('/streaks/send', {
        friendIds: Array.from(selectedIds),
        mediaUrl: uploadedUrl,
        mediaType,
        caption: caption.trim() || undefined,
        durationSeconds: 10,
      });

      // 3. Refresh friends store to update streak counts
      fetchFriends().catch(() => {});

      setSendSuccess(true);
      setTimeout(() => {
        setIsSending(false);
        setSendSuccess(false);
        setSelectedIds(new Set());
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to send streak:', err);
      setIsSending(false);
      setErrorMsg(err.response?.data?.message || err.message || 'فشل إرسال الستريك');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheetContainer}>
          {/* Header Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Sheet Title Row */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.flameIconBadge}>
                <Flame size={20} color="#FE3C72" fill="#FE3C72" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>إرسال ستريك</Text>
                <Text style={styles.sheetSubtitle}>
                  شارك لقطتك مع أصدقائك للحفاظ على الستريك اليومي 🔥
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Select Capsule for Active Streaks */}
          {activeStreakFriends.length > 0 && (
            <View style={styles.quickCapsuleRow}>
              <TouchableOpacity
                style={[
                  styles.quickCapsule,
                  allActiveSelected && styles.quickCapsuleActive,
                ]}
                onPress={toggleSelectAllActiveStreaks}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    allActiveSelected
                      ? ['#FE3C72', '#FF6584']
                      : ['rgba(254, 60, 114, 0.08)', 'rgba(255, 101, 132, 0.08)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.quickCapsuleGradient}
                >
                  <Flame
                    size={16}
                    color={allActiveSelected ? '#FFFFFF' : '#FE3C72'}
                    fill={allActiveSelected ? '#FFFFFF' : '#FE3C72'}
                  />
                  <Text
                    style={[
                      styles.quickCapsuleText,
                      allActiveSelected && styles.quickCapsuleTextActive,
                    ]}
                  >
                    {allActiveSelected
                      ? `إلغاء تحديد الستريكات النشطة (${activeStreakFriends.length})`
                      : `تحديد كل أصدقاء الستريك النشطين (${activeStreakFriends.length})`}
                  </Text>
                  {allActiveSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن صديق بالاسم..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Error message banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Friends List */}
          <FlatList
            data={filteredFriends}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedIds.has(item.id);
              const streak = item.streakCount ?? 0;
              const hasStreak = streak > 0 && !item.isStreakBroken;
              const expiringSoon = item.isStreakExpiringSoon;
              const sentToday = item.hasSentStreakToday;

              return (
                <TouchableOpacity
                  style={[styles.friendRow, isSelected && styles.friendRowSelected]}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={0.75}
                >
                  {/* Avatar with Online Indicator */}
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{ uri: item.profileImageUrl || 'https://i.pravatar.cc/150' }}
                      style={styles.avatarImg}
                    />
                    {item.isOnline && <View style={styles.onlineDot} />}
                  </View>

                  {/* Name and Streak Information */}
                  <View style={styles.friendInfo}>
                    <View style={styles.nameStreakRow}>
                      <Text style={styles.friendName}>{item.name}</Text>
                      {hasStreak && (
                        <View
                          style={[
                            styles.streakBadge,
                            expiringSoon && styles.streakBadgeExpiring,
                          ]}
                        >
                          <Flame size={13} color="#FFFFFF" fill="#FFFFFF" />
                          <Text style={styles.streakCountText}>{streak}</Text>
                          {expiringSoon && (
                            <Hourglass size={12} color="#FFFFFF" strokeWidth={2.4} />
                          )}
                        </View>
                      )}
                    </View>

                    {/* Streak cycle status */}
                    <View style={styles.statusRow}>
                      {sentToday ? (
                        <View style={styles.statusPillSent}>
                          <Check size={11} color="#059669" strokeWidth={2.6} />
                          <Text style={styles.statusTextSent}>تم الإرسال اليوم</Text>
                        </View>
                      ) : hasStreak ? (
                        <View style={styles.statusPillPending}>
                          <Text style={styles.statusTextPending}>
                            {expiringSoon ? '⏳ أوشك على الانتهاء!' : 'بانتظار لقطتك اليوم'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noStreakText}>ابدأ ستريك جديد اليوم 🔥</Text>
                      )}
                    </View>
                  </View>

                  {/* Radio / Check Circle */}
                  <View
                    style={[
                      styles.checkCircle,
                      isSelected && styles.checkCircleSelected,
                    ]}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Users size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
                <Text style={styles.emptySubtitle}>لم يتم العثور على أصدقاء يطابقون بحثك</Text>
              </View>
            )}
          />

          {/* Floating Send Button Container */}
          <View style={styles.sendBtnWrapper}>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (selectedIds.size === 0 || isSending) && styles.sendBtnDisabled,
              ]}
              disabled={selectedIds.size === 0 || isSending}
              onPress={handleSend}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={
                  selectedIds.size > 0
                    ? ['#FE3C72', '#FF6584']
                    : ['#94A3B8', '#CBD5E1']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendBtnGradient}
              >
                {isSending ? (
                  <View style={styles.sendInnerRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.sendBtnText}>جاري رفع وإرسال الستريك...</Text>
                  </View>
                ) : sendSuccess ? (
                  <View style={styles.sendInnerRow}>
                    <Check size={20} color="#FFFFFF" strokeWidth={2.8} />
                    <Text style={styles.sendBtnText}>تم إرسال الستريك بنجاح! 🔥</Text>
                  </View>
                ) : (
                  <View style={styles.sendInnerRow}>
                    <Flame size={20} color="#FFFFFF" fill="#FFFFFF" />
                    <Text style={styles.sendBtnText}>
                      إرسال الستريك ({selectedIds.size} أصدقاء)
                    </Text>
                    <Send size={18} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    backdropFilter: 'blur(8px)',
  } as any,
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.65,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 24 : 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(254, 60, 114, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCapsuleRow: {
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  quickCapsule: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(254, 60, 114, 0.25)',
  },
  quickCapsuleActive: {
    borderColor: '#FE3C72',
  },
  quickCapsuleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  quickCapsuleText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FE3C72',
  },
  quickCapsuleTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 22,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#0F172A',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#FAFAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 14,
  },
  friendRowSelected: {
    backgroundColor: 'rgba(254, 60, 114, 0.05)',
    borderColor: 'rgba(254, 60, 114, 0.35)',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendInfo: {
    flex: 1,
  },
  nameStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#0F172A',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F97316',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 12,
  },
  streakBadgeExpiring: {
    backgroundColor: '#E11D48',
  },
  streakCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  statusRow: {
    marginTop: 3,
  },
  statusPillSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusTextSent: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#059669',
  },
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextPending: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#F97316',
  },
  noStreakText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#94A3B8',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkCircleSelected: {
    backgroundColor: '#FE3C72',
    borderColor: '#FE3C72',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#64748B',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: '#94A3B8',
    marginTop: 4,
  },
  sendBtnWrapper: {
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sendBtn: {
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#FE3C72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  sendBtnDisabled: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
