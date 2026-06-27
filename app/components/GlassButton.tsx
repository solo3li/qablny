import React from 'react';
import { Text, StyleSheet, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
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
  
  const bgColor = isPrimary ? Colors.primary : 
                   isDanger ? Colors.danger : 
                   isSecondary ? Colors.secondary :
                   Colors.surface;
                   
  const textColor = isGhost ? Colors.text : 
                    isPrimary || isSecondary || isDanger ? '#FFFFFF' : Colors.text;

  const pad = { sm: { v: 10, h: 16 }, md: { v: 14, h: 24 }, lg: { v: 18, h: 32 } }[size];
  const fontSize = { sm: 14, md: 16, lg: 18 }[size];

  if (isGhost) {
    return (
      <TouchableOpacity activeOpacity={0.6} style={[styles.ghostBtn, { paddingVertical: pad.v, paddingHorizontal: pad.h }, style]} {...props}>
        <View style={styles.inner}>
          {icon && <View style={title ? styles.iconWithText : null}>{icon}</View>}
          {title && <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={[
        styles.wrapper, 
        { backgroundColor: bgColor, paddingVertical: pad.v, paddingHorizontal: pad.h }, 
        style
      ]} 
      {...props}
    >
      <View style={styles.inner}>
        {icon && <View style={title ? styles.iconWithText : null}>{icon}</View>}
        {title && <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // Minimalist: No heavy shadows, flat design
  },
  ghostBtn: {
    borderRadius: 12,
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
  text: { fontWeight: '600', letterSpacing: 0.5 },
});
