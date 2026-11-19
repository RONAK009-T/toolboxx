export interface Theme {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHighlight: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;
  accent: string;
  warning: string;
  error: string;
  success: string;
  cardBg: string;
  statusBar: 'light-content' | 'dark-content';
  isDark: boolean;
}

// Classic Deep Navy / Slate Dark Theme
export const DARK_THEME: Theme = {
  background: '#0B1120',           // Deep Classic Navy
  backgroundSecondary: '#111827',
  surface: '#151F32',              // Structured dark utility surface
  surfaceHighlight: '#1E293B',
  border: '#23324D',               // Refined classic border
  borderLight: '#334155',
  text: '#F8FAFC',                 // Clean, high-contrast white
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  primary: '#2563EB',              // Classic Utility Blue
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryGlow: 'rgba(37, 99, 235, 0.14)',
  accent: '#38BDF8',
  warning: '#D97706',
  error: '#DC2626',
  success: '#16A34A',
  cardBg: '#151F32',
  statusBar: 'light-content',
  isDark: true,
};

// Classic Clean Light Theme
export const LIGHT_THEME: Theme = {
  background: '#F8FAFC',           // Clean Slate Off-White
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',              // Crisp Card Surface
  surfaceHighlight: '#F1F5F9',
  border: '#CBD5E1',               // Clean Divider Border
  borderLight: '#E2E8F0',
  text: '#0F172A',                 // Deep Slate Text
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#2563EB',              // Classic Utility Blue
  primaryLight: '#3B82F6',
  primaryDark: '#1D4ED8',
  primaryGlow: 'rgba(37, 99, 235, 0.10)',
  accent: '#0284C7',
  warning: '#D97706',
  error: '#DC2626',
  success: '#16A34A',
  cardBg: '#FFFFFF',
  statusBar: 'dark-content',
  isDark: false,
};
