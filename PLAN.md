# PLAN.md — Phase 2 (fal.ai Cloud Studio) & Phase 3 (Text-Based Video Editing)
**Architect**: `kiro-planner.md`  
**Execution Standard**: Strict TDD, Single Write Surfaces, Diff-Only Review

---

### Track A: Phase 2 — fal.ai Cloud Generative Suite

#### Task 2.1: Fal Proxy Route & Client Foundation
* **Objective**: Create secure serverless proxy route in Next.js App Router to protect `FAL_KEY`, and client initialization wrapper.
* **Write Surface 1**: `apps/web/src/app/api/fal/proxy/route.ts`
* **Write Surface 2**: `apps/web/src/lib/fal/client.ts`
* **Exit Gate**: Proxy route accepts requests, forwards to fal with authorization header, handles missing key gracefully with clear error/mock for development.

#### Task 2.2: AI Generation Service & Tests
* **Objective**: Client-side service executing Image generation (Flux), Text-to-Speech, and Foley Sound FX.
* **Write Surface**: `apps/web/src/services/ai/fal-service.ts`
* **Test Surface**: `apps/web/src/services/ai/__tests__/fal-service.test.ts`
* **Exit Gate**: Unit tests verify payload formatting, response parsing, and error handling.

#### Task 2.3: AI Studio UI in Assets Panel
* **Objective**: Implement "AI Studio" tab in Assets Panel and "Generate Speech" shortcut in Text properties panel.
* **Write Surface 1**: `apps/web/src/stores/assets-panel-store.tsx` (add `ai` tab)
* **Write Surface 2**: `apps/web/src/components/editor/panels/assets/views/ai-studio.tsx` (Image / TTS / SFX generator)
* **Write Surface 3**: `apps/web/src/components/editor/panels/properties/tabs/text-tab.tsx` (TTS button)
* **Exit Gate**: Tab bar displays AI Studio; clicking switches to studio view; generated media imports into timeline & assets pool.

---

### Track B: Phase 3 — Text-Based Video Editing (Descript Model)

#### Task 3.1: Word Token Parsing & Filler Word Engine
* **Objective**: Convert transcript segments into interactive word tokens with timestamps and filler word detection.
* **Write Surface**: `apps/web/src/lib/transcription/word-parser.ts`
* **Test Surface**: `apps/web/src/lib/transcription/__tests__/word-parser.test.ts`
* **Logic**:
  - `parseTranscriptWords({ segments })`: splits segment text into word tokens with interpolated timecodes.
  - `detectFillerWords({ words })`: flags conversational filler (`"um"`, `"uh"`, `"like"`, `"you know"`).
  - `convertWordsToCuts({ wordsToDelete, paddingSeconds })`: converts selected word intervals into `SilenceIntervalWithTicks` for timeline ripple cuts.
* **Exit Gate**: `bun test apps/web/src/lib/transcription/__tests__/word-parser.test.ts` passes GREEN.

#### Task 3.2: Interactive Transcript Editor View
* **Objective**: Render interactive word chips with click-to-seek, live playhead highlighting, filler word tags, and one-click removal.
* **Write Surface**: `apps/web/src/components/editor/panels/assets/views/transcript-editor.tsx`
* **Integration Surface**: `apps/web/src/components/editor/panels/assets/views/captions.tsx`
* **Exit Gate**: Captions tab allows toggling to "Text Editor" mode; clicking words seeks timeline; "Remove Filler Words" ripples clips.

---

### Task 4: Verification, Lint & Review Gate
* **Commands**:
  - `bun test`
  - `bun x @biomejs/biome check`
  - `.agents/team/diff-scan.ps1`
* **Exit Gate**: All tests pass, 0 lint errors, clean git status.
