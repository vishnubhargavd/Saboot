export const THEME = {
  colors: {
    // Pure Apple Monochrome Palette
    background: '#000000',
    surface: '#0D0D0D',
    surfaceElevated: '#161616',
    surfaceHighlight: '#222222',
    border: '#1F1F1F',
    borderLight: '#2E2E2E',
    borderFocus: '#FFFFFF',

    // Pure Stark Accents
    primary: '#FFFFFF',
    primaryInverse: '#000000',
    textPrimary: '#FFFFFF',
    textSecondary: '#A1A1AA', // Zinc 400
    textMuted: '#71717A',     // Zinc 500
    textDisabled: '#52525B',

    // Status (Minimal Apple Tint with Crisp Monochrome Badging)
    verified: '#34D399',      // Minimal Apple Mint
    verifiedBg: '#0A1A12',
    verifiedBorder: '#164E35',

    rejected: '#F87171',      // Minimal Apple Rose
    rejectedBg: '#1A0A0A',
    rejectedBorder: '#4E1616',

    review: '#FBBF24',        // Minimal Apple Amber
    reviewBg: '#1A1408',
    reviewBorder: '#4E380E',

    // Modes
    liveGps: '#FFFFFF',
    liveGpsBg: '#161616',
    simulation: '#E4E4E7',
    simulationBg: '#161616',
  },

  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      mono: 'Courier',
    },
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      hero: 32,
    },
  },

  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    full: 9999,
  },
};
