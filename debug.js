// debug.js - Debugging tools for Three.js ball

import * as THREE from 'three';

console.log("Debug script loaded");

// IMPORTANT: Don't automatically create emergency balls or interfere with main app
let debugActive = false;

// Add debug UI
function createDebugUI() {
    // Only create if it doesn't exist already
    if (document.getElementById('debug-panel')) return;
    
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '1000';
    debugPanel.style.maxWidth = '300px';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.fontSize = '12px';
    debugPanel.id = 'debug-panel';
    
    debugPanel.innerHTML = `
        <h3>Debug Tools</h3>
        <div id="debug-info"></div>
        <div style="margin-top: 10px;">
            <button id="reset-ball" style="padding: 5px; margin: 5px; cursor: pointer;">
                Reset Ball
            </button>
            <button id="toggle-wireframe" style="padding: 5px; margin: 5px; cursor: pointer;">
                Toggle Wireframe
            </button>
        </div>
        <div style="margin-top: 10px;">
            <button id="emergency-ball" style="padding: 5px; margin: 5px; cursor: pointer; background-color: #ff3333;">
                Emergency Ball
            </button>
        </div>
    `;
    
    document.body.appendChild(debugPanel);
    
    // Add event listeners
    document.getElementById('reset-ball').addEventListener('click', resetBall);
    document.getElementById('toggle-wireframe').addEventListener('click', toggleWireframe);
    document.getElementById('emergency-ball').addEventListener('click', createEmergencyBall);
    
    // Start update loop
    updateDebugInfo();
    debugActive = true;
}

// Update debug info
function updateDebugInfo() {
    const debugInfo = document.getElementById('debug-info');
    if (!debugInfo) return;
    
    const app = window.app;
    if (!app) {
        debugInfo.innerHTML = '<p style="color: red;">App not initialized</p>';
        setTimeout(updateDebugInfo, 1000);
        return;
    }
    
    const ballExists = app.ballGroup ? "Yes" : "No";
    const wireframeExists = app.ballGroup?.userData?.wireMesh ? "Yes" : "No";
    const sceneObjects = app.scene?.children?.length || 0;
    
    debugInfo.innerHTML = `
        <p>Ball exists: <span style="color: ${ballExists === 'Yes' ? 'lime' : 'red'}">${ballExists}</span></p>
        <p>Wireframe exists: <span style="color: ${wireframeExists === 'Yes' ? 'lime' : 'red'}">${wireframeExists}</span></p>
        <p>Scene objects: ${sceneObjects}</p>
        <p>FPS: ${Math.round(1000 / (performance.now() - (window._lastFrameTime || performance.now())))} fps</p>
    `;
    
    window._lastFrameTime = performance.now();
    
    // Check ball position
    if (app.ballGroup) {
        const pos = app.ballGroup.position;
        debugInfo.innerHTML += `<p>Ball position: (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})</p>`;
        
        // Check if ball is outside of camera view
        if (Math.abs(pos.z) > 10) {
            debugInfo.innerHTML += `<p style="color: red;">WARNING: Ball may be out of view (z=${pos.z.toFixed(2)})</p>`;
            
            // Fix position if too far away
            if (Math.abs(pos.z) > 50) {
                app.ballGroup.position.set(0, 0, 0);
                debugInfo.innerHTML += `<p style="color: lime;">Auto-reset position</p>`;
            }
        }
    }
    
    setTimeout(updateDebugInfo, 500);
}

// Reset ball function
function resetBall() {
    if (!window.app || !window.app.ballGroup) {
        console.error("Ball not found, cannot reset");
        return;
    }
    
    window.app.ballGroup.position.set(0, 0, 0);
    window.app.ballGroup.rotation.set(0, 0, 0);
    window.app.ballGroup.scale.set(1, 1, 1);
    console.log("Ball position and rotation reset");
}

// Toggle wireframe function
function toggleWireframe() {
    if (!window.app || !window.app.ballGroup || !window.app.ballGroup.userData) {
        console.error("Ball or wireframe not found");
        return;
    }
    
    const wireMesh = window.app.ballGroup.userData.wireMesh;
    if (wireMesh) {
        wireMesh.visible = !wireMesh.visible;
        console.log("Wireframe visibility:", wireMesh.visible);
    }
}

// Emergency ball creation
function createEmergencyBall() {
    console.log("Creating emergency ball...");
    
    if (!window.app) {
        console.log("Creating app object");
        window.app = {};
    }
    
    if (!window.app.scene) {
        console.log("Creating new scene");
        window.app.scene = new THREE.Scene();
        window.app.scene.background = new THREE.Color(0x000033);
    }
    
    // Remove existing ball if present
    if (window.app.ballGroup) {
        window.app.scene.remove(window.app.ballGroup);
    }
    
    // Create a simple sphere as fallback
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
        color: 0xFF3333, // Red for emergency
        wireframe: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    const ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    
    // Add wireframe
    const wireGeometry = new THREE.EdgesGeometry(geometry);
    const wireMaterial = new THREE.LineBasicMaterial({ 
        color: 0xFFFFFF, 
        transparent: true, 
        opacity: 0.5 
    });
    const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
    ballGroup.add(wireMesh);
    
    // Store references
    ballGroup.userData = {
        mesh: mesh,
        wireMesh: wireMesh,
        mat: material,
        wireMat: wireMaterial,
        geo: geometry,
        wireGeo: wireGeometry,
        originalPositions: geometry.attributes.position.array.slice()
    };
    
    // Add to scene
    window.app.scene.add(ballGroup);
    window.app.ballGroup = ballGroup;
    
    console.log("Emergency ball created");
}

// Simple emergency ball that works without any dependencies
function createRecoveryBall() {
    console.log("Creating recovery ball with minimal dependencies");
    
    try {
        // Create app if it doesn't exist
        if (!window.app) {
            window.app = {};
        }
        
        // Create scene if it doesn't exist
        if (!window.app.scene) {
            console.log("Creating new scene for recovery ball");
            window.app.scene = new THREE.Scene();
            window.app.scene.background = new THREE.Color(0x000033);
        }
        
        // Create camera if it doesn't exist
        if (!window.app.camera) {
            window.app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            window.app.camera.position.z = 2;
        }
        
        // Create renderer if it doesn't exist
        if (!window.app.renderer) {
            window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
            window.app.renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(window.app.renderer.domElement);
        }
        
        // Create a simple ball
        const geometry = new THREE.SphereGeometry(1, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red for emergency
            wireframe: false
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Create ball group
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        
        // Add minimal event system
        ballGroup.emit = function(eventName, data) {
            console.log(`Recovery ball event: ${eventName}`, data);
        };
        
        // Store minimal userData
        ballGroup.userData = {
            mesh: mesh,
            mat: material,
            geo: geometry,
            isRecoveryBall: true
        };
        
        // Add to scene
        window.app.scene.add(ballGroup);
        window.app.ballGroup = ballGroup;
        
        // Start minimal animation
        function animate() {
            requestAnimationFrame(animate);
            
            if (ballGroup) {
                ballGroup.rotation.y += 0.01;
            }
            
            if (window.app.renderer && window.app.scene && window.app.camera) {
                window.app.renderer.render(window.app.scene, window.app.camera);
            }
        }
        
        animate();
        
        console.log("Recovery ball created successfully");
        
        if (window.showStatus) {
            window.showStatus("Recovery mode activated");
        }
        
        return ballGroup;
    } catch (error) {
        console.error("Failed to create recovery ball:", error);
        return null;
    }
}

// Make recovery function available globally
window.createRecoveryBall = createRecoveryBall;

// Show debug button
function addDebugButton() {
    const button = document.createElement('button');
    button.textContent = 'Create Recovery Ball';
    button.style = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 8px 16px;
        background: #ff3333;
        color: white;
        border: none;
        border-radius: 4px;
        z-index: 10000;
        cursor: pointer;
    `;
    
    button.onclick = function() {
        createRecoveryBall();
    };
    
    document.body.appendChild(button);
}

// Instead of exporting directly, load the debugAudioSystem function
// and set it globally when available
let debugAudioSystemFunction = null;
import('./js/audio/core.js').then(module => {
    if (module.debugAudioSystem) {
        debugAudioSystemFunction = module.debugAudioSystem;
        window.debugAudioSystem = debugAudioSystemFunction;
        console.log("Debug audio system loaded from debug.js");
    }
}).catch(err => {
    console.error("Could not load debug audio system:", err);
});

// Load audio debugging, but in a way that doesn't break the main app
function loadAudioDebugTools() {
    // Only try to import if not already loaded
    if (!window.debugAudioSystem) {
        import('./js/audio/core.js').then(module => {
            if (module.debugAudioSystem) {
                window.debugAudioSystem = module.debugAudioSystem;
            }
        }).catch(e => {});
    }
}

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
    setTimeout(() => {
        createDebugUI();
        console.log("Debug UI created");
        
        // Add debug button
        setTimeout(addDebugButton, 1000);
        
        // Register error handler
        window.addEventListener('error', handleGlobalError);
    }, 2000);
});
