import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl, Platform, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { router } from 'expo-router';
import { Search, MessageSquarePlus, MessageSquareDashed, Users, X, Flame, Hourglass, Compass, MapPin } from 'lucide-react-native';

export default function MessagesScreen() {
  const { friends, fetchFriends, initSignalR, onlineUsers, typingUsers, voiceUsers } = useChatStore();
  const { user } = useAuthStore();
  const { requests, fetchRequests, fetchAllFriends, acceptRequest, rejectRequest, friends: allFriends } = useFriendStore();

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
        <Text style={styles.logoText}>الرسائل</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.mapBadgeBtn} 
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="خريطة سناب"
            onPress={() => {
              Keyboard.dismiss();
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                (document.activeElement as HTMLElement)?.blur?.();
              }
              router.push('/map');
            }}
          >
            <Compass size={16} color={Colors.primary} />
            <Text style={styles.mapBadgeText}>القريبين</Text>
            <View style={styles.mapLivePulse} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerIconBtn} 
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="محادثة جديدة واستكشاف"
            onPress={() => {
              Keyboard.dismiss();
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                (document.activeElement as HTMLElement)?.blur?.();
              }
              router.push('/explore');
            }}
          >
            <View style={{position: 'relative'}}>
              <MessageSquarePlus size={20} color={Colors.primary} />
              {(requests?.length ?? 0) > 0 && <View style={styles.notificationDot} />}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="ابحث في المحادثات..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X color={Colors.textMuted} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modern Segmented Control */}
      <View style={styles.tabSegments}>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'chats' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('chats')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'chats' && styles.segmentTextActive]}>محادثاتي</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentBtn, activeTab === 'requests' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeTab === 'requests' && styles.segmentTextActive]}>
            طلبات الصداقة {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
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
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                    {(item.streakCount ?? 0) > 0 && !item.isStreakBroken && (
                      <View style={[styles.streakBadge, item.isStreakExpiringSoon && styles.streakBadgeExpiring]}>
                        <Flame size={12} color="#FFFFFF" fill="#FFFFFF" />
                        <Text style={styles.streakBadgeText}>{item.streakCount}</Text>
                        {item.isStreakExpiringSoon && <Hourglass size={11} color="#FFFFFF" strokeWidth={2.4} />}
                      </View>
                    )}
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
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MessageSquareDashed size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {search.length > 0 ? 'لا توجد نتائج' : 'لا توجد محادثات بعد'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.length > 0
                  ? 'لم نعثر على أي محادثة تطابق بحثك'
                  : 'ابحث عن أصدقاء جدد وتواصل معهم في أي وقت'}
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton} 
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="استكشف وتواصل الآن"
                onPress={() => {
                  Keyboard.dismiss();
                  if (Platform.OS === 'web' && typeof document !== 'undefined') {
                    (document.activeElement as HTMLElement)?.blur?.();
                  }
                  router.push('/explore');
                }}
              >
                <Users size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>استكشف وتواصل الآن</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ padding: 24, paddingBottom: 120, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <FriendRequestCard 
              request={item} 
              onAccept={async (id) => {
                await acceptRequest(id);
                fetchFriends();
              }} 
              onReject={(id) => rejectRequest(id)} 
            />
          )}
          ListEmptyComponent={() => (
            <View style={{alignItems: 'center', marginTop: 60}}>
              <Text style={{color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_600SemiBold'}}>لا توجد طلبات معلقة</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: Platform.OS === 'ios' ? 54 : 32, 
    paddingBottom: 16,
  },
  logoText: { fontSize: 28, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mapBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
    }),
  },
  mapBadgeText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  mapLivePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerIconBtn: { 
    width: 42, 
    height: 42, 
    borderRadius: 21, 
    backgroundColor: '#FFFFFF', 
    borderWidth: 0.5, 
    borderColor: 'rgba(0,0,0,0.06)', 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
    }),
  },
  notificationDot: { 
    position: 'absolute', 
    top: -2, 
    right: -2, 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: Colors.primary, 
    borderWidth: 1.5, 
    borderColor: '#FFFFFF',
    zIndex: 10,
    elevation: 3,
  },

  searchContainer: { paddingHorizontal: 24, marginBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EAECEF',
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 1 },
    }),
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, fontFamily: 'PlusJakartaSans_600SemiBold', outlineStyle: 'none' } as any,

  tabSegments: {
    flexDirection: 'row',
    backgroundColor: '#EEF0F3',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
    }),
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  segmentTextActive: {
    color: Colors.text,
    fontFamily: 'PlusJakartaSans_700Bold',
  },

  crushesSection: { marginBottom: 12 },
  sectionTitle: { paddingHorizontal: 24, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text, marginBottom: 12 },
  crushesList: { paddingHorizontal: 20, gap: 16 },
  crushItem: { alignItems: 'center', width: 72 },
  crushRing: { width: 68, height: 68, borderRadius: 34, padding: 3, justifyContent: 'center', alignItems: 'center' },
  crushAvatarWrap: { width: '100%', height: '100%', borderRadius: 34, backgroundColor: Colors.bg, padding: 2 },
  crushAvatar: { width: '100%', height: '100%', borderRadius: 34 },
  crushName: { marginTop: 6, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },

  chatListContent: { paddingHorizontal: 24, paddingBottom: 120 },
  separator: { height: 1, backgroundColor: '#F1F3F5', marginVertical: 4 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  chatAvatarContainer: { position: 'relative' },
  chatAvatar: { width: 56, height: 56, borderRadius: 28 },
  onlineStatusDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: '#FFFFFF' },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F97316', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  streakBadgeExpiring: { backgroundColor: '#E11D48' },
  streakBadgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  activeBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: Colors.online, fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  chatTime: { fontSize: 12, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  chatMessage: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
  unreadCircle: { backgroundColor: Colors.primary, minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginTop: 2 },
  unreadText: { color: '#FFF', fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold' },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)' } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    }),
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 24,
    minWidth: 200,
    gap: 8,
    ...Platform.select({
      web: { boxShadow: Colors.shadowGlow } as any,
      default: { elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
    }),
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
