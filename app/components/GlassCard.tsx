import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors } from '../constants/Colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  borderRadius?: number;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, style, intensity = 25, borderRadius = 12, glowColor, ...props
}) => {
  return (
    <View style={[styles.wrapper, glowColor ? { borderColor: glowColor, shadowColor: glowColor, shadowOpacity: 0.2 } : null, { borderRadius }, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderColor: Colors.glassBorder,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
});
