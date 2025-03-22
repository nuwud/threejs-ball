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

// Insert the recover function into the HTML
const recoverButton = document.createElement('button');
recoverButton.textContent = 'Recover Ball';
recoverButton.style.position = 'absolute';
recoverButton.style.top = '10px';
recoverButton.style.right = '10px';
recoverButton.style.zIndex = '9999';
recoverButton.style.padding = '8px 16px';
recoverButton.style.backgroundColor = '#ff5555';
recoverButton.style.color = 'white';
recoverButton.style.border = 'none';
recoverButton.style.borderRadius = '4px';
recoverButton.style.cursor = 'pointer';
recoverButton.onclick = () => window.recoverBall();
document.body.appendChild(recoverButton);
