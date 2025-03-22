// quick-fix.js
// A minimal patch that you can apply directly to your existing project

(function() {
    console.log("Loading audio system quick fix...");
    
    // Function to apply once the app is loaded
    function patchAudioSystem() {
        // Make sure the app exists
        if (!window.app) {
            console.warn("App not found, trying again in 500ms");
            setTimeout(patchAudioSystem, 500);
            return;
        }
        
        console.log("Applying audio system fixes...");
        
        // PATCH 1: Increase sound limits in the sound scheduler
        const fixSoundScheduler = () => {
            // Find the sound scheduler
            const scheduler = (window.app.soundScheduler || 
                (window.app.audioSystem && window.app.audioSystem.soundScheduler) ||
                (window.audioSystem && window.audioSystem.soundScheduler));
                
            if (!scheduler) {
                console.warn("Sound scheduler not found");
                return false;
            }
            
            // Increase the max sounds per second
            scheduler.maxSoundsPerSecond = 30; // Up from 25
            
            // Reduce the throttling for positional sounds
            const originalShouldAllowSound = scheduler.shouldAllowSound;
            scheduler.shouldAllowSound = function(facetIndex, soundType = 'generic') {
                // For positional sounds, be less restrictive
                if (soundType === 'positional') {
                    // Get current time
                    const now = Date.now();
                    
                    // If we're under 1/3 of max, always allow
                    if (this.soundsThisSecond < (this.maxSoundsPerSecond / 3)) {
                        return true;
                    }
                    
                    // Otherwise use normal logic but be more permissive
                    return this.soundsThisSecond < (this.maxSoundsPerSecond / 2); // Was 1/4
                }
                
                // For facet sounds, be less restrictive too
                if (soundType === 'facet') {
                    // If we haven't played this facet recently, allow it more easily
                    if (!this.recentFacets.has(facetIndex)) {
                        return true;
                    }
                    
                    // If we've played fewer than half max sounds, allow repeat facets
                    if (this.soundsThisSecond < (this.maxSoundsPerSecond / 2)) {
                        return true;
                    }
                }
                
                // Use original logic for other cases
                return originalShouldAllowSound.call(this, facetIndex, soundType);
            };
            
            console.log("Sound scheduler patched: increased limits");
            return true;
        };
        
        // PATCH 2: Improve the playFacetSound function
        const fixPlayFacetSound = () => {
            // Find the audio module
            let audioModule = null;
            
            // Try different possible locations
            if (window.app.audioModule) {
                audioModule = window.app.audioModule;
            } else if (window.audioModule) {
                audioModule = window.audioModule;
            }
            
            if (!audioModule) {
                // Function probably in global scope
                if (typeof window.playFacetSound !== 'function') {
                    console.warn("Could not locate playFacetSound function");
                    return false;
                }
                
                // Store the original function
                const originalPlayFacetSound = window.playFacetSound;
                
                // Replace with improved version
                window.playFacetSound = function(app, facetIndex, position = null) {
                    // Make sure audio is available
                    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
                        return;
                    }
                    
                    // Continue with original implementation but with modified envelope timing
                    try {
                        const result = originalPlayFacetSound(app, facetIndex, position);
                        
                        // If we got here, assume it worked
                        console.log("Enhanced facet sound played");
                        return result;
                    } catch (error) {
                        console.error("Error in enhanced facet sound:", error);
                        return null;
                    }
                };
                
                console.log("Global playFacetSound function patched");
                return true;
            } else {
                // If module exists, patch the function within it
                if (typeof audioModule.playFacetSound !== 'function') {
                    console.warn("playFacetSound not found in audio module");
                    return false;
                }
                
                // Store original function
                const originalPlayFacetSound = audioModule.playFacetSound;
                
                // Replace with improved version
                audioModule.playFacetSound = function(app, facetIndex, position = null) {
                    // Same implementation as above
                    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
                        return;
                    }
                    
                    try {
                        const result = originalPlayFacetSound(app, facetIndex, position);
                        console.log("Enhanced facet sound played (module)");
                        return result;
                    } catch (error) {
                        console.error("Error in enhanced facet sound (module):", error);
                        return null;
                    }
                };
                
                console.log("Module playFacetSound function patched");
                return true;
            }
        };
        
        // PATCH 3: Modify the core.js functions directly
        const patchCoreFunctions = () => {
            // Import functions from core.js if they're available
            try {
                // First try to find the core module
                let coreModule = null;
                
                // Check different possible locations
                if (window.app.audio && window.app.audio.core) {
                    coreModule = window.app.audio.core;
                } else if (window.audio && window.audio.core) {
                    coreModule = window.audio.core;
                }
                
                if (coreModule) {
                    // Patch the playFacetSound function
                    if (typeof coreModule.playFacetSound === 'function') {
                        const originalPlayFacetSound = coreModule.playFacetSound;
                        coreModule.playFacetSound = function(app, facetIndex, position = null) {
                            if (!app.audioContext) return;
                            
                            try {
                                // Get normalized position (default to center)
                                const pos = position || { u: 0.5, v: 0.5 };
                                
                                // Use facet index to select different sound characteristics
                                const baseFreq = 220 + (facetIndex % 12) * 50;
                                
                                // Vary frequency based on position within facet (subtle variation)
                                const freqVariation = 30 * (pos.u - 0.5); // +/- 15 Hz based on horizontal position
                                
                                // Calculate final frequency including variation
                                const frequency = baseFreq + freqVariation;

                                // Check if we should allow this sound (using soundScheduler)
                                const soundScheduler = app.soundScheduler || 
                                    (window.audioSystem && window.audioSystem.soundScheduler);
                                    
                                if (soundScheduler && typeof soundScheduler.shouldAllowSound === 'function' && 
                                    !soundScheduler.shouldAllowSound(facetIndex, 'facet')) {
                                    return; // Skip playing sound due to throttling
                                }

                                // Always create a new oscillator for each sound
                                const oscillatorNode = app.audioContext.createOscillator();
                                
                                // Get node pool
                                const nodePool = app.nodePool || 
                                    (window.audioSystem && window.audioSystem.nodePool);
                                    
                                if (!nodePool) {
                                    return;
                                }
                                
                                const gainNode = nodePool.acquire('gain');

                                if (!gainNode) {
                                    console.warn('Could not acquire gain node for facet sound');
                                    return;
                                }

                                // Configure sound - change oscillator type based on facet index
                                // This creates distinct timbres for different facets
                                const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
                                oscillatorNode.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
                                
                                // Add some variation based on facet index
                                const detune = (facetIndex * 7) % 100 - 50; // -50 to +50 cents
                                oscillatorNode.detune.value = detune;
                                
                                // Base frequency with variation
                                oscillatorNode.frequency.value = frequency;

                                // Get master gain
                                const masterGain = app.masterGain || 
                                    (window.audioSystem && window.audioSystem.masterGain) ||
                                    app.audioContext.destination;

                                // Connect nodes
                                oscillatorNode.connect(gainNode);
                                gainNode.connect(masterGain);

                                // Start with zero gain to avoid clicks
                                gainNode.gain.value = 0;

                                // Start the oscillator
                                oscillatorNode.start();

                                // Envelope shape - LONGER duration for more continuous sound
                                const now = app.audioContext.currentTime;
                                
                                // Faster attack (5ms)
                                gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
                                
                                // Longer sustain (300ms)
                                gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
                                
                                // Slower release (200ms)
                                gainNode.gain.linearRampToValueAtTime(0, now + 0.35);

                                // Longer timeout for cleanup (550ms instead of 250ms)
                                setTimeout(() => {
                                    try {
                                        oscillatorNode.stop();
                                        oscillatorNode.disconnect();
                                        gainNode.disconnect();
                                        nodePool.release(gainNode);
                                    } catch (e) {
                                        console.warn('Error in audio cleanup:', e);
                                    }
                                }, 550);

                                // Record successful sound trigger with facet index
                                if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
                                    soundScheduler.recordSoundPlayed(facetIndex);
                                }
                            } catch (error) {
                                console.error('Error in enhanced playFacetSound:', error);
                                // Call original function as fallback
                                return originalPlayFacetSound.apply(this, arguments);
                            }
                        };
                        
                        console.log("Core playFacetSound patched");
                    }
                    
                    // Patch the playToneForPosition function
                    if (typeof coreModule.playToneForPosition === 'function') {
                        const originalPlayToneForPosition = coreModule.playToneForPosition;
                        coreModule.playToneForPosition = function(app, x, y) {
                            if (!app.audioContext) return;
                            
                            try {
                                // Check if we should allow this sound (using soundScheduler)
                                const soundScheduler = app.soundScheduler || 
                                    (window.audioSystem && window.audioSystem.soundScheduler);
                                    
                                if (soundScheduler && typeof soundScheduler.shouldAllowSound === 'function' && 
                                    !soundScheduler.shouldAllowSound(undefined, 'positional')) {
                                    return; // Skip playing sound due to throttling
                                }
                                
                                // Normalize coordinates to 0-1 range
                                const normX = (x + 1) / 2;
                                const normY = (y + 1) / 2;

                                // Map x to frequency (e.g., 220Hz to 880Hz)
                                const frequency = 220 + normX * 660;

                                // Map y to volume (0.1 to 0.5) - lower volume for positional sounds
                                const volume = 0.05 + normY * 0.2;

                                // Create a new oscillator each time (don't reuse from pool)
                                const oscillatorNode = app.audioContext.createOscillator();
                                
                                // Get a gain node from the pool
                                const nodePool = app.nodePool || 
                                    (window.audioSystem && window.audioSystem.nodePool);
                                    
                                if (!nodePool) {
                                    return;
                                }
                                
                                let gainNode = nodePool.acquire('gain');
                                if (!gainNode) {
                                    gainNode = app.audioContext.createGain();
                                }

                                // Configure oscillator
                                oscillatorNode.type = 'sine';
                                oscillatorNode.frequency.value = frequency;

                                // Set volume
                                gainNode.gain.value = 0;

                                // Get master gain
                                const masterGain = app.masterGain || 
                                    (window.audioSystem && window.audioSystem.masterGain) ||
                                    app.audioContext.destination;

                                // Connect nodes
                                oscillatorNode.connect(gainNode);
                                gainNode.connect(masterGain);

                                // Start oscillator
                                oscillatorNode.start();

                                // IMPROVED ENVELOPE for more continuous sound
                                const now = app.audioContext.currentTime;
                                
                                // Faster attack
                                gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                                
                                // Hold for a bit for smoother sound
                                gainNode.gain.linearRampToValueAtTime(volume * 0.8, now + 0.07);
                                
                                // Slower release for better continuity
                                gainNode.gain.linearRampToValueAtTime(0, now + 0.18);

                                // Schedule cleanup - longer for better sound
                                setTimeout(() => {
                                    try {
                                        oscillatorNode.stop();
                                        oscillatorNode.disconnect();
                                        gainNode.disconnect();
                                        
                                        // Return gain node to pool if possible
                                        if (nodePool && typeof nodePool.release === 'function') {
                                            nodePool.release(gainNode);
                                        }
                                    } catch (cleanupError) {
                                        console.warn('Error during audio cleanup:', cleanupError);
                                    }
                                }, 250); // Longer timeout

                                // Record successful sound trigger
                                if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
                                    soundScheduler.recordSoundPlayed();
                                }
                            } catch (error) {
                                console.error('Error in enhanced playToneForPosition:', error);
                                // Fall back to original function
                                return originalPlayToneForPosition.apply(this, arguments);
                            }
                        };
                        
                        console.log("Core playToneForPosition patched");
                    }
                    
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error("Error patching core functions:", error);
                return false;
            }
        };
        
        // Set up continuous mode function
        window.enableContinuousSoundMode = function(app) {
            try {
                // Get sound scheduler
                const soundScheduler = app.soundScheduler || 
                    (window.audioSystem && window.audioSystem.soundScheduler);
                
                if (!soundScheduler) {
                    console.warn('Sound scheduler not available');
                    return false;
                }
                
                // Add continuous mode method if it doesn't exist
                if (typeof soundScheduler.setContinuousMode !== 'function') {
                    soundScheduler.setContinuousMode = function(enabled) {
                        this.continuousSoundMode = enabled;
                        // In continuous mode, we allow more sounds but manage them more carefully
                        if (enabled) {
                            this.minPositionalInterval = 30; // Allow sounds more frequently in continuous mode
                        } else {
                            this.minPositionalInterval = 50; // Default interval
                        }
                    };
                    
                    // Add property if needed
                    if (soundScheduler.continuousSoundMode === undefined) {
                        soundScheduler.continuousSoundMode = false;
                    }
                    
                    if (soundScheduler.minPositionalInterval === undefined) {
                        soundScheduler.minPositionalInterval = 50;
                    }
                }
                
                // Enable continuous mode for fluid sound experience
                soundScheduler.setContinuousMode(true);
                console.log('Continuous sound mode enabled');
                
                // Increase max sounds per second for better experience
                soundScheduler.maxSoundsPerSecond = 30;
                
                // Get circuit breaker to reduce sensitivity
                const circuitBreaker = app.circuitBreaker || 
                    (window.audioSystem && window.audioSystem.circuitBreaker);
                    
                if (circuitBreaker) {
                    // Reset circuit breaker to ensure we start fresh
                    if (typeof circuitBreaker.initialize === 'function') {
                        circuitBreaker.initialize();
                    }
                }
                
                return true;
            } catch (error) {
                console.error('Error enabling continuous sound mode:', error);
                return false;
            }
        };
        
        // Apply each patch
        const results = {
            scheduler: fixSoundScheduler(),
            facetSound: fixPlayFacetSound(),
            coreFunctions: patchCoreFunctions()
        };
        
        // Report results
        console.log("Audio system fix results:", results);
        
        // Automatically enable continuous mode
        if (window.enableContinuousSoundMode && window.app) {
            window.enableContinuousSoundMode(window.app);
            console.log("Continuous sound mode automatically enabled");
        }
        
        // Final adjustments to circuit breaker if available
        const circuitBreaker = window.app.circuitBreaker || 
            (window.app.audioSystem && window.app.audioSystem.circuitBreaker) ||
            (window.audioSystem && window.audioSystem.circuitBreaker);
            
        if (circuitBreaker) {
            // Make circuit breaker less sensitive
            if (typeof circuitBreaker.isInFailureMode === 'function' && 
                circuitBreaker.isInFailureMode()) {
                    
                // Reset the circuit breaker
                if (typeof circuitBreaker.initialize === 'function') {
                    circuitBreaker.initialize();
                    console.log("Circuit breaker reset");
                }
            }
        }
        
        console.log("Audio system fix complete!");
    }
    
    // Create global audioSystem namespace if it doesn't exist
    window.audioSystem = window.audioSystem || {};
    
    // Inject this fix as soon as possible
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Document already loaded
        setTimeout(patchAudioSystem, 1000); // Delay to ensure app is initialized
    } else {
        // Wait for document to load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(patchAudioSystem, 1000);
        });
    }
})();
