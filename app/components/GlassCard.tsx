import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors } from '../constants/Colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  borderRadius?: number;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, style, intensity = 25, borderRadius = 16, glowColor, ...props
}) => {
  return (
    <View style={[styles.wrapper, glowColor ? { borderColor: glowColor, borderWidth: 2 } : null, { borderRadius }, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    overflow: 'hidden',
    // Minimalist: No shadows, completely flat with subtle border
  },
});
