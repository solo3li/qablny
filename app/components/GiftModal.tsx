import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../constants/Colors';
import { GlassCard } from './GlassCard';
import { X } from 'lucide-react-native';
import { axiosClient } from '../src/api/axiosClient';

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: any) => void;
}

export function GiftModal({ visible, onClose, onSendGift }: GiftModalProps) {
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
    if (visible && gifts.length === 0) {
      axiosClient.get('/gifts').then(res => setGifts(res.data)).catch(console.error);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <GlassCard style={styles.giftsSheet} borderRadius={24}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎁 أرسل هدية</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={Colors.textMuted} size={22} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.giftsGrid}>
              {gifts.map(g => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => onSendGift(g)}>
                  <Text style={styles.giftEmoji}>{g.emoji || '🎁'}</Text>
                  <Text style={styles.giftName}>{g.name}</Text>
                  <View style={styles.giftCost}>
                    <Text style={styles.giftCostText}>🪙 {g.coinCost}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </GlassCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  giftsSheet: { margin: 12, padding: 24, maxHeight: '60%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  giftItem: { width: '48%', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  giftEmoji: { fontSize: 34 },
  giftName: { color: Colors.textSecondary, fontSize: 14 },
  giftCost: { backgroundColor: '#332b00', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  giftCostText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },
});
