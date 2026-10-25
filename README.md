<table width="100%">
  <tr>
    <td align="left" width="120">
      <img src="apps/web/public/logos/opencut/icon.svg" alt="Opiom Logo" width="100" />
    </td>
    <td align="right">
      <h1>Opiom</h1>
      <h3 style="margin-top: -10px;">The Next-Generation AI-Powered Open-Source Video Editor for Web, Desktop, and Mobile.</h3>
    </td>
  </tr>
</table>

## Sponsors & Infrastructure

Thanks to [Vercel](https://vercel.com?utm_source=github-opencut&utm_campaign=oss) and [fal.ai](https://fal.ai?utm_source=github-opencut&utm_campaign=oss) for their support of open-source video innovation.

<a href="https://vercel.com/oss">
  <img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" />
</a>

<a href="https://fal.ai">
  <img alt="Powered by fal.ai" src="https://img.shields.io/badge/Powered%20by-fal.ai-000000?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCAxMEwxMy4wOSAxNS43NEwxMiAyMkwxMC45MSAxNS43NEw0IDEwTDEwLjkxIDguMjZMMTIgMloiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=" />
</a>

## Core Strengths

- **Local-First Privacy**: Your project files, media assets, and API keys stay on your local device.
- **Paywall-Free AI Suite**: Pro-grade features (silence removal, transcript cuts, auto-reframe, custom LLM clippers) without subscriptions.
- **Streamlined Precision**: High-speed, Apple-grade interface built for fluid editing and zero layout shifts.

## AI Capabilities

### 1. Smart Silence & Dead-Air Remover ("Smart Jump-Cut")
- 100% local, client-side audio pause detection using Web Audio API RMS amplitude analysis.
- Instant ripple-cutting with adjustable threshold (`-60dB` to `-20dB`), pause duration (`0.2s` to `2.0s`), and inward safety padding.
- Keyboard shortcut: `Alt+S`.

### 2. fal.ai Cloud Generative Suite
- **AI Image & B-Roll Generation**: Prompt-to-visual generation with Flux Schnell and aspect ratio presets (`16:9`, `9:16`, `1:1`, `4:3`).
- **AI Voiceover (TTS)**: Convert text layers directly into natural, studio-quality speech synced to the timeline.
- **AI Foley & Sound FX**: Atmospheric Foley and sound design generated directly into project assets.

### 3. Text-Based Video Editing
- Interactive word-level transcript navigation and scrubbing.
- Automatic filler-word detection (`"um"`, `"uh"`, `"like"`, `"you know"`).
- 1-click **"Remove All Fillers"** with automatic multi-track ripple slicing.

### 4. Computer Vision Auto-Masking & Auto-Reframe
- **AI Smart Cutout**: Background removal without green screens, with real-time threshold, edge feathering, and subject/background inversion.
- **Auto-Reframe (9:16)**: Smooth dynamic horizontal panning using Exponential Moving Average (EMA) and deadband jitter filtering.

### 5. AI Clipper & Bring-Your-Own-Key LLM Suite
- Automatically extracts viral highlights, hooks, and engagement scores from footage.
- **Bring-Your-Own-Key (BYOK)**: Supports OpenAI, Ollama (Local), OpenRouter, DeepSeek, Groq, or custom OpenAI-compatible Base URLs.
- Configurable via `/settings` or directly inside the editor's Settings panel with local zero-knowledge encrypted storage.

## Project Structure

- `apps/web/`: Next.js web application with WebAssembly media engine and local-first storage.
- `apps/desktop/`: Native desktop application built with GPUI.
- `rust/`: Platform-agnostic core: GPU compositor, effects, masks, and WASM bindings.
- `docs/`: Architecture specifications and subsystem documentation.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/docs/installation) (v1.2+)
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (optional for local database & Redis)

### Quick Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/aze-last/Opiom.git
   cd Opiom
   ```

2. Copy the environment configuration:

   ```bash
   # Unix/Linux/Mac
   cp apps/web/.env.example apps/web/.env.local

   # Windows PowerShell
   Copy-Item apps/web/.env.example apps/web/.env.local
   ```

3. (Optional) Start the local PostgreSQL and Redis services:

   ```bash
   docker compose up -d db redis serverless-redis-http
   ```

4. Install dependencies and start the dev server:

   ```bash
   bun install
   bun dev:web
   ```

   The application will be live at [http://localhost:3000](http://localhost:3000).

### Desktop Setup

If you wish to test or develop the native desktop client, see [`apps/desktop/README.md`](apps/desktop/README.md).

### Local WASM Development

If you are developing or rebuilding Rust WASM crates (`rust/wasm`):

```bash
# 1. Build WASM package
bun run build:wasm

# 2. Watch for changes
bun dev:wasm
```

### Self-Hosting with Docker

To build and run the production web container:

```bash
docker compose up -d
```

The app will be accessible at [http://localhost:3100](http://localhost:3100).

## Contributing

We welcome community contributions and enhancements!

**🎯 Focus areas:**
- AI tool integrations and heuristic algorithms
- Timeline performance and keyboard navigation
- Asset management and rendering pipelines
- Bug fixes and UI/UX polish

See our [Contributing Guide](.github/CONTRIBUTING.md) for full setup instructions, code style standards, and pull request procedures.

**Quick start for contributors:**

- Fork the repo and clone locally
- Follow the setup guidelines in [CONTRIBUTING.md](.github/CONTRIBUTING.md)
- Ensure all tests pass: `bun test`
- Submit a pull request with clear verification notes

## License

[MIT LICENSE](LICENSE)

---

![Star History Chart](https://api.star-history.com/svg?repos=opencut-app/opencut&type=Date)
