import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { useNetwork } from './src/hooks/useNetwork';
import { usePreferences } from './src/hooks/usePreferences';
import { BottomNav, TabKey } from './src/components/BottomNav';
import { OfflineNoticeModal } from './src/components/OfflineNoticeModal';
import { BannerAdView } from './src/ads/BannerAdView';
import { InterstitialModal } from './src/ads/InterstitialModal';
import { canShowInterstitial } from './src/ads/AdService';

// Storage
import {
  getFavorites,
  toggleFavorite,
  getRecents,
  addRecent,
  clearRecents,
  getHighScores,
} from './src/storage/storage';

// Screens
import { HomeScreen } from './src/screens/home/HomeScreen';
import { ToolsHubScreen } from './src/screens/tools/ToolsHubScreen';
import { GamesHubScreen } from './src/screens/games/GamesHubScreen';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';

// Tool Screens
import { CalculatorScreen } from './src/screens/tools/CalculatorScreen';
import { GSTCalculatorScreen } from './src/screens/tools/GSTCalculatorScreen';
import { EMICalculatorScreen } from './src/screens/tools/EMICalculatorScreen';
import { AgeCalculatorScreen } from './src/screens/tools/AgeCalculatorScreen';
import { PercentageCalculatorScreen } from './src/screens/tools/PercentageCalculatorScreen';
import { UnitConverterScreen } from './src/screens/tools/UnitConverterScreen';
import { CurrencyConverterScreen } from './src/screens/tools/CurrencyConverterScreen';
import { ImageCompressorScreen } from './src/screens/tools/ImageCompressorScreen';
import { ImageResizerScreen } from './src/screens/tools/ImageResizerScreen';
import { ImageCropperScreen } from './src/screens/tools/ImageCropperScreen';
import { ImageConverterScreen } from './src/screens/tools/ImageConverterScreen';
import { QRGeneratorScreen } from './src/screens/tools/QRGeneratorScreen';
import { QRScannerScreen } from './src/screens/tools/QRScannerScreen';
import { PDFToolsScreen } from './src/screens/tools/PDFToolsScreen';
import { TextToolsScreen } from './src/screens/tools/TextToolsScreen';
import { PasswordGeneratorScreen } from './src/screens/tools/PasswordGeneratorScreen';
import { StopwatchScreen } from './src/screens/tools/StopwatchScreen';
import { TimerScreen } from './src/screens/tools/TimerScreen';
import { DateCalculatorScreen } from './src/screens/tools/DateCalculatorScreen';
import { AIToolScreen } from './src/screens/tools/AIToolScreen';

// Game Screens
import { Game2048Screen } from './src/screens/games/Game2048Screen';
import { GameSnakeScreen } from './src/screens/games/GameSnakeScreen';
import { GameTicTacToeScreen } from './src/screens/games/GameTicTacToeScreen';
import { GameMemoryScreen } from './src/screens/games/GameMemoryScreen';
import { GameReactionScreen } from './src/screens/games/GameReactionScreen';
import { GameNumberGuessScreen } from './src/screens/games/GameNumberGuessScreen';
import { GameMathSprintScreen } from './src/screens/games/GameMathSprintScreen';
import { GameRPSScreen } from './src/screens/games/GameRPSScreen';
import { GameSlidingPuzzleScreen } from './src/screens/games/GameSlidingPuzzleScreen';
import { GameAeroDashScreen } from './src/screens/games/GameAeroDashScreen';

import { APP_ITEMS } from './src/constants/items';
import { AppItem } from './src/types';

function MainApp() {
  const { theme } = useTheme();
  const { isOnline, isSimulatedOffline, setSimulatedOffline } = useNetwork();
  const { triggerHaptic } = usePreferences();

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [activeItem, setActiveItem] = useState<AppItem | null>(null);

  // App Data
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [highScores, setHighScores] = useState<Record<string, number>>({});

  // Modals
  const [offlineNoticeVisible, setOfflineNoticeVisible] = useState(false);
  const [offlineNoticeFeature, setOfflineNoticeFeature] = useState('');
  const [interstitialVisible, setInterstitialVisible] = useState(false);

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    const favs = await getFavorites();
    const recs = await getRecents();
    const scores = await getHighScores();
    setFavorites(favs);
    setRecents(recs);
    setHighScores(scores);
  };

  const handleToggleFavorite = async (id: string) => {
    triggerHaptic('light');
    await toggleFavorite(id);
    const updated = await getFavorites();
    setFavorites(updated);
  };

  const handleClearRecents = async () => {
    triggerHaptic('medium');
    await clearRecents();
    setRecents([]);
  };

  const handleSelectItem = async (item: AppItem) => {
    triggerHaptic('light');

    // Check if item is online-only and user is offline
    if (item.isOnline && !isOnline) {
      setOfflineNoticeFeature(item.title);
      setOfflineNoticeVisible(true);
      return;
    }

    // Record as recently used
    await addRecent(item.id);
    const updatedRecents = await getRecents();
    setRecents(updatedRecents);

    setActiveItem(item);
  };

  const handleBackFromDetail = () => {
    triggerHaptic('light');
    setActiveItem(null);
    loadLocalData(); // refresh scores and recents
  };

  // Natural game-over transition point for interstitial ad
  const handleGameOverTransition = (finalScore: number) => {
    loadLocalData();
    if (canShowInterstitial(isOnline)) {
      setTimeout(() => {
        setInterstitialVisible(true);
      }, 500);
    }
  };

  // Render current detail screen if an item is selected
  const renderDetailScreen = () => {
    if (!activeItem) return null;

    switch (activeItem.id) {
      // CALCULATORS
      case 'calculator':
        return <CalculatorScreen onBack={handleBackFromDetail} />;
      case 'gst_calculator':
        return <GSTCalculatorScreen onBack={handleBackFromDetail} />;
      case 'emi_calculator':
        return <EMICalculatorScreen onBack={handleBackFromDetail} />;
      case 'age_calculator':
        return <AgeCalculatorScreen onBack={handleBackFromDetail} />;
      case 'percentage_calculator':
        return <PercentageCalculatorScreen onBack={handleBackFromDetail} />;
      case 'unit_converter':
        return <UnitConverterScreen onBack={handleBackFromDetail} />;
      case 'currency_converter':
        return <CurrencyConverterScreen isOnline={isOnline} onBack={handleBackFromDetail} />;

      // IMAGE TOOLS
      case 'image_compressor':
        return <ImageCompressorScreen onBack={handleBackFromDetail} />;
      case 'image_resizer':
        return <ImageResizerScreen onBack={handleBackFromDetail} />;
      case 'image_cropper':
        return <ImageCropperScreen onBack={handleBackFromDetail} />;
      case 'image_converter':
        return (
          <ImageConverterScreen
            onBack={handleBackFromDetail}
            onNavigateToPdf={() => {
              const pdfTool = APP_ITEMS.find((t) => t.id === 'pdf_tools');
              if (pdfTool) handleSelectItem(pdfTool);
            }}
          />
        );

      // QR & BARCODE
      case 'qr_generator':
        return <QRGeneratorScreen onBack={handleBackFromDetail} />;
      case 'qr_scanner':
        return <QRScannerScreen onBack={handleBackFromDetail} />;

      // PDF TOOLS
      case 'pdf_tools':
        return <PDFToolsScreen onBack={handleBackFromDetail} />;

      // TEXT & PASSWORD
      case 'text_tools':
        return <TextToolsScreen onBack={handleBackFromDetail} />;
      case 'password_generator':
        return <PasswordGeneratorScreen onBack={handleBackFromDetail} />;

      // DATE & TIME
      case 'stopwatch':
        return <StopwatchScreen onBack={handleBackFromDetail} />;
      case 'timer':
        return <TimerScreen onBack={handleBackFromDetail} />;
      case 'date_calculator':
        return <DateCalculatorScreen onBack={handleBackFromDetail} />;

      // AI TOOLS
      case 'ai_chat':
      case 'ai_summarizer':
      case 'ai_grammar':
      case 'ai_question_solver':
        return (
          <AIToolScreen
            toolId={activeItem.id as any}
            isOnline={isOnline}
            onBack={handleBackFromDetail}
            onNavigateToSettings={() => {
              setActiveItem(null);
              setActiveTab('settings');
            }}
          />
        );

      // OFFLINE GAMES
      case 'game_2048':
        return <Game2048Screen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_snake':
        return <GameSnakeScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_tictactoe':
        return <GameTicTacToeScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_memory':
        return <GameMemoryScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_reaction':
        return <GameReactionScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_guess_number':
        return <GameNumberGuessScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_math_challenge':
        return <GameMathSprintScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_rps':
        return <GameRPSScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_sliding_puzzle':
        return <GameSlidingPuzzleScreen onBack={handleBackFromDetail} onGameOver={handleGameOverTransition} />;
      case 'game_aero_dash':
        return (
          <GameAeroDashScreen
            isOnline={isOnline}
            onBack={handleBackFromDetail}
            onGameOver={handleGameOverTransition}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />

      {/* Screen Body */}
      <View style={styles.body}>
        {activeItem ? (
          renderDetailScreen()
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                isOnline={isOnline}
                isSimulatedOffline={isSimulatedOffline}
                favorites={favorites}
                recents={recents}
                highScores={highScores}
                onToggleFavorite={handleToggleFavorite}
                onSelectItem={handleSelectItem}
                onSelectTab={setActiveTab}
                onClearRecents={handleClearRecents}
                onToggleSimulatedOffline={() => setSimulatedOffline(!isSimulatedOffline)}
              />
            )}
            {activeTab === 'tools' && (
              <ToolsHubScreen
                isOnline={isOnline}
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                onSelectItem={handleSelectItem}
              />
            )}
            {activeTab === 'games' && (
              <GamesHubScreen
                isOnline={isOnline}
                favorites={favorites}
                highScores={highScores}
                onToggleFavorite={handleToggleFavorite}
                onSelectItem={handleSelectItem}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsScreen
                onSimulateOfflineChange={setSimulatedOffline}
              />
            )}
          </>
        )}
      </View>

      {/* Banner Ad - only when online, cleanly integrated */}
      {!activeItem && <BannerAdView isOnline={isOnline} position="bottom" />}

      {/* Bottom Navigation */}
      {!activeItem && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => {
            triggerHaptic('light');
            setActiveTab(tab);
          }}
        />
      )}

      {/* Offline Notice Modal */}
      <OfflineNoticeModal
        visible={offlineNoticeVisible}
        featureName={offlineNoticeFeature}
        onClose={() => setOfflineNoticeVisible(false)}
      />

      {/* Interstitial Ad Transition Modal */}
      <InterstitialModal
        visible={interstitialVisible}
        onClose={() => setInterstitialVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
