# TOOLBOX X — ERROR AUDIT & FUNCTIONAL REWRITE CHECKLIST

This document details the complete inspection, root-cause analysis, and systematic fix plan for all features in ToolBox X.

---

## 1. Image Compressor
- **Current Implementation:** `src/screens/tools/ImageCompressorScreen.tsx` using `expo-image-manipulator` and basic info lookup.
- **Problems:**
  - Does not read original size reliably on Android `content://` URIs.
  - Quality options only had hard-coded numbers (0.2, 0.4, 0.6, 0.8) without Low, Medium, High, and Custom selection.
  - No explicit local save to device gallery/downloads.
  - Share logic lacked robust file verification and mimeType validation.
- **Root Cause:** Android content URIs return `undefined` on `FileSystem.getInfoAsync` without copying to a cached local file. Quality was not structured per spec.
- **Required Fix:**
  - Copy picked asset to `FileSystem.cacheDirectory` to guarantee absolute file path and exact byte length.
  - Implement Quality presets: `Low` (0.3), `Medium` (0.5), `High` (0.8), `Custom` (0.1–0.99 slider).
  - Display exact Before/After: e.g. "Original: 5.8 MB", "Compressed: 1.7 MB", "Reduced: 70.7%".
  - Provide both [Save to Device] and [Share Image] via centralized sharing service.
- **Testing Method:** Pick a real JPEG/PNG, compress at various quality settings, verify new file creation on disk, check byte reduction percentage, test sharing.

---

## 2. Image Resizer
- **Current Implementation:** `src/screens/tools/ImageResizerScreen.tsx`.
- **Problems:**
  - Aspect ratio recalculation could get stuck or produce NaN if input was temporarily empty.
  - Presets did not include `Original` (100%).
  - Does not display "Original: 1920 × 1080 | New: 1280 × 720" clearly in the result card.
- **Root Cause:** Input parsing desync and missing explicit dimension validation before calling `ImageManipulator`.
- **Required Fix:**
  - Clean two-way aspect ratio sync: modifying width auto-updates height; modifying height auto-updates width.
  - Presets: `Original`, `25%`, `50%`, `75%`, `Custom`.
  - Validate non-zero positive integers.
  - Verified output preview with Before/After dimension stats.
- **Testing Method:** Pick photo, enter custom width, verify height updates proportionately, execute resize, inspect result file dimensions.

---

## 3. Image Converter
- **Current Implementation:** `src/screens/tools/ImageConverterScreen.tsx`.
- **Problems:**
  - Did not prevent PDFs or non-image files from being selected, or warn the user.
  - Did not generate standardized output filenames (`toolbox_converted_YYYYMMDD.png/jpg/webp`).
  - Lacked proper format-specific MIME type mapping.
- **Root Cause:** Lack of file extension check and missing PDF redirection alert.
- **Required Fix:**
  - Inspect selected file extension/MIME: if `.pdf`, show: "This file is a PDF. Please use PDF Tools for PDF operations."
  - Support JPG → PNG, PNG → JPG, JPG → WEBP, PNG → WEBP, WEBP → JPG.
  - Save output with clean file naming and correct MIME type.
- **Testing Method:** Attempt picking PDF (verify rejection banner), pick PNG, convert to JPEG and WEBP, verify file integrity.

---

## 4. Image to PDF Maker & PDF Sharing
- **Current Implementation:** `src/screens/tools/PDFToolsScreen.tsx`.
- **Problems:**
  - Generated PDF via `Print.printToFileAsync` stored in temp cache with obscure name.
  - Sharing frequently failed on Android because the temporary file URI was not converted into a standard shareable file with `application/pdf` MIME type.
  - Missing page reordering (Move Up / Move Down).
  - Missing separate [Open PDF] and [Save PDF] options.
- **Root Cause:** Android FileProvider permissions for Expo cache files require proper URI handling and explicit `application/pdf` MIME type.
- **Required Fix:**
  - Copy generated PDF to `FileSystem.documentDirectory + 'ToolBoxX_Images_' + date + '.pdf'`.
  - Provide Reorder controls (Move Up / Down / Remove) for each page.
  - Provide [Open PDF], [Save PDF], and [Share PDF] with verified `application/pdf` MIME type.
- **Testing Method:** Select 3 images, reorder them, generate PDF, verify page count and file size, test [Share PDF] sheet.

---

## 5. QR Code Generator & QR Share Bug
- **Current Implementation:** `src/screens/tools/QRGeneratorScreen.tsx`.
- **Problems:**
  - **CRITICAL BUG:** When clicking Share, it invoked `Share.share({ message: qrPayload })`, sharing raw text or contact name strings rather than an image file!
- **Root Cause:** Using React Native `Share` with a text message string instead of capturing the SVG QR code into a `.png` file.
- **Required Fix:**
  - Use `QRCode` SVG ref `toDataURL` to generate base64 PNG data.
  - Write base64 to `FileSystem.cacheDirectory + 'toolbox_qr_2026.png'`.
  - Share via `Sharing.shareAsync` with `mimeType: 'image/png'`.
  - Provide [Save PNG] to save the actual image locally.
- **Testing Method:** Generate Contact QR and URL QR, tap Share, verify receiving app receives an actual PNG image file `toolbox_qr_2026.png` instead of a text string.

---

## 6. Tic-Tac-Toe Game Engine
- **Current Implementation:** `src/screens/games/GameTicTacToeScreen.tsx`.
- **Problems:**
  - Player could tap during computer's turn (timeout window), causing desync or duplicate moves.
  - Win/Draw states did not completely lock board.
  - Reset vs New Game semantics were confused.
- **Root Cause:** Missing `isThinking` flag and board lock when game is ended.
- **Required Fix:**
  - `isThinking` state disables touch inputs while AI calculates.
  - Unbeatable Minimax algorithm for Hard difficulty.
  - Clean [Restart Round] and [New Game] actions.
- **Testing Method:** Play against Easy, Medium, Hard AI; verify AI cannot be interrupted, verify win/loss/draw detection and score tracking.

---

## 7. 15-Tile Sliding Puzzle
- **Current Implementation:** `src/screens/games/GameSlidingPuzzleScreen.tsx`.
- **Problems:**
  - Time was displayed in raw seconds rather than classic `MM:SS`.
  - Shuffle was purely random-rejection without a quick deterministic solvable generator.
  - Missing proper celebration dialog with exact moves and formatted time.
- **Root Cause:** Display formatting and basic shuffle logic.
- **Required Fix:**
  - Ensure strictly solvable initial configurations using inversion parity + blank row from bottom.
  - Display `Time: 01:42 | Moves: 56`.
  - Classic wooden/slate utility tile design with green highlight for tiles in correct position.
- **Testing Method:** Test move counter, verify only adjacent tiles slide into empty slot, test restart and new puzzle.

---

## 8. Aero Dash Arcade Game
- **Current Implementation:** `src/screens/games/GameAeroDashScreen.tsx`.
- **Problems:**
  - Touch input lag: `handleFlap` updated React state `velocity`, but the active `requestAnimationFrame` loop relied on closed-over local variables.
  - Obstacle collision boxes were misaligned with graphic boundaries.
  - Restart could trigger duplicate animation loops or frame stacking.
- **Root Cause:** React state closure desynchronization in high-frequency animation loops.
- **Required Fix:**
  - Store physics state in mutable `useRef` (`gameStateRef`).
  - `handleFlap` directly mutates `gameStateRef.current.vy = JUMP_FORCE`, achieving zero-latency response.
  - Clear previous animation frame ID before starting a new loop.
  - Proper collision detection with player bounding box and energy gates.
- **Testing Method:** Tap rapidly, verify immediate flap response, test collision with top/bottom gates, verify clean game over and restart.

---

## 9. AI Assistant, Summarizer, Grammar Checker, Question Solver
- **Current Implementation:** `src/screens/tools/AIToolScreen.tsx`.
- **Problems:**
  - **CRITICAL:** Responses were simulated using `setTimeout` with hard-coded dummy text!
  - No real API integration existed.
- **Root Cause:** Missing central AI client architecture.
- **Required Fix:**
  - Create `src/services/ai/aiClient.ts` with real HTTP fetch client.
  - Support Google Gemini (`gemini-2.0-flash` / `gemini-1.5-flash`) and OpenAI-compatible API endpoints.
  - Support API key configuration in Settings and secure local storage.
  - Implement real endpoints:
    - `aiAssistant.ts`: Full conversational streaming/chat.
    - `summarizer.ts`: Real text summary with structured key points.
    - `grammarChecker.ts`: Real grammar correction with itemized explanations.
    - `questionSolver.ts`: Real step-by-step solver with image multimodal support via base64!
  - Handle offline checks and API errors gracefully.
- **Testing Method:** Configure API key in Settings, send query to AI chat, summarize text, test grammar check, upload question image.

---

## 10. Classic Professional UI Redesign
- **Current Implementation:** Neon green/teal theme, oversized emojis, basic cards.
- **Problems:** Felt like a basic demo rather than a mature, reliable utility tool.
- **Required Fix:**
  - Redesign using a classic Dark Navy (`#0F172A`, `#1E293B`, `#1E3A8A`) and crisp White/Slate (`#F8FAFC`, `#E2E8F0`) theme.
  - Accent: Classic Royal Blue (`#2563EB`).
  - Professional typography, clear hierarchy, structured cards, classic status bars.
  - Clean vector icons from `@expo/vector-icons` (Ionicons / MaterialCommunityIcons) instead of bare emojis.
