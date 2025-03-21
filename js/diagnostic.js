import * as THREE from "three";

// Diagnostic function to check for errors
function runDiagnostics() {
    console.log("======= THREE.js BALL DIAGNOSTICS =======");
    
    // Check THREE.js loaded properly
    console.log("THREE.js version:", THREE.REVISION);
    
    // Check if the ball exists in the scene
    if (window.app && window.app.ballGroup) {
        console.log("Ball exists:", true);
        console.log("Ball position:", window.app.ballGroup.position);
        console.log("Ball userData:", window.app.ballGroup.userData);
        
        // Check if the mesh and wireframe exist
        if (window.app.ballGroup.children.length > 0) {
            console.log("Ball children count:", window.app.ballGroup.children.length);
            window.app.ballGroup.children.forEach((child, index) => {
                console.log(`Child ${index} type:`, child.type);
            });
        } else {
            console.error("Ball has no children!");
        }
    } else {
        console.error("Ball not found in scene!");
    }
    
    // Check audio initialization
    if (window.app.audioContext) {
        console.log("Audio context initialized:", true);
        console.log("Sound synthesizer exists:", window.app.soundSynth ? true : false);
    } else {
        console.warn("Audio context not initialized yet. (This is normal before first interaction)");
    }
    
    // Check event listeners
    if (window.app.mouse) {
        console.log("Mouse tracking initialized:", true);
    } else {
        console.error("Mouse tracking not initialized!");
    }
    
    // Check raycaster
    if (window.app.raycaster) {
        console.log("Raycaster initialized:", true);
    } else {
        console.error("Raycaster not initialized!");
    }
    
    // Check for event handler properties
    console.log("Event handlers setup:", {
        isDragging: typeof window.app.isDragging !== 'undefined',
        isHovered: typeof window.app.isHovered !== 'undefined',
        touchPoint: typeof window.app.touchPoint !== 'undefined',
        lastFacetIndex: typeof window.app.lastFacetIndex !== 'undefined'
    });
    
    // Check special effects flags
    console.log("Effects flags:", {
        isRainbowMode: window.app.isRainbowMode,
        isMagneticMode: window.app.isMagneticMode,
        spikiness: window.app.spikiness
    });
    
    console.log("====== END DIAGNOSTICS ======");
}

// Run diagnostics after a short delay to ensure everything has loaded
setTimeout(runDiagnostics, 2000);

// Create global access for debugging in console
window.runDiagnostics = runDiagnostics;

// Export the diagnostic function for importing in other files
export { runDiagnostics };
