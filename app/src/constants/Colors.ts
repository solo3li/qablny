export const Colors = {
  // --- Clean Light Modern Theme (Hinge / Apple inspired) ---

  // Backgrounds
  bg: '#F8F9FA',            // Pure warm off-white surface
  background: '#F8F9FA',
  bgDeep: '#EEF0F3',        // Soft container fill
  surface: '#FFFFFF',       // Clean white card surface
  surfaceHover: '#F4F5F7',  // Interactive hover/press state
  surfaceLight: '#F1F3F5',

  // Signature Accent & Harmonious Tints
  primary: '#FE3C72',       // Signature elegant Coral/Rose primary
  primaryDim: 'rgba(254, 60, 114, 0.08)', // Subtle tint fill for active chips/cards
  primaryContainer: '#FE3C72',
  primaryLight: '#FF6584',
  secondary: '#FF5A79',     // Cohesive soft rose-pink accent (no clashing neon magenta)
  secondaryDim: 'rgba(254, 60, 114, 0.12)',
  cyan: '#0E9F6E',          // Refined emerald/teal accent
  cyanDim: 'rgba(14, 159, 110, 0.08)',

  // Crisp High-Contrast Typography
  text: '#1A1D1E',          // Crisp near-black heading & primary copy
  textSecondary: '#6C757D', // Neutral clean slate subtitle
  textMuted: '#9CA3AF',     // Gentle placeholder & metadata gray

  // Refined Borders
  glassBorder: '#EAECEF',   // Subtle elegant border
  glassBorderBright: '#FFFFFF',
  glassBg: 'rgba(255, 255, 255, 0.85)',
  border: '#EAECEF',
  glassmorphism: 'rgba(255, 255, 255, 0.85)',

  // Subtle Modern Shadows
  shadowLight: '0px 2px 12px rgba(0, 0, 0, 0.04)',
  shadowGlow: '0px 8px 24px rgba(254, 60, 114, 0.22)',
  shadowCard: '0px 4px 20px rgba(0, 0, 0, 0.06)',

  // Clean Gradients
  gradMain: ['#FFFFFF', '#F8F9FA'] as const,
  gradPrimary: ['#FE3C72', '#FF6584'] as const,
  gradSecondary: ['#FF6584', '#FE3C72'] as const,
  gradCard: ['#FFFFFF', '#FFFFFF'] as string[],

  // States
  online: '#10B981',        // Fresh emerald green for online indicators
  danger: '#EF4444',        // Clean modern red
  error: '#EF4444',
  success: '#10B981',       // Emerald success
  warning: '#F59E0B',
};

export const Layout = {
  borderRadius: 16,
  padding: 20,
};
