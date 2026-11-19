import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  X,
  Mic,
  MicOff,
  Lock,
  Unlock,
  Plus,
  Gift,
  MessageSquare,
  Send,
  Users,
  Crown,
  Settings,
  LogOut,
  UserCheck,
  UserPlus,
  Coins,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { axiosClient } from '../../src/api/axiosClient';
import { centrifugoManager } from '../../src/api/centrifugoClient';
import { useAuthStore } from '../../src/store/authStore';
import {
  useVoiceRoomStore,
  VoiceRoomSeatData,
  RoomMessage,
} from '../../src/store/voiceRoomStore';

const { width } = Dimensions.get('window');

// Concentric Audio Ripple Component for active speakers
function AudioRippleRing({ isSpeaking, size }: { isSpeaking: boolean; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!isSpeaking) {
      scale.setValue(1);
      opacity.setValue(0);
      return;
    }

    const rippleAnim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.28,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      ])
    );

    rippleAnim.start();

    return () => {
      rippleAnim.stop();
    };
  }, [isSpeaking]);

  if (!isSpeaking) return null;

  return (
    <Animated.View
      style={[
        styles.rippleCircle,
        {
          width: size + 16,
          height: size + 16,
          borderRadius: (size + 16) / 2,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
}

export default function VoiceRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    currentRoom,
    seats,
    isHost,
    isSeated,
    mySeatIndex,
    isMuted,
    activeSpeakers,
    messages,
    activeGiftEffect,
    setRoom,
    updateSeats,
    setListenersCount,
    setMuted,
    setMinimized,
    addMessage,
    triggerGiftEffect,
    leaveRoom,
  } = useVoiceRoomStore();

  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Chat message input modal
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Seat Action Sheet Modal
  const [selectedSeat, setSelectedSeat] = useState<VoiceRoomSeatData | null>(null);
  const [seatModalVisible, setSeatModalVisible] = useState(false);

  // Gift Modal
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [availableGifts, setAvailableGifts] = useState<any[]>([]);
  const [selectedGiftRecipient, setSelectedGiftRecipient] = useState<string>('');
  const [userCoins, setUserCoins] = useState<number>(user?.coins || 100);
  const [isSendingGift, setIsSendingGift] = useState(false);

  // Host Control Modal
  const [hostModalVisible, setHostModalVisible] = useState(false);

  // Exit Confirmation Modal
  const [exitModalVisible, setExitModalVisible] = useState(false);

  const chatListRef = useRef<FlatList>(null);

  // Load Room Details & LiveKit Token
  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        // 1. Fetch Room State
        const roomRes = await axiosClient.get(`/rooms/${id}`);
        const roomData = roomRes.data;

        // 2. Fetch LiveKit Token
        const tokenRes = await axiosClient.get(`/rooms/${id}/token`);
        const { token, serverUrl } = tokenRes.data;

        // 3. Join room as listener
        await axiosClient.post(`/rooms/${id}/join`).catch(() => {});

        if (isMounted) {
          setRoom(
            roomData,
            roomData.seats || [],
            token,
            serverUrl,
            user?.id || ''
          );
          setSelectedGiftRecipient(roomData.hostId);
        }
      } catch (e: any) {
        console.error('Error loading voice room:', e);
        alert(e?.response?.data?.message || 'فشل تحميل بيانات الغرفة الصوتية');
        router.back();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    // 4. Centrifugo Subscription for real-time room events
    const channelName = `rooms:${id}`;
    const unsubscribe = centrifugoManager.subscribeChannel(channelName, (payload: any) => {
      const event = payload.event;
      const data = payload.data || payload;

      if (event === 'seat_updated') {
        if (data.seats) {
          updateSeats(data.seats);
        }
      } else if (event === 'room_joined') {
        if (data.listenersCount !== undefined) {
          setListenersCount(data.listenersCount);
        }
        addMessage({
          id: `join-${Date.now()}-${Math.random()}`,
          type: 'join',
          senderName: data.userName,
          message: 'انضم إلى الغرفة',
          timestamp: new Date().toISOString(),
        });
      } else if (event === 'room_left') {
        if (data.listenersCount !== undefined) {
          setListenersCount(data.listenersCount);
        }
      } else if (event === 'room_chat') {
        addMessage({
          id: data.id || `msg-${Date.now()}`,
          type: 'text',
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          vipLevel: data.vipLevel,
          message: data.message,
          timestamp: data.timestamp,
        });
      } else if (event === 'room_gift') {
        const giftMsg: RoomMessage = {
          id: data.id || `gift-${Date.now()}`,
          type: 'gift',
          senderId: data.senderId,
          senderName: data.senderName,
          senderAvatar: data.senderAvatar,
          recipientName: data.recipientName,
          giftName: data.giftName,
          giftEmoji: data.giftEmoji,
          coinsSpent: data.coinsSpent,
          timestamp: data.timestamp,
        };
        addMessage(giftMsg);
        triggerGiftEffect(giftMsg);
      } else if (event === 'room_ended') {
        alert(data.message || 'تم إنهاء الغرفة بواسطة المضيف');
        leaveRoom();
        router.replace('/(tabs)/rooms');
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  // Load Gifts for modal
  useEffect(() => {
    axiosClient
      .get('/gifts')
      .then((res) => setAvailableGifts(res.data))
      .catch(() => {});
  }, []);

  // Minimize handler
  const handleMinimize = () => {
    setMinimized(true);
    router.back();
  };

  // Exit handler
  const handleConfirmExit = async () => {
    setExitModalVisible(false);
    try {
      await axiosClient.post(`/rooms/${id}/leave`);
    } catch (e) {
      // ignore
    }
    leaveRoom();
    router.replace('/(tabs)/rooms');
  };

  // Toggle Mute
  const handleToggleMute = async () => {
    const nextMute = !isMuted;
    setMuted(nextMute);
    if (isSeated && mySeatIndex) {
      try {
        await axiosClient.post(`/rooms/${id}/seats/${mySeatIndex}/mute`, {
          isMuted: nextMute,
        });
      } catch (e) {
        console.warn('Failed to update seat mute:', e);
      }
    }
  };

  // Send Chat Message
  const handleSendChat = async () => {
    if (!chatText.trim() || isSendingChat) return;
    setIsSendingChat(true);
    try {
      await axiosClient.post(`/rooms/${id}/chat`, {
        message: chatText.trim(),
      });
      setChatText('');
      setChatModalVisible(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل إرسال الرسالة');
    } finally {
      setIsSendingChat(false);
    }
  };

  // Seat Interaction
  const handleSeatPress = (seat: VoiceRoomSeatData) => {
    setSelectedSeat(seat);
    setSeatModalVisible(true);
  };

  const handleTakeSeat = async (seatIndex: number) => {
    setSeatModalVisible(false);
    try {
      const res = await axiosClient.post(`/rooms/${id}/seats/${seatIndex}/take`);
      if (res.data.seats) {
        updateSeats(res.data.seats);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل الصعود إلى المقعد');
    }
  };

  const handleLeaveSeat = async (seatIndex: number) => {
    setSeatModalVisible(false);
    try {
      const res = await axiosClient.post(`/rooms/${id}/seats/${seatIndex}/leave`);
      if (res.data.seats) {
        updateSeats(res.data.seats);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل مغادرة المقعد');
    }
  };

  const handleLockSeat = async (seatIndex: number, shouldLock: boolean) => {
    setSeatModalVisible(false);
    try {
      const res = await axiosClient.post(`/rooms/${id}/seats/${seatIndex}/lock`, {
        isLocked: shouldLock,
      });
      if (res.data.seats) {
        updateSeats(res.data.seats);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل قفل/فتح المقعد');
    }
  };

  // Request next available seat
  const handleAutoTakeSeat = async () => {
    const emptySeat = seats.find((s) => !s.userId && !s.isLocked);
    if (emptySeat) {
      await handleTakeSeat(emptySeat.seatIndex);
    } else {
      alert('جميع المقاعد مشغولة حالياً');
    }
  };

  // Send Gift
  const handleSendGift = async (gift: any) => {
    if (!selectedGiftRecipient || isSendingGift) return;
    if (userCoins < gift.coinCost) {
      alert('رصيد الكوينز غير كافٍ لإرسال هذه الهدية');
      return;
    }
    setIsSendingGift(true);
    try {
      const res = await axiosClient.post(`/rooms/${id}/gift`, {
        recipientId: selectedGiftRecipient,
        giftId: gift.id,
      });
      setUserCoins(res.data.coinsRemaining);
      setGiftModalVisible(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل إرسال الهدية');
    } finally {
      setIsSendingGift(false);
    }
  };

  // Host End Room
  const handleEndRoom = async () => {
    setHostModalVisible(false);
    try {
      await axiosClient.post(`/rooms/${id}/end`);
      leaveRoom();
      router.replace('/(tabs)/rooms');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل إنهاء الغرفة');
    }
  };

  if (loading || !currentRoom) {
    return (
      <View style={styles.loadingFull}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>جاري الانضمام إلى الغرفة الصوتية...</Text>
      </View>
    );
  }

  const isHostSpeaking = activeSpeakers.includes(currentRoom.hostId);
  const fallbackHostAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    currentRoom.hostName || 'Host'
  )}&background=FE3C72&color=fff&size=200`;

  return (
    <View style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: Minimize & Exit buttons */}
        <View style={styles.headerActionsLeft}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleMinimize}
            activeOpacity={0.7}
          >
            <ChevronDown size={22} color="#1A1D1E" strokeWidth={2.4} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setExitModalVisible(true)}
            activeOpacity={0.7}
          >
            <X size={20} color="#1A1D1E" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Center: Room Info (Name & ID) */}
        <View style={styles.roomInfoCenter}>
          <Text style={styles.roomHeaderTitle} numberOfLines={1}>
            {currentRoom.title}
          </Text>
          <View style={styles.roomSubInfoRow}>
            <View style={styles.roomIdPill}>
              <Text style={styles.roomIdText}>ID: {currentRoom.id.slice(0, 6)}</Text>
            </View>
            <View style={styles.listenersCountPill}>
              <Users size={12} color="#6C757D" strokeWidth={2.2} />
              <Text style={styles.listenersCountText}>
                {currentRoom.listenersCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Right: Follow Host & Host options */}
        <View style={styles.headerActionsRight}>
          {!isHost && (
            <TouchableOpacity
              style={[
                styles.followBtn,
                isFollowing && styles.followBtnActive,
              ]}
              onPress={() => setIsFollowing(!isFollowing)}
              activeOpacity={0.8}
            >
              {isFollowing ? (
                <UserCheck size={14} color="#10B981" strokeWidth={2.4} />
              ) : (
                <UserPlus size={14} color={Colors.primary} strokeWidth={2.4} />
              )}
              <Text
                style={[
                  styles.followBtnText,
                  isFollowing && styles.followBtnTextActive,
                ]}
              >
                {isFollowing ? 'متابع' : 'متابعة'}
              </Text>
            </TouchableOpacity>
          )}

          {isHost && (
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setHostModalVisible(true)}
              activeOpacity={0.7}
            >
              <Settings size={20} color="#1A1D1E" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stage Canvas: SoGo 1 Host + 8 Guest Seats ────────── */}
      <ScrollView
        style={styles.stageScroll}
        contentContainerStyle={styles.stageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Host Seat (Top Center) */}
        <View style={styles.hostSection}>
          <TouchableOpacity
            style={styles.hostAvatarTouch}
            onPress={() => {
              setSelectedGiftRecipient(currentRoom.hostId);
              setGiftModalVisible(true);
            }}
            activeOpacity={0.9}
          >
            <AudioRippleRing isSpeaking={isHostSpeaking} size={76} />
            <View style={styles.hostAvatarWrapper}>
              <Image
                source={{ uri: currentRoom.hostAvatar || fallbackHostAvatar }}
                style={styles.hostAvatarImg}
              />
              <View style={styles.crownBadge}>
                <Crown size={12} color="#FFFFFF" strokeWidth={2.6} />
              </View>
              {isHost && isMuted && (
                <View style={styles.hostMuteBadge}>
                  <MicOff size={11} color="#FFFFFF" strokeWidth={2.6} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.hostInfoGroup}>
            <View style={styles.hostNameLine}>
              <Text style={styles.hostName}>{currentRoom.hostName}</Text>
              {currentRoom.hostVipLevel > 0 && (
                <View style={styles.vipPill}>
                  <Text style={styles.vipPillText}>VIP</Text>
                </View>
              )}
            </View>
            <Text style={styles.hostRoleLabel}>المضيف</Text>
          </View>
        </View>

        {/* 2. 8 Guest Seats (4x2 Grid) */}
        <View style={styles.guestSeatsGrid}>
          {seats.map((seat) => {
            const isOccupied = !!seat.userId;
            const isSpeaking = isOccupied && activeSpeakers.includes(seat.userId!);
            const fallbackGuestAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              seat.userName || 'G'
            )}&background=F4F5F7&color=6C757D&size=150`;

            return (
              <View key={seat.seatIndex} style={styles.seatCell}>
                <TouchableOpacity
                  style={styles.seatCircleBtn}
                  onPress={() => handleSeatPress(seat)}
                  activeOpacity={0.85}
                >
                  <AudioRippleRing isSpeaking={isSpeaking} size={56} />

                  {isOccupied ? (
                    // Occupied Seat
                    <View style={styles.seatOccupiedWrapper}>
                      <Image
                        source={{ uri: seat.userAvatar || fallbackGuestAvatar }}
                        style={styles.seatAvatarImg}
                      />
                      {seat.isMuted && (
                        <View style={styles.seatStatusBadge}>
                          <MicOff size={10} color="#FFFFFF" strokeWidth={2.4} />
                        </View>
                      )}
                    </View>
                  ) : seat.isLocked ? (
                    // Locked Seat
                    <View style={styles.seatLockedCircle}>
                      <Lock size={18} color="#9CA3AF" strokeWidth={2.2} />
                    </View>
                  ) : (
                    // Empty Seat
                    <View style={styles.seatEmptyCircle}>
                      <Plus size={20} color="#9CA3AF" strokeWidth={2.2} />
                    </View>
                  )}

                  {/* Seat Index Number Pill */}
                  <View style={styles.seatIndexBadge}>
                    <Text style={styles.seatIndexText}>{seat.seatIndex}</Text>
                  </View>
                </TouchableOpacity>

                {/* Seat Occupant Name or Empty Label */}
                <Text style={styles.seatNameLabel} numberOfLines={1}>
                  {isOccupied
                    ? seat.userName
                    : seat.isLocked
                    ? 'مقفل'
                    : 'فارغ'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Active Gift Celebration Animation Overlay ────────── */}
        {activeGiftEffect && (
          <View
            style={[
              styles.giftBannerOverlay,
              Platform.OS === 'web'
                ? ({
                    boxShadow: '0 8px 30px rgba(254, 60, 114, 0.25)',
                  } as any)
                : null,
            ]}
          >
            <LinearGradient
              colors={Colors.gradPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.giftBannerGradient}
            >
              <Gift size={24} color="#FFFFFF" strokeWidth={2.4} />
              <View style={styles.giftBannerTextCol}>
                <Text style={styles.giftBannerTitle}>
                  {activeGiftEffect.senderName} أرسل {activeGiftEffect.giftName}
                </Text>
                <Text style={styles.giftBannerSubtitle}>
                  إلى {activeGiftEffect.recipientName} ({activeGiftEffect.coinsSpent} كوينز)
                </Text>
              </View>
              <Sparkles size={20} color="#FDE047" strokeWidth={2.4} />
            </LinearGradient>
          </View>
        )}

        {/* ── Live Event Chat Stream ───────────────────────────── */}
        <View style={styles.chatStreamContainer}>
          <FlatList
            ref={chatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              chatListRef.current?.scrollToEnd({ animated: true })
            }
            renderItem={({ item }) => {
              if (item.type === 'join') {
                return (
                  <View style={styles.joinMessageBubble}>
                    <Text style={styles.joinMessageText}>
                      {item.senderName} انضم إلى الغرفة
                    </Text>
                  </View>
                );
              }
              if (item.type === 'gift') {
                return (
                  <View style={styles.giftMessageBubble}>
                    <Gift size={13} color="#FE3C72" strokeWidth={2.4} />
                    <Text style={styles.giftMessageText}>
                      {item.senderName} أهدى {item.recipientName} {item.giftName}
                    </Text>
                  </View>
                );
              }
              if (item.type === 'system') {
                return (
                  <View style={styles.systemMessageBubble}>
                    <Text style={styles.systemMessageText}>{item.message}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.chatMessageRow}>
                  <Text style={styles.chatSenderName}>{item.senderName}: </Text>
                  <Text style={styles.chatMessageText}>{item.message}</Text>
                </View>
              );
            }}
          />
        </View>
      </ScrollView>

      {/* ── Bottom Action Dock ────────────────────────────────── */}
      <View
        style={[
          styles.bottomDock,
          Platform.OS === 'web'
            ? ({
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.04)',
              } as any)
            : null,
        ]}
      >
        {/* Chat Input Trigger */}
        <TouchableOpacity
          style={styles.chatInputPill}
          onPress={() => setChatModalVisible(true)}
          activeOpacity={0.8}
        >
          <MessageSquare size={16} color="#6C757D" strokeWidth={2.2} />
          <Text style={styles.chatInputPlaceholder}>اكتب تعليقاً...</Text>
        </TouchableOpacity>

        {/* Mic Toggle Button */}
        {isSeated ? (
          <TouchableOpacity
            style={[styles.dockCircleBtn, isMuted && styles.dockCircleBtnMuted]}
            onPress={handleToggleMute}
            activeOpacity={0.8}
          >
            {isMuted ? (
              <MicOff size={20} color="#EF4444" strokeWidth={2.2} />
            ) : (
              <Mic size={20} color="#10B981" strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        ) : (
          /* Take Seat / Raise Hand Button */
          <TouchableOpacity
            style={styles.dockCircleBtn}
            onPress={handleAutoTakeSeat}
            activeOpacity={0.8}
          >
            <Mic size={20} color={Colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        )}

        {/* Gift Button */}
        <TouchableOpacity
          style={styles.giftDockBtn}
          onPress={() => {
            setSelectedGiftRecipient(currentRoom.hostId);
            setGiftModalVisible(true);
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradPrimary}
            style={styles.giftDockGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Gift size={20} color="#FFFFFF" strokeWidth={2.4} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Chat Input Modal ─────────────────────────────────── */}
      <Modal
        visible={chatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.chatModalContent}>
            <TextInput
              style={styles.chatModalInput}
              placeholder="اكتب رسالتك للمتواجدين..."
              placeholderTextColor="#9CA3AF"
              value={chatText}
              onChangeText={setChatText}
              maxLength={120}
              autoFocus
              textAlign="right"
              onSubmitEditing={handleSendChat}
            />
            <TouchableOpacity
              style={[
                styles.sendChatBtn,
                (!chatText.trim() || isSendingChat) && styles.sendChatBtnDisabled,
              ]}
              disabled={!chatText.trim() || isSendingChat}
              onPress={handleSendChat}
            >
              <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Seat Action Sheet Modal ──────────────────────────── */}
      <Modal
        visible={seatModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSeatModalVisible(false)}
      >
        <View style={styles.actionSheetOverlay}>
          <View style={styles.actionSheetContent}>
            <View style={styles.actionSheetHeader}>
              <Text style={styles.actionSheetTitle}>
                المقعد رقم {selectedSeat?.seatIndex}
              </Text>
              <TouchableOpacity onPress={() => setSeatModalVisible(false)}>
                <X size={20} color="#6C757D" />
              </TouchableOpacity>
            </View>

            {/* Empty Seat Options */}
            {selectedSeat && !selectedSeat.userId && !selectedSeat.isLocked && (
              <View style={styles.sheetActionsList}>
                <TouchableOpacity
                  style={styles.sheetActionItem}
                  onPress={() => handleTakeSeat(selectedSeat.seatIndex)}
                >
                  <Plus size={20} color={Colors.primary} strokeWidth={2.2} />
                  <Text style={styles.sheetActionTextPrimary}>الصعود للمقعد</Text>
                </TouchableOpacity>

                {isHost && (
                  <TouchableOpacity
                    style={styles.sheetActionItem}
                    onPress={() => handleLockSeat(selectedSeat.seatIndex, true)}
                  >
                    <Lock size={20} color="#4B5563" strokeWidth={2.2} />
                    <Text style={styles.sheetActionText}>قفل المقعد</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Locked Seat Options */}
            {selectedSeat && selectedSeat.isLocked && (
              <View style={styles.sheetActionsList}>
                {isHost ? (
                  <TouchableOpacity
                    style={styles.sheetActionItem}
                    onPress={() => handleLockSeat(selectedSeat.seatIndex, false)}
                  >
                    <Unlock size={20} color="#10B981" strokeWidth={2.2} />
                    <Text style={styles.sheetActionTextPrimary}>فتح المقعد</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.sheetInfoNotice}>
                    هذا المقعد مقفل حالياً بواسطة المضيف
                  </Text>
                )}
              </View>
            )}

            {/* Occupied Seat Options */}
            {selectedSeat && selectedSeat.userId && (
              <View style={styles.sheetActionsList}>
                {/* If it's my seat */}
                {selectedSeat.userId === user?.id ? (
                  <>
                    <TouchableOpacity
                      style={styles.sheetActionItem}
                      onPress={handleToggleMute}
                    >
                      {isMuted ? (
                        <>
                          <Mic size={20} color="#10B981" strokeWidth={2.2} />
                          <Text style={styles.sheetActionText}>تشغيل المايك</Text>
                        </>
                      ) : (
                        <>
                          <MicOff size={20} color="#EF4444" strokeWidth={2.2} />
                          <Text style={styles.sheetActionTextDanger}>كتم المايك</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.sheetActionItem}
                      onPress={() => handleLeaveSeat(selectedSeat.seatIndex)}
                    >
                      <LogOut size={20} color="#EF4444" strokeWidth={2.2} />
                      <Text style={styles.sheetActionTextDanger}>مغادرة المقعد</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  /* If it's another user */
                  <>
                    <TouchableOpacity
                      style={styles.sheetActionItem}
                      onPress={() => {
                        setSelectedGiftRecipient(selectedSeat.userId!);
                        setSeatModalVisible(false);
                        setGiftModalVisible(true);
                      }}
                    >
                      <Gift size={20} color={Colors.primary} strokeWidth={2.2} />
                      <Text style={styles.sheetActionTextPrimary}>
                        إرسال هدية إلى {selectedSeat.userName}
                      </Text>
                    </TouchableOpacity>

                    {isHost && (
                      <TouchableOpacity
                        style={styles.sheetActionItem}
                        onPress={() => handleLeaveSeat(selectedSeat.seatIndex)}
                      >
                        <LogOut size={20} color="#EF4444" strokeWidth={2.2} />
                        <Text style={styles.sheetActionTextDanger}>
                          إنزال من المقعد
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Gift Selection Modal ─────────────────────────────── */}
      <Modal
        visible={giftModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGiftModalVisible(false)}
      >
        <View style={styles.actionSheetOverlay}>
          <View style={styles.giftSheetContent}>
            {/* Gift Sheet Header */}
            <View style={styles.giftSheetHeader}>
              <View>
                <Text style={styles.actionSheetTitle}>إرسال هدية</Text>
                <View style={styles.coinsBalanceBadge}>
                  <Coins size={14} color="#F59E0B" strokeWidth={2.4} />
                  <Text style={styles.coinsBalanceText}>
                    رصيدك: {userCoins} كوينز
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setGiftModalVisible(false)}>
                <X size={20} color="#6C757D" />
              </TouchableOpacity>
            </View>

            {/* Recipient Picker Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recipientsRow}
            >
              {/* Host Chip */}
              <TouchableOpacity
                style={[
                  styles.recipientChip,
                  selectedGiftRecipient === currentRoom.hostId &&
                    styles.recipientChipActive,
                ]}
                onPress={() => setSelectedGiftRecipient(currentRoom.hostId)}
              >
                <Text
                  style={[
                    styles.recipientChipText,
                    selectedGiftRecipient === currentRoom.hostId &&
                      styles.recipientChipTextActive,
                  ]}
                >
                  المضيف ({currentRoom.hostName})
                </Text>
              </TouchableOpacity>

              {/* Seated Guests Chips */}
              {seats
                .filter((s) => s.userId && s.userId !== user?.id)
                .map((s) => (
                  <TouchableOpacity
                    key={s.seatIndex}
                    style={[
                      styles.recipientChip,
                      selectedGiftRecipient === s.userId &&
                        styles.recipientChipActive,
                    ]}
                    onPress={() => setSelectedGiftRecipient(s.userId!)}
                  >
                    <Text
                      style={[
                        styles.recipientChipText,
                        selectedGiftRecipient === s.userId &&
                          styles.recipientChipTextActive,
                      ]}
                    >
                      مايك {s.seatIndex}: {s.userName}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Gifts Grid */}
            <View style={styles.giftsGrid}>
              {availableGifts.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={styles.giftCard}
                  onPress={() => handleSendGift(g)}
                  activeOpacity={0.8}
                  disabled={isSendingGift}
                >
                  <View style={styles.giftEmojiBox}>
                    <Text style={styles.giftEmojiText}>{g.emoji || '🎁'}</Text>
                  </View>
                  <Text style={styles.giftNameText} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <View style={styles.giftPriceBadge}>
                    <Text style={styles.giftPriceText}>{g.coinCost} كوينز</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Host Control Modal ───────────────────────────────── */}
      <Modal
        visible={hostModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHostModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.hostControlCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إدارة الغرفة الصوتية</Text>
              <TouchableOpacity onPress={() => setHostModalVisible(false)}>
                <X size={20} color="#6C757D" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.hostDangerActionBtn}
              onPress={handleEndRoom}
            >
              <LogOut size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.hostDangerActionText}>إنهاء الغرفة الصوتية</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Exit Confirmation Modal ──────────────────────────── */}
      <Modal
        visible={exitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>مغادرة الغرفة الصوتية</Text>
            <Text style={styles.confirmSubtitle}>
              هل تود مغادرة الغرفة الصوتية أم تصغيرها للاستماع في الخلفية؟
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.minimizeChoiceBtn}
                onPress={() => {
                  setExitModalVisible(false);
                  handleMinimize();
                }}
              >
                <Text style={styles.minimizeChoiceText}>تصغير للاستماع</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.leaveChoiceBtn}
                onPress={handleConfirmExit}
              >
                <Text style={styles.leaveChoiceText}>مغادرة كلياً</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingFull: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 26,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  headerActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomInfoCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  roomHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D1E',
  },
  roomSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  roomIdPill: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roomIdText: {
    fontSize: 10,
    color: '#6C757D',
    fontWeight: '600',
  },
  listenersCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listenersCountText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
  },
  followBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  followBtnTextActive: {
    color: '#10B981',
  },
  stageScroll: {
    flex: 1,
  },
  stageContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 110,
  },
  hostSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  hostAvatarTouch: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarWrapper: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FE3C72',
    backgroundColor: '#F1F3F5',
  },
  hostAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  hostMuteBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  hostInfoGroup: {
    alignItems: 'center',
    marginTop: 8,
  },
  hostNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  vipPill: {
    backgroundColor: '#FE3C72',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  vipPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  hostRoleLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
    marginTop: 2,
  },
  guestSeatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    marginBottom: 20,
  },
  seatCell: {
    width: '23%',
    alignItems: 'center',
  },
  seatCircleBtn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatOccupiedWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F3F5',
    position: 'relative',
  },
  seatAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  seatStatusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  seatEmptyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
  },
  seatLockedCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatIndexBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAECEF',
  },
  seatIndexText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6C757D',
  },
  seatNameLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 64,
  },
  rippleCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(254, 60, 114, 0.25)',
  },
  giftBannerOverlay: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
  },
  giftBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  giftBannerTextCol: {
    flex: 1,
  },
  giftBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  giftBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  chatStreamContainer: {
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  chatMessageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  chatSenderName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  chatMessageText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1D1E',
  },
  joinMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginVertical: 3,
  },
  joinMessageText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  giftMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginVertical: 3,
  },
  giftMessageText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
  },
  systemMessageBubble: {
    alignSelf: 'center',
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 4,
  },
  systemMessageText: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: '500',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  chatInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F4F5F7',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
  },
  chatInputPlaceholder: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  dockCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockCircleBtnMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  giftDockBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  giftDockGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  chatModalContent: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    gap: 8,
  },
  chatModalInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1D1E',
    paddingHorizontal: 12,
  },
  sendChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendChatBtnDisabled: {
    opacity: 0.5,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D1E',
  },
  sheetActionsList: {
    gap: 10,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
  },
  sheetActionTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1D1E',
  },
  sheetActionTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  sheetInfoNotice: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    paddingVertical: 16,
  },
  giftSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  giftSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  coinsBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  coinsBalanceText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  recipientsRow: {
    gap: 8,
    marginBottom: 16,
  },
  recipientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F4F5F7',
  },
  recipientChipActive: {
    backgroundColor: 'rgba(254, 60, 114, 0.1)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  recipientChipText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
  },
  recipientChipTextActive: {
    color: Colors.primary,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  giftCard: {
    width: '23%',
    alignItems: 'center',
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  giftEmojiBox: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  giftEmojiText: {
    fontSize: 26,
  },
  giftNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1D1E',
    marginBottom: 4,
    textAlign: 'center',
  },
  giftPriceBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  giftPriceText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  hostControlCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1D1E',
  },
  hostDangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 16,
  },
  hostDangerActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1D1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  minimizeChoiceBtn: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  minimizeChoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1D1E',
  },
  leaveChoiceBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  leaveChoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
});
