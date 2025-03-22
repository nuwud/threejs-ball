// main.js - Main entry point for the Three.js application
import * as THREE from 'three';
import { setupRenderer } from './renderer.js';
import { createScene } from './scene.js';
// Import only what's actually exported from audio modules
import {
    initializeAudio,
    getAudioContext,
    resumeAudio,
    getAudioStatus
} from './audio/core.js';
import { createAudioVisualizer } from './visualization.js';
import { createBall, updateBallScale, updateBallRotation, updateBallPosition, resetBall } from './ball.js';
import { setupEventListeners } from './events.js';
import {
    updateParticleExplosion,
    updateMagneticParticles,
    updateBlackholeEffect,
    updateRainbowMode,
    createParticleExplosion,
    createMagneticTrail,
    createBlackholeEffect
} from './effects/index.js';
import {
    getSynthesizer,
    createBallSoundEffects
} from './audio/index.js';

console.log("Initializing application...");

// Global app state
window.app = {
    scene: null,
    camera: null,
    renderer: null,
    isRainbowMode: false,
    isMagneticMode: false,
    gravitationalPull: 0,
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    isDragging: false,
    isHovered: false,
    targetScale: 1.0,
    currentScale: 1.0,
    spikiness: 0,
    ballGroup: null,
    lastFacetIndex: -1,
    touchPoint: null,
    rainbowSoundPlaying: false,
    clock: new THREE.Clock()
};

// Create a listener for audio positioning
const listener = new THREE.AudioListener();

// Global app controls - exposed for UI buttons
window.appControls = {
    toggleRainbowMode: function () {
        const isActive = toggleRainbowMode(window.app);
        console.log("Rainbow mode:", isActive);
        return isActive;
    },
    toggleMagneticMode: function () {
        window.app.isMagneticMode = !window.app.isMagneticMode;
        if (window.app.isMagneticMode) {
            createMagneticTrail(window.app);
        } else {
            removeMagneticTrail(window.app);
        }
        console.log("Magnetic mode:", window.app.isMagneticMode);
        return window.app.isMagneticMode;
    },
    createBlackholeEffect: function () {
        createBlackholeEffect(window.app);
        console.log("Blackhole effect activated");
    },
    createExplosion: function () {
        createParticleExplosion(window.app);
        console.log("Explosion effect activated");
    },
    resetBall: function () {
        resetBall(window.app);
        console.log("Ball reset");
    }
};

// Initialize the application
function initScene() {
    // Create scene
    window.app.scene = createScene();
    console.log("Scene created");

    // Create camera
    const w = window.innerWidth;
    const h = window.innerHeight;
    window.app.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    window.app.camera.position.set(0, 0, 2);
    window.app.camera.add(listener); // Add listener to camera
    console.log("Camera created");

    // Create lights
    const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    hemilight.position.set(0, 1, 0).normalize();
    window.app.scene.add(hemilight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    window.app.scene.add(light);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-1, -1, -1).normalize();
    window.app.scene.add(light2);

    const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
    pointLight.position.set(0, 0, 2);
    window.app.scene.add(pointLight);
    window.app.scene.userData.pointLight = pointLight;

    console.log("Lights set up");
}

function initRenderer() {
    // Set up renderer
    const w = window.innerWidth;
    const h = window.innerHeight;
    window.app.renderer = setupRenderer(w, h);
    document.body.appendChild(window.app.renderer.domElement);
    console.log("Renderer added to DOM");

    // Add event listener for window resize
    window.addEventListener('resize', onWindowResize);
    console.log("Resize handler set up");
}

// Initialize the application asynchronously
async function initApp() {
    console.log("Initializing application...");

    // First set up scene, renderer, etc.
    initScene();
    initRenderer();

    // Set up the audio autoplay handler instead of initializing audio immediately
    setupAudioAutoplayHandler();

    // Create the ball (doesn't need to wait for audio)
    createBall(window.app);
    console.log("Ball created");

    // Set up event listeners for interactivity
    setupEventListeners(window.app);
    console.log("Event listeners set up");

    // Start animation loop
    animate();

    console.log("Application initialized successfully");
}

// Function to handle window resize
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    window.app.camera.aspect = width / height;
    window.app.camera.updateProjectionMatrix();

    window.app.renderer.setSize(width, height);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update ball animations
    updateBallScale(window.app);
    updateBallRotation(window.app);
    updateBallPosition(window.app);

    // Update special effects
    updateParticleExplosion(window.app);
    updateMagneticParticles(window.app);
    updateBlackholeEffect(window.app);
    updateRainbowMode(window.app);

    // Update audio visualization if available
    if (window.app.analyser) {
        updateAudioVisualization(window.app);
    }

    // Render the scene
    window.app.renderer.render(window.app.scene, window.app.camera);
}

// Add missing audio visualization functions
// Simple setup for audio analyzer
function setupAudioAnalyzer(app) {
    if (!app.audioContext) {
        console.warn("Cannot set up audio analyzer: AudioContext not available");
        return;
    }

    try {
        // Create analyzer node
        const analyser = app.audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        // Connect to master output
        const masterGain = app.audioContext.destination;
        masterGain.connect(analyser);

        // Store the analyzer in the app
        app.analyser = analyser;
        app.analyserData = new Uint8Array(analyser.frequencyBinCount);

        console.log("Audio analyzer set up successfully");
    } catch (error) {
        console.error("Error setting up audio analyzer:", error);
    }
}

// Create audio visualization
function createAudioVisualization(app) {
    if (!app.audioContext || !app.analyser) {
        console.warn("Cannot create audio visualization: AudioContext or Analyser not available");
        return;
    }

    // Create visualization mesh
    const visualizerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const visualizerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

    const visualizerContainer = new THREE.Group();
    app.scene.add(visualizerContainer);

    // Create audio bars
    const numBars = 32;
    const bars = [];

    for (let i = 0; i < numBars; i++) {
        const bar = new THREE.Mesh(visualizerGeometry, visualizerMaterial);
        const angle = (i / numBars) * Math.PI * 2;
        bar.position.x = Math.cos(angle) * 1.5;
        bar.position.z = Math.sin(angle) * 1.5;
        bar.scale.y = 0.1;
        visualizerContainer.add(bar);
        bars.push(bar);
    }

    app.audioVisualization = {
        container: visualizerContainer,
        bars: bars
    };

    console.log("Audio visualization created");
}

// Update audio visualization
function updateAudioVisualization(app) {
    if (!app.analyser || !app.audioVisualization) return;

    // Get frequency data
    app.analyser.getByteFrequencyData(app.analyserData);

    // Update visualization
    const bars = app.audioVisualization.bars;
    const dataLength = app.analyserData.length;

    for (let i = 0; i < bars.length; i++) {
        const index = Math.floor(i * dataLength / bars.length);
        const value = app.analyserData[index] / 255; // Normalize to 0-1

        // Update bar height
        bars[i].scale.y = 0.1 + value * 2;
    }
}

// Function to handle browser audio autoplay restrictions
function setupAudioAutoplayHandler() {
    const startAudioElement = document.createElement('div');
    startAudioElement.className = 'audio-start-overlay';
    startAudioElement.innerHTML = `
        <div class="audio-start-content">
            <h2>Click to Enable Audio</h2>
            <p>This experience includes audio effects.</p>
            <button class="audio-start-button">Start Experience</button>
        </div>
    `;
    document.body.appendChild(startAudioElement);

    const startButton = startAudioElement.querySelector('.audio-start-button');
    startButton.addEventListener('click', () => {
        // This user interaction will allow audio to start
        initializeAudio().then((audioInitialized) => {
            console.log('Audio initialized after user interaction');

            if (audioInitialized) {
                // Store audio context in app for convenience
                window.app.audioContext = getAudioContext();

                // Set up audio analysis
                setupAudioAnalyzer(window.app);

                // Create audio visualizations
                createAudioVisualization(window.app);

                // Set up ball sound effects
                const soundEffects = createBallSoundEffects(window.app.ballGroup);
                soundEffects.setupBallEvents();

                console.log('Audio system initialized successfully');
            } else {
                console.log('Running without audio features');
            }

            // Remove the overlay
            startAudioElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(startAudioElement);
            }, 500); // Fade out time
        }).catch(error => {
            console.warn('Audio initialization failed:', error);
            startAudioElement.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(startAudioElement);
            }, 500);
        });
    });
}

// Start the application
initApp();