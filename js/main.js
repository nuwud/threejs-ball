// main.js - Main entry point for the Three.js application
import * as THREE from 'three';
import { setupRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { 
    listener, 
    setupAudio, 
    setupAudioAnalyzer, 
    createAudioVisualization, 
    updateAudioVisualization,
    getSynthesizer,
    createBallSoundEffects
} from './audio/index.js';
import { createBall, updateBallScale, updateBallRotation, updateBallPosition, resetBall } from './ball.js';
import { setupEventListeners } from './events.js';
import { 
    updateParticleExplosion, 
    updateMagneticParticles, 
    updateBlackholeEffect, 
    updateRainbowMode,
    createParticleExplosion,
    createMagneticTrail,
    createBlackholeEffect,
    removeMagneticTrail
} from './effects/index.js';
import { updateFacetHighlights } from './effects/facet.js';
import { createTrailEffect, updateTrailEffect } from './effects/trail.js';
import { applySpikyEffect } from './effects/spiky.js';
import { resetDeformation } from './effects/deformation.js';

// Audio core imports - keep these intact
import { 
    playFacetSound,
    playClickSound,
    playReleaseSound,
    soundManager, 
    enableContinuousSoundMode
} from './audio/core.js';

// Make soundManager globally available
window.soundManager = soundManager;

// Dynamically load debugAudioSystem but don't let it break the main app
window.debugAudioSystem = null;
import('./audio/core.js').then(module => {
    if (module.debugAudioSystem) {
        window.debugAudioSystem = module.debugAudioSystem;
    }
}).catch(e => console.warn("Could not load debug audio system:", e));

console.log("Initializing application...");

// Global app state
window.app = {
    scene: null,
    camera: null,
    renderer: null,
    audioContext: null,
    soundSynth: null,
    analyser: null,
    bufferLength: null,
    audioDataArray: null,
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
    audioInitialized: false,
    enableFacetHighlighting: false,
    trailEffect: null
};

// Global app controls - exposed for UI buttons
window.appControls = {
    toggleRainbowMode: function() {
        const isActive = !window.app.isRainbowMode;
        window.app.isRainbowMode = isActive;
        console.log("Rainbow mode:", isActive);
        return isActive;
    },
    toggleMagneticMode: function() {
        window.app.isMagneticMode = !window.app.isMagneticMode;
        if (window.app.isMagneticMode) {
            createMagneticTrail(window.app);
        } else {
            removeMagneticTrail(window.app);
        }
        console.log("Magnetic mode:", window.app.isMagneticMode);
        return window.app.isMagneticMode;
    },
    createBlackholeEffect: function() {
        createBlackholeEffect(window.app);
        console.log("Blackhole effect activated");
    },
    createExplosion: function() {
        createParticleExplosion(window.app);
        console.log("Explosion effect activated");
    },
    resetBall: function() {
        resetBall(window.app);
        console.log("Ball reset");
    },
    playSound: function() {
        // Make sure audio is initialized
        if (!window.app.audioInitialized) {
            initOnFirstClick();
        }
        
        // Use the core audio functions directly
        if (window.app.audioContext) {
            playClickSound(window.app);
            console.log("Test sound played");
        } else {
            console.warn("Audio context not available");
        }
    },
    toggleSpikyMode: function() {
        // Toggle spikiness between 0 and 0.5
        window.app.spikiness = window.app.spikiness > 0 ? 0 : 0.5;
        
        if (window.app.spikiness > 0) {
            applySpikyEffect(window.app, window.app.spikiness);
            console.log("Spiky mode activated:", window.app.spikiness);
        } else {
            resetDeformation(window.app, 0.5);
            console.log("Spiky mode deactivated");
        }
        
        return window.app.spikiness > 0;
    },
    
    toggleFacetHighlighting: function() {
        window.app.enableFacetHighlighting = !window.app.enableFacetHighlighting;
        console.log("Facet highlighting:", window.app.enableFacetHighlighting);
        return window.app.enableFacetHighlighting;
    },
    
    toggleTrailEffect: function() {
        if (window.app.trailEffect) {
            window.app.scene.remove(window.app.trailEffect);
            window.app.trailEffect = null;
            console.log("Trail effect deactivated");
            return false;
        } else {
            window.app.trailEffect = createTrailEffect(window.app);
            console.log("Trail effect activated");
            return true;
        }
    }
};

/**
 * Create a simpler emergency ball if the main ball creation fails
 * This ensures users always see something rather than an empty scene
 */
function createEmergencyBall() {
    console.log("Creating emergency ball...");
    
    if (!window.app) {
        console.error("Cannot create emergency ball: app object missing");
        return null;
    }
    
    // Make sure we have a scene - create one if it doesn't exist
    if (!window.app.scene) {
        console.warn("Scene not found, creating a new scene for emergency ball");
        window.app.scene = new THREE.Scene();
        window.app.scene.background = new THREE.Color(0x000033); // Dark blue background
    }
    
    try {
        // Create a simple sphere with fewer segments
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        
        // Create a simple material (no complex textures or effects)
        const material = new THREE.MeshBasicMaterial({
            color: 0x8866ff,
            wireframe: false
        });
        
        // Create wireframe material
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true
        });
        
        // Create meshes
        const mesh = new THREE.Mesh(geometry, material);
        const wireMesh = new THREE.Mesh(geometry, wireMaterial);
        
        // Create group to hold both meshes
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        ballGroup.add(wireMesh);
        
        // Store references in userData
        ballGroup.userData = {
            mesh: mesh,
            wireMesh: wireMesh,
            mat: material,
            wireMat: wireMaterial,
            geo: geometry,
            isEmergencyBall: true,
            originalPositions: geometry.attributes.position.array.slice()
        };
        
        // Add to scene
        window.app.scene.add(ballGroup);
        window.app.ballGroup = ballGroup;
        
        // Add emit function for compatibility with event system
        ballGroup.emit = function(eventName, data) {
            console.log(`Ball event: ${eventName}`, data);
        };
        
        console.log("Emergency ball created successfully");
        
        // Make sure we have a camera
        if (!window.app.camera) {
            console.warn("Camera not found, creating a new camera for emergency ball");
            window.app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            window.app.camera.position.z = 2;
        }
        
        // Show status message to user
        if (window.showStatus) {
            window.showStatus("Using simplified ball model");
        }
        
        return ballGroup;
    } catch (error) {
        console.error("Failed to create emergency ball:", error);
        return null;
    }
}

// Initialize the application
function init() {
    console.log("Initializing application...");

    try {
        // Set up renderer
        const w = window.innerWidth;
        const h = window.innerHeight;
        window.app.renderer = setupRenderer(w, h);
        document.body.appendChild(window.app.renderer.domElement);
        console.log("Renderer added to DOM");

        // Create scene
        window.app.scene = createScene();
        console.log("Scene created");

        // Create camera
        window.app.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
        window.app.camera.position.set(0, 0, 2);
        window.app.camera.add(listener);
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

        // Add event listener for window resize
        window.addEventListener('resize', onWindowResize);
        console.log("Resize handler set up");

        // Initialize soundManager early and attach to window.app
        if (soundManager && !window.app.soundManager) {
            window.app.soundManager = soundManager;
            if (typeof soundManager.init === 'function') {
                try {
                    soundManager.init();
                    console.log("Sound manager initialized early");
                } catch (e) {
                    console.warn("Early sound manager initialization failed:", e);
                }
            }
        }

        // Try to create the ball
        try {
            console.log("Attempting to create ball...");
            const ball = createBall(window.app);
            console.log("Ball creation result:", ball ? "Success" : "Failed");
            
            // If ball creation failed, create emergency ball
            if (!ball || !window.app.ballGroup) {
                console.warn("Ball not created successfully, trying emergency ball");
                createEmergencyBall();
            }
        } catch (ballError) {
            console.error("Error creating ball:", ballError);
            createEmergencyBall();
        }

        // Set up event listeners for interactivity
        setupEventListeners(window.app);
        console.log("Event listeners set up");
        
        // Initialize audio on first user interaction
        document.addEventListener('click', initOnFirstClick, { once: true });
        document.addEventListener('mousedown', initOnFirstClick, { once: true });
        document.addEventListener('touchstart', initOnFirstClick, { once: true });
        document.addEventListener('keydown', initOnFirstClick, { once: true });
        
        // Start animation loop
        animate();
        console.log("Animation loop started");
        
        // Add debug button for audio testing
        addDebugButton();
        
        console.log("Application initialized successfully");
    } catch (error) {
        console.error("Error initializing application:", error);
        
        // Try to recover with minimal initialization
        try {
            if (!window.app.renderer) {
                const w = window.innerWidth;
                const h = window.innerHeight;
                window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
                window.app.renderer.setSize(w, h);
                document.body.appendChild(window.app.renderer.domElement);
            }
            
            if (!window.app.scene) {
                window.app.scene = new THREE.Scene();
                window.app.scene.background = new THREE.Color(0x000000);
            }
            
            if (!window.app.camera) {
                window.app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                window.app.camera.position.z = 2;
            }
            
            if (!window.app.ballGroup) {
                createEmergencyBall();
            }
            
            // Start minimal animation loop
            function minimalAnimate() {
                requestAnimationFrame(minimalAnimate);
                
                // Rotate ball if it exists
                if (window.app.ballGroup) {
                    window.app.ballGroup.rotation.y += 0.01;
                }
                
                // Render
                window.app.renderer.render(window.app.scene, window.app.camera);
            }
            
            minimalAnimate();
            console.log("Minimal fallback initialization completed");
            
            if (window.showStatus) {
                window.showStatus("Running in fallback mode");
            }
        } catch (fallbackError) {
            console.error("Critical failure in fallback:", fallbackError);
        }
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    try {
        // Update ball animations if ball exists
        if (window.app.ballGroup) {
            try {
                updateBallScale(window.app);
                updateBallRotation(window.app);
                updateBallPosition(window.app);
            } catch (ballError) {
                console.error("Error updating ball:", ballError);
                // At least make it rotate
                window.app.ballGroup.rotation.y += 0.01;
            }
        }
        
        // Update special effects - wrap in try/catch to prevent one effect from breaking everything
        try {
            updateParticleExplosion(window.app);
        } catch (e) { console.error("Error in particle explosion:", e); }
        
        try {
            updateMagneticParticles(window.app);
        } catch (e) { console.error("Error in magnetic particles:", e); }
        
        try {
            updateBlackholeEffect(window.app);
        } catch (e) { console.error("Error in blackhole effect:", e); }
        
        try {
            updateRainbowMode(window.app);
        } catch (e) { console.error("Error in rainbow mode:", e); }
        
        // Add these new updates with proper safety checks:
        if (window.app.trailEffect) {
            try {
                updateTrailEffect(window.app);
            } catch (e) { 
                console.error("Error in trail effect:", e);
                // Clean up failed trail effect to prevent future errors
                if (window.app.trailEffect && window.app.scene) {
                    window.app.scene.remove(window.app.trailEffect);
                    window.app.trailEffect = null;
                }
            }
        }
        
        if (window.app.enableFacetHighlighting) {
            try {
                updateFacetHighlights(window.app);
            } catch (e) { 
                console.error("Error in facet highlights:", e);
                // Disable facet highlighting to prevent future errors
                window.app.enableFacetHighlighting = false;
            }
        }

        // Update audio visualization if available
        if (window.app.audioContext && window.app.analyser) {
            try {
                updateAudioVisualization(window.app);
            } catch (e) { console.error("Error in audio visualization:", e); }
        }
        
        // Render the scene
        window.app.renderer.render(window.app.scene, window.app.camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
    }
}

// Initialize audio on first user interaction
function initOnFirstClick() {
    try {
        // Don't initialize multiple times
        if (window.app.audioInitialized) return;
        
        console.log("Initializing audio on first user interaction");
        
        // Set a flag to prevent infinite loops if audio initialization fails
        window.app.audioInitialized = true;
        
        // Ensure soundManager is attached to app
        if (!window.app.soundManager && soundManager) {
            window.app.soundManager = soundManager;
            console.log("Sound manager attached to app");
        }
        
        // Initialize soundManager if not already done
        if (window.app.soundManager && typeof window.app.soundManager.init === 'function' && !window.app.soundManager.initialized) {
            try {
                window.app.soundManager.init();
                console.log("Sound manager initialized");
            } catch (e) {
                console.error("Failed to initialize sound manager:", e);
            }
        }
        
        // Setup audio systems with timeouts to prevent blocking
        setTimeout(() => {
            try {
                setupAudio(window.app);
                console.log("Audio setup complete");
                
                // Setup analyzer after short delay
                setTimeout(() => {
                    try {
                        setupAudioAnalyzer(window.app);
                        console.log("Audio analyzer setup complete");
                        
                        // Create audio visualizations
                        createAudioVisualization(window.app);
                        console.log("Audio visualization created");
                        
                        // Initialize synthesizer if needed
                        try {
                            // Get the synthesizer instance
                            window.app.soundSynth = getSynthesizer();
                            
                            // Setup ball sound effects
                            if (window.app.soundSynth && window.app.ballGroup) {
                                const soundEffects = createBallSoundEffects(window.app.ballGroup);
                                soundEffects.setupBallEvents();
                                console.log("Ball sound effects initialized");
                            }
                        } catch (synthError) {
                            console.warn("Error initializing synthesizer:", synthError);
                        }
                        
                        // Resume audio context if needed
                        if (window.app.audioContext && window.app.audioContext.state === 'suspended') {
                            window.app.audioContext.resume().then(() => {
                                console.log("AudioContext resumed successfully");
                            }).catch(err => {
                                console.error("Failed to resume AudioContext:", err);
                            });
                        }
                    } catch (analyzerError) {
                        console.error("Error setting up audio analyzer:", analyzerError);
                    }
                }, 100);
            } catch (setupError) {
                console.error("Error in audio setup:", setupError);
            }
        }, 100);
        
        console.log("Audio initialization scheduled");
    } catch (error) {
        console.error("Error initializing audio:", error);
        // Mark as initialized even if it fails to prevent retries
        window.app.audioInitialized = true;
    }
}

// For debugging: add a button to test audio
function addDebugButton() {
    const button = document.createElement('button');
    button.textContent = 'Test Audio';
    button.style.position = 'absolute';
    button.style.bottom = '10px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '8px 16px';
    button.style.background = '#00AAFF';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
        // Ensure audio is initialized
        if (!window.app.audioInitialized) {
            initOnFirstClick();
            
            // Add a small delay to allow audio to initialize
            setTimeout(() => {
                playTestSound();
            }, 500);
        } else {
            playTestSound();
        }
    });
    
    function playTestSound() {
        // Direct play using core audio functions
        if (window.app.audioContext) {
            playClickSound(window.app);
            console.log("Test sound played");
        } else {
            console.warn("Audio context not available");
        }
    }
    
    document.body.appendChild(button);
}

// Add this to your initialization code to handle the new UI controls
function initAudioControls() {
    const audioEnabledCheckbox = document.getElementById('audio-enabled');
    const continuousModeCheckbox = document.getElementById('continuous-mode');
    const visualizationCheckbox = document.getElementById('visualization');
    const volumeSlider = document.getElementById('volume');
    
    // Check if elements exist in the DOM
    if (!audioEnabledCheckbox || !continuousModeCheckbox || 
        !visualizationCheckbox || !volumeSlider) {
        console.warn("Audio control elements not found in DOM");
        return;
    }
    
    // Set initial states - WITH NULL CHECKS
    audioEnabledCheckbox.checked = true;
    continuousModeCheckbox.checked = true;
    visualizationCheckbox.checked = true;
    
    // Initialize master volume - WITH NULL CHECKS
    if (window.app && window.app.soundManager && window.app.soundManager.masterGain) {
        volumeSlider.value = window.app.soundManager.masterGain.gain.value * 100;
    } else {
        volumeSlider.value = 70; // Default value
    }
    
    // Add event listeners
    audioEnabledCheckbox.addEventListener('change', (e) => {
        if (!window.app || !window.app.soundManager || !window.app.soundManager.masterGain) return;
        
        if (e.target.checked) {
            window.app.soundManager.masterGain.gain.value = volumeSlider.value / 100;
        } else {
            window.app.soundManager.masterGain.gain.value = 0;
        }
    });
    
    continuousModeCheckbox.addEventListener('change', (e) => {
        if (window.app) {
            window.app.continuousSoundEnabled = e.target.checked;
        }
    });
    
    visualizationCheckbox.addEventListener('change', (e) => {
        if (window.app && window.app.audioVisualization) {
            window.app.audioVisualization.enabled = e.target.checked;
        }
    });
    
    volumeSlider.addEventListener('input', (e) => {
        if (!window.app || !window.app.soundManager || !window.app.soundManager.masterGain) return;
        
        if (audioEnabledCheckbox.checked) {
            window.app.soundManager.masterGain.gain.value = e.target.value / 100;
        }
    });
}

// Don't call initAudioControls immediately - call it after a delay
// to ensure the DOM elements are loaded
setTimeout(initAudioControls, 1000); 

// Initialize the application
init();

document.addEventListener('DOMContentLoaded', () => {
    const ball = document.getElementById('ball');
    const toggleGreenSquares = document.getElementById('toggleGreenSquares');

    // Toggle green squares visibility
    toggleGreenSquares.addEventListener('click', () => {
        toggleGreenSquares.classList.toggle('active');
        const greenSquares = document.querySelectorAll('.green-square');
        greenSquares.forEach(square => {
            square.style.display = toggleGreenSquares.classList.contains('active') ? 'block' : 'none';
        });
    });

    // Ensure green squares are hidden by default
    toggleGreenSquares.classList.remove('active');
    const greenSquares = document.querySelectorAll('.green-square');
    greenSquares.forEach(square => {
        square.style.display = 'none';
    });

    // Add other button functionalities here
    document.getElementById('resetBall').addEventListener('click', () => {
        // Reset ball functionality
    });

    document.getElementById('toggleWireframe').addEventListener('click', () => {
        // Toggle wireframe functionality
    });

    document.getElementById('emergencyBall').addEventListener('click', () => {
        // Emergency ball functionality
    });

    document.getElementById('standardAudio').addEventListener('click', () => {
        // Standard audio functionality
    });

    document.getElementById('continuousAudio').addEventListener('click', () => {
        // Continuous audio functionality
    });

    document.getElementById('toggleVisualization').addEventListener('click', () => {
        // Toggle visualization functionality
    });

    document.getElementById('debugAudio').addEventListener('click', () => {
        // Debug audio functionality
    });

    document.getElementById('testAudio').addEventListener('click', () => {
        // Test audio functionality
    });
});