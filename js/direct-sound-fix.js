/**
 * direct-sound-fix.js
 * 
 * This fix directly targets the specific throttling mechanisms in the code:
 * 1. The 10ms mouse move throttle
 * 2. The 150ms time-based trigger limit
 * 3. The shouldPlayFacetSound conditional logic
 * 4. The sound scheduler throttling
 */

(function() {
    console.log("Loading direct sound fix...");

    // Function to apply once the DOM is loaded
    function apply() {
        console.log("Applying direct sound fix...");

        // Wait for app to be available
        if (!window.app) {
            console.log("Waiting for app...");
            setTimeout(apply, 300);
            return;
        }

        // ==========================================================
        // CRITICAL FIX 1: Replace the mousemove event handler
        // ==========================================================
        
        // Create our own unthrottled handler with direct sound triggering
        function unthrottledMouseHandler(event) {
            // Basic setup - copied from original onPointerMove
            const app = window.app;
            if (!app || !app.raycaster || !app.camera) return;
            
            // Calculate mouse position
            const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
            const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Calculate mouse movement distance
            let mouseMovementDistance = 0;
            if (app.lastMousePosition && app.lastMousePosition.x !== undefined) {
                const dx = mouseX - app.lastMousePosition.x;
                const dy = mouseY - app.lastMousePosition.y;
                mouseMovementDistance = Math.sqrt(dx * dx + dy * dy);
            }
            
            // Update last mouse position
            if (!app.lastMousePosition) app.lastMousePosition = new THREE.Vector2();
            app.lastMousePosition.x = mouseX;
            app.lastMousePosition.y = mouseY;
            
            // Store mouse coordinates
            if (!app.mouse) app.mouse = new THREE.Vector2();
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
                // Handle hover state
                if (!app.isHovered) {
                    document.body.style.cursor = 'pointer';
                    
                    // Update appearance
                    if (app.ballGroup.userData.wireMat) {
                        app.ballGroup.userData.wireMat.color.set(0xFF00FF);
                    }
                    
                    // Update gradient colors
                    if (typeof updateGradientColors === 'function') {
                        updateGradientColors(app, '#FF77FF', '#AA55FF', '#55FFFF');
                    }
                    
                    app.isHovered = true;
                }
                
                // Store intersection point for deformation
                app.touchPoint = intersects[0].point.clone();
                
                // Apply deformation
                if (typeof applyDeformation === 'function') {
                    applyDeformation(app, app.touchPoint, 0.2, 0.3);
                }
                
                // Get facet index
                const facetIndex = intersects[0].faceIndex;
                
                // Initialize audio
                if (typeof ensureAudioInitialized === 'function') {
                    ensureAudioInitialized(app);
                }
                
                // Get UV position in facet
                const uv = intersects[0].uv;
                const positionInFacet = uv ? { u: uv.x, v: uv.y } : { u: 0.5, v: 0.5 };
                
                // CRITICAL CHANGE: We ALWAYS play sounds here without any conditions
                
                // Import sound functions if not available globally
                const { playToneForPosition, playFacetSound } = window.soundFunctions || {};
                
                // Method 1: Try to use global sound functions
                if (typeof window.playToneForPosition === 'function') {
                    window.playToneForPosition(app, mouseX, mouseY);
                } 
                // Method 2: Try to use imported sound functions 
                else if (typeof playToneForPosition === 'function') {
                    playToneForPosition(app, mouseX, mouseY);
                }
                // Method 3: Try to use audio modules directly
                else if (app.audioContext) {
                    // Create a direct tone
                    createDirectTone(app, mouseX, mouseY);
                }
                
                // Similarly for facet sound
                if (typeof window.playFacetSound === 'function') {
                    window.playFacetSound(app, facetIndex, positionInFacet);
                } else if (typeof playFacetSound === 'function') {
                    playFacetSound(app, facetIndex, positionInFacet);
                } else if (app.audioContext) {
                    createDirectFacetSound(app, facetIndex, positionInFacet);
                }
                
                // Update last facet index
                app.lastFacetIndex = facetIndex;
                
            } else {
                // Not hovering over ball
                if (app.isHovered) {
                    document.body.style.cursor = 'default';
                    
                    // Reset appearance
                    if (app.ballGroup.userData.wireMat) {
                        app.ballGroup.userData.wireMat.color.set(0x00FFFF);
                    }
                    
                    // Reset gradient colors
                    if (typeof updateGradientColors === 'function') {
                        updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
                    }
                    
                    app.isHovered = false;
                }
                
                app.touchPoint = null;
                
                // Reset deformation
                if (typeof resetDeformation === 'function') {
                    resetDeformation(app, 0.1);
                }
            }
            
            // Handle dragging
            if (app.isDragging && app.previousMousePosition) {
                const deltaX = event.clientX - app.previousMousePosition.x;
                const deltaY = event.clientY - app.previousMousePosition.y;
                
                app.ballGroup.rotation.y += deltaX * 0.01;
                app.ballGroup.rotation.x += deltaY * 0.01;
                
                app.previousMousePosition.x = event.clientX;
                app.previousMousePosition.y = event.clientY;
            }
        }
        
        // Create direct tone function (bypass all throttling)
        function createDirectTone(app, x, y) {
            if (!app.audioContext) return;
            
            // Normalize coordinates to 0-1 range
            const normX = (x + 1) / 2;
            const normY = (y + 1) / 2;
            
            // Map x to frequency (220Hz to 880Hz)
            const frequency = 220 + normX * 660;
            
            // Map y to volume
            const volume = 0.05 + normY * 0.15;
            
            // Create oscillator
            const oscillator = app.audioContext.createOscillator();
            const gainNode = app.audioContext.createGain();
            
            // Configure oscillator
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            // Set volume
            gainNode.gain.value = 0;
            
            // Connect nodes
            oscillator.connect(gainNode);
            
            // Connect to output
            const destination = app.masterGain || app.audioContext.destination;
            gainNode.connect(destination);
            
            // Start oscillator
            oscillator.start();
            
            // Apply envelope
            const now = app.audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
            
            // Cleanup
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 200);
        }
        
        // Create direct facet sound function (bypass all throttling)
        function createDirectFacetSound(app, facetIndex, position) {
            if (!app.audioContext) return;
            
            const pos = position || { u: 0.5, v: 0.5 };
            
            // Use facet index to vary sound
            const baseFreq = 220 + (facetIndex % 12) * 50;
            const freqVariation = 30 * (pos.u - 0.5);
            const frequency = baseFreq + freqVariation;
            
            // Create oscillator
            const oscillator = app.audioContext.createOscillator();
            const gainNode = app.audioContext.createGain();
            
            // Configure sound based on facet
            const oscTypes = ['sine', 'triangle', 'square', 'sawtooth'];
            oscillator.type = oscTypes[facetIndex % oscTypes.length];
            
            // Add variation
            const detune = (facetIndex * 7) % 100 - 50;
            oscillator.detune.value = detune;
            oscillator.frequency.value = frequency;
            
            // Set volume
            gainNode.gain.value = 0;
            
            // Connect to output
            const destination = app.masterGain || app.audioContext.destination;
            oscillator.connect(gainNode);
            gainNode.connect(destination);
            
            // Start oscillator
            oscillator.start();
            
            // Apply envelope - LONGER duration for better continuity
            const now = app.audioContext.currentTime;
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
            
            // Cleanup
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 400);
        }

        // ==========================================================
        // CRITICAL FIX 2: Bypass the sound scheduler
        // ==========================================================
        
        // Find the sound scheduler
        let soundScheduler = null;
        if (app.soundScheduler) {
            soundScheduler = app.soundScheduler;
        } else if (window.audioSystem && window.audioSystem.soundScheduler) {
            soundScheduler = window.audioSystem.soundScheduler;
        }
        
        if (soundScheduler) {
            console.log("Found sound scheduler, bypassing throttling...");
            
            // Bypass shouldAllowSound
            soundScheduler.shouldAllowSound = function() {
                return true;
            };
            
            // Bypass recordSoundPlayed
            soundScheduler.recordSoundPlayed = function() {
                return true;
            };
            
            // Increase max sounds per second to effectively unlimited
            soundScheduler.maxSoundsPerSecond = 1000;
        }
        
        // ==========================================================
        // CRITICAL FIX 3: Patch the original sound functions
        // ==========================================================
        
        // Import core audio functions if possible
        try {
            const { playToneForPosition, playFacetSound } = app.audio || 
                window.audioModule || 
                require('./audio/core.js');
                
            // Store for direct use
            window.soundFunctions = {
                playToneForPosition,
                playFacetSound
            };
            
            // Patch original functions if found
            if (typeof playToneForPosition === 'function') {
                const original = playToneForPosition;
                window.playToneForPosition = function(app, x, y) {
                    // Skip the shouldAllowSound check completely
                    try {
                        if (!app.audioContext) return;
                        
                        // Extract the core functionality from the original
                        createDirectTone(app, x, y);
                    } catch (error) {
                        console.error("Error in patched playToneForPosition:", error);
                        // Fall back to original if our direct implementation fails
                        return original(app, x, y);
                    }
                };
                console.log("Successfully patched playToneForPosition");
            }
            
            if (typeof playFacetSound === 'function') {
                const original = playFacetSound;
                window.playFacetSound = function(app, facetIndex, position) {
                    // Skip the shouldAllowSound check completely
                    try {
                        if (!app.audioContext) return;
                        
                        // Extract the core functionality from the original
                        createDirectFacetSound(app, facetIndex, position);
                    } catch (error) {
                        console.error("Error in patched playFacetSound:", error);
                        // Fall back to original if our direct implementation fails
                        return original(app, facetIndex, position);
                    }
                };
                console.log("Successfully patched playFacetSound");
            }
        } catch (error) {
            console.warn("Could not import core audio functions:", error);
        }
        
        // ==========================================================
        // CRITICAL FIX 4: Replace the throttled event listener
        // ==========================================================
        
        console.log("Setting up unthrottled event listeners...");
        
        // Remove existing listeners
        window.removeEventListener('mousemove', window.throttledPointerMove);
        
        // Add our direct unthrottled listener
        window.addEventListener('mousemove', unthrottledMouseHandler);
        
        // Also handle touch events
        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            unthrottledMouseHandler(touch);
        }, { passive: false });
        
        console.log("Direct sound fix applied successfully!");
        
        // Add a visual indicator that the fix is active
        const indicator = document.createElement('div');
        indicator.textContent = 'CONTINUOUS SOUND ACTIVE';
        indicator.style.position = 'fixed';
        indicator.style.top = '10px';
        indicator.style.left = '10px';
        indicator.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
        indicator.style.color = 'black';
        indicator.style.padding = '10px';
        indicator.style.borderRadius = '5px';
        indicator.style.zIndex = '1000';
        indicator.style.fontWeight = 'bold';
        document.body.appendChild(indicator);
        
        // Fade out the indicator after 5 seconds
        setTimeout(() => {
            indicator.style.transition = 'opacity 1s';
            indicator.style.opacity = '0.3';
            
            indicator.addEventListener('mouseenter', () => {
                indicator.style.opacity = '1';
            });
            
            indicator.addEventListener('mouseleave', () => {
                indicator.style.opacity = '0.3';
            });
        }, 5000);
    }
    
    // Apply the fix when the page loads
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(apply, 500);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(apply, 500));
    }
})();
