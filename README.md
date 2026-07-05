# Socratic Approach: Multi-Agent LLM Debate System

## Overview

A web application that enables users to submit questions, ideas, or beliefs, which are then debated by six distinct LLM personas via OpenRouter's free tier. The system orchestrates a structured conversation that progresses toward consensus.

## How It Runs

The user experience is exactly this: **type a question → watch the six philosophers debate it live in the scene → the Judge delivers the verdict.** No keys, no sign-ups, no redirects.

Behind the page sits a small server API that holds the secrets:

- `/api/chat` — proxies the LLM calls to OpenRouter with the server-held `OPENROUTER_API_KEY`, trying a chain of models in order so a failing or rate-limited free model never kills a debate
- `/api/history` — returns recent questions & verdicts from Neon; the orchestrator feeds them into every new debate so past debates inform new ones
- `/api/record` — stores each finished debate (question, transcript, verdict, consensus) in Neon; the table is created automatically
- `/api/health` — tells the page the server is ready

The Neon chronicle is **internal storage only** — reference data and prompt augmentation. It is never shown in the UI.

### Deploy (one time)

The app needs a host that can run server code — GitHub Pages alone cannot (it is static-only, and no website can read GitHub Actions secrets). Whichever host you choose, set two environment variables in its dashboard: `OPENROUTER_API_KEY` and `NEON_DATABASE_URL` (or `DATABASE_URL`) — see `.env.example`.

**Simplest — one host serves everything.** Deploy configs are included for [Render](https://render.com) (`render.yaml`), [Railway](https://railway.app) (`railway.json`), and [Fly.io](https://fly.io) (`fly.toml`); all run `node server.js`, which serves the page *and* the API from one URL. Vercel also works out of the box (the `api/` folder deploys as serverless functions). Use the deployment URL as your site and you are done — no CORS, no extra config.

**Optional split — GitHub Pages frontend + backend host.** If you prefer serving the page from GitHub Pages: deploy the backend as above, set `CORS_ORIGIN` on the backend to your Pages origin (the included configs already default it to `https://nihilisticiconoclast.github.io`), and put the backend's URL in the `api-base` meta tag at the top of `index.html`.

### Run locally

```sh
npm install   # optional, only needed for database access
OPENROUTER_API_KEY=sk-or-... DATABASE_URL=postgres://... node server.js
# → http://localhost:3000
```

`DATABASE_URL` is optional locally; without it, history and recording are silently skipped.

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

The page is a single `index.html` with no dependencies beyond the "Press Start 2P" web font; the `api/` functions are plain Node handlers whose only dependency is `pg`.

### File Structure
- `index.html` — markup, styles, and all JavaScript: rendering, animation, speech bubbles, and debate orchestration
- `api/` — serverless functions: `chat` (OpenRouter proxy), `history` & `record` (internal Neon chronicle), `health`
- `server.js` — local dev server exposing the same `/api` endpoints
- All art is procedural (no external image assets): painted smoothly with canvas vector graphics, then pixelated by the nearest-neighbour workflow described above

### How It Works
1. Every frame, the scene is painted smoothly at full resolution. The background (sky, sea, coastal town, Acropolis, parapet, floor, props, framing columns) is painted once and cached; the six characters are painted per frame with their current animation state.
2. The frame is downsampled to 320x180, palette-posterized with Bayer dithering, and upscaled with nearest-neighbour sampling to the display canvas.
3. Characters animate continuously: breathing, blinking, listening nods, speaking mouth frames and hand gestures; the two back-view foreground figures turn their head to profile while speaking.
4. When a debate starts, the orchestrator runs up to `MAX_TURNS` rounds. In each round the five debaters speak in sequence (each sees the transcript so far), then the Judge deliberates and issues a `VERDICT: CONSENSUS` or `VERDICT: CONTINUE` marker. On consensus or after the final round, the Judge delivers a closing verdict.
5. Each reply is displayed as a color-coded speech bubble above the speaker with a character-by-character typing effect, while the speaker plays its speaking animation.

### Configuration

Server environment variables:
- `OPENROUTER_API_KEY` — required (stray quotes/whitespace from pasting are stripped automatically)
- `NEON_DATABASE_URL` / `DATABASE_URL` — Neon connection string for the internal chronicle
- `DEBATE_MODELS` — optional comma-separated OpenRouter model ids, tried in order as fallbacks. If unset, the server builds the chain automatically from OpenRouter's **live list of `:free` models** (cached 1h, strong model families preferred), so withdrawn free models never break the app
- `CORS_ORIGIN` — only for split hosting (see Deploy)

Tunable constants near the top of the script in `index.html`:
- `MAX_TURNS` — maximum debate rounds before the Judge must rule (default 3)
- `API_DELAY_MS` — pause between API calls to respect free-tier rate limits
- `LO_W` / `LO_H` — resolution of the pixelation grid (default 320x180)
- `LEVELS` — posterization levels per color channel (default 11)

### Troubleshooting

**First stop: open `/api/diag` on your deployment** (e.g. `https://your-app.onrender.com/api/diag`). It tests the key, the free-model list, and one live completion from inside the server, and prints a `hint` line naming the exact fix. If `/api/diag` returns *Not Found*, the host is running an old build — redeploy latest `main`.

- **"User not found"** during a debate — OpenRouter's 401 for an invalid API key. Re-copy the key from openrouter.ai/keys into the host's `OPENROUTER_API_KEY` env var and redeploy.
- **"All debate models failed"** / a free model reported unavailable — if *every* free model fails, it is one of two account-side causes, and `/api/diag` will tell you which: (a) OpenRouter's privacy setting — free models require enabling prompt training/logging at **openrouter.ai → Settings → Privacy**; (b) the daily free-model quota — accounts with under $10 lifetime credits get ~50 free requests/day and one debate uses ~13, so a day of testing exhausts it; add $10 credit to raise it to ~1000/day or wait for the reset. (Individually withdrawn models are handled automatically by the live model chain.)
- **"The agora is still waking"** — free hosting tiers (e.g. Render) sleep when idle and take up to a minute to wake. The page retries automatically; just try again shortly.
- **`/api/health`** shows what the server can see: `proxy:false` = key missing, `db:false` = database URL missing.
