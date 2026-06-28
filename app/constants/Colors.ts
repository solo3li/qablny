export const Colors = {
  // --- Hype UI Theme ---
  
  // Backgrounds
  bg: '#FFFFFF',         // Pure White
  bgDeep: '#F5F5F5',     // Very light gray for search bars / inactive tabs
  surface: '#FFFFFF',    // White
  surfaceHover: '#F9F9F9',

  // Accents & Buttons (Vibrant Gradients)
  primary: '#FF512F',    // Orange-Pink
  primaryDim: '#FFE8E3',
  secondary: '#DD2476',  // Deep Pink
  secondaryDim: '#FBE3EE',
  cyan: '#9B51E0',       // Purple 
  cyanDim: '#EFE5F9',

  // Text
  text: '#1C1C1E',       // Almost Black
  textSecondary: '#8E8E93', // Gray
  textMuted: '#C7C7CC',  // Light Gray

  // Borders
  glassBorder: '#E5E5EA',
  glassBorderBright: '#F2F2F7',
  glassBg: 'rgba(255, 255, 255, 0.95)',

  // Shadows
  shadowLight: '0px 8px 24px rgba(0, 0, 0, 0.08)',
  shadowGlow: '0px 10px 24px rgba(255, 81, 47, 0.35)',

  // Gradients
  gradMain: ['#FFFFFF', '#F9F9F9'] as const,
  gradPrimary: ['#FF8A00', '#FF007A'] as const, // Orange to Pink
  gradSecondary: ['#FF007A', '#9B51E0'] as const, // Pink to Purple
  gradCard: ['#FFFFFF', '#FFFFFF'] as string[],

  // States
  online: '#00D084',     // Vibrant Green
  danger: '#FF3B30',     // Red
  success: '#34C759',
};
