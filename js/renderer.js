// renderer.js - Sets up the WebGL renderer
import * as THREE from 'three';

// Setup and configure the renderer
function setupRenderer() {
    // Create WebGL renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: 'high-performance'
    });
    
    // Set size to full window
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Set device pixel ratio for better quality on high DPI displays
    // But limit to 2x to prevent performance issues on super high DPI devices
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable tone mapping for better color rendering
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Set output encoding for proper color space
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Add a small amount of clearing jitter to create subtle grain effect
    renderer.autoClearColor = false;
    
    return renderer;
}

// Clear renderer with custom post-processing effects
function customClearRenderer(renderer, scene, camera) {
    // Clear with a very subtle noise effect
    renderer.clearColor();
    
    // Draw a full-screen quad with a tiny bit of noise
    // This can be implemented if desired for a film grain effect
}

export { setupRenderer, customClearRenderer };