export const THEME = {
  colors: {
    // Base backgrounds
    background: '#090D16',
    surface: '#0F172A',
    surfaceElevated: '#1E293B',
    surfaceHighlight: '#334155',
    border: '#1E293B',
    borderLight: '#334155',

    // Primary Accents
    primary: '#38BDF8', // Cyan
    primaryGlow: 'rgba(56, 189, 248, 0.25)',
    accent: '#6366F1', // Indigo

    // Zero-Trust Decision Status
    verified: '#10B981', // Emerald Green
    verifiedBg: 'rgba(16, 185, 129, 0.12)',
    verifiedBorder: '#059669',

    rejected: '#EF4444', // Crimson Red
    rejectedBg: 'rgba(239, 68, 68, 0.12)',
    rejectedBorder: '#DC2626',

    review: '#F59E0B', // Amber
    reviewBg: 'rgba(245, 158, 11, 0.12)',
    reviewBorder: '#D97706',

    // Simulation / Demo Mode Accent
    simulation: '#A855F7', // Vivid Purple
    simulationBg: 'rgba(168, 85, 247, 0.15)',
    simulationBorder: '#9333EA',

    // Live GPS Mode Accent
    liveGps: '#10B981',
    liveGpsBg: 'rgba(16, 185, 129, 0.15)',

    // Typography
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#090D16',

    // Residence Categories
    categoryHouse: '#38BDF8',
    categoryApartment: '#F59E0B',
    categoryGated: '#EC4899',
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

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};
