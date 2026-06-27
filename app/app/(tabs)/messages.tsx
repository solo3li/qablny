import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendStore } from '../../src/store/friendStore';
import { GlassCard } from '../../components/GlassCard';
import { FriendRequestCard } from '../../components/FriendRequestCard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MessageCircle, Search, Users, Bell } from 'lucide-react-native';

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
        <View>
          <Text style={styles.title}>المجتمع</Text>
          {totalUnread > 0 && activeTab === 'chats' && (
            <Text style={styles.unreadBadgeText}>{totalUnread} رسالة غير مقروءة</Text>
          )}
        </View>
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
              activeOpacity={0.7}
            >
              <View style={styles.tabInner}>
                <Icon color={isActive ? Colors.cyan : Colors.textMuted} size={16} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
                {tab.badge != null && tab.badge > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search (only for chats and friends) */}
      {activeTab !== 'requests' && (
        <GlassCard style={styles.searchBox}>
          <Search color={Colors.textMuted} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'chats' ? 'ابحث في المحادثات...' : 'ابحث في الأصدقاء...'}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </GlassCard>
      )}

      {/* ── TAB: Chats ────────────────────────────────── */}
      {activeTab === 'chats' && (
        <FlatList
          data={filteredFriends}
          keyExtractor={f => f.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />}
          ListHeaderComponent={() => (
            filteredFriends.filter(f => f.isOnline).length > 0 ? (
              <View style={styles.onlineSection}>
                <Text style={styles.sectionLabel}>متصل الآن 🟢</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={filteredFriends.filter(f => f.isOnline)}
                  keyExtractor={f => 'online-' + f.id}
                  contentContainerStyle={{ gap: 16, paddingHorizontal: 4 }}
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
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>كل المحادثات</Text>
              </View>
            ) : null
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)}>
              <GlassCard style={styles.chatRow} glowColor={item.unread > 0 ? Colors.cyan : undefined}>
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
                      item.unread > 0 && { color: Colors.text },
                      voiceUsers[item.id] && { color: Colors.pink, fontWeight: '700' },
                      typingUsers[item.id] && !voiceUsers[item.id] && { color: Colors.cyan, fontWeight: '700' }
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
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>لا توجد محادثات بعد</Text>
              <Text style={styles.emptyHint}>ابحث عن أصدقاء جدد من تاب الاستكشاف!</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Friends ──────────────────────────────── */}
      {activeTab === 'friends' && (
        <FlatList
          data={mappedAllFriends}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />}
          renderItem={({ item }: any) => (
            <TouchableOpacity onPress={() => router.push(`/chat/${item.id}` as any)}>
              <GlassCard style={styles.friendRow}>
                <View style={styles.avatarWrap}>
                  <Image source={{ uri: item.profileImageUrl || `https://i.pravatar.cc/100?u=${item.id}` }} style={styles.avatar} />
                  {item.isOnline && <View style={styles.chatOnlineDot} />}
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatLast}>{item.isOnline ? '🟢 متصل الآن' : `آخر ظهور: ${item.lastSeen || 'غير معروف'}`}</Text>
                </View>
                <View style={styles.chatBtnWrap}>
                  <View style={styles.chatIconBtn}>
                    <MessageCircle color={Colors.cyan} size={18} />
                  </View>
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>لا يوجد أصدقاء بعد</Text>
              <Text style={styles.emptyHint}>أرسل طلبات صداقة من صفحات المستخدمين!</Text>
            </View>
          )}
        />
      )}

      {/* ── TAB: Requests ─────────────────────────────── */}
      {activeTab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={r => r.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.cyan} />}
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
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>لا توجد طلبات صداقة</Text>
              <Text style={styles.emptyHint}>ستظهر هنا طلبات الصداقة الواردة</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.text },
  unreadBadgeText: { fontSize: 13, color: Colors.cyan, marginTop: 2 },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: Colors.cyanDim,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: Colors.cyan },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2,
    backgroundColor: Colors.cyan,
    borderRadius: 1,
  },
  tabBadge: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, marginHorizontal: 16 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },

  // Online strip
  onlineSection: { marginBottom: 8 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase', paddingHorizontal: 16 },
  onlineItem: { alignItems: 'center', gap: 6 },
  onlineAvatarWrap: { position: 'relative' },
  onlineAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: Colors.online },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  onlineName: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },

  // Chat row
  chatRow: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center', marginHorizontal: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  chatOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  chatTime: { fontSize: 11, color: Colors.textMuted },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLast: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  unreadBadge: { backgroundColor: Colors.cyan, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadNum: { color: Colors.bg, fontSize: 11, fontWeight: '800' },

  // Friend row
  friendRow: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'center', marginHorizontal: 16 },
  chatBtnWrap: {},
  chatIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyHint: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});
