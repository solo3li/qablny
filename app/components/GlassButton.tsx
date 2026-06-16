import React from 'react';
import { Text, StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';

interface GlassButtonProps extends TouchableOpacityProps {
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title, icon, variant = 'primary', size = 'md', style, ...props
}) => {
  const colors = {
    primary: { bg: Colors.cyanDim, border: Colors.glassBorderBright, text: Colors.cyan },
    danger: { bg: Colors.dangerDim, border: Colors.danger + '55', text: Colors.danger },
    ghost: { bg: Colors.surface, border: Colors.glassBorder, text: Colors.textSecondary },
    gold: { bg: Colors.goldDim, border: Colors.gold + '55', text: Colors.gold },
  }[variant];

  const pad = { sm: { v: 8, h: 14 }, md: { v: 14, h: 22 }, lg: { v: 18, h: 28 } }[size];
  const fontSize = { sm: 13, md: 15, lg: 17 }[size];

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: colors.bg, borderColor: colors.border, paddingVertical: pad.v, paddingHorizontal: pad.h }, style]}
      activeOpacity={0.7}
      {...props}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.inner}>
        {icon && <View style={title ? styles.iconWithText : null}>{icon}</View>}
        {title && <Text style={[styles.text, { color: colors.text, fontSize }]}>{title}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: { marginRight: 8 },
  text: { fontWeight: '700', letterSpacing: 0.3 },
});
