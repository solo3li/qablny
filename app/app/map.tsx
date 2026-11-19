import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import {
  ChevronRight,
  Ghost,
  RotateCcw,
  MapPin,
  MessageCircle,
  Phone,
  Camera,
  Users,
  Sparkles,
  Flame,
  Shield,
  LocateFixed,
} from 'lucide-react-native';
import { axiosClient } from '../src/api/axiosClient';
import { useAuthStore } from '../src/store/authStore';
import { useCallStore } from '../src/store/callStore';
import { GhostModeSheet } from '../components/map/GhostModeSheet';
import { SendStreakSheet } from '../components/SendStreakSheet';
import { NearbyUser, MapCoordinates, GhostMode } from '../components/map/types';
import { Colors } from '../constants/Colors';

const DEFAULT_CENTER: MapCoordinates = {
  latitude: 30.0444,
  longitude: 31.2357,
};

const DISTANCE_OPTIONS = [
  { value: 1, label: '1 كم' },
  { value: 5, label: '5 كم' },
  { value: 15, label: '15 كم' },
  { value: 30, label: '30 كم' },
  { value: 50, label: '50 كم' },
];

export default function NearbyScreen() {
  const { user: currentUser } = useAuthStore();
  const [coords, setCoords] = useState<MapCoordinates>(DEFAULT_CENTER);
  const [users, setUsers] = useState<NearbyUser[]>([]);
  const [radius, setRadius] = useState<number>(15);
  const [ghostMode, setGhostMode] = useState<GhostMode>('public');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showGhostModal, setShowGhostModal] = useState<boolean>(false);
  const [targetStreakUser, setTargetStreakUser] = useState<NearbyUser | null>(null);

  // Fetch current user ghost mode
  const fetchGhostMode = async () => {
    try {
      const res = await axiosClient.get('/map/ghost-mode');
      if (res.data?.ghostMode) {
        setGhostMode(res.data.ghostMode as GhostMode);
      }
    } catch (e) {
      // fallback
    }
  };

  // Toggle or change ghost mode
  const handleToggleGhostMode = async () => {
    try {
      const res = await axiosClient.post('/map/ghost-mode', { toggle: true });
      if (res.data?.ghostMode) {
        setGhostMode(res.data.ghostMode as GhostMode);
      }
    } catch (e) {
      console.warn('Failed to toggle ghost mode:', e);
    }
  };

  const handleSelectGhostMode = async (mode: GhostMode) => {
    try {
      const res = await axiosClient.post('/map/ghost-mode', { ghostMode: mode });
      if (res.data?.ghostMode) {
        setGhostMode(res.data.ghostMode as GhostMode);
      }
    } catch (e) {
      console.warn('Failed to set ghost mode:', e);
    }
  };

  // Fetch nearby users within radius
  const fetchNearbyUsers = useCallback(
    async (lat: number, lon: number, r: number) => {
      try {
        setRefreshing(true);
        const res = await axiosClient.get(
          `/map/nearby?latitude=${lat}&longitude=${lon}&radius=${r}`
        );
        if (res.data?.users) {
          setUsers(res.data.users);
        }
        if (res.data?.myGhostMode) {
          setGhostMode(res.data.myGhostMode as GhostMode);
        }
      } catch (e) {
        console.warn('Failed to fetch nearby users:', e);
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    []
  );

  // Initialize GPS location
  useEffect(() => {
    let isMounted = true;

    async function initLocation() {
      fetchGhostMode();
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!isMounted) return;
              const newCoords = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };
              setCoords(newCoords);
              fetchNearbyUsers(newCoords.latitude, newCoords.longitude, radius);
            },
            () => {
              if (!isMounted) return;
              fetchNearbyUsers(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude, radius);
            },
            { timeout: 7000 }
          );
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!isMounted) return;
            const newCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            setCoords(newCoords);
            fetchNearbyUsers(newCoords.latitude, newCoords.longitude, radius);
          } else {
            fetchNearbyUsers(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude, radius);
          }
        }
      } catch (err) {
        if (isMounted) {
          fetchNearbyUsers(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude, radius);
        }
      }
    }

    initLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  // Re-fetch when radius changes
  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    fetchNearbyUsers(coords.latitude, coords.longitude, newRadius);
  };

  // Re-center on user
  const handleRecenter = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const newCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoords(newCoords);
          fetchNearbyUsers(newCoords.latitude, newCoords.longitude, radius);
        });
      } else {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const newCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCoords(newCoords);
        fetchNearbyUsers(newCoords.latitude, newCoords.longitude, radius);
      }
    } catch (e) {
      fetchNearbyUsers(coords.latitude, coords.longitude, radius);
    }
  };

  // Action Handlers
  const handleOpenChat = (u: NearbyUser) => {
    router.push(`/chat/${u.id}`);
  };

  const handleInitiateCall = (u: NearbyUser) => {
    useCallStore.getState().initiateCall(u.id, 'voice');
  };

  const handleSendStreak = (u: NearbyUser) => {
    setTargetStreakUser(u);
  };

  // Render Single User Card
  const renderUserItem = ({ item }: { item: NearbyUser }) => {
    return (
      <View style={styles.userCard}>
        {/* Left: Avatar with Online & Streak Indicators */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.profileImageUrl ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160',
            }}
            style={styles.avatarImage}
          />
          {item.isOnline && <View style={styles.onlineDot} />}
          {item.streakDays > 0 && (
            <View style={styles.streakBadge}>
              <Flame size={11} color="#FF6B00" fill="#FF6B00" />
              <Text style={styles.streakText}>{item.streakDays}</Text>
            </View>
          )}
        </View>

        {/* Middle: User Info & Distance */}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.age ? (
              <View style={styles.agePill}>
                <Text style={styles.ageText}>{item.age}</Text>
              </View>
            ) : null}
          </View>

          {/* Distance Indicator */}
          <View style={styles.distanceRow}>
            <MapPin size={13} color="#FE3C72" />
            <Text style={styles.distanceText}>على بعد {item.distanceText}</Text>
          </View>

          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
        </View>

        {/* Right: Quick Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.chatBtn]}
            onPress={() => handleOpenChat(item)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="محادثة"
          >
            <MessageCircle size={17} color="#FE3C72" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => handleInitiateCall(item)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="اتصال"
          >
            <Phone size={16} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.snapBtn]}
            onPress={() => handleSendStreak(item)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityLabel="إرسال ستريك"
          >
            <Camera size={16} color="#F59E0B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)');
            }}
            activeOpacity={0.7}
          >
            <ChevronRight size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>القريبين منك</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? 'جاري البحث...' : `${users.length} شخص في نطاق ${radius} كم`}
            </Text>
          </View>
        </View>

        {/* Ghost Mode Capsule & Actions */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.ghostCapsule,
              ghostMode === 'ghost' && styles.ghostCapsuleActive,
            ]}
            onPress={handleToggleGhostMode}
            onLongPress={() => setShowGhostModal(true)}
            activeOpacity={0.8}
          >
            <Ghost
              size={15}
              color={ghostMode === 'ghost' ? '#C084FC' : '#94A3B8'}
            />
            <Text
              style={[
                styles.ghostText,
                ghostMode === 'ghost' && styles.ghostTextActive,
              ]}
            >
              {ghostMode === 'ghost' ? 'شبح' : 'مرئي'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleRecenter}
            activeOpacity={0.7}
          >
            <LocateFixed size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Distance Selector Pills (تحديد المسافة) */}
      <View style={styles.distanceFilterSection}>
        <Text style={styles.distanceFilterLabel}>نطاق المسافة:</Text>
        <View style={styles.pillsRow}>
          {DISTANCE_OPTIONS.map((opt) => {
            const isSelected = radius === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.distancePill, isSelected && styles.distancePillActive]}
                onPress={() => handleRadiusChange(opt.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.distancePillText,
                    isSelected && styles.distancePillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Ghost Mode Notice Banner */}
      {ghostMode === 'ghost' && (
        <View style={styles.ghostNotice}>
          <Ghost size={16} color="#C084FC" />
          <Text style={styles.ghostNoticeText}>
            أنت في وضع الشبح حالياً: يمكنك رؤية الآخرين ولكن موقعك مخفي عنهم.
          </Text>
        </View>
      )}

      {/* Main Nearby List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FE3C72" />
          <Text style={styles.loadingText}>جاري البحث عن القريبين منك...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNearbyUsers(coords.latitude, coords.longitude, radius)}
              tintColor="#FE3C72"
              colors={['#FE3C72']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Users size={36} color="#64748B" />
              </View>
              <Text style={styles.emptyTitle}>لا يوجد أشخاص في نطاق {radius} كم</Text>
              <Text style={styles.emptySubtitle}>
                جرب زيادة نطاق المسافة من الأعلى لاكتشاف أشخاص أكثر بالقرب منك.
              </Text>
              {radius < 50 && (
                <TouchableOpacity
                  style={styles.expandRadiusBtn}
                  onPress={() => handleRadiusChange(radius === 1 ? 5 : radius === 5 ? 15 : radius === 15 ? 30 : 50)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.expandRadiusText}>توسيع نطاق البحث</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Ghost Mode Sheet Modal */}
      <GhostModeSheet
        visible={showGhostModal}
        currentMode={ghostMode}
        onSelectMode={handleSelectGhostMode}
        onClose={() => setShowGhostModal(false)}
      />

      {/* Send Streak Sheet Modal */}
      {targetStreakUser && (
        <SendStreakSheet
          visible={Boolean(targetStreakUser)}
          mediaUri={null}
          mediaType="image"
          caption={`🔥 تحية من القريبين إلى ${targetStreakUser.name}!`}
          onClose={() => setTargetStreakUser(null)}
          onSuccess={() => setTargetStreakUser(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0D111A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'web' ? 'inherit' : undefined,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghostCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ghostCapsuleActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  ghostText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  ghostTextActive: {
    color: '#C084FC',
    fontWeight: '700',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceFilterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0B0F17',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  distanceFilterLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  distancePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distancePillActive: {
    backgroundColor: 'rgba(254, 60, 114, 0.18)',
    borderColor: '#FE3C72',
  },
  distancePillText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  distancePillTextActive: {
    color: '#FE3C72',
    fontWeight: '800',
  },
  ghostNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  ghostNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#D8B4FE',
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#0F1523',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#0F1523',
  },
  streakBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#1E1520',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
  },
  streakText: {
    fontSize: 10,
    color: '#FF6B00',
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  agePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  ageText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#FE3C72',
    fontWeight: '600',
  },
  userBio: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chatBtn: {
    backgroundColor: 'rgba(254, 60, 114, 0.1)',
    borderColor: 'rgba(254, 60, 114, 0.25)',
  },
  callBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  snapBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  expandRadiusBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(254, 60, 114, 0.15)',
    borderWidth: 1,
    borderColor: '#FE3C72',
  },
  expandRadiusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FE3C72',
  },
});
