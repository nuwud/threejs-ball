# Interactive 3D Ball with Three.js

A visually stunning and interactive 3D sphere built with Three.js featuring enhanced audio effects, dynamic deformations, facet-based interactions, and physics animations. This project showcases advanced WebGL techniques in an approachable, fun interactive experience.

## Live Demo

Experience the interactive ball at: [https://nuwud.github.io/getting-started-with-threejs/](https://nuwud.github.io/getting-started-with-threejs/)

## Features

### Visual Effects
- **Dynamic Deformation**: Touch/hover to create dents in the surface
- **Responsive Wireframe**: Dual-layered design with translucent surface and wireframe overlay
- **Gradient Materials**: Customizable radial gradients with physically-based rendering
- **Facet-Based Interaction**: Each triangle facet of the icosahedron produces unique visual and audio feedback
- **Smooth Animations**: Fluid breathing animation with organic movement
- **Interactive Lighting**: Point light that follows your cursor movement

### Interaction
- **Mouse/Touch Controls**: Full interaction support for desktop and mobile
- **Multi-State Interaction**: Different effects for hover, click, right-click
- **Smooth Transitions**: All state changes have fluid animations
- **Physics-Based Movement**: Natural motion with easing and smooth transitions
- **Facet Detection**: Precise triangle detection for individual facet interactions

### Audio
- **Enhanced Sound Design**: Pleasant musical tones instead of high-pitched sounds
- **Facet-Based Sonic Textures**: Each triangle facet produces a unique crunchy sound with its own timbre
- **Warm Synthesizer**: Rich harmonic content with tri-oscillator design
- **Musical Scales**: Pentatonic scale for natural, pleasing melodies
- **Audio Effects**: Reverb, delay, and distortion for richer sound
- **Percussive Facet Sounds**: Short, punchy sounds with unique characteristics per facet
- **Dynamic Audio Mixing**: Sound intensity varies with interaction type and position

## How to Use

1. **Basic Interactions**:
   - **Hover**: Move your cursor over the ball to create dents and hear warm pad sounds
   - **Click & Drag**: Rotate the ball in any direction
   - **Cross Facet Boundaries**: Hear unique crunchy sonic textures for each facet

2. **Sound Experience**:
   - **Hover Movement**: Creates warm musical tones that change with cursor position
   - **Facet Transitions**: Generates unique crunchy, percussive sounds per triangle facet
   - **Click**: Plays a pleasant E major chord
   - **Release**: Plays a C major chord on mouse release

## Technical Implementation

The project demonstrates several advanced Three.js and Web Audio API techniques:

- **Dynamic Geometry Manipulation**: Real-time vertex modifications for deformation
- **Custom Material Creation**: Canvas-generated textures for gradient effects
- **Advanced Lighting Setup**: Multiple light sources with shadows and specular highlights
- **Facet-Based Interaction**: Precise triangle detection using raycasting
- **Advanced Audio Synthesis**: Multi-oscillator design with complex sound shaping
- **Audio Effect Chain**: Professional-quality reverb, delay, compression, and distortion
- **Bandpass Filtering**: Frequency shaping for unique timbres per facet
- **Noise Generation**: Creating pink and white noise for percussive textures
- **Envelope Shaping**: Attack and release curves for natural sound dynamics

## Getting Started

### Prerequisites
- Modern web browser with WebGL support
- Audio capability for full experience

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nuwud/getting-started-with-threejs.git
   ```

2. Navigate to the project directory:
   ```bash
   cd getting-started-with-threejs
   ```

3. Open one of these files in your browser or use a local server:
   - `index.html` - Original version with modular structure
   - `quick-fix.html` - Simplified version with enhanced audio

   ```bash
   # Using Python's built-in server
   python -m http.server
   # Then visit http://localhost:8000
   ```

## Code Structure

### Modular Version (js/ directory)
- **main.js**: Entry point and application initialization
- **renderer.js**: Three.js renderer setup
- **scene.js**: Scene, camera, and lighting setup
- **ball.js**: Icosahedron geometry and materials
- **effects.js**: Special visual effects
- **audio.js**: Sound system and audio effects
- **events.js**: User interaction handling
- **utils.js**: Utility functions and animation loop

### Quick-Fix Version
- **quick-fix.js**: Self-contained version with enhanced audio features
  - **SoundSynthesizer class**: Advanced audio synthesis with multiple oscillators
  - **Facet detection**: Triangle-precise interaction detection
  - **Crunchy facet sounds**: Unique sonic texture per facet

## Audio System Highlights

The enhanced audio system includes:

- **Multi-Oscillator Synthesis**: Layered oscillators with detuning for rich sounds
- **Audio Effects Chain**: Professional-quality signal processing
  - **Reverb**: Convolution-based room simulation
  - **Delay**: Echo with feedback for spatial depth
  - **Compression**: Dynamic range control for clean sound
  - **Distortion**: Variable waveshaping for crunchy textures
- **Per-Facet Sound Design**:
  - Unique frequency per facet based on musical scales
  - Custom distortion curves per facet
  - Bandpass filtering with variable resonance
  - Noise component for texture and richness
  - Filter sweeps for dynamic sound evolution
- **Envelope Shaping**: Precise attack and release curves

## Performance Optimization

The project includes several optimizations:

- **Audio initialization on demand**: Web Audio API starts only on first interaction
- **Efficient facet detection**: Fast triangle lookup
- **Audio buffer reuse**: Noise generators shared between sounds
- **Selective audio processing**: Sounds only generated when needed
- **Memory management**: Proper cleanup of audio nodes

## Browser Compatibility

- Chrome (recommended for best audio performance)
- Firefox
- Safari (14+)
- Edge

Mobile browsers that support WebGL will also work, but performance may vary.

## Future Enhancements

Some planned features include:

- **Spectral analysis visualization**: Visual representation of audio frequencies
- **More facet-based effects**: Shape deformation based on specific triangles
- **Advanced synthesis techniques**: FM and granular synthesis for more complex sounds
- **MIDI control**: Support for external MIDI controllers
- **Audio reactivity**: Visual elements that respond to sound characteristics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Three.js](https://threejs.org/) for the powerful 3D library
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for audio processing
- Inspiration from various WebGL demos and creative coding projects
