import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mic,
  Headphones,
  Plus,
  Lock,
  Radio,
  X,
  Search,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { Colors } from '../../constants/Colors';
import { axiosClient } from '../../src/api/axiosClient';
import { useAuthStore } from '../../src/store/authStore';
import { useVoiceRoomStore } from '../../src/store/voiceRoomStore';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'الكل' },
  { id: 'chat', label: 'سوالف وفرفشة' },
  { id: 'karaoke', label: 'كاريوكي وغناء' },
  { id: 'competitions', label: 'مسابقات' },
  { id: 'games', label: 'ألعاب' },
];

function MiniEqualizer() {
  const bar1 = useRef(new Animated.Value(4)).current;
  const bar2 = useRef(new Animated.Value(12)).current;
  const bar3 = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const loopAnim = (val: Animated.Value, minH: number, maxH: number, dur: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: maxH, duration: dur, useNativeDriver: false }),
          Animated.timing(val, { toValue: minH, duration: dur, useNativeDriver: false }),
        ])
      );
    };
    const a1 = loopAnim(bar1, 3, 14, 380);
    const a2 = loopAnim(bar2, 5, 18, 300);
    const a3 = loopAnim(bar3, 3, 13, 440);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <View style={styles.miniEqContainer}>
      <Animated.View style={[styles.miniEqBar, { height: bar1 }]} />
      <Animated.View style={[styles.miniEqBar, { height: bar2 }]} />
      <Animated.View style={[styles.miniEqBar, { height: bar3 }]} />
    </View>
  );
}

export default function VoiceRoomsLobbyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { currentRoom, setMinimized } = useVoiceRoomStore();

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create room modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('chat');
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchRooms = async (cat?: string) => {
    try {
      const activeCat = cat !== undefined ? cat : selectedCategory;
      const url = activeCat && activeCat !== 'all' ? `/rooms?category=${activeCat}` : '/rooms';
      const res = await axiosClient.get(url);
      setRooms(res.data);
    } catch (e) {
      console.warn('Failed to fetch voice rooms', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedCategory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
    setRefreshing(false);
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setLoading(true);
  };

  const handleEnterRoom = (room: any) => {
    // If this room is already running in background, simply maximize
    if (currentRoom && currentRoom.id === room.id) {
      setMinimized(false);
    }
    router.push(`/room/${room.id}` as any);
  };

  const handleCreateRoom = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await axiosClient.post('/rooms', {
        title: newTitle.trim(),
        category: newCategory,
        password: isPasswordProtected && newPassword ? newPassword : null,
      });

      setIsModalVisible(false);
      setNewTitle('');
      setNewPassword('');
      setIsPasswordProtected(false);

      router.push(`/room/${res.data.id}` as any);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'فشل إنشاء الغرفة الصوتية');
    } finally {
      setIsCreating(false);
    }
  };

  const getCategoryLabel = (catId: string) => {
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? found.label : 'سوالف وفرفشة';
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle}>الغرف الصوتية</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveBadgeDot} />
              <Text style={styles.liveBadgeText}>حي</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>استمع وشارك وتحدث في مساحات حية</Text>
        </View>

        {/* Create Room Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={Colors.gradPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createBtnGradient}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.createBtnText}>إنشاء غرفة</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Categories Horizontal Bar */}
      <View style={styles.categoriesWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleSelectCategory(cat.id)}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Room Grid / List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري تحميل الغرف الصوتية...</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          numColumns={width > 700 ? 2 : 1}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Radio size={42} color={Colors.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد غرف نشطة حالياً</Text>
              <Text style={styles.emptySubtitle}>
                كن أول من يفتح مساحة صوتية ويدعو الأصدقاء للحديث والتسلية!
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setIsModalVisible(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={Colors.gradPrimary}
                  style={styles.emptyCreateGradient}
                >
                  <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={styles.emptyCreateText}>إنشاء غرفة الآن</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              item.hostName || 'Host'
            )}&background=FE3C72&color=fff&size=200`;

            return (
              <TouchableOpacity
                style={[
                  styles.roomCard,
                  Platform.OS === 'web'
                    ? ({
                        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      } as any)
                    : null,
                ]}
                onPress={() => handleEnterRoom(item)}
                activeOpacity={0.88}
              >
                {/* Card Top: Host Avatar + Equalizer + Category */}
                <View style={styles.cardHeader}>
                  <View style={styles.hostAvatarGroup}>
                    <Image
                      source={{ uri: item.hostAvatar || fallbackAvatar }}
                      style={styles.hostAvatar}
                    />
                    <View style={styles.hostLiveRing} />
                  </View>

                  <View style={styles.headerRight}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                    <MiniEqualizer />
                  </View>
                </View>

                {/* Card Body: Title + Host Name */}
                <View style={styles.cardBody}>
                  <View style={styles.titleLine}>
                    <Text style={styles.roomTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.hasPassword && (
                      <Lock size={14} color="#6C757D" strokeWidth={2.2} />
                    )}
                  </View>
                  <Text style={styles.hostNameText} numberOfLines={1}>
                    المضيف: {item.hostName}
                  </Text>
                </View>

                {/* Card Footer: Speakers count + Listeners count */}
                <View style={styles.cardFooter}>
                  <View style={styles.counterGroup}>
                    <Mic size={14} color={Colors.primary} strokeWidth={2.4} />
                    <Text style={styles.counterText}>
                      {item.speakersCount}/8 مايك
                    </Text>
                  </View>

                  <View style={styles.counterDivider} />

                  <View style={styles.counterGroup}>
                    <Headphones size={14} color="#6C757D" strokeWidth={2.2} />
                    <Text style={styles.counterText}>
                      {item.listenersCount} مستمع
                    </Text>
                  </View>

                  <View style={{ flex: 1 }} />

                  <View style={styles.joinAction}>
                    <Text style={styles.joinActionText}>انضمام</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Create Room Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              Platform.OS === 'web'
                ? ({
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.16)',
                  } as any)
                : null,
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>إنشاء غرفة صوتية</Text>
                <Text style={styles.modalSubtitle}>
                  اختر عنواناً جذاباً وابدأ الحديث مع المتابعين
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsModalVisible(false)}
              >
                <X size={20} color="#6C757D" strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>عنوان الغرفة</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: سهرة طرب ووناسة مع الأصدقاء..."
                placeholderTextColor="#9CA3AF"
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={45}
                textAlign="right"
              />
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>التصنيف</Text>
              <View style={styles.modalCategoriesGrid}>
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => {
                  const isSelected = newCategory === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.modalCatChip,
                        isSelected && styles.modalCatChipActive,
                      ]}
                      onPress={() => setNewCategory(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.modalCatChipText,
                          isSelected && styles.modalCatChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Password Protection (Optional) */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsPasswordProtected(!isPasswordProtected)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    isPasswordProtected && styles.checkboxActive,
                  ]}
                >
                  {isPasswordProtected && (
                    <Lock size={12} color="#FFFFFF" strokeWidth={2.6} />
                  )}
                </View>
                <Text style={styles.toggleLabel}>غرفة خاصة محمية بكلمة مرور</Text>
              </TouchableOpacity>

              {isPasswordProtected && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="أدخل كلمة المرور (أرقام أو حروف)..."
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  maxLength={16}
                  textAlign="right"
                />
              )}
            </View>

            {/* Submit Action */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!newTitle.trim() || isCreating) && styles.submitBtnDisabled,
              ]}
              disabled={!newTitle.trim() || isCreating}
              onPress={handleCreateRoom}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={
                  newTitle.trim() && !isCreating
                    ? Colors.gradPrimary
                    : ['#D1D5DB', '#9CA3AF']
                }
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Mic size={18} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.submitText}>بدء الغرفة الصوتية</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1D1E',
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
    fontWeight: '500',
  },
  createBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  categoriesWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  categoriesContent: {
    paddingHorizontal: 18,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F5F7',
  },
  categoryPillActive: {
    backgroundColor: Colors.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C757D',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  roomCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  hostAvatarGroup: {
    position: 'relative',
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F3F5',
  },
  hostLiveRing: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#F4F5F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C757D',
  },
  miniEqContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 18,
    gap: 2.5,
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniEqBar: {
    width: 2.5,
    backgroundColor: Colors.primary,
    borderRadius: 1.5,
  },
  cardBody: {
    marginBottom: 14,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1D1E',
    flex: 1,
    textAlign: 'left',
  },
  hostNameText: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
    textAlign: 'left',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F9FA',
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  counterDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#EAECEF',
    marginHorizontal: 10,
  },
  counterText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  joinAction: {
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  joinActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(254, 60, 114, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D1E',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyCreateBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  emptyCreateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  emptyCreateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1D1E',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1D1E',
    marginBottom: 8,
    textAlign: 'right',
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EAECEF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1D1E',
  },
  modalCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
  },
  modalCatChipActive: {
    backgroundColor: Colors.primary,
  },
  modalCatChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
  },
  modalCatChipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  submitBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
