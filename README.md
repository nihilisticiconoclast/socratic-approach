# Socratic Approach: Multi-Agent LLM Debate System

## Overview

A web application that enables users to submit questions, ideas, or beliefs, which are then debated by six distinct LLM personas via OpenRouter's free tier. The system orchestrates a structured conversation that progresses toward consensus.

## Getting Started

1. Get a free API key from [OpenRouter](https://openrouter.ai/keys).
2. Open `index.html` in a modern browser — no build step or server is required (though you can serve it locally with `python3 -m http.server` if you prefer).
3. Paste your API key into the key field (it is stored only in your browser's localStorage).
4. Optionally change the model — any OpenRouter model ID works; the default is a free-tier model.
5. Type a question, idea, or belief and press **Begin Debate**.

The six philosophers will debate the topic in rounds. After each round the Judge deliberates; the debate ends when the Judge declares consensus or the maximum number of rounds is reached, at which point the Judge delivers a final verdict.

> **Security note:** the API key is used directly from the browser, so it is visible to anyone with access to the page session. This is fine for personal use with a free-tier key; for production, proxy the API calls through a backend that holds the key.

## Visual Design Specification

### Aesthetic Direction
The interface combines low-fi pixel art visuals with hyper-realistic human movement animation. Characters are rendered in pixel art style but animate with fluid, natural motion to create an immersive conversation experience.

### Scene Composition

**Camera Perspective**
- First-person viewpoint positioned within the group circle
- Speakers are the primary focus in the foreground
- Camera angle is slightly elevated, looking down at the circle of debaters

**Character Arrangement**
- Six characters arranged in a semi-circle facing inward
- Each character represents one of the six agent personas
- Positions staggered for visual interest and to avoid symmetry
- Characters maintain appropriate personal space while appearing engaged

### Character Design (Pixel Art Style)

**Art Style**
- Resolution: 32x48 pixels per character (scalable)
- Color palette: Limited to 16-32 colors per character
- Greek classical attire: Togas, chitons, sandals
- Distinct color schemes for each persona
- Minimal shading with cel-shading technique

**Personas and Visual Identifiers**

| Persona | Color Scheme | Distinguishing Features | Attire |
|---------|--------------|------------------------|--------|
| **Socrates** | Deep blue (#2563eb) | White beard, balding, staff | White toga with blue sash |
| **Contrarian** | Red (#ef4444) | Frowned brows, crossed arms | Red chiton, gold accents |
| **Free Thinker** | Purple (#8b5cf6) | Wild hair, open gestures | Flowing purple toga |
| **Grump** | Gray (#78716c) | Slouched posture, scowl | Dull gray tunic |
| **Synthesizer** | Green (#10b981) | Balanced stance, calm expression | Olive green himation |
| **Judge** | Orange (#f59e0b) | Stern expression, upright posture | Orange toga with white trim |

**Animation Requirements**
- **Idle Animations**: Subtle weight shifts, breathing motion, occasional head turns
- **Speaking Animations**: 
  - Head nods and tilts synchronized with speech rhythm
  - Hand gestures (pointing, open palms, thinking pose)
  - Eye blinks at natural intervals
  - Mouth movement for speech (2-3 frame animation)
- **Listening Animations**: 
  - Head tilts indicating consideration
  - Occasional nodding in agreement
  - Crossed arms or chin-stroking for contemplation
- **Transition Animations**: Smooth 2-3 frame transitions between states

### Background Design

**Theme**: Ancient Greek Mediterranean

**Foreground (In Focus)**
- Stone floor with mosaic patterns (pixel art)
- Partial stone pillars framing the scene
- Olive branches scattered on the ground

**Midground**
- Crumbling marble columns
- Stone ruins and architectural fragments
- Olive trees with distinctive pixel art foliage
- Mediterranean vegetation (rosemary, thyme)

**Background (Distant)**
- Azure Mediterranean sea
- Distant islands on the horizon
- Clear blue sky with subtle cloud details
- Ancient Greek temple ruins in the distance

**Color Palette**
- Stone: #a8a29e, #78716c, #57534e
- Sea: #0ea5e9, #0284c7, #0369a1
- Sky: #dbeafe, #bfdbfe, #93c5fd
- Vegetation: #22c55e, #16a34a, #15803d
- Shadows: #4b5563, #374151

### Speech Bubble System

**Design**
- Pixel art style bubbles with jagged edges
- Color-coded to match each character's theme
- Semi-transparent background (80% opacity)
- Tail pointer indicating speaker

**Animation**
- **Appearance**: Fade in from speaker's mouth position, growing to full size (0.3s)
- **Display**: Remains visible while character is speaking + 1 second buffer
- **Disappearance**: Fade out and shrink back to speaker (0.3s)
- **Typing Effect**: Text appears character by character with slight pause between words

**Positioning**
- Bubbles emerge from character's mouth area
- Positioned above character's head
- Automatically adjusts to avoid overlap with other bubbles
- Maximum of 1 bubble per character at a time

**Styling**
- Border: 2px solid, color matches character theme
- Background: Character's primary color at 80% opacity
- Text: White or black depending on contrast
- Padding: 8-12 pixels
- Border radius: 4-6 pixels (slightly rounded)
- Font: Pixel font (e.g., "Press Start 2P" or custom pixel font)

### UI Elements

**Input Area**
- Pixel art styled text input
- Stone-like border texture
- Parchment-like background
- Cursor: Blinking pixel art caret

**Submit Button**
- Stone tablet appearance
- Engraved text effect
- Press animation: Slight depression effect
- Hover: Color shift to indicate interactivity

**Status Messages**
- Scroll-like appearance
- Fade in/out animations
- Positioned at bottom of scene

## Architecture

### Frontend
- HTML5 Canvas for pixel art rendering
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
- `index.html` — markup, styles, and all JavaScript: canvas rendering, animation, speech bubbles, and debate orchestration
- All sprites and background art are drawn procedurally on the canvas at pixel-art resolution (no external image assets)

### How It Works
1. The scene is rendered to a 960x540 canvas. Background layers (sky, sea, islands, temple, ruins, olive trees, mosaic floor) are painted once to an offscreen buffer at low resolution and upscaled with image smoothing disabled for a crisp pixel look.
2. The six characters are drawn each frame from procedural 32x48 pixel-grid sprites, with breathing, blinking, nodding, mouth, and gesture animation driven by `requestAnimationFrame`.
3. When a debate starts, the orchestrator runs up to `MAX_TURNS` rounds. In each round the five debaters speak in sequence (each sees the transcript so far), then the Judge deliberates and issues a `VERDICT: CONSENSUS` or `VERDICT: CONTINUE` marker. On consensus or after the final round, the Judge delivers a closing verdict.
4. Each reply is displayed as a color-coded speech bubble above the speaker with a character-by-character typing effect, while the speaker plays its speaking animation.

### Configuration
Tunable constants near the top of the script in `index.html`:
- `DEFAULT_MODEL` — OpenRouter model ID (defaults to a free-tier model; can also be changed in the UI)
- `MAX_TURNS` — maximum debate rounds before the Judge must rule (default 3)
- `API_DELAY_MS` — pause between API calls to respect free-tier rate limits
