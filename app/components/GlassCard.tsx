import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

interface Props extends ViewProps {
  glowColor?: string;
  tint?: 'light' | 'primary' | 'secondary';
}

export function GlassCard({ children, style, glowColor, tint = 'light', ...props }: Props) {
  const bgColor = 
    tint === 'primary' ? Colors.primaryDim : 
    tint === 'secondary' ? Colors.secondaryDim : 
    Colors.bgDeep;

  const getClayShadow = () => {
    if (tint === 'primary') return Colors.clayShadowPrimary;
    if (tint === 'secondary') return Colors.clayShadowSecondary;
    return Colors.clayShadowBase;
  };

  return (
    <View style={[
      styles.card, 
      { backgroundColor: bgColor },
      Platform.OS === 'web' ? { boxShadow: getClayShadow() } as any : null,
      style
    ]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 16,
    // Native shadow fallback
    ...Platform.select({
      default: {
        shadowColor: '#D0C5B9',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
      }
    }),
  },
});
