import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { axiosClient } from '../../src/api/axiosClient';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { router } from 'expo-router';
import { Ticket, Plus, ChevronLeft } from 'lucide-react-native';

export default function SupportTicketsScreen() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axiosClient.get('/support/tickets');
      setTickets(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderTicket = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/support/${item.id}`)}>
      <GlassCard style={styles.ticketCard} tint="light">
        <View style={styles.ticketLeft}>
          <Ticket color={Colors.primary} size={24} />
          <View>
            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.date}>{new Date(item.updatedAt).toLocaleDateString()}</Text>
          </View>
        </View>
        <View style={styles.ticketRight}>
          <View style={[styles.statusBadge, item.status === 'Open' ? styles.statusOpen : styles.statusClosed]}>
            <Text style={styles.statusText}>{item.status === 'Open' ? 'مفتوح' : 'مغلق'}</Text>
          </View>
          <ChevronLeft color={Colors.textMuted} size={18} />
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>مركز المساعدة</Text>
        <Text style={styles.subtitle}>تذاكر الدعم الفني الخاصة بك</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={t => t.id}
          renderItem={renderTicket}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>لا توجد تذاكر حالياً.</Text>
          }
        />
      )}

      <View style={styles.fabContainer}>
        <GlassButton
          title="تذكرة جديدة"
          variant="primary"
          icon={<Plus color="#fff" size={20} />}
          onPress={() => router.push('/support/create' as any)}
          style={styles.fab}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: 24, paddingTop: 60, paddingBottom: 10 },
  title: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', color: Colors.text },
  subtitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textSecondary, marginTop: 4 },
  list: { padding: 24, paddingBottom: 100, gap: 12 },
  ticketCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  ticketLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subject: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  date: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: Colors.textMuted, marginTop: 4 },
  ticketRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusOpen: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusClosed: { backgroundColor: 'rgba(107, 114, 128, 0.2)' },
  statusText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: Colors.text },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontFamily: 'PlusJakartaSans_500Medium' },
  fabContainer: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  fab: { height: 50 }
});
