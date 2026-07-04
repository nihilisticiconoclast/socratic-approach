# Claude Context: Socratic Approach Project

## Project Overview
This project implements a multi-agent LLM debate system with a pixel-art visual interface. Six AI personas debate user-submitted ideas in character, in an Ancient Greek setting rendered as detailed pixel-art illustration.

## Key Files
- index.html - Main application with canvas rendering and debate logic
- README.md - Setup instructions and documentation
- All art is procedural (no external asset files)

## Implementation Notes

### Visual Design Requirements
- Style: detailed, illustration-grade pixel art on one uniform pixel grid — warm Mediterranean daylight, realistic proportions, painterly shading
- Technique: **nearest-neighbour pixelation workflow** — paint the scene smoothly at full resolution (gradients, bezier anatomy, soft shading), downsample to a 320x180 grid, posterize the palette with ordered dithering, then upscale with nearest-neighbour sampling. Do NOT draw characters as small fixed-size sprites; that hard-caps quality
- Theme: Ancient Greece in both clothing (chitons, togas, himations, sandals) and scenery (agora terrace, marble columns, Acropolis temple, cypresses and olives, Mediterranean sea, mosaic floor)
- Composition: first-person viewpoint inside the debate circle — the two nearest personas (Grump, Synthesizer) are seen from behind, large and cropped by the frame; the other four sit facing the viewer
- Characters: six distinct personas, each with a signature color worn as garment, drape, or trim
- Animation: fluid, natural movement synchronized with speech; the smooth scene is repainted and re-pixelated every frame

### Technical Stack
- HTML5 Canvas for rendering
- Vanilla JavaScript for logic and animation
- OpenRouter API for LLM interactions
- CSS for UI styling

### Personas and System Prompts
Each agent has a carefully crafted system prompt to maintain its role:

1. Socrates: Socratic method, asks probing questions, never states opinions
2. Contrarian: Takes opposing view, devil's advocate, skeptical
3. Free Thinker: Creative, open-minded, explores unconventional ideas
4. Grump: Cynical, dismissive, resistant to new ideas
5. Synthesizer: Finds common ground, reconciles perspectives
6. Judge: Evaluates arguments, guides toward resolution

### Conversation Flow
1. User submits a question/idea
2. System initializes debate with all six agents
3. Each round, the five debaters respond in sequence (each sees the transcript so far, so they can react to one another); the Judge closes the round and checks for consensus
4. Responses displayed as speech bubbles with a typing effect
5. After MAX_TURNS or consensus detection, the Judge generates a final summary

### Animation System
- State-based animation (idle, speaking, listening): breathing, blinking, nods, mouth frames, hand gestures
- Back-view foreground characters turn their head to profile while speaking
- Speech bubble system with fade in/out and typing effect
- Subtle camera sway and parallax on the framing columns

## Development Guidelines

### For Visual Assets
- All art is procedural: painted smoothly on a hi-res canvas each frame, then pixelated through the downsample/posterize/dither/nearest-neighbour pipeline (see `render()` in index.html)
- Figures are painted at natural size for their place in the scene — foreground back-view figures span most of the frame height
- Maintain each persona's signature color, harmonized to the warm scene palette
- Background should be layered (foreground framing columns, benches and figures, parapet, sea/hill, sky)

### For Code
- Keep canvas rendering separate from debate logic
- Use requestAnimationFrame for smooth animations
- Implement proper cleanup for speech bubbles
- Handle API errors gracefully
- Escape all user input to prevent XSS

### For Personas
- System prompts should be specific and restrictive
- Each persona should have distinct communication style
- Maintain consistency in character behavior
- Keep responses concise (2-4 sentences)

## Testing
- Test with various debate topics
- Verify all personas maintain their roles
- Check animation smoothness
- Test on different screen sizes
- Validate API key handling

## Future Enhancements
- Backend service to hide API keys
- Character customization options
- Interactive camera controls
- Debate export functionality
- Multi-user debate support
- Analytics and visualization

## Important Considerations
- OpenRouter free tier has rate limits
- Client-side API keys are visible in browser (use backend for production)
- Animation performance varies by device
- Mobile support may need additional work
