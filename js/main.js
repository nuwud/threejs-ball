import * as THREE from "three";
import { setupRenderer } from "./renderer.js";
import { listener, soundManager, initSynthesizer, setupAudioAnalyzer, createAudioVisualization } from "./audio.js";
import { geo, originalPositions, createGradientTexture, mat, wireMat, wireGeo, wireMesh, mesh, ballGroup } from "./geometry.js";
import { setupEventListeners, toggleRainbowMode, toggleMagneticMode, createBlackholeEffect, explodeEffect, resetBall } from "./events.js";

console.log("Initializing application...");

// Global app state
window.app = {
    scene: null,
    camera: null,
    renderer: null,
    isRainbowMode: false,
    isMagneticMode: false
};

// Global app controls - exposed for UI buttons
window.appControls = {
    toggleRainbowMode,
    toggleMagneticMode,
    createBlackholeEffect,
    createExplosion: explodeEffect,
    resetBall
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
    window.app.scene = new THREE.Scene();
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
    console.log("Lights set up");
    
    // Add event listener for window resize
    window.addEventListener('resize', onWindowResize);
    console.log("Resize handler set up");
    
    // Add ball group and touch sphere to scene
    window.app.scene.add(ballGroup);
    console.log("Ball created");
    
    // Set up event listeners with proper options
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
    
    // Handle any animations here
    
    // Render the scene
    window.app.renderer.render(window.app.scene, window.app.camera);
}

// Initialize audio on first user interaction
function initOnFirstClick() {
    try {
        initSynthesizer();
        setupAudioAnalyzer();
        soundManager.init();
        
        // Create audio visualizations
        createAudioVisualization(window.app.scene);
        
        console.log("Audio effects initialized");
    } catch (error) {
        console.error("Error initializing audio:", error);
    }
}

// Initialize the application
init();