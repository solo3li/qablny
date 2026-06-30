import React from 'react';
import { StyleSheet, ViewProps, Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';

interface Props extends ViewProps {
  glowColor?: string;
  tint?: 'light' | 'primary' | 'secondary';
  intensity?: number;
}

export function GlassCard({ children, style, glowColor, tint = 'light', intensity = 20, ...props }: Props) {
  const bgColor = 
    tint === 'primary' ? Colors.primaryDim : 
    tint === 'secondary' ? Colors.secondaryDim : 
    Colors.glassBg;

  const CardComponent = Platform.OS === 'web' ? View : BlurView;

  return (
    <CardComponent 
      intensity={intensity}
      tint={tint === 'light' ? 'light' : 'default'}
      style={[
        styles.card, 
        { backgroundColor: bgColor },
        Platform.OS === 'web' ? { 
          backdropFilter: `blur(${intensity}px)`,
          boxShadow: glowColor ? `0px 10px 24px ${glowColor}50` : Colors.shadowLight 
        } as any : null,
        style
      ]} {...props}>
      {children}
    </CardComponent>
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
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 4,
      }
    }),
  },
});
