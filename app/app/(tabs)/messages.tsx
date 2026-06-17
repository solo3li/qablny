import React from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useChatStore } from '../../src/store/chatStore';
import { useAuthStore } from '../../src/store/authStore';
import { GlassCard } from '../../components/GlassCard';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { MessageCircle, Search } from 'lucide-react-native';
import { TextInput } from 'react-native';

  const { friends, fetchFriends, initSignalR } = useChatStore();
  const { user } = useAuthStore();
  const totalUnread = friends?.reduce((acc, f) => acc + (f.unread || 0), 0) || 0;

  React.useEffect(() => {
    if (user) {
      fetchFriends();
      initSignalR(user.id);
    }
  }, [user]);

  return (
    <LinearGradient colors={['#040710', '#070B14']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>الرسائل</Text>
          {totalUnread > 0 && <Text style={styles.unreadBadgeText}>{totalUnread} رسالة غير مقروءة</Text>}
        </View>
        <View style={[styles.iconBtn]}>
          <MessageCircle color={Colors.cyan} size={22} />
        </View>
      </View>

      {/* Search */}
      <GlassCard style={styles.searchBox}>
        <Search color={Colors.textMuted} size={18} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث في المحادثات..."
          placeholderTextColor={Colors.textMuted}
        />
      </GlassCard>

      {/* Online friends strip */}
      <View style={styles.onlineSection}>
        <Text style={styles.sectionLabel}>متصل الآن</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={friends?.filter(f => f.isOnline) || []}
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
      </View>

      {/* All conversations */}
      <Text style={styles.sectionLabel}>كل المحادثات</Text>
      <FlatList
        data={friends || []}
        keyExtractor={f => f.id}
        contentContainerStyle={{ gap: 10, paddingBottom: 100 }}
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
                  <Text style={styles.chatLast} numberOfLines={1}>{item.lastMessage || 'بدأت المحادثة'}</Text>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadNum}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.text },
  unreadBadgeText: { fontSize: 13, color: Colors.cyan, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cyanDim, borderWidth: 1, borderColor: Colors.glassBorderBright, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  onlineSection: { marginBottom: 16 },
  sectionLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  onlineItem: { alignItems: 'center', gap: 6 },
  onlineAvatarWrap: { position: 'relative' },
  onlineAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.online },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  onlineName: { color: Colors.textSecondary, fontSize: 12 },
  chatRow: { flexDirection: 'row', padding: 14, gap: 14, alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  chatOnlineDot: { position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 7, backgroundColor: Colors.online, borderWidth: 2, borderColor: Colors.bg },
  chatInfo: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  chatName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  chatTime: { fontSize: 12, color: Colors.textMuted },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatLast: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  unreadBadge: { backgroundColor: Colors.cyan, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadNum: { color: Colors.bg, fontSize: 11, fontWeight: '800' },
});
