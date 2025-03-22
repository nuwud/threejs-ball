// main.js - Main entry point for the Three.js application
import * as THREE from 'three';
import { setupRenderer } from './js/renderer.js';
import { createScene } from './js/scene.js';
// Import only what's actually exported from audio modules
import {
    initializeAudio,
    getAudioContext,
    resumeAudio,
    getAudioStatus,
    ensureAudioInitialized,
    playToneForPosition,
    playFacetSound,
    playClickSound,
    playReleaseSound
} from './js/audio/core.js';
import { createAudioVisualizer } from './js/visualization.js';
import { createBall, updateBallScale, updateBallRotation, updateBallPosition, resetBall } from './js/ball.js';
import { setupEventListeners } from './js/events.js';
import {
    updateParticleExplosion,
    updateMagneticParticles,
    updateBlackholeEffect,
    updateRainbowMode,
    createParticleExplosion,
    createMagneticTrail,
    createBlackholeEffect,
    removeMagneticTrail,
    toggleRainbowMode
} from './js/effects/index.js';
import {
    getSynthesizer,
    createBallSoundEffects
} from './js/audio/index.js';

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
    clock: new THREE.Clock(),
    enableFacetHighlighting: false,
    trailEffect: null
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
    },
    // Add spiky mode toggle
    toggleSpikyMode: function () {
        // Toggle spikiness between 0 and 0.5
        window.app.spikiness = window.app.spikiness > 0 ? 0 : 0.5;
        
        if (window.app.spikiness > 0) {
            if (typeof applySpikyEffect === 'function') {
                applySpikyEffect(window.app, window.app.spikiness);
            } else {
                console.warn("applySpikyEffect function not found");
            }
            console.log("Spiky mode activated:", window.app.spikiness);
        } else {
            resetBall(window.app, 0.5);
            console.log("Spiky mode deactivated");
        }
        
        return window.app.spikiness > 0;
    },
    toggleFacetHighlighting: function () {
        window.app.enableFacetHighlighting = !window.app.enableFacetHighlighting;
        console.log("Facet highlighting:", window.app.enableFacetHighlighting);
        return window.app.enableFacetHighlighting;
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

    try {
        // First set up scene, renderer, etc.
        initScene();
        initRenderer();
        
        console.log("Scene and renderer initialized");
        
        // Try to create the regular ball first
        try {
            console.log("Attempting to create ball...");
            const ball = createBall(window.app);
            console.log("Ball creation result:", ball ? "Success" : "Failed");
        } catch (ballError) {
            console.error("Error creating regular ball:", ballError);
        }
        
        // If ball wasn't created or had an issue, create emergency ball immediately
        if (!window.app.ballGroup) {
            console.warn("Ball not created successfully - creating emergency ball");
            createEmergencyBall();
        }
        
        // Set up event listeners for interactivity
        setupEventListeners(window.app);
        console.log("Event listeners set up");
        
        // Set up the audio autoplay handler
        setupAudioAutoplayHandler();
        
        // Start animation loop
        animate();
        
        console.log("Application initialized successfully");
        
        // Double-check ball existence after a short delay
        setTimeout(() => {
            if (!window.app.ballGroup || !window.app.scene.children.includes(window.app.ballGroup)) {
                console.warn("Ball still missing after init - creating emergency ball");
                createEmergencyBall();
            }
        }, 1000);
        
    } catch (error) {
        console.error("Error during initialization:", error);
        displayErrorOverlay(error);
        
        // Create emergency ball even after general error
        try {
            createEmergencyBall();
        } catch (emergencyError) {
            console.error("Even emergency ball creation failed:", emergencyError);
        }
    }
}

// Add emergency ball creation as a fallback
function createEmergencyBall() {
    console.warn("Creating emergency fallback ball");
    
    // Remove existing ball if present
    if (window.app.ballGroup && window.app.scene) {
        window.app.scene.remove(window.app.ballGroup);
    }
    
    // Create a simple sphere as a fallback
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0xFF3333, // Red for emergency
        wireframe: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    
    // Add wireframe
    const wireGeometry = new THREE.EdgesGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({ 
        color: 0xFFFFFF, 
        transparent: true, 
        opacity: 0.5 
    });
    const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
    ballGroup.add(wireMesh);
    
    // Store references
    ballGroup.userData = {
        mesh: mesh,
        wireMesh: wireMesh,
        mat: material,
        wireMat: wireMaterial,
        geo: geometry,
        wireGeo: wireGeometry,
        originalPositions: geometry.attributes.position.array.slice()
    };
    
    // Add simple event emitter capabilities
    ballGroup.addEventListener = function(event, callback) {
        if (!this._listeners) this._listeners = {};
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    };
    
    ballGroup.emit = function(event, data) {
        if (!this._listeners || !this._listeners[event]) return;
        for (const callback of this._listeners[event]) {
            callback(data);
        }
    };
    
    // Add to scene
    if (window.app.scene) {
        window.app.scene.add(ballGroup);
        window.app.ballGroup = ballGroup;
        
        console.log("Emergency ball created");
        return ballGroup;
    } else {
        console.error("Cannot create emergency ball: scene not available");
        return null;
    }
}

// Function to handle window resize
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    window.app.camera.aspect = width / height;
    window.app.camera.updateProjectionMatrix();

    window.app.renderer.setSize(width, height);
}

// Animation loop with better error handling
function animate() {
    try {
        requestAnimationFrame(animate);
        
        if (!window.app.ballGroup) {
            console.error("Ball missing in animation loop, attempting to recreate");
            createEmergencyBall();
            return;
        }
        
        // Update ball animations with safety checks
        try {
            updateBallScale(window.app);
            updateBallRotation(window.app);
            updateBallPosition(window.app);
        } catch (ballError) {
            console.error("Error updating ball animations:", ballError);
        }
        
        // Update special effects with safety checks
        try {
            if (typeof updateParticleExplosion === 'function') updateParticleExplosion(window.app);
            if (typeof updateMagneticParticles === 'function') updateMagneticParticles(window.app);
            if (typeof updateBlackholeEffect === 'function') updateBlackholeEffect(window.app);
            if (typeof updateRainbowMode === 'function') updateRainbowMode(window.app);
            
            // Add these new updates with safety checks:
            if (window.app.trailEffect && typeof updateTrailEffect === 'function') {
                updateTrailEffect(window.app);
            }
            
            if (window.app.enableFacetHighlighting && typeof updateFacetHighlights === 'function') {
                updateFacetHighlights(window.app);
            }
        } catch (effectError) {
            console.error("Error updating effects:", effectError);
        }
        
        // Update audio visualization if available
        try {
            if (window.app.analyser && typeof updateAudioVisualization === 'function') {
                updateAudioVisualization(window.app);
            }
        } catch (audioError) {
            console.error("Error updating audio visualization:", audioError);
        }
        
        // Render the scene
        if (window.app.renderer && window.app.scene && window.app.camera) {
            window.app.renderer.render(window.app.scene, window.app.camera);
        } else {
            console.error("Cannot render: missing renderer, scene, or camera");
        }
    } catch (error) {
        console.error("Error in animation loop:", error);
        // Don't rethrow - we want the animation to continue even with errors
    }
}

// Add a function to display error messages to the user
function displayErrorOverlay(error) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '10px';
    overlay.style.left = '10px';
    overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    overlay.style.color = 'white';
    overlay.style.padding = '20px';
    overlay.style.borderRadius = '5px';
    overlay.style.zIndex = '1000';
    overlay.style.maxWidth = '80%';
    overlay.innerHTML = `
        <h2>Error Initializing Three.js</h2>
        <p>${error.message || 'Unknown error'}</p>
        <button id="retry-btn" style="padding: 10px; margin-top: 10px; cursor: pointer;">
            Retry Initialization
        </button>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('retry-btn').addEventListener('click', () => {
        overlay.remove();
        window.location.reload();
    });
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
                if (window.app.ballGroup) {
                    try {
                        const soundEffects = createBallSoundEffects(window.app.ballGroup);
                        soundEffects.setupBallEvents();
                    } catch (soundError) {
                        console.warn("Error setting up ball sound effects:", soundError);
                    }
                } else {
                    console.warn("Cannot setup ball sound effects: Ball not created");
                }

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