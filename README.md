# Interactive 3D Ball with Three.js

A visually stunning and interactive 3D sphere built with Three.js featuring sound effects, dynamic deformations, particle effects and physics interactions.

![Interactive Three.js Ball Demo](https://user-images.githubusercontent.com/your_username/your_repo/assets/demo.gif)

## Features

### Visual Effects
- **Dynamic Deformation**: Touch/hover to create dents in the surface
- **Responsive Wireframe**: Dual-layered design with translucent surface and wireframe overlay
- **Gradient Materials**: Customizable radial gradients with physically-based rendering
- **Particle Systems**: Explosion effects with physics-based particle movement
- **Spiky Transformation**: Scroll wheel creates dynamically animated spikes
- **Black Hole Effect**: Gravitational pull and deformation physics
- **Magnetic Field**: Orbital particle systems with dynamic following behavior

### Interaction
- **Mouse/Touch Controls**: Full interaction support for desktop and mobile
- **Multi-State Interaction**: Different effects for hover, click, right-click, scroll
- **Advanced Mouse Support**: Forward/back buttons trigger special effects
- **Double-Click Actions**: Toggle rainbow color cycling mode
- **Smooth Transitions**: All state changes have fluid animations

### Audio
- **Interactive Sound Effects**: Audio feedback for all interactions
- **Positional Audio**: 3D sounds that change based on object position
- **Audio Synthesis**: Real-time generated sounds using Web Audio API
- **Audio Reactivity**: Visual effects that respond to sound intensity
- **Dynamic Sound Design**: Different oscillator types for different interactions

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

- Dynamic geometry manipulation
- Custom material creation with Canvas-generated textures
- Advanced lighting setup with multiple light sources
- Physics-based animations for natural movement
- Matrix transformations for proper world/local space conversions
- Custom interaction handling with raycasting
- Particle systems with individual physics and properties
- Audio integration using Three.js Audio and Web Audio API

## Getting Started

### Prerequisites
- Modern web browser with WebGL support

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

## Customization

You can customize the ball's appearance and behavior:

- Modify the `colorStart`, `colorMid`, and `colorEnd` variables to change the gradient
- Adjust subdivision level in `new THREE.IcosahedronGeometry(1.0, 4)` (4 is high detail)
- Change material properties in the `MeshPhysicalMaterial` initialization
- Modify physics parameters in various update functions

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari (14+)
- Edge

Mobile browsers that support WebGL will also work, but performance may vary.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [Three.js](https://threejs.org/) for the powerful 3D library
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) for audio processing
