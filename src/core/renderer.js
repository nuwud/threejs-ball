import * as THREE from 'three';

/**
 * Create the renderer for the application
 * This function ensures that a renderer is correctly created and configured
 */
export function createRenderer(options = {}) {
    console.log('Creating renderer...');
    
    try {
        // Try to create WebGL renderer first
        const renderer = new THREE.WebGLRenderer({
            antialias: options.antialias !== false,
            alpha: options.alpha !== false,
            ...options
        });
        
        // Set up renderer 
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(options.backgroundColor || 0x000000, options.backgroundAlpha || 1);
        
        // Enable shadows if requested
        if (options.shadows) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        console.log('WebGL renderer created successfully');
        return renderer;
    } catch (error) {
        console.error('Error creating WebGL renderer:', error);
        
        // Fallback to canvas renderer (for very old browsers)
        try {
            console.warn('Attempting to create fallback renderer');
            
            // Create a simple DIV with error message as last resort
            const container = document.getElementById('container') || document.body;
            const errorElement = document.createElement('div');
            errorElement.style.color = 'white';
            errorElement.style.padding = '20px';
            errorElement.style.textAlign = 'center';
            errorElement.innerHTML = 'Unable to create 3D renderer. Your browser might not support WebGL.<br>Please try using a modern browser.';
            container.appendChild(errorElement);
            
            return null;
        } catch (fallbackError) {
            console.error('Error creating fallback renderer:', fallbackError);
            return null;
        }
    }
}

/**
 * Attach the renderer to a DOM element
 * @param {THREE.WebGLRenderer} renderer - The renderer to attach
 * @param {string} containerId - ID of the container element (default: 'container')
 * @returns {boolean} Whether attachment was successful
 */
export function attachRenderer(renderer, containerId = 'container') {
    if (!renderer || !renderer.domElement) {
        console.error('Invalid renderer provided for attachment');
        return false;
    }
    
    try {
        // Find container
        const container = document.getElementById(containerId);
        
        if (container) {
            // Add renderer to container
            container.appendChild(renderer.domElement);
            console.log(`Renderer attached to ${containerId}`);
            return true;
        } else {
            // Fallback to body if container not found
            console.warn(`Container ${containerId} not found, attaching to body`);
            document.body.appendChild(renderer.domElement);
            return true;
        }
    } catch (error) {
        console.error('Error attaching renderer:', error);
        return false;
    }
}

/**
 * Ensure a renderer is created and attached to the DOM
 * @param {Object} options - Renderer options
 * @param {string} containerId - Container element ID
 * @returns {THREE.WebGLRenderer} The created renderer
 */
export function ensureRenderer(options = {}, containerId = 'container') {
    // Check if we already have a renderer in the app
    if (window.app && window.app.renderer) {
        return window.app.renderer;
    }
    
    // Create new renderer
    const renderer = createRenderer(options);
    
    // Attach to DOM
    if (renderer) {
        attachRenderer(renderer, containerId);
        
        // Store in app
        if (window.app) {
            window.app.renderer = renderer;
        }
    }
    
    return renderer;
}

// Register resize handler
window.addEventListener('resize', () => {
    if (window.app && window.app.renderer) {
        const renderer = window.app.renderer;
        const camera = window.app.camera;
        
        if (camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
        
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});

// Make functions available globally
if (window.app) {
    window.app.createRenderer = createRenderer;
    window.app.attachRenderer = attachRenderer;
    window.app.ensureRenderer = ensureRenderer;
}