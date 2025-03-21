// main.js - Main entry point for the Three.js application
import * as THREE from 'three';
import { setupRenderer } from './renderer.js';
import { createScene } from './scene.js';
import { listener, setupAudio, setupAudioAnalyzer, createAudioVisualization, updateAudioVisualization } from './audio/core.js';
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

// Global app controls - exposed for UI buttons
window.appControls = {
    toggleRainbowMode: function() {
        const isActive = toggleRainbowMode(window.app);
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
    
    // Start animation loop
    animate();
    
    // Initialize all needed components
    document.addEventListener('click', initOnFirstClick, { once: true });
    console.log("Animation loop started");
    
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
    if (window.app.audioContext && window.app.analyser) {
        updateAudioVisualization(window.app);
    }
    
    // Render the scene
    window.app.renderer.render(window.app.scene, window.app.camera);
}

// Initialize audio on first user interaction
function initOnFirstClick() {
    try {
        setupAudio(window.app);
        setupAudioAnalyzer(window.app);
        
        // Create audio visualizations
        createAudioVisualization(window.app);
        
        if (window.app.audioContext && window.app.audioContext.state === 'suspended') {
            window.app.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
            });
        }
        
        console.log("Audio effects initialized");
    } catch (error) {
        console.error("Error initializing audio:", error);
    }
}

function createAudioVisualization(app) {
    if (!app.audioContext) {
        console.warn("Cannot create audio visualization: AudioContext not available");
        return;
    }
    // rest of your code...
}

// Initialize the application
init();