# OpenCut AI Implementation & Modernization Checklist

This checklist defines the phased roadmap for setting up OpenCut and embedding local-first and cloud AI features, orchestrated by the `.agents` team under strict TDD and engineering discipline.

---

## Phase 0: Project Setup & Baseline Verification

- [x] **0.1 Package Manager & Tooling Alignment**
  - [x] Inspect existing `bun.lock` vs `.agents/rules.md` (which prefers `pnpm`/`rtk`).
  - [x] Verify local Node/Bun/Rust environment and establish approved execution command line.
  - [x] Test and confirm `apps/web` dependencies install cleanly (Bun v1.4.2 installed 733 packages).
- [x] **0.2 Environment Configuration**
  - [x] Create `apps/web/.env.local` from `apps/web/.env.example`.
  - [x] Populate local test keys (including `FAL_KEY` / `NEXT_PUBLIC_FAL_KEY` if testing fal.ai).
  - [x] Verify whether Docker services (`db`, `redis`) are needed for the current dev scope.
- [x] **0.3 Baseline Build & Pre-Flight Smoke Test**
  - [x] Verify WebAssembly bindings (`opencut-wasm`) build or link correctly.
  - [x] Run initial typecheck and linting (`bun run lint:web`).
  - [x] Run existing test suite to ensure green baseline before touching code (145 passed).
  - [x] Run clean git repo initialization and push to origin main.

---

## Phase 1: Smart Silence & Dead-Air Remover ("Smart Jump-Cut")
*Objective: 100% local, client-side silence removal using AudioContext waveform data + Whisper timestamps to auto-split and ripple-delete pauses.*

- [x] **1.1 Specification & Planning (`kiro-planner.md` & `subagents/web-crawler`)**
  - [x] Web research via crawler: extracted Descript & CapCut standards (-35 dB threshold, 0.5s pause, 100ms padding).
  - [x] Author `PLAN.md` with atomic tasks and single write surfaces.
  - [x] Define silence detection algorithm (RMS amplitude threshold + minimum pause duration).
  - [x] Define integration with ripple engine for non-destructive cuts.
- [x] **1.2 Core Algorithm (TDD RED -> GREEN)**
  - [x] Write unit tests for audio silence detection on synthetic audio buffers.
  - [x] Implement silence detection helper in `src/lib/media/silence-detector.ts`.
  - [x] Write integration test simulating timeline element splitting at silence intervals (`silence-cut.test.ts`).
  - [x] Implement multi-split and batch ripple-delete timeline command (`computeSilenceCuts`).
- [x] **1.3 UI Integration (`designer-worker.md` & `apple-design`)**
  - [x] Author design specification dossier in `.agents/team/dossiers/silence-remover-ui.md`.
  - [x] Add "Smart Cut" / "Remove Silences" trigger in Timeline Toolbar (`timeline-toolbar.tsx`) with `Alt+S` shortcut.
  - [x] Build interactive translucent modal (`SilenceRemoverDialog.tsx`) with adjustable sliders:
    - *Silence Threshold (dB)* (-60dB to -20dB, default -35dB)
    - *Min Silence Duration* (0.2s to 2.0s, default 0.5s)
    - *Padding/Buffer* (0ms to 250ms, default 100ms)
  - [x] Connect scan button to `extractTimelineAudio` & `decodeAudioToFloat32` and apply cuts directly to scene tracks.
- [x] **1.4 Verification & Review (`diff-scan.ps1` & `agy-verifier.md`)**
  - [x] Unit test suite passed (6 pass, 0 fail).
  - [x] Formatted and lint-checked via Biome.
  - [x] Keybinding migration v7-to-v8 registered for `Alt+S`.

---

## Phase 2: fal.ai Cloud Generative Suite
*Objective: Leverage OpenCut sponsor fal.ai for Text-to-Speech (voiceover), AI B-Roll generation, and Foley sound effect generation.*

- [x] **2.1 Architectural Foundation**
  - [x] Installed `@fal-ai/client` into `apps/web`.
  - [x] Implemented secure server-side proxy route in `apps/web/src/app/api/fal/proxy/route.ts` protecting `FAL_KEY`.
  - [x] Created `FalService` (`src/services/ai/fal-service.ts`) with typed formatters for Flux Schnell, MiniMax Speech/TTS, and Stable Audio/MMAudio sound effects.
  - [x] Authored unit tests in `src/services/ai/__tests__/fal-service.test.ts` (3 pass, 0 fail).
- [x] **2.2 AI Voiceover / Text-to-Speech (TTS)**
  - [x] Added "Generate AI Voiceover" quick action to the Text properties panel (`text-tab.tsx`).
  - [x] Automatically streams synthesis, builds an audio asset, and inserts an audio element directly onto the timeline aligned with the text layer.
  - [x] Provided voice style selectors (Natural, Studio Host, Narrator, Warm) in AI Studio.
- [x] **2.3 Generative B-Roll & AI Images**
  - [x] Created new `"ai"` tab registered in `assets-panel-store.tsx` with `AiBrain05Icon`.
  - [x] Built `AIStudioView` in `apps/web/src/components/editor/panels/assets/views/ai-studio.tsx`.
  - [x] Integrated Flux with aspect ratio presets: `16:9` (Landscape), `9:16` (Vertical/Reels), `1:1` (Square) and instant suggestion chips.
  - [x] Direct 1-click "Add to Timeline" (inserts as image element at playhead) and "Save to Assets".
- [x] **2.4 AI Sound FX Generation**
  - [x] Integrated prompt-based Foley generator in AI Studio with duration slider (1-10s) and sound suggestions.
  - [x] In-app audio preview with instant timeline insertion.
- [x] **2.5 Gate & Review**
  - [x] Non-blocking graceful error handling when keys are unconfigured.
  - [x] Strict Biome formatting and zero lint errors.

---

## Phase 3: Text-Based Video Editing (Descript-style)
*Objective: Edit video footage directly by manipulating the generated transcript text.*

- [x] **3.1 Word-Level Timestamp Alignment & Parsing**
  - [x] Created `src/lib/transcription/word-parser.ts` to tokenize transcript segments into timed word chips (`TranscriptWord`).
  - [x] Implemented intelligent linear timestamp interpolation when word-level timestamps are not explicitly emitted.
  - [x] Authored unit tests in `src/lib/transcription/__tests__/word-parser.test.ts` (3 pass, 0 fail).
- [x] **3.2 Interactive Transcript UI**
  - [x] Created `TranscriptEditorStore` (`src/stores/transcript-editor-store.ts`) for managing transcription segments and selected word tokens.
  - [x] Built `TranscriptEditorView` in `src/components/editor/panels/assets/views/transcript-editor.tsx`.
  - [x] Integrated segmented switch in `Captions` view (`captions.tsx`) between "Subtitles" and "Text Editor".
  - [x] Real-time playhead tracking: words highlight in active accent style (`bg-primary/25`) in sync with timeline video playback.
  - [x] Click-to-seek: clicking any word chip scrubs the video playhead directly to `word.start`.
- [x] **3.3 Filler Word Detection & Timeline Slicing**
  - [x] Automated detection of conversational fillers (`"um"`, `"uh"`, `"like"`, `"you know"`, repeated consecutive words) with amber badges.
  - [x] 1-click **"Remove All Fillers"** action: converts words into silence intervals with 50ms consonant safety padding and computes batch ripple-cuts across all tracks (`main`, `overlay`, `audio`).
  - [x] Multi-word selection (Shift+Click) and **"Cut Selected Words"** action with strikethrough preview.
- [x] **3.4 Gate & Review**
  - [x] All 12 unit tests passing under Bun (`silence-detector`, `silence-cut`, `fal-service`, `word-parser`).
  - [x] Biome formatting verified with 0 errors and 0 warnings.

---

## Phase 4: AI Computer Vision & Auto-Masking
*Objective: Automatic background removal (green-screen-less cutout) feeding into Rust/WASM mask and compositor engine.*

- [x] **4.1 Client-Side Segmentation Engine**
  - [x] Implemented client-side segmentation & alpha matte calculation in `src/services/ai/segmentation-service.ts`.
  - [x] Export alpha matte as binary mask buffer with luminance, chroma saliency, and spatial prior weighting.
  - [x] Authored unit tests in `src/services/ai/__tests__/segmentation-service.test.ts` (3 pass, 0 fail).
- [x] **4.2 Rust/WASM Mask Pipeline Integration**
  - [x] Pipe generated alpha matte and feathering parameters into mask pipeline (`rust/crates/masks/`).
  - [x] Added "AI Smart Cutout / Remove Background" section in `masks-tab.tsx` with instant tactility, threshold slider (10-90%), feather slider (0-40px), and subject/background invert toggle.
- [x] **4.3 Auto-Reframe (16:9 to 9:16)**
  - [x] Subject focal trajectory tracking with EMA damping and deadband smoothing in `src/services/ai/auto-reframe.ts`.
  - [x] Calculates smooth bounding box center and injects position X keyframes via `computeAutoReframeKeyframes`.
  - [x] Added "Auto-Reframe (9:16)" section in `transform-tab.tsx` with interview, standard, and action presets.
  - [x] Authored unit tests in `src/services/ai/__tests__/auto-reframe.test.ts` (5 pass, 0 fail).
- [x] **4.4 Gate & Review**
  - [x] All 20 AI unit tests pass across Phases 1 through 4.
  - [x] Verified Biome formatting and zero lint errors on all touched UI and service surfaces.

---

## Execution Progress Tracker

| Milestone | Status | Lead Role | Exit Gate Criteria |
|---|---|---|---|
| **Phase 0: Baseline & Dev Setup** | Completed | Coordinator | Clean install, green lint & test suite |
| **Phase 1: Silence Remover** | Completed | Kiro Planner + Coder + Designer | Unit tests pass, ripple cut verified |
| **Phase 2: fal.ai Suite** | Completed | Coder + Designer | Cloud TTS & B-roll imported to timeline |
| **Phase 3: Text-Based Editing** | Completed | Coder + Verifier | Transcript deletions slice timeline |
| **Phase 4: Auto-Masking & Reframe**| Completed | Coder + Designer + Rust Lead | Real-time mask rendering on GPU & Keyframed Pan |

