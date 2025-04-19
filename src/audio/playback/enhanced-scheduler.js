/**
 * enhanced-sound-scheduler.js
 * Implements improved rate limiting for audio playback to prevent throttling issues
 */

/**
 * Enhanced SoundScheduler class
 * Manages sound playback timing with continuous sound mode support
 */
export class SoundScheduler {
    /**
     * Create a new SoundScheduler with improved throttling logic
     * @param {number} maxSoundsPerSecond - Maximum sounds to allow per second
     */
    constructor(maxSoundsPerSecond = 30) { // Increased from 25 to 30
        this.maxSoundsPerSecond = maxSoundsPerSecond;
        this.soundsThisSecond = 0;
        this.lastResetTime = Date.now();
        this.soundHistory = []; // Track recent sounds for better distribution
        this.recentFacets = new Map(); // Changed from Set to Map to store timestamps directly
        this.enabled = true;
        
        // New properties for continuous sound handling
        this.facetCooldowns = new Map(); // Cooldown times for each facet
        this.continuousSoundMode = false; // Flag for continuous sound mode
        this.lastPositionalSoundTime = 0; // Time of last positional sound
        this.minPositionalInterval = 50; // Minimum 50ms between positional sounds (was too restrictive before)
    }

    /**
     * Initialize the scheduler
     */
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

    /**
     * Enable continuous sound mode for more fluid audio experience
     * @param {boolean} enabled - Whether continuous mode is enabled
     */
    setContinuousMode(enabled) {
        this.continuousSoundMode = enabled;
        // In continuous mode, we allow more sounds but manage them more carefully
        if (enabled) {
            this.minPositionalInterval = 30; // Allow sounds more frequently in continuous mode
        } else {
            this.minPositionalInterval = 50; // Default interval
        }
    }

    /**
     * Record a sound being played
     * @param {number} facetIndex - Optional facet index for facet-specific sounds
     * @param {string} soundType - Type of sound (facet, positional, etc.)
     * @returns {boolean} True if the sound was allowed, false if throttled
     */
    recordSoundPlayed(facetIndex, soundType = 'generic') {
        if (!this.enabled) return false;
        
        const now = Date.now();
        
        // Reset counter if more than a second has passed
        if (now - this.lastResetTime > 1000) {
            this.soundsThisSecond = 0;
            this.lastResetTime = now;
            // Don't clear facets here to maintain continuity
        }
        
        // Add this sound to history with timestamp and type
        this.soundHistory.push({
            time: now,
            facetIndex: facetIndex,
            type: soundType
        });
        
        // Trim history to keep only recent sounds (last 2 seconds)
        // Reduced from 3 seconds to improve responsiveness
        this.soundHistory = this.soundHistory.filter(sound => now - sound.time < 2000);
        
        // If facet index is provided, record when it was played
        if (facetIndex !== undefined) {
            this.recentFacets.set(facetIndex, now);
            
            // Set a cooldown based on sound type (prevents rapid repeats of the same facet)
            if (soundType === 'facet') {
                // Shorter cooldown in continuous mode
                const cooldown = this.continuousSoundMode ? 150 : 200;
                this.facetCooldowns.set(facetIndex, now + cooldown);
            }
        }
        
        // Update positional sound time if applicable
        if (soundType === 'positional') {
            this.lastPositionalSoundTime = now;
        }
        
        // Record this sound
        this.soundsThisSecond++;
        return true;
    }

    /**
     * Check if a sound should be allowed to play with improved throttling logic
     * @param {number} facetIndex - Optional facet index for facet-specific sounds
     * @param {string} soundType - Type of sound (e.g., 'facet', 'click', 'positional')
     * @returns {boolean} True if allowed, false if throttled
     */
    shouldAllowSound(facetIndex, soundType = 'generic') {
        if (!this.enabled) return false;
        
        const now = Date.now();
        
        // Reset counter if more than a second has passed
        if (now - this.lastResetTime > 1000) {
            this.soundsThisSecond = 0;
            this.lastResetTime = now;
            
            // Clear old facet entries (older than 3 seconds)
            for (const [facet, timestamp] of this.recentFacets.entries()) {
                if (now - timestamp > 3000) {
                    this.recentFacets.delete(facet);
                    this.facetCooldowns.delete(facet);
                }
            }
        }
        
        // Higher priority sounds always allowed
        if (soundType === 'click' || soundType === 'important') {
            return true;
        }
        
        // Check facet-specific cooldowns
        if (facetIndex !== undefined && this.facetCooldowns.has(facetIndex)) {
            const cooldownTime = this.facetCooldowns.get(facetIndex);
            if (now < cooldownTime) {
                // Still in cooldown period, don't play this facet again yet
                return false;
            }
        }
        
        // For positional sounds (continuous movement over ball)
        if (soundType === 'positional') {
            // Check if we've played a positional sound too recently
            if (now - this.lastPositionalSoundTime < this.minPositionalInterval) {
                return false;
            }
            
            // Allow more positional sounds in continuous mode
            const maxPositional = this.continuousSoundMode ? 
                (this.maxSoundsPerSecond / 2) : // More generous limit in continuous mode
                (this.maxSoundsPerSecond / 3);  // Default limit
                
            // Count recent positional sounds (last 500ms)
            const recentPositionalCount = this.soundHistory.filter(
                sound => sound.type === 'positional' && now - sound.time < 500
            ).length;
            
            // Make sure we're not playing too many positional sounds
            return recentPositionalCount < maxPositional;
        }
        
        // For facet sounds (when crossing triangle boundaries)
        if (soundType === 'facet') {
            // Get time since we last played this specific facet
            const lastFacetTime = this.recentFacets.get(facetIndex) || 0;
            const timeSinceLastFacetSound = now - lastFacetTime;
            
            // If we've played this facet very recently, be more selective
            if (timeSinceLastFacetSound < 200) {
                // Only allow in continuous mode or if we're well under our limit
                return this.continuousSoundMode || this.soundsThisSecond < (this.maxSoundsPerSecond / 3);
            }
            
            // For facets we haven't played in a while, be more permissive
            return this.soundsThisSecond < (this.maxSoundsPerSecond * 0.8); // Increased from 0.75
        }
        
        // For any other sound type, use a reasonable limit
        return this.soundsThisSecond < this.maxSoundsPerSecond;
    }

    /**
     * Schedule a sound to play after a delay with improved timing
     * @param {Function} playFunction - Function to call to play the sound
     * @param {number} delay - Delay in milliseconds
     * @param {number} facetIndex - Optional facet index 
     * @param {string} soundType - Type of sound to schedule
     */
    scheduleSound(playFunction, delay = 0, facetIndex, soundType = 'generic') {
        if (!this.enabled || typeof playFunction !== 'function') return;
        
        setTimeout(() => {
            if (this.shouldAllowSound(facetIndex, soundType)) {
                playFunction();
                this.recordSoundPlayed(facetIndex, soundType);
            }
        }, delay);
    }

    /**
     * Get detailed status information about the scheduler
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            enabled: this.enabled,
            maxSoundsPerSecond: this.maxSoundsPerSecond,
            currentSoundsThisSecond: this.soundsThisSecond,
            continuousModeEnabled: this.continuousSoundMode,
            recentFacetsCount: this.recentFacets.size,
            soundHistoryCount: this.soundHistory.length,
            allowingMoreSounds: this.shouldAllowSound(),
            minPositionalInterval: this.minPositionalInterval,
            millisSinceLastReset: Date.now() - this.lastResetTime
        };
    }
    
    /**
     * Dispose the scheduler
     */
    dispose() {
        this.enabled = false;
        this.soundHistory = [];
        this.recentFacets.clear();
        this.facetCooldowns.clear();
    }
}
