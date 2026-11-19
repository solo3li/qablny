import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  PanResponder,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SwitchCamera,
  SlidersHorizontal,
  Zap,
  Coins,
  Search,
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Gift,
  UserPlus,
  SkipForward,
  Sparkles,
  Camera,
  Heart,
  Crown,
  Rocket,
  Gem,
  Check,
  Users,
  Globe,
  MessageCircle,
  UserCheck,
  User,
  Flame,
  Compass,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { SnapPreviewModal } from '../../components/SnapPreviewModal';
import { SendStreakSheet } from '../../components/SendStreakSheet';
import { matchSignalR } from '../../src/api/matchSignalR';
import { router, useNavigation } from 'expo-router';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { useAppStore } from '../../store/useAppStore';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  TrackReference,
  useLocalParticipant,
  registerGlobals,
} from '@livekit/react-native';
import { RTCView } from '@livekit/react-native-webrtc';
import { Track, createLocalVideoTrack, LocalVideoTrack } from 'livekit-client';

registerGlobals();

const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL || 'wss://livekit-qablny.169.58.32.179.nip.io';

function RemoteVideo() {
  const tracks = useTracks([Track.Source.Camera]);
  const remoteTrack = tracks.find((t: any) => t.participant.isLocal === false) as TrackReference | undefined;

  if (remoteTrack && remoteTrack.publication?.track) {
    return (
      <VideoTrack
        trackRef={remoteTrack}
        style={StyleSheet.absoluteFillObject}
      />
    );
  }

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#07090e', justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ color: '#E2E8F0', marginTop: 14, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 }}>
        جاري الاتصال بالكاميرا...
      </Text>
    </View>
  );
}

function LocalVideo({ isCameraOn, facingMode }: { isCameraOn: boolean; facingMode?: 'user' | 'environment' }) {
  const tracks = useTracks([Track.Source.Camera]);
  const localTrack = tracks.find((t: any) => t.participant.isLocal === true) as TrackReference | undefined;

  if (isCameraOn && localTrack && localTrack.publication?.track) {
    return (
      <VideoTrack
        trackRef={localTrack}
        style={{ width: '100%', height: '100%' }}
        mirror={facingMode !== 'environment'}
      />
    );
  }

  return (
    <View style={{ width: '100%', height: '100%', backgroundColor: '#161922', justifyContent: 'center', alignItems: 'center' }}>
      {!isCameraOn ? (
        <VideoOff color="#94A3B8" size={24} />
      ) : (
        <ActivityIndicator size="small" color="#FFFFFF" />
      )}
    </View>
  );
}

// Azar-style Video Call Layout (Full Screen Remote + Rounded PiP Local + Action Dock)
function CallInterface({
  remotePeer,
  handleEndCall,
  handleSkip,
  handleAddFriend,
  handleSendMessage,
  setGiftsOpen,
  sentGift,
  messages,
}: any) {
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [duration, setDuration] = useState(0);
  const [isLocalMain, setIsLocalMain] = useState(false);
  const insets = useSafeAreaInsets();

  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          setIsLocalMain(prev => !prev);
        }
        pan.extractOffset();
      },
    })
  ).current;

  // Swipe Left gesture to Skip during active call
  const callSwipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40 || gestureState.vx < -0.3) {
          handleSkip();
        }
      },
    })
  ).current;

  useEffect(() => {
    const timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMic = async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
      setMicEnabled(!micEnabled);
    }
  };

  const toggleCam = async () => {
    if (localParticipant) {
      await localParticipant.setCameraEnabled(!camEnabled);
      setCamEnabled(!camEnabled);
    }
  };

  const toggleFlipCamera = async () => {
    if (localParticipant) {
      try {
        const camPub = localParticipant.getTrackPublication(Track.Source.Camera);
        const nextFacing = facingMode === 'user' ? 'environment' : 'user';
        if (camPub && camPub.videoTrack) {
          await (camPub.videoTrack as any).restartTrack({ facingMode: nextFacing });
        }
        setFacingMode(nextFacing);
      } catch (e) {
        console.warn('Failed to switch camera during call:', e);
      }
    }
  };

  const formattedTime = `${Math.floor(duration / 60)
    .toString()
    .padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;

  return (
    <View style={styles.callRoot} {...callSwipePan.panHandlers}>
      {/* 100% Full-Screen Main Video Viewport */}
      {isLocalMain ? <LocalVideo isCameraOn={camEnabled} facingMode={facingMode} /> : <RemoteVideo />}

      {/* Rounded Picture-in-Picture (PiP) Window in the corner */}
      <Animated.View
        style={[
          styles.pipContainer,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        {isLocalMain ? <RemoteVideo /> : <LocalVideo isCameraOn={camEnabled} facingMode={facingMode} />}
        <View style={styles.pipMicIcon}>
          {micEnabled ? <Mic color="#FFFFFF" size={12} /> : <MicOff color={Colors.danger} size={12} />}
        </View>
      </Animated.View>

      {/* Soft Top/Bottom Vignette Gradients */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.75)']}
        style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
      />

      {/* Top Floating HUD: Peer Info & Duration */}
      <View style={[styles.callTopBar, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.peerInfoCapsule}>
          <View style={styles.peerAvatarCircle}>
            <Text style={styles.peerAvatarInitial}>
              {remotePeer?.name ? remotePeer.name.charAt(0) : 'ص'}
            </Text>
          </View>
          <View>
            <Text style={styles.peerNameText} numberOfLines={1}>
              {remotePeer?.name || 'صديق جديد'}
            </Text>
            <Text style={styles.peerLocationText} numberOfLines={1}>
              {remotePeer?.location || 'المطابقة الحية'}
            </Text>
          </View>
        </View>

        <View style={styles.callDurationBadge}>
          <View style={styles.callLiveDot} />
          <Text style={styles.callDurationText}>{formattedTime}</Text>
        </View>
      </View>

      {/* Floating Gift Display */}
      {sentGift && (() => {
        const GiftIcon = sentGift.icon || Gift;
        return (
          <View style={styles.giftFloat}>
            <View style={styles.giftFloatBadge}>
              <GiftIcon size={60} color={sentGift.iconColor || Colors.primary} />
              <Text style={styles.giftFloatTitle}>{sentGift.name || sentGift}</Text>
            </View>
          </View>
        );
      })()}

      {/* Floating Call Action Dock */}
      <View style={[styles.callDockContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Swipe hint chip */}
        <View style={styles.callSwipeHint}>
          <Text style={styles.callSwipeHintText}>اسحب للشمال للتخطي ←</Text>
        </View>

        <View style={styles.callDockRow}>
          {/* Mic Toggle */}
          <TouchableOpacity
            style={[styles.callActionBtn, !micEnabled && styles.callActionBtnDisabled]}
            onPress={toggleMic}
            activeOpacity={0.8}
            accessibilityLabel="كتم الميكروفون"
          >
            {micEnabled ? <Mic color="#FFFFFF" size={20} /> : <MicOff color="#FFFFFF" size={20} />}
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={toggleFlipCamera}
            activeOpacity={0.8}
            accessibilityLabel="قلب الكاميرا"
          >
            <SwitchCamera color="#FFFFFF" size={20} />
          </TouchableOpacity>

          {/* Gift Tray Trigger */}
          <TouchableOpacity
            style={styles.callGiftActionBtn}
            onPress={() => setGiftsOpen(true)}
            activeOpacity={0.85}
            accessibilityLabel="إرسال هدية"
          >
            <LinearGradient colors={Colors.gradPrimary} style={styles.callGiftGradient}>
              <Gift color="#FFFFFF" size={22} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Friend Request */}
          <TouchableOpacity
            style={styles.callActionBtn}
            onPress={handleAddFriend}
            activeOpacity={0.8}
            accessibilityLabel="إضافة صديق"
          >
            <UserPlus color="#FFFFFF" size={20} />
          </TouchableOpacity>

          {/* Skip to Next */}
          <TouchableOpacity
            style={[styles.callActionBtn, styles.callSkipBtn]}
            onPress={handleSkip}
            activeOpacity={0.8}
            accessibilityLabel="التالي"
          >
            <SkipForward color="#FFFFFF" size={20} />
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity
            style={styles.callEndBtn}
            onPress={handleEndCall}
            activeOpacity={0.8}
            accessibilityLabel="إنهاء المكالمة"
          >
            <PhoneOff color="#FFFFFF" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function getGiftIconComponent(name: string) {
  if (name?.includes('تاج')) return Crown;
  if (name?.includes('صاروخ')) return Rocket;
  if (name?.includes('ماس') || name?.includes('جوهر')) return Gem;
  if (name?.includes('قلب') || name?.includes('ورد')) return Heart;
  return Gift;
}

function getGiftColor(name: string) {
  if (name?.includes('تاج')) return '#F59E0B';
  if (name?.includes('صاروخ')) return '#3B82F6';
  if (name?.includes('ماس') || name?.includes('جوهر')) return '#8B5CF6';
  if (name?.includes('قلب') || name?.includes('ورد')) return '#FE3C72';
  return Colors.primary;
}

export default function MatchScreenNative() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, checkAuth } = useAuthStore();
  const { filterGender, filterRegion, setFilterGender, setFilterRegion, setIsMatchMode } = useAppStore();

  // Instant Camera State
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Matchmaking & LiveKit State
  const [isSearching, setIsSearching] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [remotePeer, setRemotePeer] = useState<any | null>(null);
  const [isBoosted, setIsBoosted] = useState(false);

  // Snapchat-style Streaks & Snap Capture State
  const [snapPreviewVisible, setSnapPreviewVisible] = useState(false);
  const [sendSheetVisible, setSendSheetVisible] = useState(false);
  const [snapMediaUri, setSnapMediaUri] = useState<string | null>(null);
  const [snapMediaType, setSnapMediaType] = useState<'image' | 'video'>('image');
  const [snapCaption, setSnapCaption] = useState('');
  const [isRecordingSnap, setIsRecordingSnap] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const handleCaptureNative = async (type: 'image' | 'video') => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول للكاميرا لالتقاط الستريك');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        videoMaxDuration: 10,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setSnapMediaUri(asset.uri);
        setSnapMediaType(asset.type === 'video' ? 'video' : 'image');
        setSnapPreviewVisible(true);
      }
    } catch (e) {
      console.error('Camera capture error on native', e);
    }
  };

  // Filters Sheet Modal State
  const [filtersOpen, setFiltersOpen] = useState(false);
  const closeFilters = () => setFiltersOpen(false);
  const subRegions = ['الشرق الأوسط', 'الخليج العربي', 'شمال أفريقيا', 'أوروبا', 'أمريكا الشمالية', 'آسيا'];
  const genderOptions = [
    { key: 'all', label: 'الكل', icon: Users },
    { key: 'female', label: 'إناث', icon: UserCheck },
    { key: 'male', label: 'ذكور', icon: User },
  ] as const;

  // Gift Sheet Modal State
  const [giftsOpen, setGiftsOpen] = useState(false);
  const closeGifts = () => setGiftsOpen(false);
  const [sentGift, setSentGift] = useState<any | null>(null);
  const [gifts, setGifts] = useState<any[]>([
    { id: '11111111-0000-0000-0000-000000000002', name: 'قلب', icon: Heart, iconColor: '#FE3C72', coinCost: 20 },
    { id: '11111111-0000-0000-0000-000000000003', name: 'تاج', icon: Crown, iconColor: '#F59E0B', coinCost: 50 },
    { id: '11111111-0000-0000-0000-000000000008', name: 'صاروخ', icon: Rocket, iconColor: '#3B82F6', coinCost: 150 },
    { id: '11111111-0000-0000-0000-000000000004', name: 'الماس', icon: Gem, iconColor: '#8B5CF6', coinCost: 100 },
  ]);

  const [messages, setMessages] = useState<{ sender: string; text: string; type?: 'chat' | 'system' }[]>([
    { sender: 'النظام', text: 'المكالمة متصلة الآن ومؤمنة التشفير', type: 'system' },
  ]);

  // Animated Arrow for Swipe Guide Pill
  const swipeAnim = useRef(new Animated.Value(0)).current;

  // Radar Animation for Searching State
  const radarAnim1 = useRef(new Animated.Value(0)).current;
  const radarAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const swipeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeAnim, {
          toValue: -8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(swipeAnim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    swipeLoop.start();
    return () => swipeLoop.stop();
  }, [swipeAnim]);

  useEffect(() => {
    if (isSearching) {
      const createRadarLoop = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );

      const r1 = createRadarLoop(radarAnim1, 0);
      const r2 = createRadarLoop(radarAnim2, 1000);
      r1.start();
      r2.start();

      return () => {
        r1.stop();
        r2.stop();
        radarAnim1.setValue(0);
        radarAnim2.setValue(0);
      };
    }
  }, [isSearching, radarAnim1, radarAnim2]);

  // Native Mobile Camera Viewport Initialization
  const initNativeCamera = useCallback(
    async (facing: 'user' | 'environment' = facingMode) => {
      try {
        if (localVideoTrack) {
          localVideoTrack.stop();
        }
        const track = await createLocalVideoTrack({ facingMode: facing });
        setLocalVideoTrack(track);
        setHasCameraPermission(true);
      } catch (err) {
        console.warn('Native camera preview init error:', err);
        setHasCameraPermission(false);
      }
    },
    [facingMode, localVideoTrack]
  );

  useEffect(() => {
    if (!livekitToken) {
      initNativeCamera(facingMode);
    } else {
      if (localVideoTrack) {
        localVideoTrack.stop();
        setLocalVideoTrack(null);
      }
    }

    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop();
      }
    };
  }, [facingMode, !!livekitToken]);

  // Refresh User info and Boost status on mount
  useEffect(() => {
    checkAuth().catch(() => {});
    matchSignalR
      .getBoostStatus()
      .then((res: any) => {
        if (res?.isBoosted) setIsBoosted(true);
      })
      .catch((err) => console.warn('Boost status warning:', err));

    matchSignalR.setOnBoostActivated(() => {
      setIsBoosted(true);
    });

    axiosClient
      .get('/gifts')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setGifts(
            res.data.map((g: any) => ({
              id: g.id,
              name: g.name,
              icon: getGiftIconComponent(g.name),
              iconColor: getGiftColor(g.name),
              coinCost: g.coinCost ?? g.coin_cost ?? 10,
            }))
          );
        }
      })
      .catch((err) => console.warn('Failed to load gifts:', err));
  }, []);

  // SignalR Matchmaking Listeners
  useEffect(() => {
    matchSignalR.setOnMatchFound((data: any) => {
      setRoomName(data.roomName);
      setRemotePeer(data.matchedUser);
      setLivekitToken(data.liveKitToken);
      setIsSearching(false);
      setMessages((prev) => [
        ...prev,
        { sender: data.matchedUser?.name || 'مستخدم', text: 'انضم للمكالمة', type: 'system' },
      ]);
    });

    matchSignalR.setOnMatchSkipped(() => {
      setLivekitToken(null);
      setRemotePeer(null);
      setIsSearching(true);
      matchSignalR.leaveQueue().then(() => matchSignalR.joinQueue({}));
    });

    return () => {
      matchSignalR.leaveQueue();
    };
  }, []);

  // Sync Bottom Tab Bar Visibility: Docked blur bar sits over camera, hides only during active video call
  useEffect(() => {
    setIsMatchMode(!!livekitToken);
    return () => setIsMatchMode(false);
  }, [livekitToken, setIsMatchMode]);

  // Flip Camera handler
  const handleToggleCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    if (localVideoTrack) {
      try {
        await localVideoTrack.restartTrack({ facingMode: nextFacing });
      } catch (e) {
        initNativeCamera(nextFacing);
      }
    }
  };

  // Matchmaking Actions
  const handleStartSearch = async () => {
    if (isSearching || livekitToken) return;
    setIsSearching(true);
    setLivekitToken(null);
    setRemotePeer(null);
    try {
      const g = filterGender === 'all' ? undefined : filterGender === 'female' ? 2 : 1;
      await matchSignalR.joinQueue({ GenderPref: g, CallType: 'video' });
    } catch (e) {
      console.error('Search failed', e);
      setIsSearching(false);
      Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً لتتمكن من استخدام ميزة المطابقة الكاميرا.');
    }
  };

  const handleEndCall = async () => {
    setLivekitToken(null);
    setRemotePeer(null);
    await matchSignalR.leaveQueue();
    checkAuth().catch(() => {});
  };

  const handleSkip = async () => {
    setLivekitToken(null);
    setRemotePeer(null);
    setIsSearching(true);
    await matchSignalR.leaveQueue();
    await matchSignalR.joinQueue({});
  };

  const handleAddFriend = async () => {
    if (!remotePeer?.id) return;
    try {
      await axiosClient.post(`/friends/request/${remotePeer.id}`);
      Alert.alert('نجاح', 'تم إرسال طلب الصداقة بنجاح!');
    } catch (e: any) {
      console.error('Failed to add friend', e);
      const msg = e.response?.data?.message || e.response?.data?.Message || 'حدث خطأ أثناء إرسال طلب الصداقة';
      Alert.alert('تنبيه', msg);
    }
  };

  const handleSendMessage = () => {
    if (remotePeer) {
      router.push({
        pathname: `/chat/${remotePeer.id}`,
        params: { name: remotePeer.name, image: remotePeer.profileImageUrl },
      });
    }
  };

  const handleSendGift = async (gift: any) => {
    setSentGift(gift);
    setGiftsOpen(false);
    setTimeout(() => setSentGift(null), 3000);
    try {
      if (remotePeer) {
        await axiosClient.post('/gifts/send', { giftId: gift.id, receiverId: remotePeer.id });
        setMessages((prev) => [...prev, { sender: 'أنت', text: `أرسلت هدية (${gift.name})`, type: 'system' }]);
        checkAuth().catch(() => {});
      }
    } catch (e) {
      console.error('Gift sending failed', e);
    }
  };

  // Azar-style Horizontal Swipe-to-Match Gesture
  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        // Swipe left: dx is negative
        if (gestureState.dx < -35 || gestureState.vx < -0.3) {
          if (!isSearching && !livekitToken) {
            handleStartSearch();
          }
        }
      },
    })
  ).current;

  const genderLabel = filterGender === 'female' ? 'إناث' : filterGender === 'male' ? 'ذكور' : 'الكل';
  const regionLabel = filterRegion === 'العالم' ? 'العالم' : filterRegion;
  const filterLabel = `${genderLabel} · ${regionLabel}`;

  // Radar pulse animations
  const radarScale1 = radarAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.2] });
  const radarOpacity1 = radarAnim1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.35, 0] });
  const radarScale2 = radarAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.2] });
  const radarOpacity2 = radarAnim2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.55, 0.35, 0] });

  return (
    <View style={styles.container} {...swipePanResponder.panHandlers}>
      {/* ── Active LiveKit Video Call State ─────────────────────────────── */}
      {livekitToken ? (
        <LiveKitRoom
          serverUrl={LIVEKIT_URL}
          token={livekitToken}
          connect={true}
          audio={true}
          video={true}
          style={StyleSheet.absoluteFillObject}
        >
          <CallInterface
            remotePeer={remotePeer}
            handleEndCall={handleEndCall}
            handleSkip={handleSkip}
            handleAddFriend={handleAddFriend}
            handleSendMessage={handleSendMessage}
            setGiftsOpen={setGiftsOpen}
            sentGift={sentGift}
            messages={messages}
          />
        </LiveKitRoom>
      ) : (
        <>
          {/* ── Snapchat-style Instant Camera Viewport on Launch ─────────── */}
          <View style={StyleSheet.absoluteFillObject}>
            {localVideoTrack?.mediaStream ? (
              <RTCView
                streamURL={localVideoTrack.mediaStream.toURL()}
                mirror={facingMode === 'user'}
                objectFit="cover"
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#07090E' }]} />
            )}
          </View>

          {/* Gentle Ambient Vignette for HUD readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
          />

          {/* ── Camera Permission Dialog (Frosted Glass) ───────────────── */}
          {hasCameraPermission === false && (
            <View style={styles.permissionBackdrop}>
              <View style={styles.permissionCard}>
                <LinearGradient colors={Colors.gradPrimary} style={styles.permissionBadge}>
                  <Camera size={30} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.permissionTitle}>الكاميرا مطلوبة لبدء المطابقة</Text>
                <Text style={styles.permissionDesc}>يرجى السماح بالوصول للكاميرا لبدء المطابقة الفورية</Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={() => initNativeCamera(facingMode)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={Colors.gradPrimary} style={styles.permissionBtnGradient}>
                    <Text style={styles.permissionBtnText}>السماح بالكاميرا وإعادة المحاولة</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Floating Frosted Glass HUD Controls ─────────────────────── */}
          <View style={[styles.hudTopBar, { paddingTop: Math.max(insets.top, 22) }]}>
            {/* Top Left: Brand Title */}
            <View style={styles.hudBrandCapsule}>
              <View style={styles.hudBrandLiveDot} />
              <Text style={styles.hudBrandText}>قابلنى</Text>
            </View>

            {/* Top Right: Actions */}
            <View style={styles.hudActionsRow}>
              {/* Filter Capsule */}
              <TouchableOpacity
                style={[
                  styles.hudCapsule,
                  (filterGender !== 'all' || filterRegion !== 'العالم') && styles.hudCapsuleActive,
                ]}
                onPress={() => setFiltersOpen(true)}
                activeOpacity={0.8}
                accessibilityLabel="تفضيلات البحث"
              >
                <SlidersHorizontal size={14} color="#FFFFFF" />
                <Text style={styles.hudCapsuleText}>{filterLabel}</Text>
              </TouchableOpacity>

              {/* Coins Balance Capsule */}
              <TouchableOpacity
                style={styles.hudCapsule}
                onPress={() => router.push('/(tabs)/wallet' as any)}
                activeOpacity={0.8}
                accessibilityLabel="الرصيد والمحفظة"
              >
                <Coins size={14} color="#F59E0B" />
                <Text style={styles.hudCoinsText}>{user?.coins?.toLocaleString() || '0'}</Text>
              </TouchableOpacity>

              {/* Nearby / Snap Map Capsule */}
              <TouchableOpacity
                style={[styles.hudCapsule, { borderColor: 'rgba(254, 60, 114, 0.45)', backgroundColor: 'rgba(254, 60, 114, 0.2)' }]}
                onPress={() => router.push('/(tabs)/map' as any)}
                activeOpacity={0.8}
                accessibilityLabel="خريطة القريبين منك"
              >
                <Compass size={14} color="#FE3C72" />
                <Text style={[styles.hudCapsuleText, { color: '#FFFFFF', fontWeight: '700' }]}>القريبين</Text>
              </TouchableOpacity>

              {/* Boost Status Pill */}
              <TouchableOpacity
                style={[styles.hudCapsule, isBoosted && styles.hudBoostCapsuleActive]}
                onPress={() => router.push('/boost' as any)}
                activeOpacity={0.8}
                accessibilityLabel="ميزة البوست"
              >
                <Zap size={14} color={isBoosted ? '#FFD700' : '#FFFFFF'} fill={isBoosted ? '#FFD700' : 'none'} />
                {isBoosted ? (
                  <Text style={styles.hudBoostTextActive}>مفعّل</Text>
                ) : (
                  <Text style={styles.hudCapsuleText}>بوست</Text>
                )}
              </TouchableOpacity>

              {/* Flip Camera Button */}
              <TouchableOpacity
                style={styles.hudCircleBtn}
                onPress={handleToggleCameraFacing}
                activeOpacity={0.8}
                accessibilityLabel="قلب الكاميرا"
              >
                <SwitchCamera size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Azar-style Floating Guide Pill above Docked Bottom Nav ──── */}
          {!isSearching && (
            <Animated.View
              style={[
                styles.guidePillWrapper,
                {
                  bottom: Math.max(insets.bottom + 184, 204),
                  transform: [{ translateX: swipeAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.guidePillTouchable}
                onPress={handleStartSearch}
                activeOpacity={0.85}
                accessibilityLabel="اسحب للشمال للمطابقة الفورية"
              >
                <LinearGradient
                  colors={['rgba(254, 60, 114, 0.96)', 'rgba(255, 101, 132, 0.96)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.guidePillGradient}
                >
                  <Text style={styles.guideArrow}>←</Text>
                  <Text style={styles.guideText}>اسحب للشمال للمطابقة الفورية</Text>
                  <Sparkles size={16} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ── Snapchat-style Frosted Shutter Button for Streaks ──────── */}
          {!isSearching && (
            <View
              style={[
                styles.shutterWrapper,
                { bottom: Math.max(insets.bottom + 84, 100) },
              ]}
            >
              {isRecordingSnap && (
                <View style={styles.recBadge}>
                  <View style={styles.recDot} />
                  <Text style={styles.recText}>
                    00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 00:10
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.shutterOuter,
                  isRecordingSnap && styles.shutterOuterRecording,
                ]}
                onPress={() => handleCaptureNative('image')}
                onLongPress={() => handleCaptureNative('video')}
                activeOpacity={0.9}
                accessibilityLabel="نقرة لالتقاط صورة سناب، أو ضغطة مطولة لتسجيل فيديو ستريك"
              >
                <View
                  style={[
                    styles.shutterInner,
                    isRecordingSnap && styles.shutterInnerRecording,
                  ]}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Searching State: Sleek Frosted Overlay over Live Camera ── */}
          {isSearching && (
            <View style={styles.searchingOverlay}>
              {/* Soft Visual Radar Pulse Waves */}
              <Animated.View
                style={[
                  styles.radarRing,
                  { width: 140, height: 140, transform: [{ scale: radarScale1 }], opacity: radarOpacity1 },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarRing,
                  { width: 230, height: 230, transform: [{ scale: radarScale2 }], opacity: radarOpacity2 },
                ]}
              />
              <Animated.View
                style={[
                  styles.radarRing,
                  { width: 330, height: 330, transform: [{ scale: radarScale1 }], opacity: radarOpacity2 },
                ]}
              />

              {/* Pulsing Search Center Badge */}
              <View style={styles.searchCenterBadge}>
                <LinearGradient colors={Colors.gradPrimary} style={styles.searchCenterGradient}>
                  <Search size={32} color="#FFFFFF" strokeWidth={2.4} />
                </LinearGradient>
              </View>

              <Text style={styles.searchTitle}>جاري البحث عن صديق متوافق...</Text>
              <Text style={styles.searchSubtitle}>انتظر لحظات، نحن نوصلك بأفضل تطابق حسب اهتماماتك</Text>

              {/* Clear Cancel Button */}
              <TouchableOpacity
                style={styles.searchCancelBtn}
                onPress={() => {
                  setIsSearching(false);
                  matchSignalR.leaveQueue();
                }}
                activeOpacity={0.8}
                accessibilityLabel="إلغاء البحث"
              >
                <X size={18} color="#FFFFFF" />
                <Text style={styles.searchCancelText}>إلغاء البحث</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ── Filter Bottom Sheet Modal ────────────────────────────────────── */}
      <Modal visible={filtersOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeFilters} />
          <View style={styles.filterTray}>
            <View style={styles.modalHandle} />
            <View style={styles.trayHeader}>
              <Text style={styles.trayTitle}>تفضيلات البحث</Text>
              <TouchableOpacity style={styles.trayCloseBtn} onPress={closeFilters}>
                <X color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            {/* Gender Preference */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Users color={Colors.primary} size={18} />
                <Text style={styles.sectionTitle}>الجنس المفضل</Text>
              </View>
              <View style={styles.genderRow}>
                {genderOptions.map((opt) => {
                  const IconComp = opt.icon;
                  const isActive = filterGender === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.genderCard, isActive && styles.genderCardActive]}
                      onPress={() => setFilterGender(opt.key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.genderIconWrap, isActive && styles.genderIconWrapActive]}>
                        <IconComp size={22} color={isActive ? Colors.primary : Colors.textSecondary} />
                      </View>
                      <Text style={[styles.genderLabel, isActive && styles.genderLabelActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Geographic Region */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Globe color={Colors.primary} size={18} />
                <Text style={styles.sectionTitle}>المنطقة الجغرافية</Text>
              </View>

              <TouchableOpacity
                style={[styles.allRegionsBtn, filterRegion === 'العالم' && styles.allRegionsBtnActive]}
                onPress={() => setFilterRegion('العالم')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Globe size={18} color={filterRegion === 'العالم' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.allRegionsText, filterRegion === 'العالم' && styles.allRegionsTextActive]}>
                    العالم (جميع المناطق)
                  </Text>
                </View>
                {filterRegion === 'العالم' && <Check size={18} color={Colors.primary} />}
              </TouchableOpacity>

              <View style={styles.regionsGrid2Col}>
                {subRegions.map((r) => {
                  const isActive = filterRegion === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.regionChip, isActive && styles.regionChipActive]}
                      onPress={() => setFilterRegion(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.regionChipText, isActive && styles.regionChipTextActive]}>
                        {r}
                      </Text>
                      {isActive && <Check size={14} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <GlassButton
              title="تطبيق الفلاتر"
              variant="primary"
              onPress={closeFilters}
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>
        </View>
      </Modal>

      {/* ── Gift Tray Bottom Sheet Modal ─────────────────────────────────── */}
      <Modal visible={giftsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeGifts} />
          <View style={styles.giftTray}>
            <View style={styles.trayHeader}>
              <Text style={styles.trayTitle}>إرسال هدية</Text>
              <View style={styles.coinBadge}>
                <Coins size={16} color="#F59E0B" />
                <Text style={styles.coinCount}>{user?.coins?.toLocaleString() || '0'}</Text>
              </View>
            </View>

            <View style={styles.giftsGrid}>
              {gifts.map((g) => {
                const IconComp = g.icon || Gift;
                return (
                  <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)}>
                    <View style={styles.giftEmojiBox}>
                      <IconComp size={28} color={g.iconColor || Colors.primary} />
                    </View>
                    <Text style={styles.giftName}>{g.name}</Text>
                    <View style={styles.giftCostRow}>
                      <Coins size={12} color="#F59E0B" />
                      <Text style={styles.giftCostText}>{g.coinCost}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.closeTrayBtn} onPress={closeGifts}>
              <Text style={styles.closeTrayText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Snap Preview Modal ────────────────────────────────────────── */}
      <SnapPreviewModal
        visible={snapPreviewVisible}
        mediaUri={snapMediaUri}
        mediaType={snapMediaType}
        onClose={() => {
          setSnapPreviewVisible(false);
          setSnapMediaUri(null);
        }}
        onOpenSendSheet={(caption) => {
          setSnapCaption(caption);
          setSnapPreviewVisible(false);
          setSendSheetVisible(true);
        }}
      />

      {/* ── Send-To Bottom Sheet ──────────────────────────────────────── */}
      <SendStreakSheet
        visible={sendSheetVisible}
        mediaUri={snapMediaUri}
        mediaType={snapMediaType}
        caption={snapCaption}
        onClose={() => {
          setSendSheetVisible(false);
          setSnapMediaUri(null);
        }}
        onSuccess={() => {
          setSendSheetVisible(false);
          setSnapMediaUri(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },

  // ── Frosted Shutter Button for Streaks ──────────────────────────────
  shutterWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 26,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 60, 114, 0.5)',
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FE3C72',
  },
  recText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  shutterOuterRecording: {
    borderColor: '#FE3C72',
    backgroundColor: 'rgba(254, 60, 114, 0.2)',
    transform: [{ scale: 1.08 }],
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  shutterInnerRecording: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FE3C72',
  },

  // ── Floating Frosted Glass HUD Controls ─────────────────────────────
  hudTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 30,
  },
  hudBrandCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudBrandLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  hudBrandText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.3,
  },
  hudActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hudCapsuleActive: {
    borderColor: 'rgba(254, 60, 114, 0.65)',
    backgroundColor: 'rgba(254, 60, 114, 0.25)',
  },
  hudCapsuleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  hudCoinsText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  hudBoostCapsuleActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  hudBoostTextActive: {
    color: '#FFD700',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  hudCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // ── Azar-style Swipe Guide Pill ─────────────────────────────────────
  guidePillWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 25,
  },
  guidePillTouchable: {
    borderRadius: 100,
    overflow: 'hidden',
    shadowColor: '#FE3C72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  guidePillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
  },
  guideArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0.2,
  },

  // ── Searching Frosted Overlay ────────────────────────────────────────
  searchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 16, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    paddingHorizontal: 24,
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
  },
  searchCenterBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  searchCenterGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  searchSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    marginBottom: 36,
    maxWidth: 320,
    lineHeight: 22,
  },
  searchCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  searchCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // ── Camera Permission Dialog ────────────────────────────────────────
  permissionBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 10, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 45,
    paddingHorizontal: 24,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    elevation: 10,
  },
  permissionBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    color: Colors.text,
    fontSize: 19,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  permissionBtn: {
    width: '100%',
    borderRadius: 100,
    overflow: 'hidden',
  },
  permissionBtnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // ── Azar-style Video Call Layout (CallInterface) ────────────────────
  callRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pipContainer: {
    position: 'absolute',
    top: 75,
    right: 18,
    width: 105,
    height: 145,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: '#111319',
    zIndex: 35,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  pipMicIcon: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: 4,
    borderRadius: 10,
  },
  callTopBar: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  peerInfoCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: '65%',
  },
  peerAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  peerNameText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  peerLocationText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  callDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  callDurationText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // ── Floating Call Action Dock ───────────────────────────────────────
  callDockContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 40,
  },
  callSwipeHint: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  callSwipeHintText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  callDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  callActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  callActionBtnDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
    borderColor: Colors.danger,
  },
  callSkipBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  callGiftActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  callGiftGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callEndBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  // ── Floating Gift Animation ─────────────────────────────────────────
  giftFloat: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    zIndex: 100,
  },
  giftFloatBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    elevation: 12,
  },
  giftFloatTitle: {
    marginTop: 8,
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },

  // ── Modals & Bottom Sheets (Filters & Gifts) ────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  filterTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    elevation: 12,
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  trayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  trayTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  trayCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 20,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  genderCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAECEF',
  },
  genderCardActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  genderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderIconWrapActive: {
    backgroundColor: 'rgba(254, 60, 114, 0.12)',
  },
  genderLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  genderLabelActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  allRegionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAECEF',
    marginBottom: 10,
  },
  allRegionsBtnActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  allRegionsText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  allRegionsTextActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  regionsGrid2Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  regionChip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EAECEF',
  },
  regionChipActive: {
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
  },
  regionChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'center',
  },
  regionChipTextActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  // ── Gift Tray Sheet ─────────────────────────────────────────────────
  giftTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    elevation: 12,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  coinCount: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  giftsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  giftItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  giftEmojiBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  giftName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.text,
  },
  giftCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  giftCostText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  closeTrayBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F1F3F5',
    borderRadius: 100,
  },
  closeTrayText: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
});
