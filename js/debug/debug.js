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
