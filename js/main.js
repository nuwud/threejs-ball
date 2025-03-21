// main.js - Entry point for the application
import { setupRenderer } from './renderer.js';
import { createScene, setupCamera, setupLights } from './scene.js';
import { createBall } from './ball.js';
import { setupAudio, initAudioEffects } from './audio.js';
import { setupEventListeners } from './events.js';
import { animate } from './utils.js';

// Main application object to store shared references
const app = {
    renderer: null,
    scene: null,
    camera: null,
    ballGroup: null,
    soundManager: null,
    audioContext: null,
    analyser: null,
    mouse: { x: 0, y: 0 },
    raycaster: null,
    // Animation flags and states
    isDragging: false,
    isHovered: false,
    isRainbowMode: false,
    isMagneticMode: false,
    targetScale: 1.0,
    currentScale: 1.0,
    spikiness: 0,
    gravitationalPull: 0,
    // Time tracking
    clock: null,
    // Helper objects
    touchSphere: null
};

// Handle window resize events
function setupResizeHandler() {
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        // Update camera aspect ratio and projection matrix
        if (app.camera) {
            app.camera.aspect = newWidth / newHeight;
            app.camera.updateProjectionMatrix();
        }

        // Resize renderer
        if (app.renderer) {
            app.renderer.setSize(newWidth, newHeight);
        }
    });
}

// Initialize the application
function init() {
    console.log('Initializing application...');

    try {
        // Setup renderer and append canvas to DOM
        app.renderer = setupRenderer();
        document.body.appendChild(app.renderer.domElement);
        console.log('Renderer added to DOM');

        // Create scene and setup camera
        app.scene = createScene();
        console.log('Scene created');
        
        app.camera = setupCamera();
        console.log('Camera created');

        // Add lights to the scene
        setupLights(app);
        console.log('Lights set up');

        // Set up resize handler
        setupResizeHandler();
        console.log('Resize handler set up');

        // Create the 3D ball object
        app.ballGroup = createBall(app);
        console.log('Ball created');

        // Setup audio system
        app.soundManager = setupAudio(app);
        console.log('Audio system set up');

        // Setup event listeners
        setupEventListeners(app);
        console.log('Event listeners set up');

        // Start animation loop
        animate(app);
        console.log('Animation loop started');

        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        // Display error on page for visibility
        const errorDiv = document.createElement('div');
        errorDiv.style.color = 'red';
        errorDiv.style.padding = '20px';
        errorDiv.style.fontFamily = 'monospace';
        errorDiv.innerHTML = `<h2>Error initializing Three.js</h2><pre>${error.message}\n${error.stack}</pre>`;
        document.body.appendChild(errorDiv);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export the app object to make it accessible to other modules
export { app };