# UI/UX Specification: fal.ai Generative Studio & Text-Based Video Editor
**Authored by**: `designer-worker.md` (Enforcing `apple-design` & Invariants 1-4)  
**Research Source**: `subagents/web-crawler` (fal.ai SDK Next.js Architecture & Descript Interaction Models)

---

## 1. Phase 2: fal.ai AI Studio UI Design

### Surface & Placement:
* **Assets Panel Tab**: Add a new tab `ai` to `apps/web/src/stores/assets-panel-store.tsx` with `MagicWand01Icon` / `SparklesIcon` labeled **"AI Studio"**.
* **Layout Structure** (`ai-generate.tsx`):
  1. **Translucent Segmented Header**:
     - Toggle between **"Image / B-Roll"**, **"Voiceover (TTS)"**, and **"Sound FX"**.
     - Tactility: 0ms pointer-down active pill indicator.
  2. **Image / B-Roll Generation Panel**:
     - Prompt Textarea with auto-expanding height and clean placeholder prompts.
     - Aspect Ratio selector: `16:9` (Landscape), `9:16` (Vertical / Reels), `1:1` (Square).
     - Generate button with live Fal streaming status ("Queued...", "Generating...", "Ready").
     - Output preview card with 1-click **"Add to Timeline"** and **"Save to Media"** actions.
  3. **Voiceover / TTS Generator**:
     - Script text input with word count / estimated duration indicator.
     - Voice selector (e.g., Natural, Studio, Narrative, Warm).
     - "Generate Audio" button -> automatically streams progress and previews audio waveform.
  4. **Text Tab Quick Action**:
     - In `text-tab.tsx`, add a **"Convert to AI Voiceover"** action button that directly passes the text layer's string to the TTS engine.

---

## 2. Phase 3: Text-Based Video Editing UI Design (Descript Model)

### Surface & Placement:
* **Location**: In the Captions / Transcript view (`captions.tsx`), add an interactive **"Text-Based Editor"** mode.
* **Interactive Transcript Canvas**:
  - Rather than raw text strings, each word renders as an individual interactive token (`WordToken`).
  - Active Word: Real-time playhead tracking highlights the current spoken word with `bg-primary/20 text-primary font-medium rounded px-1 transition-colors duration-75`.
  - Click to Seek: Clicking any word token scrubs the playhead directly to `word.start` timecode.
* **Filler Word Highlighting & Triage**:
  - Filler words (`"um"`, `"uh"`, `"like"`, `"you know"`, repeated words) automatically render with a gentle amber badge (`bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded px-1`).
  - Global Action Bar at top of Transcript:
    - `"Remove 6 Filler Words"` button with lightning icon.
    - Clicking executes an immediate batch ripple-cut across the timeline with 50ms consonant safety padding.
* **Text Selection & Slicing**:
  - Selecting words and pressing `Backspace` / `Delete` strikes through the text and instantly cuts the corresponding audio/video clips on the timeline via `computeSilenceCuts`.

---

## 3. Motion & Ergonomics Invariants
* **60fps Frame Budget**: Word highlighting uses `transform` and `color/background-color` transitions without triggering DOM reflows.
* **Defensive Ergonomics**: All word chips have minimum hit area padding; slider/button heights >= 40px; empty state handles projects with no audio cleanly.
