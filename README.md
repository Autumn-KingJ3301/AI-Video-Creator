# Reel Engine: Autonomous 9:16 Vertical Video Studio

> **Autonomous, quality-gated engine that scripts, visualizes, renders, reviews, and edits high-retention 9:16 vertical reels.**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🌟 Overview

**Reel Engine** is an end-to-end autonomous video production pipeline designed for AI coding agents and human creators. It generates editorial, viral-retention vertical videos (1080x1920 @ 30fps) by composing Remotion TSX, Manim mathematical animations, and dynamic FFmpeg filtergraphs with content-addressed caching, native TTS audio synthesis, and deterministic quality gates.

### Key Capabilities
- **Model Context Protocol (MCP) Server**: 10 atomic tools over JSON-RPC stdio for seamless pair-programming with AI agents.
- **Editorial Design System**: Native implementation of the **Corsela Editorial Theme** (Warm Ivory `#F4F0EA`, Dark Charcoal `#141413`, Terracotta `#C84B22`, and floating white cards).
- **Deterministic Quality Gates (QA)**: Pre-render and post-render validation enforcing hook deadlines (≤ 3.0s), visual pacing (≤ 2.0s dwell), safe zones (top 14%, bottom 35%, sides 6%), reading speed limits (≤ 18 cps), and freezing/black-frame prevention.
- **Director Self-Review Rubric**: Automated 7-criteria scoring (Hook, One Idea, Pacing, Legibility, Motion, Send Moment, Payoff & Loop).
- **Content-Addressed Caching**: SHA-256 scene hashing ensures unchanged clips re-render in 0.00 seconds.
- **Audio Mixing & Ducking**: Sidechain ducking of background music under narration (-12dB) with broadcast-grade EBU R128 loudness normalization (-14 LUFS).

---

## 📁 Repository Structure

```
AI Video Creator/
├── .agents/                    # Agent orchestration and skill configurations
│   ├── mcp_config.json         # MCP server registration (spawns reel-engine over stdio)
│   └── skills/reel-director/   # Autonomous director doctrine & rubric guidelines
│
├── .gitignore                  # Git ignore rules for media, caches, dist, and runtimes
├── AGENTS.md                   # Agent system instructions and operating contracts
├── README.md                   # Project documentation and quickstart guide
│
├── reel-engine/                # Monorepo powering the autonomous rendering engine
│   ├── packages/
│   │   ├── core/               # Shared engine logic, schemas, and media processors
│   │   │   ├── contracts/      # Zod schemas (SceneIR, ProjectState, GateViolations)
│   │   │   ├── state/          # StateManager with transactional atomic persistence
│   │   │   ├── cache/          # Deterministic scene hashing and cache eviction
│   │   │   ├── timing/         # TTS voice synthesis, pause tightening, & audio analysis
│   │   │   ├── renderers/      # Remotion, Manim, and Corsela filtergraph adapters
│   │   │   ├── qa/             # Quality gates (freezedetect, blackdetect, contrast, rubric)
│   │   │   └── composer/       # Audio ducking, mixing, and video assembly
│   │   │
│   │   ├── mcp-server/         # Model Context Protocol (MCP) stdio server
│   │   │   └── src/tools/      # 10 atomic tools (init, transcribe, plan, lint, render, etc.)
│   │   │
│   │   ├── remotion-renderer/  # React / Remotion vertical composition bundle
│   │   ├── manim-renderer/     # Python Manim programmatic animation worker
│   │   └── ui/                 # Director preview web UI & timeline viewer
│   │
│   ├── fixtures/               # Example test projects & reference Scene IRs
│   ├── presets/                # Visual themes and timing configurations
│   └── tests/                  # Unit, integration, and vertical-slice test suites
│
└── reel-engine-research/       # Architectural research, ADRs, and decision matrices
    ├── architecture/ADRs/      # 10 Architectural Decision Records (ADR-001 to ADR-010)
    └── audits/                 # Audits of open-source video engines and tooling
```

---

## 🚀 Quickstart

### Prerequisites
- **Node.js**: v20+ (recommended v22+)
- **FFmpeg**: Bundled via `@ffmpeg-installer/ffmpeg` or system FFmpeg on PATH
- **Python**: 3.10+ (optional, required only for Manim mathematical animations)

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd "AI Video Creator/reel-engine"

# Install dependencies
npm install

# Build TypeScript packages
npm run build
```

### Running Tests
```bash
# Run unit & quality gate tests
npm run test:qa-gates

# Run full vertical-slice pipeline test
npm run test:vertical-slice

# Run integration tests
npm test
```

---

## 🤖 MCP Server Integration

The `reel-engine` MCP server exposes 10 atomic tools over stdio:

| Tool Name | Phase | Purpose |
| :--- | :--- | :--- |
| `reel_init_project` | Input | Ingests creative brief and loads style/format presets |
| `reel_transcribe_audio` | Audio | Synthesizes narration TTS or processes external speech tracks |
| `reel_plan_scenes` | Planning | Submits contiguous Scene IR with exact integer frame boundaries |
| `reel_lint_scene_ir` | Planning | Static pre-render linting (hook deadline, visual pacing, safe zones) |
| `reel_author_scene` | Authoring | Writes Remotion TSX or Manim Python animation code |
| `reel_render_scene` | Rendering | Renders clips with content-addressed caching (0s for cached clips) |
| `reel_verify_quality` | QA | Runs media inspection (`freezedetect`, `blackdetect`, loudness) and rubric |
| `reel_apply_edits` | Editing | Non-destructively updates scene trims, re-ordering, or cuts |
| `reel_compose_video` | Export | Mixes ducked audio (-12dB), burns captions, and exports final 1080x1920 MP4 |
| `reel_get_state` | General | Queries active project phase, blockers, and next steps |

To register the server in your local Antigravity or Gemini config:
```json
{
  "mcpServers": {
    "reel-engine": {
      "command": "node",
      "args": [
        "path/to/AI Video Creator/reel-engine/dist/mcp-server/src/index.js"
      ]
    }
  }
}
```

---

## 🎨 Corsela Editorial Design Doctrine

All vertical video outputs adhere to the **Corsela Editorial Theme**:
- **Canvas Background**: Warm Ivory (`#F4F0EA`)
- **Card Elements**: Floating Pure White (`#FFFFFF`) cards with soft borders (`#E6E0D5`)
- **Primary Text**: Dark Charcoal (`#141413`)
- **Accent & Highlights**: Terracotta (`#C84B22`)
- **Impact / Urgency Beat**: Dark Charcoal Canvas (`#282726`) with Terracotta warnings
- **Safe Zones**: Top 14% (269px), Bottom 35% (672px), Sides 6% (65px) reserved for platform UI overlays.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
