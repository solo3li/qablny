import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { router } from 'expo-router';
import { Search, Settings, MessageCirclePlus, MessageSquarePlus } from 'lucide-react-native';

export default function MessagesScreen() {
  const { friends, fetchFriends, initSignalR, onlineUsers, typingUsers, voiceUsers } = useChatStore();
  const { user } = useAuthStore();
  const { requests, fetchRequests, fetchAllFriends, friends: allFriends } = useFriendStore();

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats'|'requests'>('chats');

  React.useEffect(() => {
    if (user) {
      fetchFriends();
      initSignalR(user.id);
      fetchRequests();
      fetchAllFriends();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchRequests(), fetchAllFriends()]);
    setRefreshing(false);
  };

  const filteredFriends = (friends || []).map(f => {
    const realTime = onlineUsers[f.id];
    return {
      ...f,
      isOnline: realTime ? realTime.isOnline : f.isOnline,
      lastSeen: realTime ? realTime.lastSeen : f.lastSeen
    };
  }).filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>قابلنى</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Settings color={Colors.text} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <View style={{position: 'relative'}}>
              <MessageCirclePlus color={Colors.text} size={24} />
              {requests.length > 0 && <View style={styles.notificationDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Tabs Pill */}
      <View style={styles.searchPillOuter}>
        <View style={styles.searchInner}>
          <Search color={Colors.textMuted} size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.myChatsToggle}
          onPress={() => setActiveTab(activeTab === 'chats' ? 'requests' : 'chats')}
        >
          <Text style={styles.myChatsText}>{activeTab === 'chats' ? 'محادثاتي' : 'الطلبات'}</Text>
        </TouchableOpacity>
      </View>

      {/* New Crushes (Online users/Stories) */}
      {activeTab === 'chats' && filteredFriends.filter(f => f.isOnline).length > 0 && (
        <View style={styles.crushesSection}>
          <Text style={styles.sectionTitle}>متصلون الآن</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filteredFriends.filter(f => f.isOnline)}
            keyExtractor={f => 'online-' + f.id}
            contentContainerStyle={styles.crushesList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.crushItem} onPress={() => router.push(`/chat/${item.id}` as any)}>
                <LinearGradient
                  colors={Colors.gradPrimary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.crushRing}
                >
                  <View style={styles.crushAvatarWrap}>
                    <Image source={{ uri: item.profileImageUrl || 'https://i.pravatar.cc/150' }} style={styles.crushAvatar} />
                  </View>
                </LinearGradient>
                <Text style={styles.crushName} numberOfLines={1}>{item.name.split(' ')[0]} ✨</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Chat List */}
      {activeTab === 'chats' ? (
        <FlatList
          data={filteredFriends}
          keyExtractor={f => f.id}
          contentContainerStyle={styles.chatListContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.chatRow} onPress={() => router.push(`/chat/${item.id}` as any)} activeOpacity={0.7}>
              <View style={styles.chatAvatarContainer}>
                <Image source={{ uri: item.profileImageUrl || 'https://i.pravatar.cc/150' }} style={styles.chatAvatar} />
                {item.isOnline && <View style={styles.onlineStatusDot} />}
              </View>
              
              <View style={styles.chatDetails}>
                <View style={styles.chatTopRow}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    {item.isOnline && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>}
                  </View>
                  <Text style={styles.chatTime}>{item.lastSeen || 'الآن'}</Text>
                </View>
                
                <View style={styles.chatBottomRow}>
                  <Text style={[
                    styles.chatMessage,
                    item.unread > 0 && { color: Colors.text, fontFamily: 'PlusJakartaSans_700Bold' }
                  ]} numberOfLines={2}>
                    {voiceUsers[item.id] ? '🎙 جاري تسجيل مقطع صوتي...' : typingUsers[item.id] ? '✍️ يكتب الآن...' : (item.lastMessage || 'بدأت المحادثة')}
                  </Text>
                  
                  {item.unread > 0 && (
                    <View style={styles.unreadCircle}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={{alignItems: 'center', marginTop: 60}}>
              <Text style={{color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold'}}>لا توجد محادثات</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 24, gap: 16 }}
          renderItem={({ item }) => <FriendRequestCard request={item} onAccept={() => {}} onReject={() => {}} />}
          ListEmptyComponent={() => (
            <View style={{alignItems: 'center', marginTop: 60}}>
              <Text style={{color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold'}}>لا توجد طلبات معلقة</Text>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => router.push('/explore')}>
        <LinearGradient
          colors={Colors.gradPrimary}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MessageSquarePlus color="#FFFFFF" size={24} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, paddingTop: 10 },
  logoText: { fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.primary, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 16 },
  iconBtn: { padding: 4 },
  notificationDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, borderWidth: 2, borderColor: Colors.bg },

  searchPillOuter: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDeep, borderRadius: 100, marginHorizontal: 24, padding: 4, paddingLeft: 16, marginBottom: 24 },
  searchInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', paddingVertical: 10, outlineStyle: 'none' } as any,
  myChatsToggle: { backgroundColor: Colors.surface, borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, ...Platform.select({ web: { boxShadow: Colors.shadowLight } as any, default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 } }) },
  myChatsText: { color: Colors.text, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 14 },

  crushesSection: { marginBottom: 10 },
  sectionTitle: { paddingHorizontal: 24, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, marginBottom: 12 },
  crushesList: { paddingHorizontal: 20, gap: 16 },
  crushItem: { alignItems: 'center', width: 72 },
  crushRing: { width: 68, height: 68, borderRadius: 34, padding: 3, justifyContent: 'center', alignItems: 'center' },
  crushAvatarWrap: { width: '100%', height: '100%', borderRadius: 34, backgroundColor: Colors.bg, padding: 2 },
  crushAvatar: { width: '100%', height: '100%', borderRadius: 34 },
  crushName: { marginTop: 6, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },

  chatListContent: { paddingHorizontal: 24, paddingBottom: 120 },
  separator: { height: 1, backgroundColor: Colors.bgDeep, marginVertical: 4 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  chatAvatarContainer: { position: 'relative' },
  chatAvatar: { width: 56, height: 56, borderRadius: 28 },
  onlineStatusDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  activeBadge: { backgroundColor: '#E8F8F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: Colors.online, fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  chatTime: { fontSize: 12, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  chatMessage: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
  unreadCircle: { backgroundColor: Colors.secondary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginTop: 2 },
  unreadText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' },

  fab: { position: 'absolute', bottom: 100, right: 24, ...Platform.select({ web: { boxShadow: Colors.shadowGlow } as any, default: { elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12 } }) },
  fabGradient: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
});
