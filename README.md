# TOOLBOX X — Free Offline Tools & Games Android App

> **Production-Quality Android Application built with React Native + Expo + TypeScript**

ToolBox X combines **everyday utility tools, financial calculators, image/PDF processing utilities, AI assistants, and 10 offline arcade games** into one fast, lightweight Android application.

---

## 🌟 Core Architecture Principles

1. **100% Offline-First for Tools & Games**
   - Every offline tool, calculator, image manipulator, QR generator, and mini-game works **without internet**.
   - Network connectivity is detected automatically. When offline, the app switches to `OFFLINE MODE` and continues running smoothly without crashing or showing repetitive internet popups.
   - When online, the app seamlessly restores live exchange rates and AI features.

2. **No Login / No Signup / Zero Friction**
   - No login, no signup, no registration, no OTP, no passwords, no subscriptions.
   - User opens the app directly into the home dashboard.
   - User preferences, favorites, recents, and game high scores are stored locally on the device using `@react-native-async-storage/async-storage`.

3. **Google AdMob Monetization**
   - Fully configured with `react-native-google-mobile-ads` and Google official test unit IDs.
   - **Banner Ads:** Placed non-intrusively at natural positions (bottom, tool listing, game menu).
   - **Interstitial Ads:** Triggered strictly at natural transition points (e.g. after finishing a game) with frequency capping (minimum 75s interval, never during gameplay).
   - **Rewarded Ads:** Optional "Watch Ad for Extra Life" in games like *Aero Dash*. Watching is always optional.
   - **Offline Behavior:** When offline, all ads are completely suppressed. Offline games and tools never prompt to watch ads or connect to the internet.

---

## 🧰 Included Tools Directory

### 🧮 Calculators
- **Calculator:** Offline basic and decimal arithmetic with expression evaluation and calculation history.
- **GST Calculator:** Inclusive / Exclusive mode, CGST (50%), SGST (50%), and IGST (100%) breakdown, standard slabs (3%, 5%, 12%, 18%, 28%) and custom tax rates.
- **EMI Calculator:** Monthly loan EMI, total interest, total payable amount, with interactive principal vs interest breakdown visualizer.
- **Age Calculator:** Calculates exact age in years, months, days, total weeks, total hours, and next birthday countdown with weekday.
- **Percentage Calculator:** 4 modes: X% of Y, Percentage Increase/Decrease, X is what % of Y, and Exam Marks percentage.
- **Unit Converter:** Real-time conversion across Length, Weight/Mass, Temperature (°C, °F, K), Area, Speed, Digital Data Storage, and Time.
- **Live Currency Converter:** Real-time exchange rates (USD, INR, EUR, GBP, AED, AUD, CAD, JPY, etc.) with safe offline caching and timestamp indicators.

### 📷 Image Tools (100% Offline)
- **Image Compressor:** Compress photos locally with quality presets (20%, 40%, 60%, 80%), original vs compressed size display, disk space savings percentage, and native sharing.
- **Image Resizer:** Custom pixel width/height with aspect ratio lock and percentage presets (25%, 50%, 75%, 100%).
- **Image Cropper:** Aspect ratio presets: Free, 1:1, 4:3, 16:9.
- **Image Converter:** Local image format conversion between JPG, PNG, and WEBP.

### 🔳 QR & Barcode Tools (100% Offline)
- **QR Code Generator:** Offline SVG generation for Plain Text, Website URLs, Wi-Fi networks (SSID + Password), Phone calls, Emails, and vCard Contacts.
- **QR & Barcode Scanner:** Camera-based scanner supporting QR Code, EAN-13, EAN-8, UPC, Code-128, and Code-39 with permission handling and test simulator.

### 📄 PDF Tools (100% Offline)
- **Image to PDF Maker:** Select single or multiple photos from gallery, arrange, generate clean A4 PDF document locally using `expo-print`, and share via `expo-sharing`.

### ✍️ Text Tools & Security (100% Offline)
- **Text Utilities:** Live Word counter, Character counter (with and without spaces), Sentence counter, Paragraph counter, Reading time estimation, UPPERCASE, lowercase, Title Case, space cleanup, reverse text, and line deduplication.
- **Password Generator:** Cryptographically strong password generator with custom length (8 to 32), uppercase, lowercase, numbers, symbols toggles, password strength indicator, and clipboard copying.

### ⏱️ Date & Time Tools (100% Offline)
- **Stopwatch:** Millisecond accuracy stopwatch with split/lap recording.
- **Countdown Timer:** Configurable hours, minutes, seconds countdown with visual progress ring and completion alert.
- **Date Calculator:** Calculate exact difference in days/weeks between two dates, or add/subtract days from a calendar date.

### 🤖 AI Tools (Online Mode)
- **AI Assistant Chat:** Conversational Q&A assistant with contextual suggestions.
- **AI Summarizer:** Paste long essays, articles, or reports to extract executive summaries and bullet points.
- **AI Grammar Checker:** Syntax and tone refinement with itemized explanations.
- **AI Question Solver:** Step-by-step problem solver supporting typed or photo-attached questions.

---

## 🎮 10 Offline Mini-Games (100% Offline)

| Game | Description | Controls & Features |
|---|---|---|
| **2048** | Classic number merging puzzle | Swipe gestures + D-pad accessibility, merge to 2048 tile, high score |
| **Retro Snake** | Vintage arcade snake | D-pad controls, increasing speed as score grows, high score |
| **Tic-Tac-Toe** | Solo vs AI or 2-player pass & play | Easy, Medium, and Hard (unbeatable Minimax) AI bots, win line highlights |
| **Memory Match** | Card flipping matching game | 16-card grid, move counter, timer, match 8 icon pairs |
| **Reaction Test** | Millisecond reflex benchmark | Red to Green trigger, early tap detection, speed rating |
| **Number Guessing** | Binary search deduction | Hidden 1-100 number, higher/lower hints, attempt limits |
| **Math Sprint** | 30-second rapid mental math | Speed arithmetic (+, -, ×, ÷), multiplier streaks, high score |
| **Rock Paper Scissors**| Classic hand battle vs CPU | Win/Loss/Tie tracking, win streak counter |
| **15-Tile Puzzle** | Solvable sliding tile puzzle | Solvable inversion shuffle, move counter, stopwatch |
| **Aero Dash** | Original tap-to-fly arcade | Smooth gravity physics, plasma obstacle gates, optional rewarded ad extra life |

---

## 📱 Project Structure

```text
ToolBoxX/
├── App.tsx                          # Root application & modular screen coordinator
├── app.json                         # Expo & Android production configuration
├── eas.json                         # EAS build profiles (APK & AAB release)
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
│
└── src/
    ├── types/
    │   └── index.ts                 # TypeScript interfaces and data models
    ├── constants/
    │   ├── theme.ts                 # Modern Dark and Light theme palettes
    │   └── items.ts                 # Full catalog of tools and games metadata
    ├── storage/
    │   └── storage.ts               # AsyncStorage local-first persistence
    ├── hooks/
    │   ├── useTheme.tsx             # Theme context & system preference hook
    │   ├── useNetwork.ts            # Live NetInfo detection & offline simulator
    │   └── usePreferences.ts        # Haptics & audio feedback controller
    ├── ads/
    │   ├── AdService.ts             # AdMob configuration & frequency capping
    │   ├── BannerAdView.tsx         # Resilient adaptive banner component
    │   ├── InterstitialModal.tsx    # Natural transition interstitial dialog
    │   └── RewardedModal.tsx        # Optional rewarded ad bonus dialog
    ├── components/
    │   ├── BottomNav.tsx            # 4-tab modern bottom navigation
    │   ├── NetworkStatusPill.tsx    # Dynamic "ONLINE" / "OFFLINE MODE" pill
    │   ├── OfflineNoticeModal.tsx   # Offline barrier notice for online tools
    │   ├── ScreenHeader.tsx         # Unified back navigation header
    │   ├── SearchBar.tsx            # Global search input
    │   ├── CategoryPills.tsx        # Category filtering pills
    │   └── ItemCard.tsx             # Interactive tool & game card
    └── screens/
        ├── home/
        │   └── HomeScreen.tsx       # Main Android dashboard
        ├── tools/
        │   ├── ToolsHubScreen.tsx   # Complete tools directory
        │   ├── CalculatorScreen.tsx
        │   ├── GSTCalculatorScreen.tsx
        │   ├── EMICalculatorScreen.tsx
        │   ├── AgeCalculatorScreen.tsx
        │   ├── PercentageCalculatorScreen.tsx
        │   ├── UnitConverterScreen.tsx
        │   ├── CurrencyConverterScreen.tsx
        │   ├── ImageCompressorScreen.tsx
        │   ├── ImageResizerScreen.tsx
        │   ├── ImageCropperScreen.tsx
        │   ├── ImageConverterScreen.tsx
        │   ├── QRGeneratorScreen.tsx
        │   ├── QRScannerScreen.tsx
        │   ├── PDFToolsScreen.tsx
        │   ├── TextToolsScreen.tsx
        │   ├── PasswordGeneratorScreen.tsx
        │   ├── StopwatchScreen.tsx
        │   ├── TimerScreen.tsx
        │   ├── DateCalculatorScreen.tsx
        │   └── AIToolScreen.tsx
        ├── games/
        │   ├── GamesHubScreen.tsx   # Games arcade directory
        │   ├── Game2048Screen.tsx
        │   ├── GameSnakeScreen.tsx
        │   ├── GameTicTacToeScreen.tsx
        │   ├── GameMemoryScreen.tsx
        │   ├── GameReactionScreen.tsx
        │   ├── GameNumberGuessScreen.tsx
        │   ├── GameMathSprintScreen.tsx
        │   ├── GameRPSScreen.tsx
        │   ├── GameSlidingPuzzleScreen.tsx
        │   └── GameAeroDashScreen.tsx
        └── settings/
            └── SettingsScreen.tsx   # Theme, audio, data & privacy settings
```

---

## 🚀 Running the App

### Start Development Server
```bash
npm start
```

### Run on Android Device / Emulator
```bash
npm run android
```

### Run in Web Browser
```bash
npm run web
```

---

## 📦 Building for Android Production

### 1. Build Standalone Android APK (for testing & side-loading)
```bash
npx eas build -p android --profile preview
```

### 2. Build Google Play Store AAB (Android App Bundle)
```bash
npx eas build -p android --profile production
```

---

## 🧪 Offline Verification Test Protocol

1. **Airplane Mode / Wi-Fi OFF:**
   - Launch ToolBox X. The top status pill displays `OFFLINE MODE`.
   - Open **Calculator**, **GST**, **EMI**, **Image Compressor**, **QR Generator**, or **PDF Maker**. All execute smoothly.
   - Open any of the **10 mini-games** (2048, Snake, Tic-Tac-Toe, Reaction Test, etc.). They run 100% locally with high score saving.
   - Tapping an online feature (e.g. AI Chat) presents the clean `Internet Connection Required` modal without crashing.

2. **Network Restored:**
   - Turn Wi-Fi / mobile data ON.
   - The status pill updates to `ONLINE`.
   - Live currency exchange rates and AI features become instantly available.
   - AdMob requests ads without disrupting the user flow.
