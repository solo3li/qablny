export const Colors = {
  // Backgrounds (Minimalist Elegance)
  bg: '#FFFFFF', // Pure White
  bgDeep: '#F9FAFB', // Very soft grey
  // --- Claymorphism Theme ---
  
  // Backgrounds
  bg: '#F5F1EB',         // Creamy Off-White for main background
  bgDeep: '#FFFFFF',     // Pure white for floating cards/tabs
  surface: '#FFFFFF',    // Surface color
  surfaceHover: '#F3F4F6',

  // Accents & Buttons
  primary: '#F0A78F',    // Soft Peach / Coral
  primaryDim: '#FDECE7', // Very light peach for backgrounds
  secondary: '#A0D3C4',  // Soft Mint Green
  secondaryDim: '#E7F5F0', // Very light mint
  cyan: '#99C7D4',       // Soft Baby Blue
  cyanDim: '#E3F2F6',

  // Text
  text: '#523B33',       // Deep Brown (Friendly, warm)
  textSecondary: '#8A6D61', // Lighter Brown
  textMuted: '#C2B1A8',  // Disabled/Placeholder text

  // Borders & Shadows
  glassBorder: '#F2E8DF',// Slightly darker cream for borders
  glassBorderBright: '#FFFFFF', // Highlight border for 3D effect
  glassBg: 'rgba(255, 255, 255, 0.95)', // Semi-transparent white

  // Gradients (Optional soft backgrounds)
  gradMain: ['#F5F1EB', '#F2EBE1'] as const,
  gradPrimary: ['#F2B49F', '#F0A78F'] as const,
  gradCard: ['#FFFFFF', '#FFFFFF'] as string[],
  gradSecondary: ['#C2B8A3', '#A89E88'] as string[],

  // States
  online: '#A0D3C4',     // Mint Green for online
  danger: '#EF9A9A',     // Soft Red
  success: '#10B981',
};
