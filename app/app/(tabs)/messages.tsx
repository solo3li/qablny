import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl, Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { GlassCard } from '../../components/GlassCard';
import { router } from 'expo-router';
import { MessageSquare, Search, Users, Bell, HandHeart } from 'lucide-react-native';

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
          <Text style={styles.title}>أصدقائك</Text>
          {totalUnread > 0 && activeTab === 'chats' && (
            <Text style={styles.unreadBadgeText}>لديك {totalUnread} رسالة غير مقروءة</Text>
          )}
        </View>
      </View>

      {/* Tab Bar (Pill Tabs) */}
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
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, gap: 16 }}
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
                  contentContainerStyle={{ gap: 16, paddingVertical: 8, paddingHorizontal: 4 }}
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
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)} activeOpacity={0.8}>
              <GlassCard tint="light" style={styles.chatRow}>
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
                      item.unread > 0 && { color: Colors.text, fontWeight: '700' },
                      voiceUsers[item.id] && { color: Colors.primary },
                      typingUsers[item.id] && !voiceUsers[item.id] && { color: Colors.secondary }
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
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <HandHeart color={Colors.primary} size={64} strokeWidth={1.5} />
              <Text style={styles.emptyText}>لا توجد محادثات حتى الآن</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Friends ──────────────────────────────── */}
      {activeTab === 'friends' && (
        <FlatList
          data={mappedAllFriends}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20, gap: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          renderItem={({ item }: any) => (
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)} activeOpacity={0.8}>
              <GlassCard style={styles.friendRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.profileImageUrl || `https://i.pravatar.cc/100?u=${item.id}` }} style={styles.avatar} />
                  {item.isOnline && <View style={styles.chatOnlineDot} />}
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatLast}>{item.isOnline ? 'متصل الآن' : `آخر ظهور: ${item.lastSeen || 'غير معروف'}`}</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Users color={Colors.secondary} size={64} strokeWidth={1.5} />
              <Text style={styles.emptyText}>لا يوجد أصدقاء حالياً</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Requests ─────────────────────────────── */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ gap: 16, paddingBottom: 120, paddingHorizontal: 20 }}
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
              <Bell color={Colors.cyan} size={64} strokeWidth={1.5} />
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
  header: { paddingHorizontal: 24, marginBottom: 20, paddingTop: 10 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 },
  unreadBadgeText: { fontSize: 13, color: Colors.primary, fontWeight: '800', marginTop: 4 },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: Colors.bgDeep,
    borderRadius: 100,
    padding: 6,
    ...Platform.select({
      web: { boxShadow: `0px 4px 12px rgba(210, 195, 180, 0.3)` },
      default: { shadowColor: '#D0C5B9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 100,
  },
  tabActive: {
    backgroundColor: Colors.secondaryDim,
  },
  tabLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '700' },
  tabLabelActive: { color: Colors.text, fontWeight: '800' },
  tabBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: Colors.bgDeep, fontSize: 11, fontWeight: '800' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24, marginHorizontal: 24, backgroundColor: Colors.bgDeep, borderRadius: 100, borderWidth: 1, borderColor: '#FFFFFF', ...Platform.select({
    web: { boxShadow: `0px 8px 16px -4px rgba(210, 195, 180, 0.3)` },
    default: { shadowColor: '#D0C5B9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 2 }
  })},
  searchInput: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },

  // Online strip
  onlineSection: { marginBottom: 8 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  onlineItem: { alignItems: 'center', gap: 8 },
  onlineAvatarWrap: { position: 'relative' },
  onlineAvatar: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: Colors.bgDeep },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.online, borderWidth: 3, borderColor: Colors.bgDeep },
  onlineName: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },

  // Chat row (using GlassCard inside FlatList, no need for inner padding here if Card provides it, but we can customize)
  chatRow: { flexDirection: 'row', gap: 16, alignItems: 'center', padding: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  chatOnlineDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.online, borderWidth: 3, borderColor: Colors.bgDeep },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chatName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  chatTime: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLast: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadNum: { color: Colors.bgDeep, fontSize: 12, fontWeight: '800' },

  // Friend row
  friendRow: { flexDirection: 'row', padding: 16, gap: 16, alignItems: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textMuted },
});
