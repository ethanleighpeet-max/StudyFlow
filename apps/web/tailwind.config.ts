import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — Deep Teal: focus (blue) meets wellbeing (green)
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
        // Secondary — Soft Violet: contemplation, insights, premium
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
        // Accent — Warm Amber: motivation, streaks, achievements
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
        // Semantic colors
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#065F46',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#92400E',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#991B1B',
        },
        // Warm neutrals — slightly tinted to avoid clinical feel
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
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(12, 63, 65, 0.06), 0 1px 2px -1px rgba(12, 63, 65, 0.06)',
        'card': '0 4px 6px -1px rgba(12, 63, 65, 0.05), 0 2px 4px -2px rgba(12, 63, 65, 0.04)',
        'glow': '0 0 20px rgba(15, 139, 141, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
