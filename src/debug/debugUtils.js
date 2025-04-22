import * as THREE from 'three';

/**
 * Debug utilities for Three.js Ball project
 */

/**
 * Creates visual debug helpers in the scene
 * @param {Object} app - The application context
 */
export function addDebugHelpers(app) {
    if (!app || !app.scene) {
        console.error('Cannot add debug helpers: app or scene not available');
        return;
    }
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(5);
    app.scene.add(axesHelper);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(10, 10);
    app.scene.add(gridHelper);
    
    // Add camera helper if perspective camera
    if (app.camera && app.camera.isPerspectiveCamera) {
        const cameraHelper = new THREE.CameraHelper(app.camera);
        app.scene.add(cameraHelper);
    }
    
    console.log('Debug helpers added to scene');
    return true;
}

/**
 * Add a simple cube to the scene for visibility testing
 * @param {Object} app - The application context
 * @param {Object} options - Cube options (position, color, size)
 */
export function addDebugCube(app, options = {}) {
    if (!app || !app.scene) {
        console.error('Cannot add debug cube: app or scene not available');
        return null;
    }
    
    const size = options.size || 1;
    const color = options.color || 0xff0000;
    const position = options.position || { x: 0, y: 0, z: 0 };
    
    // Create cube
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshBasicMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    
    // Position cube
    cube.position.set(position.x, position.y, position.z);
    
    // Add to scene
    app.scene.add(cube);
    
    console.log('Debug cube added to scene');
    return cube;
}

/**
 * Test renderer by drawing a simple colored square
 * @param {Object} app - The application context
 */
export function testRenderer(app) {
    if (!app) {
        console.error('App not available for renderer test');
        return false;
    }
    
    try {
        console.log('Testing renderer...');
        
        // Create a simple scene with a colored plane
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        
        // Create a bright colored plane for visibility
        // const geometry = new THREE.PlaneGeometry(5, 5);
        // const material = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
        // const plane = new THREE.Mesh(geometry, material);
        // scene.add(plane);
        
        // If we have a renderer, render the test scene
        if (app.renderer) {
            app.renderer.render(scene, camera);
            console.log('Renderer test successful');
            return true;
        } else {
            console.error('No renderer available for test');
            return false;
        }
    } catch (error) {
        console.error('Renderer test failed:', error);
        return false;
    }
}

/**
 * Create a DOM element with renderer info for debugging
 * @param {Object} app - The application context
 */
export function showRendererInfo(app) {
    if (!app || !app.renderer) {
        console.error('Cannot show renderer info: app or renderer not available');
        return;
    }
    
    try {
        const renderer = app.renderer;
        
        // Create info panel
        const panel = document.createElement('div');
        panel.style.position = 'fixed';
        panel.style.top = '10px';
        panel.style.left = '10px';
        panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        panel.style.color = 'white';
        panel.style.padding = '10px';
        panel.style.borderRadius = '5px';
        panel.style.fontFamily = 'monospace';
        panel.style.fontSize = '12px';
        panel.style.zIndex = '1000';
        
        // Get renderer info
        const webglInfo = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
        let html = '<h3>Renderer Info</h3>';
        
        if (webglInfo) {
            const gl = renderer.getContext();
            html += `<p>Vendor: ${gl.getParameter(webglInfo.UNMASKED_VENDOR_WEBGL)}</p>`;
            html += `<p>Renderer: ${gl.getParameter(webglInfo.UNMASKED_RENDERER_WEBGL)}</p>`;
        }
        
        // Add general WebGL info
        const gl = renderer.getContext();
        html += `<p>WebGL Version: ${gl.getParameter(gl.VERSION)}</p>`;
        html += `<p>Shading Language: ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}</p>`;
        html += `<p>Canvas: ${renderer.domElement.width} x ${renderer.domElement.height}</p>`;
        
        panel.innerHTML = html;
        document.body.appendChild(panel);
        
        return panel;
    } catch (error) {
        console.error('Error showing renderer info:', error);
        return null;
    }
}

/**
 * Emergency renderer that uses 2D canvas as a fallback
 * @param {string} containerId - ID of container element
 */
export function createEmergencyRenderer(containerId = 'container') {
    console.warn('Creating emergency 2D canvas renderer');
    
    try {
        // Find container
        const container = document.getElementById(containerId) || document.body;
        
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        container.appendChild(canvas);
        
        // Get 2D context
        const ctx = canvas.getContext('2d');
        
        // Draw something visible
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 100, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Emergency Renderer Active', canvas.width / 2, canvas.height / 2);
        
        console.log('Emergency renderer created');
        return {
            domElement: canvas,
            render: () => {
                // Simple animation
                const time = Date.now() * 0.001;
                
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(
                    canvas.width / 2 + Math.sin(time) * 50,
                    canvas.height / 2 + Math.cos(time) * 50,
                    100,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
                
                ctx.fillStyle = 'white';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Emergency Renderer Active', canvas.width / 2, canvas.height / 2);
            }
        };
    } catch (error) {
        console.error('Failed to create emergency renderer:', error);
        return null;
    }
}

// Initialize and make available globally
if (window.app) {
    window.app.debugUtils = {
        addDebugHelpers,
        addDebugCube,
        testRenderer,
        showRendererInfo,
        createEmergencyRenderer
    };
    
    // Add to window for console access
    window.addDebugHelpers = () => addDebugHelpers(window.app);
    window.addDebugCube = (options) => addDebugCube(window.app, options);
    window.testRenderer = () => testRenderer(window.app);
    window.showRendererInfo = () => showRendererInfo(window.app);
}

/**
 * Debug helper for diagnosing the ball disappearance issue
 */

// Add this immediately after the HTML loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Debug module loaded');
    
    // Check for THREE.js
    console.log('THREE library available:', typeof THREE !== 'undefined');
    
    // Check app initialization
    setTimeout(() => {
        if (window.app) {
            console.log('App state:');
            console.log('- scene:', window.app.scene ? 'created' : 'missing');
            console.log('- camera:', window.app.camera ? 'created' : 'missing');
            console.log('- renderer:', window.app.renderer ? 'created' : 'missing');
            console.log('- ballGroup:', window.app.ballGroup ? 'created' : 'missing');
            
            if (window.app.ballGroup) {
                console.log('Ball children count:', window.app.ballGroup.children.length);
                console.log('Ball position:', window.app.ballGroup.position);
                console.log('Ball visibility:', window.app.ballGroup.visible);
            }
        } else {
            console.error('App not initialized!');
        }
    }, 1000); // Check after 1 second
    
    // Monitor the animation frame
    let frameCounter = 0;
    let lastCheck = Date.now();
    
    function checkFrameRate() {
        const now = Date.now();
        const elapsed = now - lastCheck;
        
        if (elapsed >= 1000) {
            console.log(`Frame rate: ${Math.round((frameCounter / elapsed) * 1000)} FPS`);
            frameCounter = 0;
            lastCheck = now;
            
            // Check the ball existence again
            if (window.app && window.app.ballGroup) {
                console.log('Ball still exists:', window.app.ballGroup.parent === window.app.scene);
                console.log('Ball visibility:', window.app.ballGroup.visible);
                console.log('Ball position:', window.app.ballGroup.position);
            }
        }
        
        frameCounter++;
        requestAnimationFrame(checkFrameRate);
    }
    
    // Start monitoring
    checkFrameRate();
});

// Add a recovery function to the window object
window.recoverBall = function() {
    console.log('Attempting to recover ball...');
    
    if (!window.app) {
        console.error('App not initialized, cannot recover');
        return;
    }
    
    try {
        // Disable potentially problematic features
        window.app.enableFacetHighlighting = false;
        if (window.app.trailEffect && window.app.scene) {
            window.app.scene.remove(window.app.trailEffect);
            window.app.trailEffect = null;
        }
        
        // Check if ball exists but is not visible
        if (window.app.ballGroup) {
            window.app.ballGroup.visible = true;
            console.log('Ball visibility restored');
            
            // Reset position and rotation
            window.app.ballGroup.position.set(0, 0, 0);
            window.app.ballGroup.rotation.set(0, 0, 0);
            console.log('Ball position and rotation reset');
            
            // Reset all materials
            window.app.ballGroup.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.needsUpdate = true;
                    child.material.visible = true;
                    if (child.material.opacity !== undefined) {
                        child.material.opacity = 1.0;
                    }
                }
            });
        } else {
            console.error('Ball group not found, cannot recover');
        }
    } catch (error) {
        console.error('Error during recovery:', error);
    }
};

// Global error handler with improved diagnostics
function handleGlobalError(event) {
    console.error('Global error:', event.message, 'at', event.filename, 'line', event.lineno);

    // Show error to user
    if (window.showStatus) {
        window.showStatus('Error: ' + event.message);
    }

    // Diagnostic info about sound system
    console.log("Sound system state:", {
        soundManagerExists: !!window.soundManager,
        soundManagerInitialized: window.soundManager?.initialized,
        appSoundManagerExists: !!window.app?.soundManager,
        audioContextExists: !!window.app?.audioContext || !!window.soundManager?.audioContext
    });

    // Try to recover if it's a ball-related error
    if (event.message.includes('ball') && !window.app?.ballGroup) {
        console.warn("Ball-related error detected, attempting recovery");
        createRecoveryBall();
    }
}

// Initialize ONLY WHEN REQUESTED, not automatically
function initDebug() {
    createDebugUI();
    loadAudioDebugTools();
}

// Export all functions
export {
    initDebug,
    createDebugUI,
    resetBall,
    toggleWireframe,
    createEmergencyBall
};

// Make debug functions available globally, but don't auto-initialize
window.debugTools = {
    init: initDebug,
    createDebugUI,
    resetBall,
    toggleWireframe,
    createEmergencyBall
};

// Initialize on load
window.addEventListener('load', function() {
    // Debug initialization disabled to remove stray buttons
    console.log("Debug UI initialization suppressed to prevent stray buttons");

    // Only register the error handler
    window.addEventListener('error', handleGlobalError);
});
