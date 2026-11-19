import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Platform, RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { 
  ArrowRight, Search, UserPlus, Check, Clock, 
  MessageCircle, Users, X, MapPin
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { axiosClient } from '../src/api/axiosClient';

interface UserResult {
  id: string;
  name: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  age: number;
  gender: number;
  location?: string | null;
  isOnline: boolean;
  relationshipStatus: 'none' | 'friend' | 'pending_sent' | 'pending_received';
}

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const url = searchQuery.trim() 
        ? `/users/search?q=${encodeURIComponent(searchQuery.trim())}` 
        : '/users/search';
      const res = await axiosClient.get(url);
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to search users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(query);
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers(query);
    setRefreshing(false);
  };

  const handleSendRequest = async (targetId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [targetId]: true }));
      await axiosClient.post(`/friends/request/${targetId}`);
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, relationshipStatus: 'pending_sent' } : u));
    } catch (err) {
      console.error('Failed to send friend request', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const handleAcceptRequest = async (targetId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [targetId]: true }));
      await axiosClient.put(`/friends/accept/${targetId}`);
      // Optimistic update
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, relationshipStatus: 'friend' } : u));
    } catch (err) {
      console.error('Failed to accept friend request', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [targetId]: false }));
    }
  };

  const renderItem = ({ item }: { item: UserResult }) => {
    const isWorking = actionLoading[item.id];

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: item.profileImageUrl || `https://i.pravatar.cc/150?u=${item.id}` }}
              style={styles.avatar}
            />
            {item.isOnline && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.textWrap}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.ageBadge}>
                <Text style={styles.ageText}>{item.age} {item.gender === 2 ? '♀' : '♂'}</Text>
              </View>
            </View>

            {item.location ? (
              <View style={styles.locationRow}>
                <MapPin size={12} color={Colors.textMuted} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
            ) : item.bio ? (
              <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
            ) : (
              <Text style={styles.statusText}>{item.isOnline ? 'متصل الآن' : 'غير متصل'}</Text>
            )}
          </View>
        </View>

        <View style={styles.actionWrap}>
          {item.relationshipStatus === 'friend' ? (
            <TouchableOpacity 
              style={styles.chatBtn}
              onPress={() => router.push(`/chat/${item.id}` as any)}
            >
              <MessageCircle size={16} color="#FFFFFF" />
              <Text style={styles.chatBtnText}>محادثة</Text>
            </TouchableOpacity>
          ) : item.relationshipStatus === 'pending_sent' ? (
            <View style={styles.pendingBtn}>
              <Clock size={15} color={Colors.textMuted} />
              <Text style={styles.pendingBtnText}>تم الإرسال</Text>
            </View>
          ) : item.relationshipStatus === 'pending_received' ? (
            <TouchableOpacity 
              style={styles.acceptBtn}
              onPress={() => handleAcceptRequest(item.id)}
              disabled={isWorking}
            >
              {isWorking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>قبول</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => handleSendRequest(item.id)}
              disabled={isWorking}
            >
              {isWorking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>إضافة</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => {
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
              (document.activeElement as HTMLElement)?.blur?.();
            }
            router.back();
          }}
        >
          <ArrowRight color={Colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>إضافة أصدقاء</Text>
          <Text style={styles.headerSubtitle}>ابحث عن مستخدمين وتواصل معهم</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color={Colors.textMuted} size={20} />
          <TextInput
            style={styles.input}
            placeholder="ابحث بالاسم أو البريد..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={text => {
              setQuery(text);
              fetchUsers(text);
            }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); fetchUsers(''); }}>
              <X color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading && users.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري البحث عن أشخاص...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Users size={56} color={Colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
              <Text style={styles.emptySubtitle}>
                {query ? 'لم نتمكن من العثور على أي مستخدم يطابق بحثك' : 'لا يوجد مستخدمون حالياً'}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAECEF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    }),
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
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
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.text,
    outlineStyle: 'none',
  } as any,
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAECEF',
    ...Platform.select({
      web: { boxShadow: Colors.shadowLight } as any,
      default: { elevation: 1 },
    }),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgDeep,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.text,
  },
  ageBadge: {
    backgroundColor: '#EEF0F3',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ageText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textMuted,
  },
  userBio: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionWrap: {
    marginLeft: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
  },
  pendingBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textMuted,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.online,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  acceptBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
  },
  chatBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: Colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
