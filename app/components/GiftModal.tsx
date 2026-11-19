import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { X, Gift, Coins, Crown, Rocket, Gem, Heart } from 'lucide-react-native';
import { axiosClient } from '../src/api/axiosClient';
import { useAuthStore } from '../src/store/authStore';

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: any) => void;
}

function getGiftIcon(name: string) {
  if (name?.includes('تاج')) return <Crown size={28} color="#F59E0B" />;
  if (name?.includes('صاروخ')) return <Rocket size={28} color="#3B82F6" />;
  if (name?.includes('ماس') || name?.includes('جوهر')) return <Gem size={28} color="#8B5CF6" />;
  if (name?.includes('قلب') || name?.includes('ورد')) return <Heart size={28} color="#FE3C72" />;
  return <Gift size={28} color={Colors.primary} />;
}

export function GiftModal({ visible, onClose, onSendGift }: GiftModalProps) {
  const { user } = useAuthStore();
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
    if (visible && gifts.length === 0) {
      axiosClient.get('/gifts').then(res => setGifts(res.data)).catch(console.error);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.giftsSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Gift size={20} color={Colors.primary} />
              <Text style={styles.modalTitle}>إرسال هدية</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.coinBadge}>
                <Coins size={15} color="#F59E0B" />
                <Text style={styles.coinCount}>{user?.coins?.toLocaleString() || '0'}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X color={Colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.giftsGrid}>
              {gifts.map(g => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => onSendGift(g)} activeOpacity={0.75}>
                  <View style={styles.giftIconWrap}>
                    {getGiftIcon(g.name)}
                  </View>
                  <Text style={styles.giftName}>{g.name}</Text>
                  <View style={styles.giftCost}>
                    <Coins size={12} color="#F59E0B" />
                    <Text style={styles.giftCostText}>{g.coinCost ?? g.coin_cost ?? 10}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(0, 0, 0, 0.6)' 
  },
  giftsSheet: { 
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    paddingHorizontal: 24, 
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: Colors.glassBorder,
    ...Platform.select({
      web: { boxShadow: '0px -8px 32px rgba(0, 0, 0, 0.12)' } as any,
      default: { elevation: 16 },
    }),
  },
  modalHandle: { 
    width: 44, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: '#E2E8F0', 
    alignSelf: 'center', 
    marginBottom: 16 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 18, 
    fontFamily: 'PlusJakartaSans_700Bold', 
    color: Colors.text 
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  coinCount: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#D97706',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    rowGap: 12 
  },
  giftItem: { 
    width: '48%', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 18, 
    padding: 14, 
    borderWidth: 1.5, 
    borderColor: '#EAECEF' 
  },
  giftIconWrap: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: '#F8F9FA', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 2 
  },
  giftName: { 
    color: Colors.textSecondary, 
    fontSize: 14, 
    fontFamily: 'PlusJakartaSans_600SemiBold' 
  },
  giftCost: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: 'rgba(245, 158, 11, 0.1)', 
    borderRadius: 10, 
    paddingHorizontal: 8, 
    paddingVertical: 4 
  },
  giftCostText: { 
    color: '#D97706', 
    fontSize: 12, 
    fontFamily: 'PlusJakartaSans_700Bold' 
  },
});
