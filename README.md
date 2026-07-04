# Socratic Approach: Multi-Agent LLM Debate System

## Overview

A web application that enables users to submit questions, ideas, or beliefs, which are then debated by six distinct LLM personas via OpenRouter's free tier. The system orchestrates a structured conversation that progresses toward consensus.

## Getting Started

First, get a free API key from [OpenRouter](https://openrouter.ai/keys). Then run the app one of two ways:

**Option A — with the bundled server (recommended; the page never asks for a key):**

```sh
OPENROUTER_API_KEY=sk-or-... node server.js
# → http://localhost:3000
```

The server holds the key and proxies the LLM calls; the page detects this and hides the key field. Set the key as an environment variable wherever the server runs (your shell, a hosting platform's secrets, etc.).

**Option B — as a plain static file:**

Open `index.html` directly in a browser and paste your API key into the key field (it is stored only in your browser's localStorage). This exists because a static page running in a browser **cannot read server-side secrets** — secrets stored in a platform (hosting dashboards, databases, environment settings) are only visible to server-side code like `server.js`.

Either way: optionally change the model (any OpenRouter model ID works; the default is free-tier), then type a question, idea, or belief and press **Begin Debate**. The six philosophers debate in rounds; after each round the Judge deliberates, and the debate ends when the Judge declares consensus or the round limit is reached, at which point the Judge delivers a final verdict.

> **Security note:** in Option B the API key is used directly from the browser, so it is visible to anyone with access to the page session — fine for personal use with a free-tier key. Use Option A (or any backend proxy) for anything shared or production.

## Visual Design

### Look & Feel

Detailed, illustration-grade pixel art: a dense uniform pixel grid, warm Mediterranean daylight, realistic figure proportions and natural posing, and painterly light and shade. The frame should read as a single hand-shaded pixel illustration — never as a collection of small game sprites at mixed densities.

### Technique: Nearest-Neighbour Pixelation Workflow

The pixel-art look is produced by pixelating smoothly painted artwork rather than by placing individual pixels:

1. **Paint** the scene smoothly at full resolution (960x540) with canvas vector graphics — gradients for sky, sea, skin and cloth; bezier silhouettes for anatomy and drapery; soft shadows.
2. **Downsample** the frame to a low-resolution pixel grid (320x180).
3. **Quantize** the palette (posterization) with ordered Bayer dithering for the retro shading feel.
4. **Upscale** back to display size with **nearest-neighbour** sampling, so every pixel lands crisp and square on one uniform grid.

Animation is unaffected by the pipeline: the smooth scene is repainted every frame and re-pixelated, so motion stays fluid while the output stays pixel art.

### Theme: Ancient Greece

**Clothing** — chitons, togas and himations, and sandals. Each persona keeps a signature color, worn as their garment, drape, or trim:

| Persona | Signature color | Worn as |
|---------|-----------------|---------|
| Socrates | Blue | Himation drape over a cream toga; white beard, bald, staff |
| Contrarian | Red | Himation drape over a cream chiton, gold-trimmed hem; arms crossed |
| Free Thinker | Purple | Himation drape over a cream toga; wild hair |
| Grump | Gray | Plain woollen cloak; slouched posture |
| Synthesizer | Green | Himation band over a cream robe |
| Judge | Orange | Himation drape and hem trim over a cream toga; gold laurel wreath |

**Scenery** — an open-air agora terrace: marble columns framing the view, a stone parapet, the Acropolis with its temple on a headland, cypress and olive trees, the azure Mediterranean sea and sky, a mosaic medallion set into the stone floor, and props such as an amphora and a discarded scroll.

**Composition** — first-person viewpoint from a seat within the debate circle: the two nearest debaters are seen from behind, large in the frame and cropped by its edges; the other four sit on stone benches facing the viewer.

### Speech Bubbles & UI

- Speech bubbles are color-coded to each persona, with a tail pointing to the speaker, a character-by-character typing effect, and fade in/out.
- UI chrome is parchment-and-stone: parchment input fields, stone-tablet buttons with a press animation, and scroll-styled status messages at the bottom of the scene.

## Architecture

### Frontend
- HTML5 Canvas for rendering
- JavaScript for animation and conversation logic
- CSS for overall layout and non-canvas elements

### Backend Logic (Client-side)
- OpenRouter API integration for LLM calls
- Conversation orchestration engine
- Persona management system
- Animation controller

### Personas

| Role | Description | Style | Purpose |
|------|-------------|-------|---------|
| **Socrates** | Probing questioner | Socratic method, relentless inquiry | Challenges assumptions, exposes contradictions |
| **Contrarian** | Devil's advocate | Skeptical, argumentative | Tests the strength of the idea |
| **Free Thinker** | Open-minded explorer | Creative, speculative | Expands possibilities, thinks outside constraints |
| **Grump** | Closed-minded critic | Cynical, dismissive | Provides resistance, voices doubts |
| **Synthesizer** | Integrator | Balanced, analytical | Identifies common ground, reconciles views |
| **Judge** | Arbitrator | Fair, decisive | Evaluates arguments, guides toward consensus |

## Implementation

The entire application lives in a single `index.html` file with no dependencies beyond the "Press Start 2P" web font and the OpenRouter API.

### File Structure
- `index.html` — markup, styles, and all JavaScript: rendering, animation, speech bubbles, and debate orchestration
- `server.js` — optional zero-dependency Node server: serves the app and proxies OpenRouter calls with a server-held `OPENROUTER_API_KEY`, so the browser never handles the key
- All art is procedural (no external image assets): painted smoothly with canvas vector graphics, then pixelated by the nearest-neighbour workflow described above

### How It Works
1. Every frame, the scene is painted smoothly at full resolution. The background (sky, sea, coastal town, Acropolis, parapet, floor, props, framing columns) is painted once and cached; the six characters are painted per frame with their current animation state.
2. The frame is downsampled to 320x180, palette-posterized with Bayer dithering, and upscaled with nearest-neighbour sampling to the display canvas.
3. Characters animate continuously: breathing, blinking, listening nods, speaking mouth frames and hand gestures; the two back-view foreground figures turn their head to profile while speaking.
4. When a debate starts, the orchestrator runs up to `MAX_TURNS` rounds. In each round the five debaters speak in sequence (each sees the transcript so far), then the Judge deliberates and issues a `VERDICT: CONSENSUS` or `VERDICT: CONTINUE` marker. On consensus or after the final round, the Judge delivers a closing verdict.
5. Each reply is displayed as a color-coded speech bubble above the speaker with a character-by-character typing effect, while the speaker plays its speaking animation.

### Configuration
Tunable constants near the top of the script in `index.html`:
- `DEFAULT_MODEL` — OpenRouter model ID (defaults to a free-tier model; can also be changed in the UI)
- `MAX_TURNS` — maximum debate rounds before the Judge must rule (default 3)
- `API_DELAY_MS` — pause between API calls to respect free-tier rate limits
- `LO_W` / `LO_H` — resolution of the pixelation grid (default 320x180)
- `LEVELS` — posterization levels per color channel (default 11)
