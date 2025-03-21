import * as THREE from 'three';

// Setup and configure the renderer
export function setupRenderer(width, height) {
    // Create WebGL renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
    });
    
    // Set size to full window
    renderer.setSize(width, height);
    
    // Set device pixel ratio for better quality on high DPI displays
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Use outputColorSpace instead of the deprecated outputEncoding
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    return renderer;
}

// Clear renderer with custom post-processing effects
function customClearRenderer(renderer, scene, camera) {
    // Clear with a very subtle noise effect
    renderer.clearColor();
    
    // Draw a full-screen quad with a tiny bit of noise
    // This can be implemented if desired for a film grain effect
}

export { customClearRenderer };