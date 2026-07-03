# Claude Context: Socratic Approach Project

## Project Overview
This project implements a multi-agent LLM debate system with a unique pixel art visual interface. Six AI personas debate user-submitted ideas in character, with realistic animations and a Greek-themed setting.

## Key Files
- index.html - Main application with canvas rendering and debate logic
- README.md - Setup instructions and documentation
- Sprites and background art are drawn procedurally on the canvas (no external asset files)

## Implementation Notes

### Visual Design Requirements
- Style: Low-fi pixel art (32x48px base grid, scaled up for characters nearer the camera) with hyper-realistic movement and realistic body proportions
- Palette: Warm Mediterranean daylight — cream marble, sand stone, azure sea/sky
- Theme: Ancient Greek with Mediterranean background (Acropolis and temple in the distance)
- Camera: First-person within the debate circle — the two nearest debaters (Grump and Synthesizer) are seen from behind, large and cropped at the bottom corners; the other four sit facing the viewer
- Characters: Six distinct seated personas with unique visual identities (persona color appears as garment, drape, or trim over a harmonized warm palette)
- Animation: Fluid, natural movement synchronized with speech; back-view characters turn their head to profile while speaking

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
- Character sprites with multiple animation frames
- State-based rendering (idle, speaking, listening)
- Speech bubble system with fade in/out
- Subtle camera movement and depth effects

## Development Guidelines

### For Visual Assets
- Use 32x48 pixel base size for characters, scaled to larger grids/pixel density the closer a character is to the camera
- Sprites are procedural (drawn on canvas per frame from pixel-grid coordinates); if external art is ever introduced, use pixel art tools like Aseprite or Piskel
- Maintain consistent color palette per character, harmonized to the warm scene palette
- Background should be layered (foreground framing columns, stone parapet, sea/hill, sky)

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
- Pixel art requires attention to detail
- Animation performance varies by device
- Mobile support may need additional work