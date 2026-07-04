import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Video, Users } from 'lucide-react-native';
import { axiosClient as api } from '../../src/api/axiosClient';
import { LinearGradient } from 'expo-linear-gradient';

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
        <Text style={styles.title}>Live Streams</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateRoom}>
          <Video color="#FFF" size={20} />
          <Text style={styles.createButtonText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No live streams right now.</Text>
            <Text style={styles.emptySubText}>Be the first to go live!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.roomCard}
            onPress={() => router.push(`/live/${item.liveKitRoomName}`)}
          >
            <Image 
              source={{ uri: item.coverImageUrl || item.hostImageUrl || 'https://via.placeholder.com/300' }} 
              style={styles.coverImage} 
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradient}
            >
              <View style={styles.liveBadge}>
                <View style={styles.dot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <View style={styles.viewersBadge}>
                <Users color="#FFF" size={12} />
                <Text style={styles.viewersText}>{item.viewersCount}</Text>
              </View>
              
              <View style={styles.roomInfo}>
                <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.hostName} numberOfLines={1}>{item.hostName}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#FFF'
  },
  title: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  createButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, gap: 8
  },
  createButtonText: { color: '#FFF', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  listContainer: { padding: 16, gap: 16 },
  roomCard: {
    flex: 1, height: 220, margin: 8,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#EEE'
  },
  coverImage: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
    justifyContent: 'flex-end', padding: 12
  },
  liveBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveText: { color: '#FFF', fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  viewersBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4
  },
  viewersText: { color: '#FFF', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  roomInfo: { gap: 4 },
  roomTitle: { color: '#FFF', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  hostName: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  emptySubText: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textMuted, marginTop: 8 }
});
