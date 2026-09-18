export type Theme = 'green' | 'blue' | 'purple' | 'red' | 'orange' | 'teal';

export interface ThemeColors {
  name: string;
  emoji: string;
  background: string;
  tableBg: string;
  tableBorder: string;
  patternColor: string;
  textColor: string;
}

export const themes: Record<Theme, ThemeColors> = {
  green: {
    name: 'Зелёный',
    emoji: '🟢',
    background: 'from-green-800 via-green-700 to-green-900',
    tableBg: 'bg-green-600/20',
    tableBorder: 'border-green-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-green-300/60',
  },
  blue: {
    name: 'Синий',
    emoji: '🔵',
    background: 'from-blue-800 via-blue-700 to-blue-900',
    tableBg: 'bg-blue-600/20',
    tableBorder: 'border-blue-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-blue-300/60',
  },
  purple: {
    name: 'Фиолетовый',
    emoji: '🟣',
    background: 'from-purple-800 via-purple-700 to-purple-900',
    tableBg: 'bg-purple-600/20',
    tableBorder: 'border-purple-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-purple-300/60',
  },
  red: {
    name: 'Бордовый',
    emoji: '🍷',
    background: 'from-rose-900 via-rose-800 to-rose-950',
    tableBg: 'bg-rose-700/20',
    tableBorder: 'border-rose-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-rose-300/60',
  },
  orange: {
    name: 'Терракотовый',
    emoji: '🟤',
    background: 'from-amber-900 via-amber-800 to-amber-950',
    tableBg: 'bg-amber-700/20',
    tableBorder: 'border-amber-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-amber-300/60',
  },
  teal: {
    name: 'Бирюзовый',
    emoji: '🔷',
    background: 'from-teal-800 via-teal-700 to-teal-900',
    tableBg: 'bg-teal-600/20',
    tableBorder: 'border-teal-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
    textColor: 'text-teal-300/60',
  },
};

export const themeOrder: Theme[] = ['green', 'blue', 'purple', 'red', 'orange', 'teal'];

export function getNextTheme(current: Theme): Theme {
  const currentIndex = themeOrder.indexOf(current);
  const nextIndex = (currentIndex + 1) % themeOrder.length;
  return themeOrder[nextIndex];
}
