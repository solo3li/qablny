import React from 'react';
import { Text, StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface GlassButtonProps extends TouchableOpacityProps {
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title, icon, variant = 'primary', size = 'md', style, ...props
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  
  const bgColors = isPrimary ? Colors.gradPrimary : 
                   isDanger ? [Colors.danger, '#C2185B'] : 
                   variant === 'gold' ? ['#FFD166', '#FF9F1C'] :
                   [Colors.surface, Colors.surface];
                   
  const textColor = isGhost ? Colors.textSecondary : Colors.text;

  const pad = { sm: { v: 10, h: 16 }, md: { v: 16, h: 24 }, lg: { v: 20, h: 32 } }[size];
  const fontSize = { sm: 14, md: 16, lg: 18 }[size];

  return (
    <TouchableOpacity activeOpacity={0.8} style={[styles.wrapper, style]} {...props}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.btn, { paddingVertical: pad.v, paddingHorizontal: pad.h }]}
      >
        <View style={styles.inner}>
          {icon && <View style={title ? styles.iconWithText : null}>{icon}</View>}
          {title && <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  btn: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: { marginRight: 10 },
  text: { fontWeight: '800', letterSpacing: 0.5 },
});
