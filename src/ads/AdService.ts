import { Platform } from 'react-native';

// Google Official Test Ad Unit IDs
export const AD_UNIT_IDS = {
  BANNER: Platform.select({
    android: 'ca-app-pub-7656940430582096/2341203126',
    ios: 'ca-app-pub-7656940430582096/2341203126',
    default: 'ca-app-pub-7656940430582096/2341203126',
  }),
  INTERSTITIAL: Platform.select({
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
    default: 'ca-app-pub-3940256099942544/1033173712',
  }),
  REWARDED: Platform.select({
    android: 'ca-app-pub-7656940430582096/3672089957',
    ios: 'ca-app-pub-7656940430582096/3672089957',
    default: 'ca-app-pub-7656940430582096/3672089957',
  }),
};

// Frequency capping: at least 75 seconds between interstitials, minimum 2 game completions
const MIN_INTERSTITIAL_INTERVAL_MS = 75000;
let lastInterstitialTime = 0;
let transitionCounter = 0;

export const canShowInterstitial = (isOnline: boolean): boolean => {
  if (!isOnline) return false;
  const now = Date.now();
  if (now - lastInterstitialTime < MIN_INTERSTITIAL_INTERVAL_MS) {
    return false;
  }
  transitionCounter++;
  if (transitionCounter < 2) {
    return false;
  }
  return true;
};

export const markInterstitialShown = () => {
  lastInterstitialTime = Date.now();
  transitionCounter = 0;
};
