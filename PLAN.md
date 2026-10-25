# PLAN.md — Phase 1: Smart Silence & Dead-Air Remover ("Smart Jump-Cut")
**Architect**: `kiro-planner.md`  
**Execution Contract for**: `coder-worker.md`  
**Standard**: Strict TDD (RED ➔ GREEN ➔ IMPROVE), Single Write Surfaces, Diff-Only Review

---

### Task 1: Silence Interval Detection Engine
* **Objective**: Compute start and end timestamps (in seconds and ticks) of silent intervals from audio sample buffers.
* **Write Surface**: `apps/web/src/lib/media/silence-detector.ts`
* **Test Surface**: `apps/web/src/lib/media/__tests__/silence-detector.test.ts`
* **Algorithm**:
  - Convert dB threshold to linear amplitude: `amplitudeThreshold = 10^(thresholdDb / 20)`.
  - Process Float32Array samples in small analysis windows (e.g., 20ms = `sampleRate * 0.02`).
  - Calculate RMS energy: `RMS = sqrt(sum(s^2) / N)`.
  - Mark windows below `amplitudeThreshold` as silent.
  - Group contiguous silent windows into intervals `[start, end]`.
  - Filter out intervals shorter than `minDurationSeconds`.
  - Apply `paddingSeconds` inward (shrink silence interval by padding at both ends so word boundaries are protected).
* **Exit Gate**: `bun test apps/web/src/lib/media/__tests__/silence-detector.test.ts` passes GREEN.

---

### Task 2: Timeline Silence Batch-Split & Ripple Removal
* **Objective**: Split timeline clips around detected silence intervals and delete the silent segments while applying ripple adjustments to close the gaps.
* **Write Surface**: `apps/web/src/lib/timeline/silence-cut.ts`
* **Test Surface**: `apps/web/src/lib/timeline/__tests__/silence-cut.test.ts`
* **Logic**:
  - Accept `tracks`, `silenceIntervals: Array<{ start: number, end: number }>` in ticks/seconds.
  - Calculate cut points across active audio/video tracks.
  - For each silence interval, split elements overlapping the interval and mark the dead-air segment for removal.
  - Call `computeRippleAdjustments` / `applyRippleAdjustments` from `src/lib/ripple/` to shift subsequent elements left.
* **Exit Gate**: `bun test apps/web/src/lib/timeline/__tests__/silence-cut.test.ts` passes GREEN.

---

### Task 3: Action Registration & Handler
* **Objective**: Expose `remove-silence` through the OpenCut action system.
* **Write Surface 1**: `apps/web/src/lib/actions/definitions.ts`
* **Write Surface 2**: `apps/web/src/hooks/actions/use-editor-actions.ts`
* **Exit Gate**: Action can be dispatched via `invokeAction("remove-silence")`.

---

### Task 4: Silence Remover Dialog Component (`apple-design`)
* **Objective**: Render translucent modal popover in the timeline toolbar matching `designer-worker` spec.
* **Write Surface**: `apps/web/src/components/editor/panels/timeline/silence-remover-dialog.tsx`
* **Integration Surface**: `apps/web/src/components/editor/panels/timeline/timeline-toolbar.tsx`
* **Exit Gate**: Toolbar displays Smart Cut button; dialog opens with threshold, duration, and padding sliders, calculates detected gaps, and applies cut.

---

### Task 5: Gate Execution & Review
* **Commands**:
  - `bun test`
  - `bun run lint:web`
  - `.agents/team/diff-scan.ps1`
* **Exit Gate**: Exit 0 (GREEN), zero blocking review findings.
