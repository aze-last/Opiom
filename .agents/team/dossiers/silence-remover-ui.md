# UI/UX Specification: Smart Silence Remover ("Smart Jump-Cut")
**Authored by**: `designer-worker.md` (Enforcing `apple-design` & Invariants 1-4)  
**Research Source**: `subagents/web-crawler` (Descript & CapCut Industry Standards)

---

## 1. Ergonomic Placement & Hierarchy
* **Location**: Timeline Toolbar ([`timeline-toolbar.tsx`](file:///c:/Users/ASUS/Downloads/Programs/OpenCut-0.3.0/OpenCut-0.3.0/apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx)), grouped immediately adjacent to the `SplitButton` (Scissors) and `OcRippleIcon`.
* **Trigger Component**:
  - Icon: Waveform / Sound Mute Icon (`Audio01Icon` / `WaveformIcon` or `ScissorsCuttingIcon` with subtle sparkle badge).
  - Label / Tooltip: `"Smart Cut (Silence Remover)"` with shortcut tooltip (`Alt+S`).
  - Tactility: 0ms pointer-down press scale (`scale-95 active:scale-90 transition-transform duration-75`).

---

## 2. Interactive Dialog Surface ("Apple Translucent Material")
* **Surface**: Layered translucent material:
  - `bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl p-5 w-[380px]`
* **Rhythm & Structure**:
  1. **Header**:
     - Title: `Smart Silence Remover` (text-sm font-semibold tracking-tight)
     - Subtitle: `Detect and ripple-delete pauses across selected or active tracks.` (text-xs text-muted-foreground)
  2. **Parameter Controls**:
     - **Silence Threshold (`dB`)**:
       - Slider range: `-60 dB` (subtle) to `-20 dB` (aggressive). Default: `-35 dB`.
       - Micro-label: Dynamic live readout with badge (`"-35 dB"`).
     - **Minimum Gap Duration (`s`)**:
       - Slider range: `0.2s` to `2.0s`. Default: `0.5s`.
       - Micro-label: `0.50s`.
     - **Safety Padding (`ms`)**:
       - Preserves starting consonants and natural breath.
       - Slider range: `0ms` to `250ms`. Default: `100ms`.
  3. **Analysis Bar / Live Feedback**:
     - While scanning: Smooth subtle indeterminate progress bar (`progress.tsx`) + `Spinner`.
     - Idle / Scanned:
       - If silences found: Badge with count (`Found 8 gaps — 4.2s total`) in `bg-secondary text-foreground text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center justify-between`.
       - If 0 found: Amber caution badge (`No silences detected above threshold`).
  4. **Action Footer**:
     - Secondary: `Cancel` (`variant="ghost"`).
     - Primary: `Apply Ripple Cut` (`variant="default"` with 0ms click feedback, disabled when 0 gaps or scanning).

---

## 3. Motion & Compositor Invariants
* **Transition**: Dialog enter/exit uses spring dynamics (`scale: 0.95 -> 1.0, opacity: 0 -> 1` via `motion`).
* **Compositor Isolation**: No layout thrashing (`width`/`height`). All animations composite-only (`transform`, `opacity`).
* **Accessible Fallback**: `@media (prefers-reduced-motion: reduce)` disables transform scaling and uses instantaneous opacity fades.

---

## 4. Worst-Case Data Defensive Safeguards
* **Empty Timeline**: Button disabled with tooltip `"Add media to timeline to detect silence"`.
* **Huge Project (1hr+)**: Chunked processing with cancellation token to prevent main thread frame drops.
* **Touch Ergonomics**: All slider thumb hitboxes >= 44x44px; button hitboxes >= 40px height.
