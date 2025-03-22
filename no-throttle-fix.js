// no-throttle-fix.js
// Aggressive audio fix that removes most sound throttling

(function() {
    console.log("Loading NO THROTTLE audio fix...");
    
    // Function to apply once the app is loaded
    function removeAudioThrottling() {
        // Make sure the app exists
        if (!window.app) {
            console.warn("App not found, trying again in 300ms");
            setTimeout(removeAudioThrottling, 300);
            return;
        }
        
        console.log("Applying aggressive audio fix...");
        
        // Wait for audio initialization
        if (!window.app.audioContext) {
            console.log("Waiting for audio context...");
            setTimeout(removeAudioThrottling, 300);
            return;
        }
        
        // APPROACH 1: Direct override of core audio module functions
        let audioModuleFound = false;
        
        // Try to find the audio module paths
        const possiblePaths = [
            window.app.audio,
            window.app.audioModule,
            window.audioSystem,
            window.audio
        ];
        
        // Try to locate audio module
        let audioModule = null;
        for (const path of possiblePaths) {
            if (path && path.core) {
                audioModule = path.core;
                break;
            }
        }
        
        // If we found the audio module, override functions directly
        if (audioModule) {
            console.log("Found audio module, applying direct overrides");
            audioModuleFound = true;
            
            // Store original functions if needed for fallback
            const originalPlayFacetSound = audioModule.playFacetSound;
            const originalPlayToneForPosition = audioModule.playToneForPosition;
            
            // Override playFacetSound with no-throttle version
            audioModule.playFacetSound = function(app, facetIndex, position = null) {
                try {
                    if (!app.audioContext || app.audioContext.state !== 'running') return;
                    
                    // Get normalized position (default to center)
                    const pos = position || { u: 0.5, v: 0.5 };
                    
                    // Use facet index to select different sound characteristics
                    const baseFreq = 220 + (facetIndex % 12) * 50;
                    
                    // Vary frequency based on position within facet
                    const freqVariation = 30 * (pos.u - 0.5);
                    const frequency = baseFreq + freqVariation;
                    
                    // Create a new oscillator
                    const oscillatorNode = app.audioContext.createOscillator();
                    const gainNode = app.audioContext.createGain();
                    
                    // Configure sound
                    const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
                    oscillatorNode.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
                    
                    // Add some variation
                    const detune = (facetIndex * 7) % 100 - 50;
                    oscillatorNode.detune.value = detune;
                    
                    // Set frequency
                    oscillatorNode.frequency.value = frequency;
                    
                    // Get master output destination
                    const destination = app.masterGain || app.audioContext.destination;
                    
                    // Connect nodes
                    oscillatorNode.connect(gainNode);
                    gainNode.connect(destination);
                    
                    // Start with zero gain to avoid clicks
                    gainNode.gain.value = 0;
                    
                    // Start the oscillator
                    oscillatorNode.start();
                    
                    // Envelope shape
                    const now = app.audioContext.currentTime;
                    
                    // Fast attack
                    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
                    
                    // Medium sustain
                    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
                    
                    // Smooth release
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
                    
                    // Cleanup
                    setTimeout(() => {
                        try {
                            oscillatorNode.stop();
                            oscillatorNode.disconnect();
                            gainNode.disconnect();
                        } catch (e) {
                            console.warn('Error in audio cleanup:', e);
                        }
                    }, 400);
                } catch (error) {
                    console.error("Error in no-throttle playFacetSound:", error);
                    
                    // Fallback to original if something goes wrong
                    if (originalPlayFacetSound) {
                        try {
                            return originalPlayFacetSound(app, facetIndex, position);
                        } catch (fallbackError) {
                            console.error("Fallback also failed:", fallbackError);
                        }
                    }
                }
            };
            
            // Override playToneForPosition with no-throttle version
            audioModule.playToneForPosition = function(app, x, y) {
                try {
                    if (!app.audioContext || app.audioContext.state !== 'running') return;
                    
                    // Normalize coordinates to 0-1 range
                    const normX = (x + 1) / 2;
                    const normY = (y + 1) / 2;
                    
                    // Map x to frequency (e.g., 220Hz to 880Hz)
                    const frequency = 220 + normX * 660;
                    
                    // Map y to volume
                    const volume = 0.1 + normY * 0.15;
                    
                    // Create a new oscillator
                    const oscillatorNode = app.audioContext.createOscillator();
                    const gainNode = app.audioContext.createGain();
                    
                    // Configure oscillator
                    oscillatorNode.type = 'sine';
                    oscillatorNode.frequency.value = frequency;
                    
                    // Set volume
                    gainNode.gain.value = 0;
                    
                    // Get master output destination
                    const destination = app.masterGain || app.audioContext.destination;
                    
                    // Connect nodes
                    oscillatorNode.connect(gainNode);
                    gainNode.connect(destination);
                    
                    // Start oscillator
                    oscillatorNode.start();
                    
                    // Envelope
                    const now = app.audioContext.currentTime;
                    
                    // Quick attack
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                    
                    // Hold briefly
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
                    
                    // Smooth release
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                    
                    // Cleanup
                    setTimeout(() => {
                        try {
                            oscillatorNode.stop();
                            oscillatorNode.disconnect();
                            gainNode.disconnect();
                        } catch (e) {
                            console.warn('Error in audio cleanup:', e);
                        }
                    }, 200);
                } catch (error) {
                    console.error("Error in no-throttle playToneForPosition:", error);
                    
                    // Fallback to original if something goes wrong
                    if (originalPlayToneForPosition) {
                        try {
                            return originalPlayToneForPosition(app, x, y);
                        } catch (fallbackError) {
                            console.error("Fallback also failed:", fallbackError);
                        }
                    }
                }
            };
            
            console.log("Direct audio function overrides applied successfully");
        }
        
        // APPROACH 2: Look for and disable the sound scheduler
        if (window.app.soundScheduler) {
            console.log("Found sound scheduler, disabling throttling");
            
            // Disable throttling by making shouldAllowSound always return true
            window.app.soundScheduler.shouldAllowSound = function() { return true; };
            window.app.soundScheduler.maxSoundsPerSecond = 1000; // Effectively unlimited
            
            console.log("Sound scheduler throttling disabled");
        }
        
        // APPROACH 3: Create global patched versions of audio functions
        if (!audioModuleFound) {
            console.log("Creating global audio function overrides");
            
            // Create unthrottled versions of key functions
            window.unthrottledPlayFacetSound = function(app, facetIndex, position = null) {
                try {
                    if (!app.audioContext || app.audioContext.state !== 'running') return;
                    
                    // Get normalized position (default to center)
                    const pos = position || { u: 0.5, v: 0.5 };
                    
                    // Use facet index to select different sound characteristics
                    const baseFreq = 220 + (facetIndex % 12) * 50;
                    
                    // Vary frequency based on position within facet
                    const freqVariation = 30 * (pos.u - 0.5);
                    const frequency = baseFreq + freqVariation;
                    
                    // Create a new oscillator
                    const oscillatorNode = app.audioContext.createOscillator();
                    const gainNode = app.audioContext.createGain();
                    
                    // Configure sound
                    const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
                    oscillatorNode.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
                    
                    // Add some variation
                    const detune = (facetIndex * 7) % 100 - 50;
                    oscillatorNode.detune.value = detune;
                    
                    // Set frequency
                    oscillatorNode.frequency.value = frequency;
                    
                    // Get master output destination
                    const destination = app.masterGain || app.audioContext.destination;
                    
                    // Connect nodes
                    oscillatorNode.connect(gainNode);
                    gainNode.connect(destination);
                    
                    // Start with zero gain to avoid clicks
                    gainNode.gain.value = 0;
                    
                    // Start the oscillator
                    oscillatorNode.start();
                    
                    // Envelope shape
                    const now = app.audioContext.currentTime;
                    
                    // Fast attack
                    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
                    
                    // Medium sustain
                    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
                    
                    // Smooth release
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.25);
                    
                    // Cleanup
                    setTimeout(() => {
                        try {
                            oscillatorNode.stop();
                            oscillatorNode.disconnect();
                            gainNode.disconnect();
                        } catch (e) {
                            console.warn('Error in audio cleanup:', e);
                        }
                    }, 400);
                } catch (error) {
                    console.error("Error in unthrottled playFacetSound:", error);
                }
            };
            
            // Create unthrottled version of playToneForPosition
            window.unthrottledPlayToneForPosition = function(app, x, y) {
                try {
                    if (!app.audioContext || app.audioContext.state !== 'running') return;
                    
                    // Normalize coordinates to 0-1 range
                    const normX = (x + 1) / 2;
                    const normY = (y + 1) / 2;
                    
                    // Map x to frequency (e.g., 220Hz to 880Hz)
                    const frequency = 220 + normX * 660;
                    
                    // Map y to volume
                    const volume = 0.1 + normY * 0.15;
                    
                    // Create a new oscillator
                    const oscillatorNode = app.audioContext.createOscillator();
                    const gainNode = app.audioContext.createGain();
                    
                    // Configure oscillator
                    oscillatorNode.type = 'sine';
                    oscillatorNode.frequency.value = frequency;
                    
                    // Set volume
                    gainNode.gain.value = 0;
                    
                    // Get master output destination
                    const destination = app.masterGain || app.audioContext.destination;
                    
                    // Connect nodes
                    oscillatorNode.connect(gainNode);
                    gainNode.connect(destination);
                    
                    // Start oscillator
                    oscillatorNode.start();
                    
                    // Envelope
                    const now = app.audioContext.currentTime;
                    
                    // Quick attack
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
                    
                    // Hold briefly
                    gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
                    
                    // Smooth release
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                    
                    // Cleanup
                    setTimeout(() => {
                        try {
                            oscillatorNode.stop();
                            oscillatorNode.disconnect();
                            gainNode.disconnect();
                        } catch (e) {
                            console.warn('Error in audio cleanup:', e);
                        }
                    }, 200);
                } catch (error) {
                    console.error("Error in unthrottled playToneForPosition:", error);
                }
            };
            
            // Find and monkey-patch the event handlers that call these functions
            // This is complex and we'll need to look for event listeners
            setTimeout(() => {
                console.log("Looking for event handlers to patch...");
                // Monitor function calls to detect when audio functions are used
                const originalPlayFacetSound = window.app.playFacetSound;
                const originalPlayToneForPosition = window.app.playToneForPosition;
                
                if (typeof originalPlayFacetSound === 'function') {
                    window.app.playFacetSound = function() {
                        console.log("Original playFacetSound called, replacing with unthrottled version");
                        return window.unthrottledPlayFacetSound.apply(this, arguments);
                    };
                }
                
                if (typeof originalPlayToneForPosition === 'function') {
                    window.app.playToneForPosition = function() {
                        console.log("Original playToneForPosition called, replacing with unthrottled version");
                        return window.unthrottledPlayToneForPosition.apply(this, arguments);
                    };
                }
                
                console.log("Event handler patching complete");
            }, 1500);
        }
        
        // APPROACH 4: Look for circuit breaker and disable it
        if (window.app.circuitBreaker) {
            console.log("Found circuit breaker, disabling");
            
            // Override circuit breaker to never enter failure mode
            window.app.circuitBreaker.isInFailureMode = function() { return false; };
            window.app.circuitBreaker.recordFailure = function() { /* Do nothing */ };
            
            // Reset quality level to high
            if (typeof window.app.circuitBreaker.getQualityLevel === 'function') {
                const originalGetQualityLevel = window.app.circuitBreaker.getQualityLevel;
                window.app.circuitBreaker.getQualityLevel = function() { return "high"; };
            }
            
            console.log("Circuit breaker disabled");
        }
        
        // APPROACH 5: Use Mutation Observer to catch dynamically added event handlers
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.tagName === 'SCRIPT') {
                            console.log("New script detected, applying patches again in 500ms");
                            setTimeout(removeAudioThrottling, 500);
                            break;
                        }
                    }
                }
            }
        });
        
        // Start observing
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
        
        console.log("No-throttle audio fix applied successfully!");
        
        // Add a visible UI indicator that the fix is active
        const statusElement = document.createElement('div');
        statusElement.textContent = 'AUDIO FIX ACTIVE: UNLIMITED SOUND MODE';
        statusElement.style.position = 'fixed';
        statusElement.style.top = '10px';
        statusElement.style.left = '10px';
        statusElement.style.background = 'rgba(0, 255, 0, 0.7)';
        statusElement.style.color = 'black';
        statusElement.style.padding = '5px 10px';
        statusElement.style.borderRadius = '5px';
        statusElement.style.zIndex = '9999';
        statusElement.style.fontWeight = 'bold';
        statusElement.style.fontSize = '14px';
        document.body.appendChild(statusElement);
        
        // Fade out the indicator after 5 seconds
        setTimeout(() => {
            statusElement.style.transition = 'opacity 2s';
            statusElement.style.opacity = '0';
            
            // Remove after fade out
            setTimeout(() => {
                document.body.removeChild(statusElement);
            }, 2000);
        }, 5000);
    }
    
    // Create global audioSystem namespace if it doesn't exist
    window.audioSystem = window.audioSystem || {};
    
    // Inject this fix as soon as possible
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Document already loaded
        setTimeout(removeAudioThrottling, 500);
    } else {
        // Wait for document to load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(removeAudioThrottling, 500);
        });
    }
})();
