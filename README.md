# socratic-approach
# Socratic Approach: Multi-Agent LLM Debate System

## Overview

A web application that enables users to submit questions, ideas, or beliefs, which are then debated by six distinct LLM personas via OpenRouter's free tier. The system orchestrates a structured conversation that progresses toward consensus.

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

### 1. HTML Structure

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Socratic Approach - Multi-Agent Debate</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #2563eb;
            --secondary: #64748b;
            --background: #1e293b;
            --surface: #334155;
            --text: #f1f5f9;
            --text-secondary: #94a3b8;
            --border: #475569;
            --success: #22c55e;
            --warning: #f59e0b;
            --danger: #ef4444;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: 'Press Start 2P', cursive;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
            padding: 0;
            margin: 0;
            min-height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        #game-container {
            flex: 1;
            position: relative;
            display: flex;
            flex-direction: column;
        }
        
        #canvas-container {
            flex: 1;
            position: relative;
        }
        
        #debate-canvas {
            display: block;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, #1e293b 0%, #334155 50%, #475569 100%);
        }
        
        #input-section {
            background
