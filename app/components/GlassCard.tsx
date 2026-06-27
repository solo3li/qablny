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

  const shadowColor = glowColor || (tint === 'primary' ? Colors.primary : tint === 'secondary' ? Colors.secondary : '#D0C5B9');

  return (
    <View style={[styles.card, { backgroundColor: bgColor }, style]} {...props}>
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
    // Claymorphism shadow effect
    ...Platform.select({
      web: {
        boxShadow: `0px 12px 24px -8px rgba(210, 195, 180, 0.5), inset 0px 4px 10px rgba(255, 255, 255, 0.8)`,
      },
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
