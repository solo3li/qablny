import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  borderRadius?: number;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children, style, intensity = 25, borderRadius = 20, glowColor, ...props
}) => {
  return (
    <View style={[styles.container, { borderRadius }, style]} {...props}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[
        styles.innerBorder,
        { borderRadius },
        glowColor ? { borderColor: glowColor } : null
      ]} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.glassBg,
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
});
