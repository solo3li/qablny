import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../store/useAppStore';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { LinearGradient } from 'expo-linear-gradient';
import { SkipForward, Flag, Gift, MessageCircle, Heart, Star, X } from 'lucide-react-native';

export default function MatchScreen() {
  const { currentMatch, nextMatch, gifts, updateCoins } = useAppStore();
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [sentGift, setSentGift] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);

  const handleSendGift = (gift: typeof gifts[0]) => {
    updateCoins(-gift.cost);
    setSentGift(gift.emoji);
    setGiftsOpen(false);
    setTimeout(() => setSentGift(null), 2000);
  };

  const handleNext = () => {
    setLiked(false);
    nextMatch();
  };

  if (!currentMatch) return null;

  return (
    <View style={styles.container}>
      {/* Video Background (dummy) */}
      <Image source={{ uri: currentMatch.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(4,7,16,0.5)', 'rgba(4,7,16,0.95)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top bar: VIP badge + location */}
      <View style={styles.topBar}>
        <GlassCard style={styles.topLeft}>
          {currentMatch.isVip && (
            <View style={styles.vipBadge}>
              <Star size={12} color={Colors.gold} fill={Colors.gold} />
              <Text style={styles.vipText}>VIP</Text>
            </View>
          )}
          <Text style={styles.locationText}>📍 {currentMatch.location}</Text>
        </GlassCard>
        <GlassButton variant="danger" size="sm" icon={<Flag color={Colors.danger} size={16} />} title="إبلاغ" />
      </View>

      {/* Gift floating emoji */}
      {sentGift && (
        <View style={styles.giftFloat}>
          <Text style={styles.giftFloatEmoji}>{sentGift}</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={styles.bottom}>
        {/* Profile info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{currentMatch.name}, {currentMatch.age}</Text>
          <View style={styles.interests}>
            {currentMatch.interests.map(i => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestText}>{i}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.circleBtn, { borderColor: Colors.danger + '55', backgroundColor: Colors.dangerDim }]}
            onPress={handleNext}
          >
            <SkipForward color={Colors.danger} size={26} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainBtn, { borderColor: Colors.glassBorderBright, backgroundColor: Colors.cyanDim }]}
            onPress={handleNext}
          >
            <Text style={styles.mainBtnText}>التالي ⚡</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, { borderColor: liked ? Colors.pink + '55' : Colors.glassBorder, backgroundColor: liked ? Colors.pinkDim : Colors.surface }]}
            onPress={() => setLiked(!liked)}
          >
            <Heart color={liked ? Colors.pink : Colors.textSecondary} size={24} fill={liked ? Colors.pink : 'none'} />
          </TouchableOpacity>
        </View>

        {/* Secondary actions */}
        <View style={styles.secondary}>
          <GlassButton
            icon={<MessageCircle color={Colors.cyan} size={18} />}
            title="دردشة"
            variant="ghost"
            size="sm"
            style={{ flex: 1 }}
          />
          <GlassButton
            icon={<Gift color={Colors.gold} size={18} />}
            title="هدية"
            variant="gold"
            size="sm"
            onPress={() => setGiftsOpen(true)}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Gifts Modal */}
      <Modal visible={giftsOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.giftsSheet} borderRadius={24}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎁 أرسل هدية</Text>
              <TouchableOpacity onPress={() => setGiftsOpen(false)}>
                <X color={Colors.textMuted} size={22} />
              </TouchableOpacity>
            </View>
            <View style={styles.giftsGrid}>
              {gifts.map(g => (
                <TouchableOpacity key={g.id} style={styles.giftItem} onPress={() => handleSendGift(g)}>
                  <Text style={styles.giftEmoji}>{g.emoji}</Text>
                  <Text style={styles.giftName}>{g.name}</Text>
                  <View style={styles.giftCost}>
                    <Text style={styles.giftCostText}>🪙 {g.cost}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { position: 'absolute', top: 56, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8 },
  vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  vipText: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
  locationText: { color: Colors.text, fontSize: 13 },
  giftFloat: { position: 'absolute', top: '40%', alignSelf: 'center' },
  giftFloatEmoji: { fontSize: 80 },
  bottom: { position: 'absolute', bottom: 80, left: 16, right: 16, gap: 16 },
  userInfo: { gap: 10 },
  userName: { fontSize: 28, fontWeight: '800', color: Colors.text },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestTag: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.glassBorder },
  interestText: { color: Colors.textSecondary, fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  circleBtn: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 1, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mainBtnText: { color: Colors.cyan, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  secondary: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  giftsSheet: { margin: 12, padding: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.glassBorder, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  giftsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  giftItem: { width: '22%', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.glassBorder },
  giftEmoji: { fontSize: 34 },
  giftName: { color: Colors.textSecondary, fontSize: 12 },
  giftCost: { backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  giftCostText: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
});
