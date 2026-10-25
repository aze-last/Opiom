# UI/UX Specification: AI Clipper & Custom LLM Provider Settings
**Authored by**: `designer-worker.md` (Enforcing `apple-design` & Invariants 1-4)  
**Feature**: AI Clipper (Viral Shorts/Highlights Finder) + Bring-Your-Own API Keys (Custom Base URL & Secret Key)

---

## 1. Ergonomics & Architecture Invariants

* **Invariant 1 (Security & Client-Side Privacy)**:
  - User API keys never leave the client browser.
  - Stored strictly in `localStorage` under `opencut_ai_provider_config`.
  - Passwords and secret keys are masked by default (`type="password"`) with an eye toggle to inspect.
* **Invariant 2 (Apple Design & Tactility)**:
  - Quick-preset segmented switches for top LLM providers (OpenAI, Ollama Local, OpenRouter, DeepSeek, Groq, Custom).
  - 0ms visual feedback on clicks (`active:scale-[0.98]`).
  - Subtle translucent cards with hair-line borders (`border-border/60 bg-muted/20`).
* **Invariant 3 (Instant Validation)**:
  - Direct "Test Connection" button with real-time ping to `${baseUrl}/models` or completion check.
  - Clear visual badge: `Connected (Latency: 120ms)` in emerald, or detailed error diagnostic in rose.
* **Invariant 4 (Clipper Virality & Workflow)**:
  - Scans timeline transcript or video segments.
  - Renders discovered clips in high-density cards with virality score badges (e.g. `98% Virality`), start/end timestamps, hook titles, and reasonings.
  - 1-click actions: "Preview / Seek", "Slice & Keep", and "Reframe to 9:16 Shorts".

---

## 2. Surfaces & Placement

1. **New Web Page: `/settings` (and `/settings/ai`)**:
   - Full-page responsive settings layout using OpenCut's modern dark theme.
   - Base URL input (with placeholder e.g. `http://localhost:11434/v1` or `https://api.openai.com/v1`).
   - Secret Key input with reveal/hide icon.
   - Model name input with autocomplete presets (`gpt-4o`, `deepseek-chat`, `llama3.3`, `claude-3-5-sonnet`).
   - Temperature and max tokens sliders.
   - Test Connection action with animated state.

2. **In-Editor Settings Tab (`settings/index.tsx`)**:
   - Quick access to "AI Keys & Model" right inside the project editor assets panel.

3. **AI Clipper View (`ai-studio.tsx` -> "clipper" sub-tab)**:
   - Target duration selector: `<30s`, `30-60s`, `60-90s`.
   - Focus prompt: e.g. "Find viral hooks and punchlines", "Find instructional key moments".
   - "Generate Viral Clips" action button.
   - List of ranked clips with virality badges, hook cards, click-to-seek, and timeline slice actions.
