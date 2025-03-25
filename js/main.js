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
    trailEffect: null,
    // Add visualization placeholders
    audioVisualization: null,
    enhancedVisualization: null
};

// Initialize the application
function init() {
    console.log("Initializing application...");

    try {
        // Set up renderer
        const w = window.innerWidth;
        const h = window.innerHeight;
        window.app.renderer = setupRenderer(w, h);
        
        // Append the renderer's canvas to the #ball container
        const ballContainer = document.getElementById('ball');
        if (ballContainer) {
            ballContainer.appendChild(window.app.renderer.domElement);
            console.log("Renderer added to DOM");
        } else {
            console.error('Ball container (#ball) not found in DOM.');
            // Fallback to append to body
            document.body.appendChild(window.app.renderer.domElement);
            console.warn("Renderer added to body as fallback");
        }

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
        
        // Create the ball - THIS IS THE CRITICAL PART
        console.log("Attempting to create ball...");
        const ball = createBall(window.app);
        
        if (!ball) {
            console.warn("Ball creation returned null, creating emergency ball");
            createEmergencyBall();
        } else {
            console.log("Ball created successfully!");
            
            // Make sure the ball is visible
            ball.visible = true;
            
            // Add it to the scene if not already added
            if (ball.parent !== window.app.scene) {
                window.app.scene.add(ball);
                console.log("Ball added to scene");
            }
            
            // Store reference in app for later access
            window.app.ballGroup = ball;
        }

        // Set up event listeners for interactivity
        setupEventListeners(window.app);
        console.log("Event listeners set up");

        // Add event listener for window resize
        window.addEventListener('resize', onWindowResize);
        console.log("Resize handler set up");

        // Initialize audio on first user interaction
        document.addEventListener('click', initOnFirstClick, { once: true });
        document.addEventListener('mousedown', initOnFirstClick, { once: true });
        document.addEventListener('touchstart', initOnFirstClick, { once: true });
        document.addEventListener('keydown', initOnFirstClick, { once: true });

        // Start animation loop
        animate();
        console.log("Animation loop started");

        console.log("Application initialized successfully");
    } catch (error) {
        console.error("Error initializing application:", error);
        // Try to recover with minimal initialization
        recoverWithEmergencyBall();
    }
}

// Initialize audio on first user interaction
function initOnFirstClick() {
    if (!window.app.audioInitialized) {
        try {
            // Pass window.app to setupAudio
            const audioSetupResult = setupAudio(window.app);
            
            // Function to complete audio initialization
            const completeAudioSetup = () => {
                window.app.audioInitialized = true;
                window.app.soundSynth = getSynthesizer();
                // Pass window.app to createBallSoundEffects if needed
                createBallSoundEffects(window.app);
                
                // Only set up audio analyzer if audio context exists
                if (window.app.audioContext) {
                    // Pass window.app to setupAudioAnalyzer
                    setupAudioAnalyzer(window.app);
                    // Pass window.app to createAudioVisualization
                    window.app.audioVisualization = createAudioVisualization(window.app);
                } else {
                    console.warn("Audio context not available, skipping analyzer setup");
                }
                
                console.log("Audio initialized on user interaction");
            };
            
            // Check if setupAudio returned a Promise
            if (audioSetupResult && typeof audioSetupResult.then === 'function') {
                // Handle Promise-based setup
                audioSetupResult
                    .then(completeAudioSetup)
                    .catch(error => {
                        console.error("Error initializing audio:", error);
                    });
            } else {
                // Handle synchronous setup (no Promise returned)
                completeAudioSetup();
            }
        } catch (error) {
            console.error("Error in audio initialization:", error);
        }
    }
}

// Function to create an emergency ball if main ball creation fails
function createEmergencyBall() {
    console.warn("Creating emergency fallback ball");
    try {
        // Create a simple sphere
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00DFDF,
            metalness: 0.3,
            roughness: 0.4,
        });
        const ball = new THREE.Mesh(geometry, material);
        
        // Create a group to hold the ball
        const ballGroup = new THREE.Group();
        ballGroup.add(ball);
        
        // Add to scene and store reference
        window.app.scene.add(ballGroup);
        window.app.ballGroup = ballGroup;
        
        console.log("Emergency ball created successfully");
    } catch (error) {
        console.error("Failed to create emergency ball:", error);
    }
}

// Handle window resize
function onWindowResize() {
    if (window.app.camera && window.app.renderer) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        window.app.camera.aspect = w / h;
        window.app.camera.updateProjectionMatrix();
        window.app.renderer.setSize(w, h);
        
        console.log("Resized renderer to", w, "x", h);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = window.app.clock.getDelta();
    const elapsedTime = window.app.clock.getElapsedTime();
    
    try {
        // Update ball scale
        if (window.app.targetScale !== window.app.currentScale) {
            updateBallScale(window.app);
        }
        
        // Update ball rotation
        updateBallRotation(window.app, delta);
        
        // Update ball position if being dragged
        if (window.app.isDragging && window.app.touchPoint) {
            updateBallPosition(window.app);
        }
        
        // Update visual effects
        if (window.app.isRainbowMode) {
            updateRainbowMode(window.app, elapsedTime);
        }
        
        if (window.app.isMagneticMode) {
            updateMagneticParticles(window.app);
        }
        
        if (window.app.gravitationalPull > 0) {
            updateBlackholeEffect(window.app);
        }
        
        if (window.app.enableFacetHighlighting) {
            updateFacetHighlights(window.app);
        }
        
        if (window.app.trailEffect) {
            updateTrailEffect(window.app.trailEffect, delta);
        }
        
        // Update audio visualization if available
        if (window.app.analyser && window.app.audioDataArray) {
            window.app.analyser.getByteFrequencyData(window.app.audioDataArray);
            if (window.app.audioVisualization) {
                updateAudioVisualization(window.app.audioDataArray);
            }
        }
        
        // Render the scene
        window.app.renderer.render(window.app.scene, window.app.camera);
    } catch (error) {
        console.error("Error in animation loop:", error);
    }
}

// Function to recover with an emergency ball if main initialization fails
function recoverWithEmergencyBall() {
    try {
        console.warn("Attempting emergency recovery...");
        
        if (!window.app.renderer) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
            window.app.renderer.setSize(w, h);
            document.body.appendChild(window.app.renderer.domElement);
            console.log("Emergency renderer created");
        }

        if (!window.app.scene) {
            window.app.scene = new THREE.Scene();
            window.app.scene.background = new THREE.Color(0x000033);
            console.log("Emergency scene created");
        }

        if (!window.app.camera) {
            window.app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            window.app.camera.position.z = 2;
            console.log("Emergency camera created");
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
    } catch (fallbackError) {
        console.error("Critical failure in fallback:", fallbackError);
    }
}

// Add controls API for external access
window.appControls = {
    resetBall: () => {
        resetBall(window.app);
        resetDeformation();
        removeMagneticTrail(window.app);
        window.app.isRainbowMode = false;
        window.app.isMagneticMode = false;
        window.app.gravitationalPull = 0;
        window.showStatus("Ball reset to default state");
    },
    toggleRainbowMode: () => {
        window.app.isRainbowMode = !window.app.isRainbowMode;
        window.showStatus(`Rainbow mode ${window.app.isRainbowMode ? 'enabled' : 'disabled'}`);
    },
    toggleMagneticMode: () => {
        window.app.isMagneticMode = !window.app.isMagneticMode;
        if (window.app.isMagneticMode) {
            createMagneticTrail(window.app);
        } else {
            removeMagneticTrail(window.app);
        }
        window.showStatus(`Magnetic mode ${window.app.isMagneticMode ? 'enabled' : 'disabled'}`);
    },
    setGravitationalPull: (value) => {
        const newValue = parseFloat(value);
        if (!isNaN(newValue)) {
            window.app.gravitationalPull = newValue;
            if (newValue > 0 && !window.app.blackholeEffect) {
                createBlackholeEffect(window.app);
            }
            window.showStatus(`Gravitational pull set to ${newValue}`);
        }
    },
    explode: () => {
        createParticleExplosion(window.app);
        window.showStatus("Explosion effect triggered");
    },
    toggleTrail: () => {
        if (window.app.trailEffect) {
            window.app.scene.remove(window.app.trailEffect);
            window.app.trailEffect = null;
            window.showStatus("Trail effect disabled");
        } else {
            window.app.trailEffect = createTrailEffect(window.app);
            window.showStatus("Trail effect enabled");
        }
    },
    makeSpikey: (value) => {
        const spikiness = parseFloat(value);
        if (!isNaN(spikiness)) {
            window.app.spikiness = spikiness;
            applySpikyEffect(window.app, spikiness);
            window.showStatus(`Spikiness set to ${spikiness}`);
        }
    },
    toggleFacetHighlighting: () => {
        window.app.enableFacetHighlighting = !window.app.enableFacetHighlighting;
        window.showStatus(`Facet highlighting ${window.app.enableFacetHighlighting ? 'enabled' : 'disabled'}`);
    },
    playSound: () => {
        if (window.app.soundSynth) {
            window.app.soundSynth.triggerAttackRelease("C4", "8n");
            return true;
        }
        return false;
    }
};

// Initialize application when document is loaded
document.addEventListener('DOMContentLoaded', init);

// Export functions for potential module use
export {
    init,
    animate,
    createEmergencyBall
};