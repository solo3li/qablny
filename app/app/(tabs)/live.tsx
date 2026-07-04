import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Dimensions, Platform } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Video, Users, Sparkles, Play } from 'lucide-react-native';
import { axiosClient as api } from '../../src/api/axiosClient';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Live Streams</Text>
          <Text style={styles.subtitle}>Discover people around the world</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateRoom} activeOpacity={0.8}>
          <LinearGradient colors={Colors.gradPrimary} style={styles.createButtonGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
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
            <LinearGradient colors={['rgba(255,95,61,0.1)', 'transparent']} style={styles.emptyIconBg}>
              <Sparkles size={48} color={Colors.primary} strokeWidth={1.5} />
            </LinearGradient>
            <Text style={styles.emptyText}>No live streams right now</Text>
            <Text style={styles.emptySubText}>Be the first to share your moments!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreateRoom}>
              <Text style={styles.emptyCreateBtnText}>Start Streaming</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const fallbackImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.hostName || 'L')}&background=random&color=fff&size=300`;
          return (
            <TouchableOpacity 
              style={[styles.roomCard, Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null]}
              activeOpacity={0.85}
              onPress={() => router.push(`/live/${item.liveKitRoomName}`)}
            >
              <Image 
                source={{ uri: item.coverImageUrl || item.hostImageUrl || fallbackImage }} 
                style={styles.coverImage} 
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)']}
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
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 24,
  },
  title: { fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textMuted, marginTop: 4 },
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
    backgroundColor: Colors.surfaceHover,
    borderWidth: 1, borderColor: Colors.glassBorder
  },
  coverImage: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'space-between', padding: 12
  },
  topBadges: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
    shadowColor: Colors.primary, shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  viewersBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  viewersText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  bottomInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  roomInfo: { flex: 1, gap: 2 },
  roomTitle: { color: '#FFF', fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },
  hostName: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 120 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  emptySubText: { fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textMuted, marginTop: 8, marginBottom: 24 },
  emptyCreateBtn: { backgroundColor: Colors.surface, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: Colors.glassBorder, shadowColor: Colors.text, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  emptyCreateBtnText: { color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
});
