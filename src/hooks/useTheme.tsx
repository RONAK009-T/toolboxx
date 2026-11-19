import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_THEME, LIGHT_THEME, Theme } from '../constants/theme';
import { ThemeMode } from '../types';
import { getSettings, saveSettings } from '../storage/storage';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: DARK_THEME,
  themeMode: 'dark',
  setThemeMode: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setLocalThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings?.themeMode) {
        setLocalThemeMode(settings.themeMode);
      }
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setLocalThemeMode(mode);
    await saveSettings({ themeMode: mode });
  };

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
