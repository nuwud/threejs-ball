// renderer.js - Handles Three.js renderer setup
import * as THREE from 'three';

// Set up the WebGL renderer
function setupRenderer() {
    console.log("Setting up renderer...");
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Create renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    // Set size to window dimensions
    renderer.setSize(w, h);

    // Enable shadows for better visual quality
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    console.log("Renderer created successfully");
    return renderer;
}

// We'll handle resize events in main.js instead
// to avoid circular dependencies

export { setupRenderer };