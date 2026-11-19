import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, GameScore } from '../types';

const KEYS = {
  FAVORITES: '@toolboxx_favorites_v1',
  RECENTS: '@toolboxx_recents_v1',
  HIGH_SCORES: '@toolboxx_high_scores_v1',
  SETTINGS: '@toolboxx_settings_v1',
  CACHED_RATES: '@toolboxx_cached_currency_rates_v1',
  CALC_HISTORY: '@toolboxx_calc_history_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  themeMode: 'dark',
  soundEnabled: true,
  vibrationEnabled: true,
  simulateOffline: false,
};

// Favorites
export const getFavorites = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : ['calculator', 'gst_calculator', 'game_2048', 'qr_generator'];
  } catch {
    return [];
  }
};

export const toggleFavorite = async (id: string): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    const index = favorites.indexOf(id);
    let updated: string[];
    let isNowFavorite = false;
    if (index >= 0) {
      updated = favorites.filter((fav) => fav !== id);
    } else {
      updated = [id, ...favorites];
      isNowFavorite = true;
    }
    await AsyncStorage.setItem(KEYS.FAVORITES, JSON.stringify(updated));
    return isNowFavorite;
  } catch {
    return false;
  }
};

// Recents
export const getRecents = async (): Promise<string[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECENTS);
    return raw ? JSON.parse(raw) : ['calculator', 'game_2048', 'gst_calculator'];
  } catch {
    return [];
  }
};

export const addRecent = async (id: string): Promise<void> => {
  try {
    const recents = await getRecents();
    const updated = [id, ...recents.filter((item) => item !== id)].slice(0, 10);
    await AsyncStorage.setItem(KEYS.RECENTS, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const clearRecents = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.RECENTS);
  } catch {
    // ignore
  }
};

// High Scores
export const getHighScores = async (): Promise<Record<string, number>> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.HIGH_SCORES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveHighScore = async (gameId: string, score: number): Promise<boolean> => {
  try {
    const scores = await getHighScores();
    const currentHigh = scores[gameId] || 0;
    if (score > currentHigh) {
      scores[gameId] = score;
      await AsyncStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(scores));
      return true; // new high score
    }
    return false;
  } catch {
    return false;
  }
};

export const resetHighScores = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.HIGH_SCORES);
  } catch {
    // ignore
  }
};

// Settings
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = async (settings: Partial<AppSettings>): Promise<AppSettings> => {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// Cached Currency Rates
export interface CachedRatesData {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
}

export const getCachedCurrencyRates = async (): Promise<CachedRatesData | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CACHED_RATES);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCachedCurrencyRates = async (data: CachedRatesData): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEYS.CACHED_RATES, JSON.stringify(data));
  } catch {
    // ignore
  }
};

// Calculator History
export interface CalcHistoryEntry {
  id: string;
  expression: string;
  result: string;
  timestamp: number;
}

export const getCalcHistory = async (): Promise<CalcHistoryEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CALC_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addCalcHistory = async (expression: string, result: string): Promise<void> => {
  try {
    const history = await getCalcHistory();
    const entry: CalcHistoryEntry = {
      id: Date.now().toString(),
      expression,
      result,
      timestamp: Date.now(),
    };
    const updated = [entry, ...history].slice(0, 30);
    await AsyncStorage.setItem(KEYS.CALC_HISTORY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

export const clearCalcHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(KEYS.CALC_HISTORY);
  } catch {
    // ignore
  }
};

// AI Service Configuration
export interface AISettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
  customEndpoint?: string;
}

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.0-flash',
};

export const getAISettings = async (): Promise<AISettings> => {
  try {
    const raw = await AsyncStorage.getItem('@toolboxx_ai_settings_v1');
    return raw ? { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
};

export const saveAISettings = async (settings: Partial<AISettings>): Promise<AISettings> => {
  try {
    const current = await getAISettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem('@toolboxx_ai_settings_v1', JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
};
