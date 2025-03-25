// quick-fix-combined.js
// A comprehensive audio fix for the Three.js Interactive Ball
// This file contains all the enhanced functionality in a single file

(function() {
    console.log("Loading combined audio system enhancement...");
    
    // Enhanced SoundScheduler class
    class EnhancedSoundScheduler {
        constructor(maxSoundsPerSecond = 30) {
            this.maxSoundsPerSecond = maxSoundsPerSecond;
            this.soundsThisSecond = 0;
            this.lastResetTime = Date.now();
            this.soundHistory = [];
            this.recentFacets = new Map();
            this.enabled = true;
            
            // Continuous sound properties
            this.facetCooldowns = new Map();
            this.continuousSoundMode = false;
            this.lastPositionalSoundTime = 0;
            this.minPositionalInterval = 50;
        }
        
        initialize() {
            this.enabled = true;
            this.soundsThisSecond = 0;
            this.lastResetTime = Date.now();
            this.soundHistory = [];
            this.recentFacets = new Map();
            this.facetCooldowns = new Map();
            this.lastPositionalSoundTime = 0;
            console.log('Enhanced sound scheduler initialized with max', this.maxSoundsPerSecond, 'sounds per second');
            return true;
        }
        
        setContinuousMode(enabled) {
            this.continuousSoundMode = enabled;
            if (enabled) {
                this.minPositionalInterval = 30;
            } else {
                this.minPositionalInterval = 50;
            }
        }
        
        recordSoundPlayed(facetIndex, soundType = 'generic') {
            if (!this.enabled) return false;
            
            const now = Date.now();
            
            if (now - this.lastResetTime > 1000) {
                this.soundsThisSecond = 0;
                this.lastResetTime = now;
            }
            
            this.soundHistory.push({
                time: now,
                facetIndex: facetIndex,
                type: soundType
            });
            
            this.soundHistory = this.soundHistory.filter(sound => now - sound.time < 2000);
            
            if (facetIndex !== undefined) {
                this.recentFacets.set(facetIndex, now);
                
                if (soundType === 'facet') {
                    const cooldown = this.continuousSoundMode ? 150 : 200;
                    this.facetCooldowns.set(facetIndex, now + cooldown);
                }
            }
            
            if (soundType === 'positional') {
                this.lastPositionalSoundTime = now;
            }
            
            this.soundsThisSecond++;
            return true;
        }
        
        shouldAllowSound(facetIndex, soundType = 'generic') {
            if (!this.enabled) return false;
            
            const now = Date.now();
            
            if (now - this.lastResetTime > 1000) {
                this.soundsThisSecond = 0;
                this.lastResetTime = now;
                
                for (const [facet, timestamp] of this.recentFacets.entries()) {
                    if (now - timestamp > 3000) {
                        this.recentFacets.delete(facet);
                        this.facetCooldowns.delete(facet);
                    }
                }
            }
            
            if (soundType === 'click' || soundType === 'important') {
                return true;
            }
            
            if (facetIndex !== undefined && this.facetCooldowns.has(facetIndex)) {
                const cooldownTime = this.facetCooldowns.get(facetIndex);
                if (now < cooldownTime) {
                    return false;
                }
            }
            
            if (soundType === 'positional') {
                if (now - this.lastPositionalSoundTime < this.minPositionalInterval) {
                    return false;
                }
                
                const maxPositional = this.continuousSoundMode ? 
                    (this.maxSoundsPerSecond / 2) : 
                    (this.maxSoundsPerSecond / 3);
                    
                const recentPositionalCount = this.soundHistory.filter(
                    sound => sound.type === 'positional' && now - sound.time < 500
                ).length;
                
                return recentPositionalCount < maxPositional;
            }
            
            if (soundType === 'facet') {
                const lastFacetTime = this.recentFacets.get(facetIndex) || 0;
                const timeSinceLastFacetSound = now - lastFacetTime;
                
                if (timeSinceLastFacetSound < 200) {
                    return this.continuousSoundMode || this.soundsThisSecond < (this.maxSoundsPerSecond / 3);
                }
                
                return this.soundsThisSecond < (this.maxSoundsPerSecond * 0.8);
            }
            
            return this.soundsThisSecond < this.maxSoundsPerSecond;
        }
        
        getStatus() {
            return {
                enabled: this.enabled,
                maxSoundsPerSecond: this.maxSoundsPerSecond,
                currentSoundsThisSecond: this.soundsThisSecond,
                continuousModeEnabled: this.continuousSoundMode,
                recentFacetsCount: this.recentFacets.size,
                soundHistoryCount: this.soundHistory.length,
                allowingMoreSounds: this.shouldAllowSound(),
                minPositionalInterval: this.minPositionalInterval
            };
        }
        
        dispose() {
            this.enabled = false;
            this.soundHistory = [];
            this.recentFacets.clear();
            this.facetCooldowns.clear();
        }
    }
    
    // Enhanced audio functions
    function enhancedPlayFacetSound(app, facetIndex, position = null) {
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
    
    function enhancedPlayToneForPosition(app, x, y) {
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
    
    // Function to apply enhanced audio system
    function enhanceAudioSystem() {
        // Make sure the app exists
        if (!window.app) {
            console.warn("App not found, trying again in 500ms");
            setTimeout(enhanceAudioSystem, 500);
            return;
        }
        
        console.log("Applying enhanced audio system...");
        
        // Create global audio system
        window.audioSystem = window.audioSystem || {};
        
        // Create enhanced sound scheduler
        const enhancedScheduler = new EnhancedSoundScheduler(30);
        enhancedScheduler.initialize();
        enhancedScheduler.setContinuousMode(true);
        
        // Save to app and global
        window.app.soundScheduler = enhancedScheduler;
        window.audioSystem.soundScheduler = enhancedScheduler;
        
        // Replace audio functions
        window.app.originalPlayFacetSound = window.app.playFacetSound;
        window.app.originalPlayToneForPosition = window.app.playToneForPosition;
        
        window.app.playFacetSound = enhancedPlayFacetSound;
        window.app.playToneForPosition = enhancedPlayToneForPosition;
        
        // Also save to global audioSystem
        window.audioSystem.playFacetSound = enhancedPlayFacetSound;
        window.audioSystem.playToneForPosition = enhancedPlayToneForPosition;
        
        // Add continuous mode toggle
        window.enableContinuousSoundMode = function(app) {
            if (app && app.soundScheduler) {
                app.soundScheduler.setContinuousMode(true);
                app.soundScheduler.maxSoundsPerSecond = 30;
                console.log("Continuous sound mode enabled");
                return true;
            }
            return false;
        };
        
        window.disableContinuousSoundMode = function(app) {
            if (app && app.soundScheduler) {
                app.soundScheduler.setContinuousMode(false);
                app.soundScheduler.maxSoundsPerSecond = 20;
                console.log("Standard sound mode enabled");
                return true;
            }
            return false;
        };
        
        // Enable continuous mode by default
        window.enableContinuousSoundMode(window.app);
        
        console.log("Enhanced audio system applied successfully");
    }
    
    // Apply the enhanced audio when DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // Document already loaded
        setTimeout(enhanceAudioSystem, 1000); 
    } else {
        // Wait for document to load
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(enhanceAudioSystem, 1000);
        });
    }
})();
