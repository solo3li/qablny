export const Colors = {
  // --- Vibe Live Connect Theme ---
  
  // Backgrounds
  bg: '#f8f9fa',         // Surface Bright
  bgDeep: '#edeeef',     // Surface Container
  surface: '#ffffff',    // Surface Container Lowest
  surfaceHover: '#f3f4f5',// Surface Container Low

  // Accents & Buttons (Vibrant Gradients)
  primary: '#b3290b',    // Primary
  primaryDim: '#ffb4a4', // Primary Fixed Dim
  primaryContainer: '#ff5f3d',
  secondary: '#b40064',  // Secondary
  secondaryDim: '#ffb0ca',
  cyan: '#006b5b',       // Tertiary
  cyanDim: '#00dfc1',

  // Text
  text: '#191c1d',       // On Surface
  textSecondary: '#5a413b', // On Surface Variant
  textMuted: '#8e7069',  // Outline

  // Borders
  glassBorder: '#e1e3e4',// Surface Variant
  glassBorderBright: '#ffffff',
  glassBg: 'rgba(255, 255, 255, 0.7)',

  // Shadows
  shadowLight: '0px 4px 20px rgba(0, 0, 0, 0.05)',
  shadowGlow: '0px 10px 24px rgba(255, 95, 61, 0.3)',

  // Gradients
  gradMain: ['#ffffff', '#f8f9fa'] as const,
  gradPrimary: ['#ff5f3d', '#b40064'] as const, // Coral to Pink
  gradSecondary: ['#b40064', '#006b5b'] as const, // Pink to Teal
  gradCard: ['#ffffff', '#ffffff'] as string[],

  // States
  online: '#00a790',     // Tertiary Container (Teal)
  danger: '#ba1a1a',     // Error
  success: '#006b5b',
};
