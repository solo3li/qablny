import React from 'react';
import { Text, StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

interface GlassButtonProps extends TouchableOpacityProps {
  title?: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'danger' | 'ghost' | 'gold' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title, icon, variant = 'primary', size = 'md', style, ...props
}) => {
  const isPrimary = variant === 'primary' || variant === 'gold';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  
  const bgColors = isPrimary ? Colors.gradPrimary : 
                   isDanger ? ['#D32F2F', '#9A0007'] : 
                   isSecondary ? Colors.gradSecondary :
                   [Colors.surface, Colors.surface];
                   
  const textColor = isGhost ? Colors.primary : 
                    isPrimary || isSecondary || isDanger ? '#0A0F24' : Colors.text;

  const pad = { sm: { v: 10, h: 16 }, md: { v: 16, h: 24 }, lg: { v: 20, h: 32 } }[size];
  const fontSize = { sm: 14, md: 15, lg: 17 }[size];

  if (isGhost) {
    return (
      <TouchableOpacity activeOpacity={0.7} style={[styles.ghostBtn, { paddingVertical: pad.v, paddingHorizontal: pad.h }, style]} {...props}>
        <View style={styles.inner}>
          {icon && <View style={title ? styles.iconWithText : null}>{icon}</View>}
          {title && <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

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
    borderRadius: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btn: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ghostBtn: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorderBright,
    backgroundColor: 'transparent',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWithText: { marginRight: 8 },
  text: { fontWeight: '600', letterSpacing: 1 },
});
