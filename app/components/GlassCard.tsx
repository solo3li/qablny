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
    Colors.surface;

  return (
    <View style={[
      styles.card, 
      { backgroundColor: bgColor },
      Platform.OS === 'web' ? { boxShadow: glowColor ? `0px 10px 24px ${glowColor}50` : Colors.shadowLight } as any : null,
      style
    ]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorderBright,
    overflow: 'hidden',
    padding: 16,
    ...Platform.select({
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      }
    }),
  },
});
