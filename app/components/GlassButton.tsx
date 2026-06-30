import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    if (variant === 'primary' || variant === 'secondary') return 'transparent'; // Gradient handled below
    switch (variant) {
      case 'danger': return Colors.danger;
      case 'outline': return Colors.surface;
      default: return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.textSecondary;
    if (variant === 'outline') return Colors.text;
    return '#FFFFFF';
  };

  const getShadow = () => {
    if (disabled || variant === 'outline') return 'none';
    return Colors.shadowGlow;
  };

  const isGradient = !disabled && (variant === 'primary' || variant === 'secondary');
  const gradColors = variant === 'secondary' ? Colors.gradSecondary : Colors.gradPrimary;

  return (
    <TouchableOpacity 
      activeOpacity={0.7} 
      style={[
        styles.button, 
        { backgroundColor: getBgColor() },
        variant === 'outline' && { borderWidth: 2, borderColor: Colors.glassBorderBright },
        Platform.OS === 'web' && variant !== 'outline' && !disabled ? { boxShadow: getShadow() } as any : null,
        style
      ]} 
      disabled={disabled || loading}
      {...props}
    >
      {isGradient && (
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
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
    height: 54,
    borderRadius: 100, // Pill shape
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    ...Platform.select({
      default: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1, // Ensure content is above gradient
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.5,
  },
});
