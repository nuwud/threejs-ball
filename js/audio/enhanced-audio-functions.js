/**
 * enhanced-audio-functions.js
 * Improved sound playback functions for the Three.js Interactive Ball
 */

/**
 * Enhanced version of playFacetSound function
 * Provides more consistent sound experience
 * @param {Object} app - Application context
 * @param {number} facetIndex - Index of the facet
 * @param {Object} position - Optional normalized position within facet
 */
export function playFacetSound(app, facetIndex, position = null) {
    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
        return;
    }

    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler || 
            (window.audioSystem && window.audioSystem.soundScheduler);
        
        if (!soundScheduler) {
            console.warn('Sound scheduler not available');
            return;
        }
            
        // Get normalized position (default to center)
        const pos = position || { u: 0.5, v: 0.5 };
        
        // Check if we should allow this sound
        if (!soundScheduler.shouldAllowSound(facetIndex, 'facet')) {
            return; // Skip due to throttling
        }
        
        // Use facet index to select different sound characteristics
        const baseFreq = 220 + (facetIndex % 12) * 50;
        
        // Vary frequency based on position within facet
        const freqVariation = 30 * (pos.u - 0.5);
        const frequency = baseFreq + freqVariation;

        // Get nodePool from app or global audio system
        const nodePool = app.nodePool || 
            (window.audioSystem && window.audioSystem.nodePool);
            
        if (!nodePool) {
            console.warn('Node pool not available');
            return;
        }

        // Always create a new oscillator for each sound
        const oscillatorNode = app.audioContext.createOscillator();
        const gainNode = nodePool.acquire('gain');

        if (!gainNode) {
            console.warn('Could not acquire gain node for facet sound');
            return;
        }

        // Configure sound - change oscillator type based on facet index
        const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
        oscillatorNode.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
        
        // Add some variation based on facet index
        const detune = (facetIndex * 7) % 100 - 50; // -50 to +50 cents
        oscillatorNode.detune.value = detune;
        
        // Base frequency with variation
        oscillatorNode.frequency.value = frequency;

        // Get master gain if available
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

        // Envelope shape - optimized for continuous sound experience
        const now = app.audioContext.currentTime;
        
        // Faster attack (5ms)
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);
        
        // Medium sustain (200ms)
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
        
        // Smoother release (150ms) - adjusted for better continuity
        gainNode.gain.linearRampToValueAtTime(0, now + 0.25);

        // Timeout for cleanup - adjusted to match envelope
        setTimeout(() => {
            try {
                oscillatorNode.stop();
                oscillatorNode.disconnect();
                gainNode.disconnect();
                nodePool.release(gainNode);
            } catch (e) {
                console.warn('Error in audio cleanup:', e);
            }
        }, 400); // Extended to prevent premature cutoff

        // Record successful sound trigger with facet index
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed(facetIndex, 'facet');
        }
    } catch (error) {
        console.error('Error playing facet sound:', error);
        // Record failure if circuit breaker exists
        if (app.circuitBreaker && typeof app.circuitBreaker.recordFailure === 'function') {
            app.circuitBreaker.recordFailure();
        }
    }
}

/**
 * Enhanced playToneForPosition with improved continuous sound management
 * @param {Object} app - Application context
 * @param {number} x - X coordinate (-1 to 1)
 * @param {number} y - Y coordinate (-1 to 1)
 */
export function playToneForPosition(app, x, y) {
    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
        return;
    }

    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler || 
            (window.audioSystem && window.audioSystem.soundScheduler);
        
        if (!soundScheduler) {
            console.warn('Sound scheduler not available');
            return;
        }
        
        // Check if we should allow this sound
        if (!soundScheduler.shouldAllowSound(undefined, 'positional')) {
            return; // Skip due to throttling
        }

        // Get nodePool from app or global audio system
        const nodePool = app.nodePool || 
            (window.audioSystem && window.audioSystem.nodePool);
            
        if (!nodePool) {
            console.warn('Node pool not available');
            return;
        }

        // Normalize coordinates to 0-1 range
        const normX = (x + 1) / 2;
        const normY = (y + 1) / 2;

        // Map x to frequency (e.g., 220Hz to 880Hz)
        const frequency = 220 + normX * 660;

        // Map y to volume (0.1 to 0.5) - adjusted for better balance
        const volume = 0.1 + normY * 0.15;

        // Create a new oscillator each time
        const oscillatorNode = app.audioContext.createOscillator();
        
        // Get a gain node from the pool
        let gainNode = nodePool.acquire('gain');
        if (!gainNode) {
            gainNode = app.audioContext.createGain(); // Fallback
        }

        // Configure oscillator
        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.value = frequency;

        // Set volume
        gainNode.gain.value = 0;

        // Get master gain if available
        const masterGain = app.masterGain || 
            (window.audioSystem && window.audioSystem.masterGain) || 
            app.audioContext.destination;

        // Connect nodes
        oscillatorNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Smoother envelope for continuous sound
        const now = app.audioContext.currentTime;
        
        // Ramp up volume more quickly
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
        
        // Hold for longer before ramping down
        gainNode.gain.linearRampToValueAtTime(volume, now + 0.05);
        
        // Ramp down more gradually
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);

        // Schedule cleanup - slightly longer duration for smoother sound
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
        }, 200);

        // Record successful sound trigger
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed(undefined, 'positional');
        }
    } catch (error) {
        console.error('Error playing tone for position:', error);
        
        // Record failure if circuit breaker exists
        if (app.circuitBreaker && typeof app.circuitBreaker.recordFailure === 'function') {
            app.circuitBreaker.recordFailure();
        }
    }
}

/**
 * Function to initialize continuous mode for fluid audio experiences
 * @param {Object} app - Application context
 */
export function enableContinuousSoundMode(app) {
    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler || 
            (window.audioSystem && window.audioSystem.soundScheduler);
        
        if (!soundScheduler) {
            console.warn('Sound scheduler not available');
            return false;
        }
        
        // Enable continuous mode for fluid sound experience
        if (typeof soundScheduler.setContinuousMode === 'function') {
            soundScheduler.setContinuousMode(true);
            console.log('Continuous sound mode enabled');
        }
        
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
}

/**
 * Play a click sound with enhanced envelope
 * @param {Object} app - Application context
 */
export function playClickSound(app) {
    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
        return;
    }

    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler || 
            (window.audioSystem && window.audioSystem.soundScheduler);
            
        if (!soundScheduler) {
            console.warn('Sound scheduler not available');
            return;
        }

        // Check if we should allow this sound
        if (!soundScheduler.shouldAllowSound(undefined, 'click')) {
            return; // Skip due to throttling
        }

        // Get nodePool from app or global audio system
        const nodePool = app.nodePool || 
            (window.audioSystem && window.audioSystem.nodePool);
            
        if (!nodePool) {
            console.warn('Node pool not available');
            return;
        }

        // Always create a new oscillator
        const oscillatorNode = app.audioContext.createOscillator();
        const filterNode = nodePool.acquire('biquadFilter');
        const gainNode = nodePool.acquire('gain');

        if (!filterNode || !gainNode) {
            console.warn('Could not acquire audio nodes for click sound');
            return;
        }

        // Configure nodes
        oscillatorNode.type = 'square';
        oscillatorNode.frequency.value = 80;

        filterNode.type = 'lowpass';
        filterNode.frequency.value = 1000;
        filterNode.Q.value = 5;

        gainNode.gain.value = 0;

        // Get master gain if available
        const masterGain = app.masterGain || 
            (window.audioSystem && window.audioSystem.masterGain) || 
            app.audioContext.destination;

        // Connect nodes
        oscillatorNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Click envelope - slightly improved for better feel
        const now = app.audioContext.currentTime;
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        // Pitch drop for click effect
        oscillatorNode.frequency.exponentialRampToValueAtTime(40, now + 0.1);

        // Schedule cleanup
        setTimeout(() => {
            try {
                oscillatorNode.stop();
                oscillatorNode.disconnect();
                filterNode.disconnect();
                gainNode.disconnect();
                nodePool.release(filterNode);
                nodePool.release(gainNode);
            } catch (e) {
                console.warn('Error in audio cleanup:', e);
            }
        }, 150);

        // Record successful sound trigger
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed(undefined, 'click');
        }
    } catch (error) {
        console.error('Error playing click sound:', error);
        
        // Record failure if circuit breaker exists
        if (app.circuitBreaker && typeof app.circuitBreaker.recordFailure === 'function') {
            app.circuitBreaker.recordFailure();
        }
    }
}

/**
 * Play a release sound with enhanced envelope
 * @param {Object} app - Application context
 */
export function playReleaseSound(app) {
    if (!app.audioContext || !app.audioContext.state || app.audioContext.state !== 'running') {
        return;
    }

    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler || 
            (window.audioSystem && window.audioSystem.soundScheduler);
            
        if (!soundScheduler) {
            console.warn('Sound scheduler not available');
            return;
        }

        // Check if we should allow this sound
        if (!soundScheduler.shouldAllowSound(undefined, 'release')) {
            return; // Skip due to throttling
        }

        // Get nodePool from app or global audio system
        const nodePool = app.nodePool || 
            (window.audioSystem && window.audioSystem.nodePool);
            
        if (!nodePool) {
            console.warn('Node pool not available');
            return;
        }

        // Always create a new oscillator
        const oscillatorNode = app.audioContext.createOscillator();
        const gainNode = nodePool.acquire('gain');

        if (!gainNode) {
            console.warn('Could not acquire audio nodes for release sound');
            return;
        }

        // Configure nodes
        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.value = 440;

        gainNode.gain.value = 0;

        // Get master gain if available
        const masterGain = app.masterGain || 
            (window.audioSystem && window.audioSystem.masterGain) || 
            app.audioContext.destination;

        // Connect nodes
        oscillatorNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Release envelope - improved for better feel
        const now = app.audioContext.currentTime;
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.08);

        // Pitch rise for release effect
        oscillatorNode.frequency.exponentialRampToValueAtTime(880, now + 0.08);

        // Schedule cleanup
        setTimeout(() => {
            try {
                oscillatorNode.stop();
                oscillatorNode.disconnect();
                gainNode.disconnect();
                nodePool.release(gainNode);
            } catch (e) {
                console.warn('Error in audio cleanup:', e);
            }
        }, 100);

        // Record successful sound trigger
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed(undefined, 'release');
        }
    } catch (error) {
        console.error('Error playing release sound:', error);
        
        // Record failure if circuit breaker exists
        if (app.circuitBreaker && typeof app.circuitBreaker.recordFailure === 'function') {
            app.circuitBreaker.recordFailure();
        }
    }
}
