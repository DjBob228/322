export type Theme = 'green' | 'blue' | 'purple' | 'red' | 'orange' | 'teal';

export interface ThemeColors {
  name: string;
  emoji: string;
  background: string;
  tableBg: string;
  tableBorder: string;
  patternColor: string;
}

export const themes: Record<Theme, ThemeColors> = {
  green: {
    name: 'Зелёный',
    emoji: '🟢',
    background: 'from-green-800 via-green-700 to-green-900',
    tableBg: 'bg-green-600/20',
    tableBorder: 'border-green-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
  blue: {
    name: 'Синий',
    emoji: '🔵',
    background: 'from-blue-800 via-blue-700 to-blue-900',
    tableBg: 'bg-blue-600/20',
    tableBorder: 'border-blue-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
  purple: {
    name: 'Фиолетовый',
    emoji: '🟣',
    background: 'from-purple-800 via-purple-700 to-purple-900',
    tableBg: 'bg-purple-600/20',
    tableBorder: 'border-purple-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
  red: {
    name: 'Красный',
    emoji: '🔴',
    background: 'from-red-800 via-red-700 to-red-900',
    tableBg: 'bg-red-600/20',
    tableBorder: 'border-red-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
  orange: {
    name: 'Оранжевый',
    emoji: '🟠',
    background: 'from-orange-800 via-orange-700 to-orange-900',
    tableBg: 'bg-orange-600/20',
    tableBorder: 'border-orange-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
  teal: {
    name: 'Бирюзовый',
    emoji: '🔷',
    background: 'from-teal-800 via-teal-700 to-teal-900',
    tableBg: 'bg-teal-600/20',
    tableBorder: 'border-teal-500/20',
    patternColor: 'rgba(255,255,255,0.05)',
  },
};

export const themeOrder: Theme[] = ['green', 'blue', 'purple', 'red', 'orange', 'teal'];

export function getNextTheme(current: Theme): Theme {
  const currentIndex = themeOrder.indexOf(current);
  const nextIndex = (currentIndex + 1) % themeOrder.length;
  return themeOrder[nextIndex];
}
