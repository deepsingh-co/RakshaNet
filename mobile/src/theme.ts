/** Shared visual language: calm surfaces, green = safe, red = only SOS. */
export const colors = {
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF2EF',
  ink: '#12251E',
  inkSoft: '#3C534B',
  muted: '#687C74',
  border: '#DBE5E0',
  borderStrong: '#C2D2CB',

  green: '#0F7B5F',
  greenDark: '#0A5B46',
  greenSoft: '#E4F2EC',
  red: '#C62828',
  redDark: '#8E1B1B',
  redSoft: '#FCEAEA',
  amber: '#9A5B06',
  amberSoft: '#FFF2DC',
  orange: '#B54708',
  orangeSoft: '#FFEBDD',
  blue: '#2D5FCC',
  blueSoft: '#E9F0FC',
  purple: '#6446B4',
  purpleSoft: '#F0EBFA',
  slateSoft: '#EEF2F0',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0B1F17',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#0B1F17',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const typography = {
  title: 26,
  heading: 20,
  body: 16,
  small: 14,
  tiny: 12,
} as const;
