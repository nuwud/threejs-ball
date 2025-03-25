/**
 * no-throttle-events.js
 * 
 * This script directly patches the event handling system to remove all throttling
 * and allow for truly continuous sound generation when interacting with the ball.
 */

(function() {
    console.log("Initializing no-throttle event system...");
    
    // Wait for app to be available
    function initialize() {
        if (!window.app) {
            setTimeout(initialize, 300);
            return;
        }
        
        console.log("App found, patching event handlers...");
        
        // Store original onPointerMove function
        const originalOnPointerMove = window.onPointerMove;
        
        // Flag to track if we've successfully patched
        let patchApplied = false;
        
        /**
         * Create an unthrottled, continuous event handler
         */
        function createUnthrottledHandlers() {
            try {
                // Get the required functions
                const THREE = window.THREE;
                if (!THREE) {
                    console.warn("THREE.js not found, will retry...");
                    return false;
                }
                
                // Find the event handler functions
                let onPointerMove = null;
                
                // First try to find it directly in the window scope
                if (typeof window.onPointerMove === 'function') {
                    onPointerMove = window.onPointerMove;
                }
                
                // Try to find it in event handlers object
                if (!onPointerMove && window.eventHandlers && typeof window.eventHandlers.onPointerMove === 'function') {
                    onPointerMove = window.eventHandlers.onPointerMove;
                }
                
                // Directly access and modify the app's event handler
                if (!onPointerMove) {
                    // Look for the throttledPointerMove in event listeners
                    const allElements = document.querySelectorAll('*');
                    for (const element of allElements) {
                        const listeners = getEventListeners(element);
                        if (listeners && listeners.mousemove) {
                            // Found mousemove handler, modify it
                            console.log("Found mousemove handler, attempting to replace...");
                            // This won't work in most browsers due to security, so we need a different approach
                        }
                    }
                }
                
                // If we still don't have the handler, we'll need to create our own
                // based on understanding the code and rewriting key parts
                
                // Create our own replacement for onPointerMove
                window.continuousPointerHandler = function(event) {
                    const app = window.app;
                    if (!app || !app.raycaster || !app.camera || !app.ballGroup) return;
                    
                    // Calculate mouse position
                    const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
                    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
                    
                    // Store mouse coordinates
                    app.mouse = app.mouse || new THREE.Vector2();
                    app.mouse.x = mouseX;
                    app.mouse.y = mouseY;
                    
                    // Update raycaster
                    app.raycaster.setFromCamera(app.mouse, app.camera);
                    
                    // Update point light if exists
                    if (app.scene && app.scene.userData && app.scene.userData.pointLight) {
                        app.scene.userData.pointLight.position.set(mouseX * 3, mouseY * 3, 2);
                    }
                    
                    // Get mesh
                    const mesh = app.ballGroup?.userData?.mesh;
                    if (!mesh) return;
                    
                    // Check for intersection
                    const intersects = app.raycaster.intersectObject(mesh);
                    
                    if (intersects.length > 0) {
                        // We're over the ball
                        if (!app.isHovered) {
                            // Just entered hover state
                            document.body.style.cursor = 'pointer';
                            app.isHovered = true;
                            
                            // Update appearance
                            if (app.ballGroup.userData.wireMat) {
                                app.ballGroup.userData.wireMat.color.set(0xFF00FF);
                            }
                            
                            // Try to update gradient colors
                            if (typeof window.updateGradientColors === 'function') {
                                window.updateGradientColors(app, '#FF77FF', '#AA55FF', '#55FFFF');
                            }
                        }
                        
                        // Store intersection point for deformation
                        app.touchPoint = intersects[0].point.clone();
                        
                        // Apply deformation if function exists
                        if (typeof window.applyDeformation === 'function') {
                            window.applyDeformation(app, app.touchPoint, 0.2, 0.3);
                        }
                        
                        // Get facet index
                        const facetIndex = intersects[0].faceIndex;
                        
                        // This is the key change: ALWAYS trigger sound, no throttling
                        const { playToneForPosition, playFacetSound } = require('./audio/core.js');
                        
                        // Try to initialize audio if needed
                        if (typeof window.ensureAudioInitialized === 'function') {
                            window.ensureAudioInitialized(app);
                        }
                        
                        // Get the normalized position within the facet
                        const posInFacet = intersects[0].uv ? {
                            u: intersects[0].uv.x,
                            v: intersects[0].uv.y
                        } : { u: 0.5, v: 0.5 };
                        
                        // ALWAYS play sounds - no throttling, no conditions
                        if (typeof playToneForPosition === 'function') {
                            playToneForPosition(app, mouseX, mouseY);
                        }
                        
                        if (typeof playFacetSound === 'function') {
                            playFacetSound(app, facetIndex, posInFacet);
                        }
                        
                        // Update last facet index
                        app.lastFacetIndex = facetIndex;
                    } else {
                        // Not hovering over ball
                        if (app.isHovered) {
                            // Just left hover state
                            document.body.style.cursor = 'default';
                            app.isHovered = false;
                            
                            // Update appearance
                            if (app.ballGroup.userData.wireMat) {
                                app.ballGroup.userData.wireMat.color.set(0x00FFFF);
                            }
                            
                            // Reset gradient colors
                            if (typeof window.updateGradientColors === 'function') {
                                window.updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
                            }
                        }
                        
                        app.touchPoint = null;
                        
                        // Reset deformation
                        if (typeof window.resetDeformation === 'function') {
                            window.resetDeformation(app, 0.1);
                        }
                    }
                    
                    // Handle dragging
                    if (app.isDragging) {
                        // We must have previous position data for this to work
                        if (app.previousMousePosition) {
                            const deltaX = event.clientX - app.previousMousePosition.x;
                            const deltaY = event.clientY - app.previousMousePosition.y;
                            
                            app.ballGroup.rotation.y += deltaX * 0.01;
                            app.ballGroup.rotation.x += deltaY * 0.01;
                            
                            app.previousMousePosition.x = event.clientX;
                            app.previousMousePosition.y = event.clientY;
                        }
                    }
                };
                
                // Install a mousemove listener with our handler that has NO throttling
                document.addEventListener('mousemove', window.continuousPointerHandler);
                
                // Also handle touch events
                document.addEventListener('touchmove', (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    window.continuousPointerHandler(touch);
                }, { passive: false });
                
                console.log("Unthrottled event handler successfully installed");
                return true;
            } catch (error) {
                console.error("Error creating unthrottled handlers:", error);
                return false;
            }
        }
        
        // Try directly hooking the sound functions for zero throttling
        function patchCoreSoundFunctions() {
            try {
                // Locate the audio core module
                const audioCore = window.app.audioCore || require('./audio/core.js');
                
                if (!audioCore) {
                    console.warn("Could not find audio core module");
                    return false;
                }
                
                // Store original functions
                const originalPlayToneForPosition = audioCore.playToneForPosition;
                const originalPlayFacetSound = audioCore.playFacetSound;
                
                if (typeof originalPlayToneForPosition !== 'function' || typeof originalPlayFacetSound !== 'function') {
                    console.warn("Sound functions not found in audio core");
                    return false;
                }
                
                // Replace playToneForPosition with unthrottled version
                audioCore.playToneForPosition = function(app, x, y) {
                    if (!app.audioContext) {
                        console.warn('Audio not initialized, cannot play tone');
                        return;
                    }
                    
                    try {
                        // Normalize coordinates to 0-1 range
                        const normX = (x + 1) / 2;
                        const normY = (y + 1) / 2;
                        
                        // Map x to frequency (220Hz to 880Hz)
                        const frequency = 220 + normX * 660;
                        
                        // Map y to volume (0.1 to 0.5)
                        const volume = 0.05 + normY * 0.2;
                        
                        // Create new oscillator
                        const oscillatorNode = app.audioContext.createOscillator();
                        const gainNode = app.audioContext.createGain();
                        
                        // Configure oscillator
                        oscillatorNode.type = 'sine';
                        oscillatorNode.frequency.value = frequency;
                        
                        // Set initial gain to 0 to avoid clicks
                        gainNode.gain.value = 0;
                        
                        // Connect nodes
                        oscillatorNode.connect(gainNode);
                        
                        // Connect to master gain or destination
                        const destination = app.masterGain || app.audioContext.destination;
                        gainNode.connect(destination);
                        
                        // Start oscillator
                        oscillatorNode.start();
                        
                        // Ramp up volume
                        gainNode.gain.linearRampToValueAtTime(volume, app.audioContext.currentTime + 0.01);
                        
                        // Ramp down volume
                        gainNode.gain.linearRampToValueAtTime(0, app.audioContext.currentTime + 0.15);
                        
                        // Clean up
                        setTimeout(() => {
                            try {
                                oscillatorNode.stop();
                                oscillatorNode.disconnect();
                                gainNode.disconnect();
                            } catch (e) {
                                // Ignore cleanup errors
                            }
                        }, 200);
                    } catch (error) {
                        console.error('Error in unthrottled playToneForPosition:', error);
                    }
                };
                
                // Replace playFacetSound with unthrottled version
                audioCore.playFacetSound = function(app, facetIndex, position = null) {
                    if (!app.audioContext) return;
                    
                    try {
                        // Get normalized position
                        const pos = position || { u: 0.5, v: 0.5 };
                        
                        // Use facet index to vary sound
                        const baseFreq = 220 + (facetIndex % 12) * 50;
                        const freqVariation = 30 * (pos.u - 0.5);
                        const frequency = baseFreq + freqVariation;
                        
                        // Create nodes
                        const oscillatorNode = app.audioContext.createOscillator();
                        const gainNode = app.audioContext.createGain();
                        
                        // Configure oscillator based on facet
                        const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
                        oscillatorNode.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
                        
                        // Add variation
                        const detune = (facetIndex * 7) % 100 - 50;
                        oscillatorNode.detune.value = detune;
                        oscillatorNode.frequency.value = frequency;
                        
                        // Set initial gain to 0
                        gainNode.gain.value = 0;
                        
                        // Connect nodes
                        oscillatorNode.connect(gainNode);
                        
                        // Connect to master gain or destination
                        const destination = app.masterGain || app.audioContext.destination;
                        gainNode.connect(destination);
                        
                        // Start oscillator
                        oscillatorNode.start();
                        
                        // Apply envelope
                        const now = app.audioContext.currentTime;
                        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
                        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
                        gainNode.gain.linearRampToValueAtTime(0, now + 0.35);
                        
                        // Clean up
                        setTimeout(() => {
                            try {
                                oscillatorNode.stop();
                                oscillatorNode.disconnect();
                                gainNode.disconnect();
                            } catch (e) {
                                // Ignore cleanup errors
                            }
                        }, 550);
                    } catch (error) {
                        console.error('Error in unthrottled playFacetSound:', error);
                    }
                };
                
                console.log("Core sound functions successfully patched to remove throttling");
                return true;
            } catch (error) {
                console.error("Error patching core sound functions:", error);
                return false;
            }
        }
        
        // Patch the sound scheduler to never throttle
        function patchSoundScheduler() {
            try {
                // Find the sound scheduler
                let scheduler = null;
                
                // Check different possible locations
                if (window.app.soundScheduler) {
                    scheduler = window.app.soundScheduler;
                } else if (window.app.audioSystem && window.app.audioSystem.soundScheduler) {
                    scheduler = window.app.audioSystem.soundScheduler;
                } else if (window.audioSystem && window.audioSystem.soundScheduler) {
                    scheduler = window.audioSystem.soundScheduler;
                } else {
                    console.warn("Could not find sound scheduler");
                    return false;
                }
                
                // Override shouldAllowSound to always return true
                scheduler.shouldAllowSound = function() { return true; };
                
                // Increase maxSoundsPerSecond to effectively unlimited
                scheduler.maxSoundsPerSecond = 1000;
                
                console.log("Sound scheduler patched to allow unlimited sounds");
                return true;
            } catch (error) {
                console.error("Error patching sound scheduler:", error);
                return false;
            }
        }
        
        // Try to patch the event trigger limit in events.js
        function patchEventTriggers() {
            try {
                // Find the onPointerMove function
                let onPointerMove = null;
                
                // Check different possible locations
                if (typeof window.onPointerMove === 'function') {
                    onPointerMove = window.onPointerMove;
                } else if (window.eventHandlers && typeof window.eventHandlers.onPointerMove === 'function') {
                    onPointerMove = window.eventHandlers.onPointerMove;
                }
                
                if (!onPointerMove) {
                    console.warn("Could not find onPointerMove function");
                    // We'll rely on our custom handler instead
                    return false;
                }
                
                // Replace the shouldPlayFacetSound logic by monkey patching
                const originalFunction = onPointerMove;
                
                window.onPointerMove = function(event, app) {
                    // First check if our custom pointerHandler exists and use that instead
                    if (typeof window.continuousPointerHandler === 'function') {
                        window.continuousPointerHandler(event);
                        return;
                    }
                    
                    // Otherwise call original but modify app to force sound playing
                    if (app) {
                        // Save original function
                        const originalLastFacetSoundTime = app.lastFacetSoundTime;
                        
                        // Override to always trigger sounds
                        app.lastFacetSoundTime = {};
                        app.mouseMovementDistance = 1.0; // Large movement to trigger sound
                        
                        // Call original
                        originalFunction(event, app);
                        
                        // Restore original
                        app.lastFacetSoundTime = originalLastFacetSoundTime;
                    } else {
                        // Just call original if no app context
                        originalFunction(event, app);
                    }
                };
                
                console.log("Event triggers patched to allow continuous sound");
                return true;
            } catch (error) {
                console.error("Error patching event triggers:", error);
                return false;
            }
        }
        
        // Apply all patches
        function applyPatches() {
            const result = {
                handlers: createUnthrottledHandlers(),
                soundFunctions: patchCoreSoundFunctions(),
                scheduler: patchSoundScheduler(),
                triggers: patchEventTriggers()
            };
            
            // Log results
            console.log("Patch results:", result);
            
            // Show success message if at least one patch worked
            if (result.handlers || result.soundFunctions || result.scheduler || result.triggers) {
                console.log("No-throttle patches applied successfully!");
                showStatus("UNLIMITED SOUND MODE ACTIVE - No audio throttling!");
                patchApplied = true;
                return true;
            } else {
                console.error("All patches failed. Please check the console for errors.");
                showStatus("Audio patch failed - check console");
                return false;
            }
        }
        
        // Show status message
        function showStatus(message) {
            // Use the app's status function if available
            if (window.showStatus) {
                window.showStatus(message);
                return;
            }
            
            // Create a status element if it doesn't exist
            let statusElement = document.getElementById('no-throttle-status');
            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.id = 'no-throttle-status';
                statusElement.style.position = 'fixed';
                statusElement.style.top = '10px';
                statusElement.style.left = '10px';
                statusElement.style.backgroundColor = 'rgba(255, 0, 0, 0.7)';
                statusElement.style.color = 'white';
                statusElement.style.padding = '10px';
                statusElement.style.borderRadius = '5px';
                statusElement.style.zIndex = '9999';
                statusElement.style.fontWeight = 'bold';
                document.body.appendChild(statusElement);
            }
            
            statusElement.textContent = message;
            
            // Fade out after 5 seconds
            setTimeout(() => {
                statusElement.style.transition = 'opacity 1s';
                statusElement.style.opacity = '0.3';
                
                // Remove after fade
                setTimeout(() => {
                    if (statusElement.parentNode) {
                        document.body.removeChild(statusElement);
                    }
                }, 1000);
            }, 5000);
        }
        
        // Apply all patches
        applyPatches();
        
        // Add activation button in case patches don't auto-apply correctly
        if (!patchApplied) {
            const activateButton = document.createElement('button');
            activateButton.textContent = 'ACTIVATE UNLIMITED SOUND MODE';
            activateButton.style.position = 'fixed';
            activateButton.style.top = '50%';
            activateButton.style.left = '50%';
            activateButton.style.transform = 'translate(-50%, -50%)';
            activateButton.style.zIndex = 10000;
            activateButton.style.padding = '20px';
            activateButton.style.backgroundColor = '#FF0000';
            activateButton.style.color = 'white';
            activateButton.style.fontSize = '24px';
            activateButton.style.fontWeight = 'bold';
            activateButton.style.border = 'none';
            activateButton.style.borderRadius = '10px';
            activateButton.style.cursor = 'pointer';
            
            activateButton.addEventListener('click', () => {
                applyPatches();
                document.body.removeChild(activateButton);
            });
            
            document.body.appendChild(activateButton);
        }
    }
    
    // Start initialization
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initialize();
    } else {
        document.addEventListener('DOMContentLoaded', initialize);
    }
})();
