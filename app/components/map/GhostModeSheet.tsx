import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import {
  Ghost,
  Globe,
  Users,
  Check,
  X,
  Shield,
  EyeOff,
} from 'lucide-react-native';
import { GhostMode } from './types';

interface GhostModeSheetProps {
  visible: boolean;
  currentMode: GhostMode;
  onSelectMode: (mode: GhostMode) => void;
  onClose: () => void;
}

export function GhostModeSheet({
  visible,
  currentMode,
  onSelectMode,
  onClose,
}: GhostModeSheetProps) {
  const options: {
    id: GhostMode;
    title: string;
    description: string;
    icon: any;
    color: string;
  }[] = [
    {
      id: 'public',
      title: 'مرئي للجميع (عام)',
      description: 'يمكن لجميع المستخدمين القريبين رؤية موقعك والستريك الخاص بك.',
      icon: Globe,
      color: '#10B981',
    },
    {
      id: 'friends',
      title: 'الأصدقاء فقط',
      description: 'فقط الأصدقاء المضافين يمكنهم رؤية موقعك وتفاصيلك على الخريطة.',
      icon: Users,
      color: '#38BDF8',
    },
    {
      id: 'ghost',
      title: 'وضع الشبح (مخفي)',
      description: 'لن يتمكن أي شخص من رؤية موقعك على الإطلاق. تصفح الخريطة بحرية وأمان.',
      icon: Ghost,
      color: '#A855F7',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheetCard}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleWrap}>
              <Ghost size={20} color="#A855F7" />
              <Text style={styles.sheetTitle}>إعدادات الخصوصية والخريطة</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetSub}>
            تحكم في من يستطيع رؤية موقعك وحالتك على خريطة سناب.
          </Text>

          {/* Options */}
          <View style={styles.optionsList}>
            {options.map((opt) => {
              const isSelected = currentMode === opt.id;
              const IconComp = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionItem,
                    isSelected && {
                      borderColor: opt.color,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelectMode(opt.id);
                    onClose();
                  }}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${opt.color}20` },
                    ]}
                  >
                    <IconComp size={22} color={opt.color} />
                  </View>

                  <View style={styles.optionTextWrap}>
                    <Text
                      style={[
                        styles.optionTitle,
                        isSelected && { color: opt.color },
                      ]}
                    >
                      {opt.title}
                    </Text>
                    <Text style={styles.optionDesc}>{opt.description}</Text>
                  </View>

                  {isSelected && (
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: opt.color },
                      ]}
                    >
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 22,
    ...Platform.select({
      web: { boxShadow: '0 16px 48px rgba(0,0,0,0.8)' } as any,
      default: { elevation: 12 },
    }),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 18,
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
