# UI/UX Specification: AI Auto-Masking, Background Removal & Auto-Reframe
**Authored by**: `designer-worker.md` (Enforcing `apple-design` & Invariants 1-4)  
**Research Source**: `subagents/web-crawler` (MediaPipe Canvas Alpha Matte Pipeline & Adobe/DaVinci Auto-Reframe Motion Smoothing)

---

## 1. AI Background Removal & Segmentation (`masks-tab.tsx`)

### Surface & Placement:
* **Location**: At the top of `masks-tab.tsx` inside an elevated `Section` titled **"AI Smart Cutout"**.
* **Controls**:
  1. **Primary Action**: "Remove Background" toggle button with `AiBrain05Icon` / `SparklesIcon`.
     - Tactility: 0ms pointer-down active scale (`active:scale-[0.98]`).
     - States: *Idle*, *Extracting Subject Alpha...*, *Cutout Active*.
  2. **Feather & Edge Softening**:
     - Fine slider: `0px` to `40px` feathering (piping into OpenCut's JFA mask feathering engine).
  3. **Matte Invert**:
     - Toggle between "Isolate Subject" and "Isolate Background".
  4. **Edge Threshold Slider**:
     - `10%` to `90%` sensitivity threshold with real-time preview.

---

## 2. Auto-Reframe 16:9 -> 9:16 (`transform-tab.tsx`)

### Surface & Placement:
* **Location**: Inside `transform-tab.tsx` in a new section **"AI Auto-Reframe (Vertical 9:16)"**.
* **Controls**:
  1. **Motion Tracking Preset**:
     - Segmented pill selector:
       - **"Interview"** (Deadband threshold 0.15, slow gentle camera tracking, ideal for podcasts/talking heads).
       - **"Standard"** (Balanced EMA smoothing $\alpha=0.2$, general vlogs).
       - **"Action"** (High responsiveness $\alpha=0.45$, sports, dancing, gaming).
  2. **1-Click Auto-Reframe Action**:
     - Button: `"Reframe to 9:16 Shorts/Reels"`.
     - Automatically:
       - Calculates subject focal trajectory across duration.
       - Generates smoothed X position keyframes using `upsertElementKeyframe`.
       - Adjusts canvas to `1080x1920` (9:16) with scale-to-fill height.
       - Marks project dirty and creates an undoable command.

---

## 3. Motion & Ergonomics Invariants
* **Invariance 1 (0ms response)**: Sliders and toggle switches respond immediately with no deferred pointer lag.
* **Invariance 2 (Spring Physics)**: Smooth ease transitions for toggles and pills.
* **Invariance 3 (60fps Budget)**: Matte compositing uses hardware-accelerated canvas `destination-in` with OffscreenCanvas.
* **Invariance 4 (Defensive Ergonomics)**: All interactive targets exceed 40px height.
