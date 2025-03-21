# Interactive 3D Ball with Three.js

A visually stunning and interactive 3D sphere built with Three.js featuring sound effects, dynamic deformations, particle effects, and physics interactions. This project showcases advanced WebGL techniques in an approachable, fun interactive experience.

![Interactive Three.js Ball Demo](https://user-images.githubusercontent.com/your_username/your_repo/assets/demo.gif)

## Live Demo

Experience the interactive ball at: [https://nuwud.github.io/getting-started-with-threejs/](https://nuwud.github.io/getting-started-with-threejs/)

## Features

### Visual Effects
- **Dynamic Deformation**: Touch/hover to create dents in the surface
- **Responsive Wireframe**: Dual-layered design with translucent surface and wireframe overlay
- **Gradient Materials**: Customizable radial gradients with physically-based rendering
- **Particle Systems**: Explosion effects with physics-based particle movement
- **Spiky Transformation**: Scroll wheel creates dynamically animated spikes
- **Black Hole Effect**: Gravitational pull and deformation physics
- **Magnetic Field**: Orbital particle systems with dynamic following behavior
- **Interactive Lighting**: Point light that follows your cursor movement

### Interaction
- **Mouse/Touch Controls**: Full interaction support for desktop and mobile
- **Multi-State Interaction**: Different effects for hover, click, right-click, scroll
- **Advanced Mouse Support**: Forward/back buttons trigger special effects
- **Double-Click Actions**: Toggle rainbow color cycling mode
- **Smooth Transitions**: All state changes have fluid animations
- **Physics-Based Movement**: Natural motion with easing and smooth transitions

### Audio
- **Interactive Sound Effects**: Audio feedback for all interactions
- **Positional Audio**: 3D sounds that change based on object position
- **Audio Synthesis**: Real-time generated sounds using Web Audio API
- **Audio Reactivity**: Visual effects that respond to sound intensity
- **Dynamic Sound Design**: Different oscillator types for different interactions
- **Frequency Modulation**: Complex sound patterns when in rainbow mode

## How to Use

1. **Basic Interactions**:
   - **Hover**: Move your cursor over the ball to create dents
   - **Click & Drag**: Rotate the ball in any direction
   - **Right-click**: Trigger an explosion effect
   - **Double-click**: Toggle rainbow color cycling mode

2. **Advanced Controls**:
   - **Mouse Wheel**: Scroll up/down to increase/decrease spikiness
   - **Forward Button**: Toggle magnetic field mode with orbiting particles
   - **Back Button**: Create a black hole that pulls and deforms the ball

## Technical Implementation

The project demonstrates several advanced Three.js techniques:

- **Dynamic Geometry Manipulation**: Real-time vertex modifications for deformation
- **Custom Material Creation**: Canvas-generated textures for gradient effects
- **Advanced Lighting Setup**: Multiple light sources with shadows and specular highlights
- **Physics-Based Animations**: Natural movement with velocity, acceleration, and inertia
- **Matrix Transformations**: Proper world/local space conversions for accurate deformation
- **Custom Interaction Handling**: Raycasting for precise object interaction
- **Particle Systems**: Individual physics and properties for each particle
- **Audio Integration**: Three.js Audio and Web Audio API with frequency analysis
- **GLSL Shaders**: Custom shader effects for special visual features

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

3. Open index.html in your browser or use a local server:
   ```bash
   # Using Python's built-in server
   python -m http.server
   # Then visit http://localhost:8000
   ```

## Code Structure

- **index.html**: Basic HTML setup with Three.js imports
- **index.js**: Main JavaScript file containing the entire application
  - Scene setup and rendering
  - Material and geometry creation
  - Interaction handling
  - Animation and physics
  - Audio integration

### Key Code Sections

The code is organized into these main functional areas:

- **Scene initialization** (lines 1-150): Setting up Three.js environment
- **Geometry and materials** (lines 151-300): Creating 3D objects
- **Interaction handlers** (lines 301-450): Mouse/touch event handling
- **Deformation functions** (lines 451-550): Manipulating geometry
- **Special effects** (lines 551-750): Explosion, magnetic field, black hole
- **Audio integration** (lines 751-900): Sound synthesis and processing
- **Animation loop** (lines 901-end): Main update cycle

## Customization

You can customize the ball's appearance and behavior:

- Modify the `colorStart`, `colorMid`, and `colorEnd` variables to change the gradient
- Adjust subdivision level in `new THREE.IcosahedronGeometry(1.0, 4)` (4 is high detail)
- Change material properties in the `MeshPhysicalMaterial` initialization
- Modify physics parameters in various update functions

### Creating Your Own Effects

To add a new interactive effect:

1. Create a new event handler for your desired input
2. Develop a function that manipulates the geometry or material
3. Add update logic to the animate() function 
4. Create corresponding audio effects if desired

## Performance Optimization

The project includes several optimizations:

- Efficient geometry updates with BufferGeometry
- Targeted recomputation of normals only when needed
- Object pooling for particle systems
- Frame-rate independent physics
- Audio processing only when necessary
- Raycasting only against relevant objects

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari (14+)
- Edge

Mobile browsers that support WebGL will also work, but performance may vary.

## Future Enhancements

Some planned features include:

- VR/AR support
- More physics-based interactions 
- Multi-touch gesture support
- Additional visual effects
- Music synchronization
- Performance optimizations for mobile

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Three.js](https://threejs.org/) for the powerful 3D library
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for audio processing
- Inspiration from various WebGL demos and creative coding projects
