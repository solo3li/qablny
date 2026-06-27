import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl, Platform,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { GlassCard } from '../../components/GlassCard';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MessageCircle, Search, Users, Bell, Sparkles } from 'lucide-react-native';

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
    { key: 'chats', label: 'المحادثات', icon: MessageCircle, badge: totalUnread },
    { key: 'friends', label: 'الأصدقاء', icon: Users },
    { key: 'requests', label: 'الطلبات', icon: Bell, badge: requests.length },
  ];

  return (
    <LinearGradient colors={Colors.gradMain} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Sparkles color={Colors.primary} size={28} />
          <Text style={styles.title}>المجتمع</Text>
        </View>
        {totalUnread > 0 && activeTab === 'chats' && (
          <Text style={styles.unreadBadgeText}>{totalUnread} غير مقروءة</Text>
        )}
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <View style={styles.tabInner}>
                <Icon color={isActive ? Colors.primary : Colors.textMuted} size={18} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {tab.badge != null && tab.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      {activeTab !== 'requests' && (
        <View style={styles.searchBox}>
          <Search color={Colors.primary} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'chats' ? 'ابحث في المحادثات...' : 'ابحث في الأصدقاء...'}
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
          contentContainerStyle={{ paddingBottom: 100, gap: 12, paddingHorizontal: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListHeaderComponent={() => (
            filteredFriends.filter(f => f.isOnline).length > 0 ? (
              <View style={styles.onlineSection}>
                <Text style={styles.sectionLabel}>متصل الآن</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={filteredFriends.filter(f => f.isOnline)}
                  keyExtractor={f => 'online-' + f.id}
                  contentContainerStyle={{ gap: 16, paddingVertical: 8 }}
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
              <GlassCard style={styles.chatRow} glowColor={item.unread > 0 ? Colors.primary : undefined}>
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
                      voiceUsers[item.id] && { color: Colors.secondary, fontWeight: '700' },
                      typingUsers[item.id] && !voiceUsers[item.id] && { color: Colors.primary, fontWeight: '700' }
                    ]} numberOfLines={1}>
                      {voiceUsers[item.id] 
                        ? '🎙 يسجل مقطع صوتي...' 
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
              <MessageCircle color={Colors.primaryDim} size={64} />
              <Text style={styles.emptyText}>لا توجد محادثات</Text>
              <Text style={styles.emptyHint}>ابدأ بالتواصل لاكتشاف أشخاص رائعين.</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Friends ──────────────────────────────── */}
      {activeTab === 'friends' && (
        <FlatList
          data={mappedAllFriends}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100, paddingHorizontal: 16 }}
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
                <View style={styles.chatBtnWrap}>
                  <View style={styles.chatIconBtn}>
                    <MessageCircle color={Colors.bg} size={18} fill={Colors.primary} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Users color={Colors.primaryDim} size={64} />
              <Text style={styles.emptyText}>لا يوجد أصدقاء</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Requests ─────────────────────────────── */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 100, paddingHorizontal: 16 }}
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
              <Bell color={Colors.primaryDim} size={64} />
              <Text style={styles.emptyText}>لا توجد طلبات</Text>
            </View>
          )}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  unreadBadgeText: { fontSize: 13, color: Colors.secondary, fontWeight: '600' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: Colors.bgDeep,
    borderWidth: 1,
    borderColor: Colors.primaryDim,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20, marginHorizontal: 16, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },

  // Online strip
  onlineSection: { marginBottom: 16 },
  sectionLabel: { color: Colors.primary, fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },
  onlineItem: { alignItems: 'center', gap: 8 },
  onlineAvatarWrap: { position: 'relative' },
  onlineAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  onlineName: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },

  // Chat row
  chatRow: { flexDirection: 'row', padding: 14, gap: 14, alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  chatOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.surface },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chatName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  chatTime: { fontSize: 12, color: Colors.textMuted },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLast: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  unreadBadge: { backgroundColor: Colors.primary, borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadNum: { color: Colors.bgDeep, fontSize: 12, fontWeight: '800' },

  // Friend row
  friendRow: { flexDirection: 'row', padding: 14, gap: 14, alignItems: 'center' },
  chatBtnWrap: {},
  chatIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.glassBorderBright },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 20, fontWeight: '800', color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  emptyHint: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
});
