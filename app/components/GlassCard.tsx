import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors } from '../constants/Colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  borderRadius?: number;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, style, intensity = 25, borderRadius = 24, glowColor, ...props
}) => {
  return (
    <View style={[styles.wrapper, glowColor ? { shadowColor: glowColor, shadowOpacity: 0.3 } : null, style]} {...props}>
      <View style={[styles.container, { borderRadius }, glowColor ? { borderColor: glowColor, borderWidth: 1 } : null]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});
