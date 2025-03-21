// main.js - Entry point for the application
// This version combines the best features from both implementations
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { setupRenderer } from './renderer.js';
import { createScene, setupCamera, setupLights } from './scene.js';
import { createBall, updateGradientColors, applyDeformation, resetDeformation } from './ball.js';
import { setupAudio, initAudioEffects, SoundSynthesizer } from './audio.js';
import { setupEventListeners } from './events.js';
import { 
    createParticleExplosion, 
    applySpikyEffect, 
    createMagneticTrail, 
    removeMagneticTrail, 
    createBlackholeEffect, 
    removeBlackholeEffect,
    updateParticleExplosion,
    updateMagneticParticles,
    updateBlackholeEffect,
    updateRainbowMode
} from './effects.js';
import { animate } from './utils.js';

// Main application object to store shared references
const app = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    ballGroup: null,
    soundManager: null,
    soundSynth: null,
    audioContext: null,
    listener: null,
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
    lastFacetIndex: -1,
    previousMousePosition: { x: 0, y: 0 },
    touchPoint: null,
    // Time tracking
    clock: null
};

// Export app controls for use with UI buttons
window.app = app;
window.appControls = {
    toggleRainbowMode: () => toggleRainbowMode(),
    toggleMagneticMode: () => toggleMagneticMode(),
    createBlackholeEffect: () => createBlackholeEffect(app),
    createExplosion: () => createParticleExplosion(app),
    resetBall: () => resetBall()
};

// Function to reset the ball to its default state
function resetBall() {
    // Stop any running effects
    if (app.isRainbowMode) toggleRainbowMode();
    if (app.isMagneticMode) toggleMagneticMode();
    removeBlackholeEffect(app);
    
    // Reset deformations
    resetDeformation(app, 0.1);
    
    // Reset scale
    app.targetScale = 1.0;
    
    // Reset colors
    updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
    
    // Reset spikiness
    app.spikiness = 0;
    
    // Stop sounds
    if (app.soundSynth) {
        app.soundSynth.stopAllSounds();
    }
}

// Toggle rainbow mode
function toggleRainbowMode() {
    app.isRainbowMode = !app.isRainbowMode;
    
    if (app.isRainbowMode) {
        // Play rainbow sound in loop
        if (app.soundSynth) {
            app.soundSynth.playSpecialSound('rainbow', true);
        }
    } else {
        // Stop rainbow sound
        if (app.soundSynth) {
            app.soundSynth.stopSpecialSound('rainbow');
        }
        
        // Reset colors
        updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
    }
}

// Toggle magnetic mode
function toggleMagneticMode() {
    app.isMagneticMode = !app.isMagneticMode;
    
    if (app.isMagneticMode) {
        // Turn on magnetic effect
        updateGradientColors(app, '#0066FF', '#3399FF', '#99CCFF'); // Blue colors
        
        // Change wireframe color
        const wireMat = app.ballGroup.userData.wireMat;
        wireMat.color.set(0x0066FF); // Blue wireframe
        
        // Create a trail of small spheres that follow the ball
        createMagneticTrail(app);
        
        // Play magnetic sound in loop
        if (app.soundSynth) {
            app.soundSynth.playSpecialSound('magnetic', true);
        }
    } else {
        // Turn off magnetic effect
        updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
        
        // Reset wireframe color
        const wireMat = app.ballGroup.userData.wireMat;
        wireMat.color.set(0x00FFFF);
        
        // Remove trail
        removeMagneticTrail(app);
        
        // Stop magnetic sound
        if (app.soundSynth) {
            app.soundSynth.stopSpecialSound('magnetic');
        }
    }
}

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
        // Create clock for animations
        app.clock = new THREE.Clock();
        
        // Setup renderer and append canvas to DOM
        app.renderer = setupRenderer();
        document.body.appendChild(app.renderer.domElement);
        console.log('Renderer added to DOM');

        // Create scene and setup camera
        app.scene = createScene();
        console.log('Scene created');
        
        app.camera = setupCamera();
        console.log('Camera created');
        
        // Setup orbit controls
        app.controls = new OrbitControls(app.camera, app.renderer.domElement);
        app.controls.enableDamping = true;
        app.controls.dampingFactor = 0.05;
        app.controls.enablePan = false;
        app.controls.enabled = false; // Disable controls initially
        
        // Add audio listener to camera
        app.listener = new THREE.AudioListener();
        app.camera.add(app.listener);
        app.camera.userData.listener = app.listener;
        
        // Add lights to the scene
        setupLights(app);
        console.log('Lights set up');

        // Set up resize handler
        setupResizeHandler();
        console.log('Resize handler set up');

        // Create the 3D ball object
        app.ballGroup = createBall(app);
        console.log('Ball created');

        // Create raycaster for interaction
        app.raycaster = new THREE.Raycaster();
        
        // Setup event listeners
        setupEventListeners(app);
        console.log('Event listeners set up');

        // Start animation loop
        animate(app, () => {
            // Custom animation updates go here
            updateAnimations();
        });
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

// Update animations in the render loop
function updateAnimations() {
    // Update ball scale
    updateMeshScale();
    
    // Update rotation if not being dragged
    updateMeshRotation();
    
    // Update position for breathing effect
    updateMeshPosition();
    
    // Update special effects
    if (app.isRainbowMode) {
        updateRainbowMode(app);
    }
    
    if (app.isMagneticMode) {
        updateMagneticParticles(app);
    }
    
    // Update particle explosion if active
    updateParticleExplosion();
    
    // Update blackhole effect if active
    updateBlackholeEffect(app);
}

// Update mesh scale based on hover state
function updateMeshScale() {
    // Smoothly interpolate current scale towards target scale
    app.currentScale += (app.targetScale - app.currentScale) * 0.1;
    
    // Apply scale to the ball group
    if (app.ballGroup) {
        app.ballGroup.scale.set(app.currentScale, app.currentScale, app.currentScale);
    }
}

// Update mesh rotation for idle animation
function updateMeshRotation() {
    // Only apply automatic rotation if not being dragged
    if (!app.isDragging && app.ballGroup) {
        // Very slow automatic rotation for subtle movement
        app.ballGroup.rotation.y += 0.001;
        app.ballGroup.rotation.x += 0.0005;
    }
    
    // Apply damping to orbit controls if enabled
    if (app.controls && app.controls.enabled) {
        app.controls.update();
    }
}

// Update mesh position for "breathing" effect
function updateMeshPosition() {
    if (app.ballGroup) {
        // Get elapsed time for animation
        const time = app.clock.getElapsedTime();
        
        // Calculate subtle floating motion using sine waves
        const newX = Math.sin(time) * 0.03;
        const newY = Math.cos(time * 1.3) * 0.02;
        
        // Apply position with smoothing
        app.ballGroup.position.x += (newX - app.ballGroup.position.x) * 0.05;
        app.ballGroup.position.y += (newY - app.ballGroup.position.y) * 0.05;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export the app object to make it accessible to other modules
export { app };