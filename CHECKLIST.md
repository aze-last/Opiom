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

- [ ] **2.1 Architectural Foundation**
  - [ ] Install `@fal-ai/serverless-client` or configure proxy API route in `apps/web/src/app/api/ai/fal/route.ts` to keep API keys secure.
  - [ ] Add client-side Fal client wrapper with progress streaming and error handling.
- [ ] **2.2 AI Voiceover / Text-to-Speech (TTS)**
  - [ ] Add "Generate Speech" action in the Text properties panel (`text-tab.tsx`).
  - [ ] Integrate fast TTS models (e.g. Kokoro / ElevenLabs / F5-TTS via fal.ai).
  - [ ] Automatically place generated `.wav`/`.mp3` audio file onto a new AudioTrack aligned with the text element.
- [ ] **2.3 Generative B-Roll & AI Images**
  - [ ] Create an "AI Studio" view inside `apps/web/src/components/editor/panels/assets/views/ai-generate.tsx`.
  - [ ] Text-to-Image (Flux) and Text-to-Video models with preset aspect ratios (16:9, 9:16, 1:1).
  - [ ] Direct "Insert to Timeline" and "Add to Media Pool" actions.
- [ ] **2.4 AI Sound FX Generation**
  - [ ] Extend `sounds.tsx` with a prompt-based sound generator (e.g. "cinematic impact", "laser whoosh").
  - [ ] Preview waveform and auto-add to timeline.
- [ ] **2.5 Gate & Review**
  - [ ] Validate non-blocking error handling for network/API failures.
  - [ ] Run pre-flight gate and diff review.

---

## Phase 3: Text-Based Video Editing (Descript-style)
*Objective: Edit video footage directly by manipulating the generated transcript text.*

- [ ] **3.1 Word-Level Timestamp Alignment**
  - [ ] Extend Whisper transcription pipeline (`worker.ts`) to return word-level timestamps alongside segments.
  - [ ] Store word-to-timestamp index in project store or active scene state.
- [ ] **3.2 Interactive Transcript UI**
  - [ ] Build word-segmented interactive reader in `CaptionsView` / dedicated Transcript panel.
  - [ ] Clicking a word scrubs playhead to exact video frame.
  - [ ] Selecting and striking out/deleting text invokes ripple-cut command to slice and delete video/audio frames.
- [ ] **3.3 Filler Word Detection**
  - [ ] Highlight detected filler words ("um", "uh", repeated words) in amber.
  - [ ] One-click button: "Delete All Filler Words".
- [ ] **3.4 Gate & Review**
  - [ ] Stress-test long transcripts (30+ minutes).
  - [ ] Run test suite and review diffs.

---

## Phase 4: AI Computer Vision & Auto-Masking
*Objective: Automatic background removal (green-screen-less cutout) feeding into Rust/WASM mask and compositor engine.*

- [ ] **4.1 Client-Side Segmentation Engine**
  - [ ] Setup web worker for image/video frame segmentation (MediaPipe Selfie Segmentation or RMBG-1.4 via `@huggingface/transformers` / ONNX WebGPU).
  - [ ] Export alpha matte as binary mask buffer.
- [ ] **4.2 Rust/WASM Mask Pipeline Integration**
  - [ ] Pipe generated alpha matte directly into OpenCut's JFA feathering mask pipeline (`rust/crates/masks/`).
  - [ ] Add "AI Background Removal" toggle in `masks-tab.tsx`.
- [ ] **4.3 Auto-Reframe (16:9 to 9:16)**
  - [ ] Face/subject tracking using ONNX face detector.
  - [ ] Calculate smooth bounding box center and inject position X keyframes.
- [ ] **4.4 Gate & Review**
  - [ ] Profile WebGPU performance and memory consumption.
  - [ ] Confirm no regressions in the GPUI desktop app builds.

---

## Execution Progress Tracker

| Milestone | Status | Lead Role | Exit Gate Criteria |
|---|---|---|---|
| **Phase 0: Baseline & Dev Setup** | Completed | Coordinator | Clean install, green lint & test suite |
| **Phase 1: Silence Remover** | Completed | Kiro Planner + Coder + Designer | Unit tests pass, ripple cut verified |
| **Phase 2: fal.ai Suite** | Ready to start | Coder + Designer | Cloud TTS & B-roll imported to timeline |
| **Phase 3: Text-Based Editing** | Queued | Coder + Verifier | Transcript deletions slice timeline |
| **Phase 4: Auto-Masking & Reframe**| Queued | Coder + Rust Lead | Real-time mask rendering on GPU |
