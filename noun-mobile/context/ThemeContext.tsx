import React, { createContext, useContext, useState, useEffect } from 'react';

// Color palettes
const lightTheme = {
  isDark: false,
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#f8f9f8',
  card: '#FFFFFF',
  headerBg: '#006400',
  headerText: '#FFFFFF',
  headerSubtext: '#E0E0E0',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#EEEEEE',
  accent: '#006600',
  accentLight: '#e8f5e9',
  accentMid: '#2e7d32',
  error: '#c62828',
  errorLight: '#ffebee',
  inputBg: '#fafafa',
  shadow: '#000',
  timerBg: 'rgba(0,0,0,0.2)',
  progressBg: 'rgba(255,255,255,0.2)',
  progressFill: '#fff',
  optionBg: '#fafafa',
  optionBorder: '#eee',
  answerBg: '#e8f5e9',
  iconBlueBg: '#e3f2fd',
  iconOrangeBg: '#fff3e0',
  disabledBg: '#f0f0f0',
  disabledIcon: '#e0e0e0',
  tabBar: '#FFFFFF',
  tabBarBorder: '#EEEEEE',
  tabInactive: '#999999',
  tabActive: '#006600',
};

const darkTheme = {
  isDark: true,
  background: '#121212',
  surface: '#1e1e1e',
  surfaceAlt: '#1a1a1a',
  card: '#252525',
  headerBg: '#1a3d1a',
  headerText: '#FFFFFF',
  headerSubtext: '#a0d4a0',
  text: '#e0e0e0',
  textSecondary: '#b0b0b0',
  textMuted: '#808080',
  border: '#333333',
  accent: '#00cc44',
  accentLight: '#1a3d1a',
  accentMid: '#00cc44',
  error: '#ff6b6b',
  errorLight: '#3d1a1a',
  inputBg: '#2a2a2a',
  shadow: '#000',
  timerBg: 'rgba(0,0,0,0.4)',
  progressBg: 'rgba(255,255,255,0.15)',
  progressFill: '#00cc44',
  optionBg: '#2a2a2a',
  optionBorder: '#3a3a3a',
  answerBg: '#1a3d1a',
  iconBlueBg: '#1a2a3d',
  iconOrangeBg: '#3d2a1a',
  disabledBg: '#2a2a2a',
  disabledIcon: '#3a3a3a',
  tabBar: '#1e1e1e',
  tabBarBorder: '#333333',
  tabInactive: '#666666',
  tabActive: '#00cc44',
};

export type ThemeColors = typeof lightTheme;

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  // Load saved preference from localStorage (web)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('noun_theme');
      if (saved === 'dark') setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('noun_theme', next ? 'dark' : 'light');
      }
      return next;
    });
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { lightTheme, darkTheme };
