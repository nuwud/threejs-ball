/**
 * Ball Protection System
 * This module implements safeguards to prevent accidental removal of the ball
 * and automatically restore it if it disappears.
 */

// Store a reference to the original ball creation function
let originalCreateBall = null;
let ballBackup = null;
let isProtectionActive = false;
let checkInterval = null;

/**
 * Initialize the ball protection system
 * @param {Object} app - The main application object
 * @param {Function} createBallFn - The original ball creation function
 */
export function initBallProtection(app, createBallFn) {
    console.log("🛡️ Ball protection system initializing...");
    
    if (isProtectionActive) {
        console.log("🛡️ Ball protection already active");
        return;
    }
    
    // Store references
    originalCreateBall = createBallFn;
    
    // Create backup of ball if it exists
    if (app.ballGroup) {
        createBallBackup(app);
    }
    
    // Set up the protection mechanisms
    setupBallObserver(app);
    
    // Start periodic checks
    startPeriodicChecks(app);
    
    // Add protection metadata
    if (app.ballGroup) {
        app.ballGroup.userData.protected = true;
        app.ballGroup.userData.protectionInitialized = Date.now();
    }
    
    isProtectionActive = true;
    console.log("🛡️ Ball protection system active");
}

/**
 * Create a backup of the ball
 */
function createBallBackup(app) {
    if (!app.ballGroup) return;
    
    try {
        // Deep clone the ball group
        ballBackup = {
            position: app.ballGroup.position.clone(),
            rotation: app.ballGroup.rotation.clone(),
            scale: app.ballGroup.scale.clone(),
            userData: JSON.parse(JSON.stringify(app.ballGroup.userData)),
            timestamp: Date.now()
        };
        
        // If the ball has mesh data, store references to geometries
        if (app.ballGroup.userData.mesh) {
            const mesh = app.ballGroup.userData.mesh;
            if (mesh.geometry) {
                // Store any necessary geometry data
                if (mesh.geometry.attributes && mesh.geometry.attributes.position) {
                    ballBackup.positionArray = mesh.geometry.attributes.position.array.slice();
                }
            }
        }
        
        console.log("🛡️ Ball backup created at", new Date(ballBackup.timestamp).toLocaleTimeString());
    } catch (error) {
        console.error("Error creating ball backup:", error);
    }
}

/**
 * Set up an observer to detect if the ball is removed
 */
function setupBallObserver(app) {
    // We'll use a MutationObserver if the browser supports it
    if (typeof MutationObserver !== 'undefined' && app.scene) {
        console.log("🛡️ Setting up MutationObserver for scene");
        
        // Not directly applicable to Three.js scene graph, but we can
        // modify Three.js methods to detect removal
        
        // Save original remove method
        const originalRemove = app.scene.remove;
        
        // Override remove method to check if the ball is being removed
        app.scene.remove = function(object) {
            if (object === app.ballGroup) {
                console.warn("🚨 Attempt to remove ball detected!");
                
                // Allow removal for legitimate purposes (like replacement)
                const stack = new Error().stack;
                const isLegitimateRemoval = stack.includes('createBall') || 
                                          stack.includes('resetBall') ||
                                          stack.includes('createEmergencyBall');
                
                if (!isLegitimateRemoval) {
                    console.error("🚫 Unauthorized ball removal prevented");
                    // We can either block the removal or allow it and restore later
                    setTimeout(() => restoreBall(app), 100);
                    return;
                }
                
                console.log("✅ Authorized ball removal for recreation");
            }
            
            // Call original method
            return originalRemove.call(this, object);
        };
    }
}

/**
 * Start periodic checks for ball existence
 */
function startPeriodicChecks(app) {
    if (checkInterval) {
        clearInterval(checkInterval);
    }
    
    // Check every second if the ball exists
    checkInterval = setInterval(() => {
        if (!app.ballGroup || !app.scene.children.includes(app.ballGroup)) {
            console.warn("🚨 Ball missing during periodic check!");
            restoreBall(app);
        }
    }, 1000);
    
    console.log("🛡️ Periodic ball existence checks started");
}

/**
 * Restore the ball if it's missing
 */
function restoreBall(app) {
    console.log("🔄 Attempting to restore ball...");
    
    // First check if ball already exists
    if (app.ballGroup && app.scene && app.scene.children.includes(app.ballGroup)) {
        console.log("✅ Ball already exists, no restoration needed");
        return;
    }
    
    try {
        // Try using the original creation function first
        if (typeof originalCreateBall === 'function') {
            console.log("🔄 Recreating ball using original function");
            const newBall = originalCreateBall(app);
            
            if (newBall && app.ballGroup) {
                // Apply backup data if available
                if (ballBackup) {
                    console.log("🔄 Applying backed up properties");
                    app.ballGroup.position.copy(ballBackup.position);
                    app.ballGroup.rotation.copy(ballBackup.rotation);
                    app.ballGroup.scale.copy(ballBackup.scale);
                }
                
                // Mark as protected
                app.ballGroup.userData.protected = true;
                app.ballGroup.userData.restoredAt = Date.now();
                
                console.log("✅ Ball successfully restored!");
                return;
            }
        }
        
        // If that fails, use emergency ball
        console.log("⚠️ Falling back to emergency ball");
        if (typeof app.createEmergencyBall === 'function') {
            app.createEmergencyBall();
            console.log("✅ Emergency ball created");
        } else if (typeof window.createEmergencyBall === 'function') {
            window.createEmergencyBall();
            console.log("✅ Emergency ball created using window function");
        } else {
            console.error("❌ No emergency ball creation function available");
            
            // Last resort - create a very basic sphere
            createLastResortBall(app);
        }
    } catch (error) {
        console.error("❌ Error restoring ball:", error);
        // Final attempt - create a very basic sphere
        createLastResortBall(app);
    }
}

/**
 * Create a very basic sphere as a last resort
 */
function createLastResortBall(app) {
    if (!app.scene) {
        console.error("❌ Cannot create last resort ball: no scene available");
        return;
    }
    
    console.log("⚠️ Creating last resort ball");
    
    try {
        // Create a basic sphere
        const THREE = window.THREE;
        if (!THREE) {
            console.error("❌ THREE not available for last resort ball");
            return;
        }
        
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF0000,
            wireframe: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Create group
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        
        // Add minimal userData
        ballGroup.userData = {
            mesh: mesh,
            mat: material,
            geo: geometry,
            isLastResort: true,
            createdAt: Date.now()
        };
        
        // Add to scene
        app.scene.add(ballGroup);
        app.ballGroup = ballGroup;
        
        console.log("✅ Last resort ball created");
    } catch (error) {
        console.error("❌ Even last resort ball creation failed:", error);
    }
}

/**
 * Remove protection and clean up
 */
export function deactivateBallProtection() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
    
    isProtectionActive = false;
    console.log("🛡️ Ball protection deactivated");
}
