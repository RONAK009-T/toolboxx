export type CategoryId =
  | 'all'
  | 'favorites'
  | 'calculator'
  | 'image'
  | 'qr'
  | 'pdf'
  | 'text'
  | 'datetime'
  | 'ai'
  | 'games';

export interface AppItem {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  icon: string;
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5' | 'Feather';
  isOnline: boolean;
  isGame: boolean;
  popular?: boolean;
  color?: string;
  badge?: string;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  themeMode: ThemeMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  simulateOffline: boolean;
}

export interface NetworkState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  isSimulatedOffline: boolean;
  isOnline: boolean;
}

export interface GameScore {
  gameId: string;
  highScore: number;
  lastPlayed: number;
}

export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number;
}
