import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Dimensions, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Video, Users, Sparkles, Play } from 'lucide-react-native';
import { axiosClient as api } from '../../src/api/axiosClient';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 24px padding on each side

// Fallback high-quality image if none provided
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop';

export default function LiveRoomsScreen() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/live');
      setRooms(res.data);
    } catch (e) {
      console.log('Failed to fetch rooms', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async () => {
    try {
      const res = await api.post('/live', { title: 'My Live Stream', coverImageUrl: '' });
      router.push(`/live/${res.data.liveKitRoomName}?isHost=true&roomId=${res.data.id}`);
    } catch (e) {
      console.log('Failed to create room', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Decorative Background Blur Elements */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Streams</Text>
          <Text style={styles.subtitle}>Discover people around the world</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateRoom} activeOpacity={0.8}>
          <LinearGradient colors={['#FF6B8A', '#FF476B']} style={styles.createButtonGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
            <Video color="#FFF" size={18} fill="#FFF" />
            <Text style={styles.createButtonText}>Go Live</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LinearGradient colors={['rgba(255,107,138,0.1)', 'transparent']} style={styles.emptyIconBg}>
              <Sparkles size={48} color={Colors.primary} strokeWidth={1.5} />
            </LinearGradient>
            <Text style={styles.emptyText}>No live streams right now</Text>
            <Text style={styles.emptySubText}>Be the first to share your moments!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreateRoom}>
              <Text style={styles.emptyCreateBtnText}>Start Streaming</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.roomCard, Platform.OS === 'web' ? { boxShadow: '0px 10px 30px rgba(0,0,0,0.15)' } as any : null]}
            activeOpacity={0.85}
            onPress={() => router.push(`/live/${item.liveKitRoomName}`)}
          >
            <Image 
              source={{ uri: item.coverImageUrl || item.hostImageUrl || FALLBACK_IMAGE }} 
              style={styles.coverImage} 
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
              style={styles.gradient}
            >
              <View style={styles.topBadges}>
                <View style={styles.liveBadge}>
                  <View style={styles.dot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
                <View style={styles.viewersBadge}>
                  <Users color="#FFF" size={12} />
                  <Text style={styles.viewersText}>{item.viewersCount}</Text>
                </View>
              </View>
              
              <View style={styles.bottomInfo}>
                <View style={styles.playIconWrap}>
                  <Play size={12} color="#FFF" fill="#FFF" />
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomTitle} numberOfLines={1}>{item.title || 'Live Stream'}</Text>
                  <Text style={styles.hostName} numberOfLines={1}>{item.hostName || 'User'}</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' }, // Dark premium background
  bgBlob1: {
    position: 'absolute', top: -100, right: -50, width: 300, height: 300,
    borderRadius: 150, backgroundColor: 'rgba(255, 107, 138, 0.15)',
    filter: Platform.OS === 'web' ? 'blur(60px)' as any : undefined,
  },
  bgBlob2: {
    position: 'absolute', top: 200, left: -100, width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(56, 189, 248, 0.1)',
    filter: Platform.OS === 'web' ? 'blur(60px)' as any : undefined,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 24,
    backgroundColor: 'transparent'
  },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFF' },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: '#94A3B8', marginTop: 4 },
  createButton: {
    borderRadius: 100,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 5,
  },
  createButtonGradient: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, gap: 8
  },
  createButtonText: { color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  roomCard: {
    width: cardWidth, height: cardWidth * 1.4, margin: 8,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  coverImage: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'space-between', padding: 12
  },
  topBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  viewersBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  viewersText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  bottomInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  roomInfo: { flex: 1, gap: 2 },
  roomTitle: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  hostName: { color: '#94A3B8', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#FFF' },
  emptySubText: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: '#94A3B8', marginTop: 8, marginBottom: 24 },
  emptyCreateBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  emptyCreateBtnText: { color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
});
