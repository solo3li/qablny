import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator, Platform, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface Props extends TouchableOpacityProps {
  title?: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function GlassButton({ title, loading, variant = 'primary', icon, style, disabled, ...props }: Props) {
  
  const getBgColor = () => {
    if (disabled) return Colors.glassBorder;
    switch (variant) {
      case 'primary': return Colors.primary;
      case 'secondary': return Colors.secondary;
      case 'danger': return Colors.danger;
      case 'outline': return Colors.bgDeep;
      default: return Colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textMuted;
    if (variant === 'outline') return Colors.text;
    return '#FFFFFF';
  };

  const getClayShadow = () => {
    if (disabled || variant === 'outline') return 'none';
    if (variant === 'secondary') return Colors.clayShadowSecondary;
    return Colors.clayShadowPrimary;
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[
        styles.button, 
        { backgroundColor: getBgColor() },
        variant === 'outline' && { borderWidth: 2, borderColor: Colors.glassBorder },
        Platform.OS === 'web' && variant !== 'outline' && !disabled ? { boxShadow: getClayShadow() } as any : null,
        style
      ]} 
      disabled={disabled || loading}
      {...props}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={getTextColor()} />
        ) : (
          <>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            {title && <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 100, // Pill shape
    borderWidth: 1,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    // Native shadow fallback
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
