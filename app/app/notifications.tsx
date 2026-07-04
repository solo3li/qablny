import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, RefreshControl
} from 'react-native';
import { Colors } from '../constants/Colors';
import { router } from 'expo-router';
import { axiosClient } from '../src/api/axiosClient';
import { 
  ArrowRight, Bell, Heart, MessageCircle, Gift, Star, 
  Users, Shield, CheckCheck 
} from 'lucide-react-native';

type NotificationType = 'like' | 'message' | 'gift' | 'match' | 'system' | 'vip' | 'friend';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  imageUrl?: string;
  actionId?: string;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bg: string }> = {
  like:    { icon: <Heart size={20} color="#FF6B8A" fill="#FF6B8A" />, color: '#FF6B8A', bg: 'rgba(255,107,138,0.12)' },
  message: { icon: <MessageCircle size={20} color={Colors.secondary} />, color: Colors.secondary, bg: 'rgba(120,80,255,0.12)' },
  gift:    { icon: <Gift size={20} color="#FFB830" />, color: '#FFB830', bg: 'rgba(255,184,48,0.12)' },
  match:   { icon: <Heart size={20} color={Colors.primary} fill={Colors.primary} />, color: Colors.primary, bg: Colors.primaryDim },
  system:  { icon: <Shield size={20} color={Colors.textMuted} />, color: Colors.textMuted, bg: Colors.surface },
  vip:     { icon: <Star size={20} color="#FFB830" fill="#FFB830" />, color: '#FFB830', bg: 'rgba(255,184,48,0.12)' },
  friend:  { icon: <Users size={20} color={Colors.cyan} />, color: Colors.cyan, bg: Colors.cyanDim },
};

// Fallback demo notifications when there's no API
const demoNotifications: Notification[] = [
  {
    id: '1',
    type: 'match',
    title: 'تم العثور على مطابقة!',
    body: 'شخص ما في انتظارك للدردشة الآن',
    isRead: false,
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '2',
    type: 'gift',
    title: 'استلمت هدية 🎁',
    body: 'أرسل لك أحمد هدية "ماسة 💎" - 500 عملة',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'like',
    title: 'شخص ما أعجبه ملفك',
    body: 'أعجب أحد المستخدمين بصورتك الشخصية',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '4',
    type: 'message',
    title: 'رسالة جديدة',
    body: 'لديك رسالة في صندوق الوارد',
    isRead: true,
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '5',
    type: 'vip',
    title: 'مكافأة VIP أسبوعية 👑',
    body: 'تم إضافة 100 عملة مكافأة على اشتراكك الأسبوعي',
    isRead: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '6',
    type: 'system',
    title: 'تحديث سياسة الخصوصية',
    body: 'قمنا بتحديث شروط الاستخدام وسياسة الخصوصية. اقرأها الآن.',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await axiosClient.get('/notifications');
      if (res.data && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch {
      // Use demo data if API not available
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await axiosClient.post('/notifications/mark-all-read');
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markRead = async (id: string) => {
    try {
      await axiosClient.post(`/notifications/${id}/read`);
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowRight color={Colors.text} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>الإشعارات</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} إشعار غير مقروء</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <CheckCheck size={18} color={Colors.primary} />
            <Text style={styles.markAllText}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={64} color={Colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
            <Text style={styles.emptyText}>ستظهر هنا جميع إشعاراتك</Text>
          </View>
        ) : (
          notifications.map((notif, idx) => {
            const cfg = typeConfig[notif.type] || typeConfig.system;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notifCard,
                  !notif.isRead && styles.notifCardUnread,
                  Platform.OS === 'web' ? { boxShadow: Colors.shadowLight } as any : null,
                ]}
                activeOpacity={0.75}
                onPress={() => markRead(notif.id)}
              >
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  {cfg.icon}
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTopRow}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    {!notif.isRead && <View style={[styles.dot, { backgroundColor: cfg.color }]} />}
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(notif.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.glassBorderBright,
  },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  markAllBtn: {
    marginLeft: 'auto' as any,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryDim,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  markAllText: { fontSize: 13, color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },

  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  notifCardUnread: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: Colors.glassBorderBright,
  },
  iconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  notifTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notifBody: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 20 },
  notifTime: { fontSize: 12, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 6 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 12 },
  emptyTitle: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
