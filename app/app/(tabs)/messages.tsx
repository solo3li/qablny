import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl, Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { router } from 'expo-router';
import { MessageSquare, Search, Users, Bell } from 'lucide-react-native';

type Tab = 'chats' | 'friends' | 'requests';

export default function MessagesScreen() {
  const { friends, fetchFriends, initSignalR, onlineUsers, typingUsers, voiceUsers } = useChatStore();
  const { user } = useAuthStore();
  const { requests, fetchRequests, acceptRequest, rejectRequest, fetchAllFriends, friends: allFriends } = useFriendStore();

  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const totalUnread = friends?.reduce((acc, f) => acc + (f.unread || 0), 0) || 0;

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

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    await acceptRequest(id);
    await fetchFriends();
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    await rejectRequest(id);
    setActionLoading(null);
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

  const mappedAllFriends = (allFriends || []).map((f: any) => {
    const realTime = onlineUsers[f.id];
    return {
      ...f,
      isOnline: realTime ? realTime.isOnline : f.isOnline,
      lastSeen: realTime ? realTime.lastSeen : f.lastSeen
    };
  }).filter((f: any) =>
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'chats', label: 'المحادثات', icon: MessageSquare, badge: totalUnread },
    { key: 'friends', label: 'الأصدقاء', icon: Users },
    { key: 'requests', label: 'الطلبات', icon: Bell, badge: requests.length },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ gap: 4 }}>
          <Text style={styles.title}>المجتمع</Text>
          {totalUnread > 0 && activeTab === 'chats' && (
            <Text style={styles.unreadBadgeText}>لديك {totalUnread} رسالة غير مقروءة</Text>
          )}
        </View>
      </View>

      {/* Tab Bar (Minimalist Line Tabs) */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {tab.badge != null && tab.badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      {activeTab !== 'requests' && (
        <View style={styles.searchBox}>
          <Search color={Colors.textMuted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'chats' ? 'البحث عن محادثة...' : 'البحث عن صديق...'}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {/* ── TAB: Chats ────────────────────────────────── */}
      {activeTab === 'chats' && (
        <FlatList
          data={filteredFriends}
          keyExtractor={f => f.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListHeaderComponent={() => (
            filteredFriends.filter(f => f.isOnline).length > 0 ? (
              <View style={styles.onlineSection}>
                <Text style={styles.sectionLabel}>متصلون حالياً</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={filteredFriends.filter(f => f.isOnline)}
                  keyExtractor={f => 'online-' + f.id}
                  contentContainerStyle={{ gap: 16, paddingHorizontal: 20, paddingVertical: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.onlineItem} onPress={() => router.push(`/chat/${item.id}` as any)}>
                      <View style={styles.onlineAvatarWrap}>
                        <Image source={{ uri: item.profileImageUrl || 'https://i.pravatar.cc/150' }} style={styles.onlineAvatar} />
                        <View style={styles.onlineDot} />
                      </View>
                      <Text style={styles.onlineName}>{item.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : null
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)} activeOpacity={0.6}>
              <View style={styles.chatRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.profileImageUrl || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
                  {item.isOnline && <View style={styles.chatOnlineDot} />}
                </View>
                <View style={styles.chatInfo}>
                  <View style={styles.chatTop}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatTime}>{item.lastSeen}</Text>
                  </View>
                  <View style={styles.chatBottom}>
                    <Text style={[
                      styles.chatLast, 
                      item.unread > 0 && { color: Colors.text, fontWeight: '500' },
                      voiceUsers[item.id] && { color: Colors.primary },
                      typingUsers[item.id] && !voiceUsers[item.id] && { color: Colors.primary }
                    ]} numberOfLines={1}>
                      {voiceUsers[item.id] 
                        ? '🎙 جاري تسجيل مقطع صوتي...' 
                        : typingUsers[item.id] 
                          ? '✍️ يكتب الآن...' 
                          : (item.lastMessage || 'بدأت المحادثة')}
                    </Text>
                    {item.unread > 0 && !typingUsers[item.id] && !voiceUsers[item.id] && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadNum}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <MessageSquare color={Colors.glassBorderBright} size={48} strokeWidth={1} />
              <Text style={styles.emptyText}>صندوق الوارد فارغ</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Friends ──────────────────────────────── */}
      {activeTab === 'friends' && (
        <FlatList
          data={mappedAllFriends}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }: any) => (
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)} activeOpacity={0.6}>
              <View style={styles.friendRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.profileImageUrl || `https://i.pravatar.cc/100?u=${item.id}` }} style={styles.avatar} />
                  {item.isOnline && <View style={styles.chatOnlineDot} />}
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatLast}>{item.isOnline ? 'متصل الآن' : `آخر ظهور: ${item.lastSeen || 'غير معروف'}`}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Users color={Colors.glassBorderBright} size={48} strokeWidth={1} />
              <Text style={styles.emptyText}>لا توجد اتصالات حالياً</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Requests ─────────────────────────────── */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ gap: 16, paddingBottom: 100, paddingHorizontal: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }) => (
            <FriendRequestCard
              request={item}
              onAccept={handleAccept}
              onReject={handleReject}
              loading={actionLoading === item.id}
            />
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Bell color={Colors.glassBorderBright} size={48} strokeWidth={1} />
              <Text style={styles.emptyText}>لا توجد طلبات معلقة</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, backgroundColor: Colors.bg },

  // Header
  header: { paddingHorizontal: 20, marginBottom: 24, paddingTop: 10 },
  title: { fontSize: 28, fontWeight: '300', color: Colors.text, fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light', letterSpacing: 1 },
  unreadBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabLabel: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: Colors.text, fontWeight: '600' },
  tabBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, marginHorizontal: 20, backgroundColor: Colors.bgDeep, borderRadius: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },

  // Online strip
  onlineSection: { marginBottom: 16 },
  sectionLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 12, paddingHorizontal: 20, textTransform: 'uppercase', letterSpacing: 1 },
  onlineItem: { alignItems: 'center', gap: 8 },
  onlineAvatarWrap: { position: 'relative' },
  onlineAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: Colors.glassBorder },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  onlineName: { color: Colors.textSecondary, fontSize: 13, fontWeight: '400' },

  // Chat row
  chatRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, gap: 16, alignItems: 'center', backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  chatOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  chatTime: { fontSize: 12, color: Colors.textMuted },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLast: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '300' },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadNum: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Friend row
  friendRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, gap: 16, alignItems: 'center', backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16, fontWeight: '400', color: Colors.textMuted, letterSpacing: 0.5 },
});
