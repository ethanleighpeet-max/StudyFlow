// @studyflow/ui — Design tokens
// Central source of truth for brand colors, spacing, typography, and animation values.
// These tokens are used across web and mobile to ensure consistency.

export const colors = {
  brand: {
    50: '#F0FAFA',
    100: '#D2F1F0',
    200: '#A8E4E2',
    300: '#72D0CE',
    400: '#3DB8B6',
    500: '#0F8B8D',
    600: '#0B7476',
    700: '#0A5E60',
    800: '#0B4C4E',
    900: '#0C3F41',
    950: '#042728',
  },
  secondary: {
    50: '#F5F3FA',
    100: '#EBE7F5',
    200: '#D9D1EC',
    300: '#C0B3DE',
    400: '#A494CC',
    500: '#7C6FAE',
    600: '#6A5C98',
    700: '#584C7E',
    800: '#4A4068',
    900: '#3D3556',
    950: '#251F37',
  },
  accent: {
    50: '#FDF8EE',
    100: '#FAEFD5',
    200: '#F4DCAA',
    300: '#EDC474',
    400: '#E6A94A',
    500: '#E09F3E',
    600: '#C8832E',
    700: '#A76627',
    800: '#885026',
    900: '#704323',
    950: '#3D2110',
  },
  success: {
    50: '#ECFDF5',
    500: '#10B981',
    700: '#065F46',
  },
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    700: '#92400E',
  },
  error: {
    50: '#FEF2F2',
    500: '#EF4444',
    700: '#991B1B',
  },
  surface: {
    50: '#FAFAF9',
    100: '#F5F5F3',
    200: '#E7E5E4',
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',
    600: '#57534E',
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',
    950: '#0C0A09',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', system-ui, sans-serif",
    heading: "'DM Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const radii = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.25rem',
  full: '9999px',
} as const;

export const animation = {
  spring: {
    gentle: { type: 'spring' as const, stiffness: 300, damping: 20 },
    snappy: { type: 'spring' as const, stiffness: 400, damping: 17 },
    bouncy: { type: 'spring' as const, stiffness: 500, damping: 15 },
  },
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    inOut: [0.45, 0, 0.55, 1] as const,
  },
} as const;
