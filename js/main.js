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
    SoundSynthesizer,
    getSynthesizer,
    createBallSoundEffects
} from './audio/index.js';
import { 
    playFacetSound,
    playClickSound,
    playReleaseSound
} from './audio/core.js';
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

// All imports are now at the top of the file

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
    audioInitialized: false
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
    }
};

// Initialize the application
function init() {
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
    
    // Create the ball
    createBall(window.app);
    console.log("Ball created");
    
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
        // Update ball animations
        updateBallScale(window.app);
        updateBallRotation(window.app);
        updateBallPosition(window.app);
        
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

// Initialize the application
init();