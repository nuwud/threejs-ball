/**
 * sound-scheduler.js
 * Implements rate limiting for audio playback to prevent overload
 * MODIFIED: Removed throttling to allow for continuous audio experience
 */

/**
 * SoundScheduler class
 * Manages sound playback timing and prevents audio overload
 */
export class SoundScheduler {
    /**
     * Create a new SoundScheduler
     * @param {number} maxSoundsPerSecond - Maximum sounds to allow per second
     */
    constructor(maxSoundsPerSecond = 60) { // Increased dramatically for continuous flow
        this.maxSoundsPerSecond = maxSoundsPerSecond;
        this.soundsThisSecond = 0;
        this.lastResetTime = Date.now();
        this.soundHistory = []; // Track recent sounds for better distribution
        this.recentFacets = new Set(); // Track recently played facets
        this.facetTimestamps = {}; // Track when each facet was last played
        this.enabled = false;
    }

    /**
     * Initialize the scheduler
     */
    initialize() {
        this.enabled = true;
        this.soundsThisSecond = 0;
        this.lastResetTime = Date.now();
        this.soundHistory = [];
        this.recentFacets = new Set();
        this.facetTimestamps = {};
        console.log('Sound scheduler initialized with max', this.maxSoundsPerSecond, 'sounds per second');
        return true;
    }

    /**
     * Record a sound being played
     * @param {number} facetIndex - Optional facet index for facet-specific sounds
     * @returns {boolean} True if the sound was allowed, false if throttled
     */
    recordSoundPlayed(facetIndex) {
        if (!this.enabled) return false;
        
        const now = Date.now();
        
        // Reset counter if more than a second has passed
        if (now - this.lastResetTime > 1000) {
            this.soundsThisSecond = 0;
            this.lastResetTime = now;
        }
        
        // Add this sound to history with timestamp
        this.soundHistory.push({
            time: now,
            facetIndex: facetIndex
        });
        
        // Trim history to keep only recent sounds (last 3 seconds)
        this.soundHistory = this.soundHistory.filter(sound => now - sound.time < 3000);
        
        // If facet index is provided, record when it was played
        if (facetIndex !== undefined) {
            this.recentFacets.add(facetIndex);
            this.facetTimestamps[facetIndex] = now;
        }
        
        // Record this sound
        this.soundsThisSecond++;
        return true;
    }

    /**
     * Check if a sound should be allowed to play
     * MODIFIED: Always returns true to allow continuous audio experience
     * @returns {boolean} Always returns true
     */
    shouldAllowSound() {
        // Always allow sounds to play for continuous experience
        return true;
    }

    /**
     * Schedule a sound to play after a delay
     * @param {Function} playFunction - Function to call to play the sound
     * @param {number} delay - Delay in milliseconds
     */
    scheduleSound(playFunction, delay = 0) {
        if (!this.enabled || typeof playFunction !== 'function') return;
        
        setTimeout(() => {
            // Always allow the sound (removed throttling check)
            playFunction();
            this.recordSoundPlayed();
        }, delay);
    }

    /**
     * Get status information
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            enabled: this.enabled,
            maxSoundsPerSecond: this.maxSoundsPerSecond,
            currentSoundsThisSecond: this.soundsThisSecond,
            recentFacetsCount: this.recentFacets.size,
            soundHistoryCount: this.soundHistory.length,
            allowingMoreSounds: true // Always allowing sounds
        };
    }
    
    /**
     * Dispose the scheduler
     */
    dispose() {
        this.enabled = false;
        this.soundHistory = [];
        this.recentFacets.clear();
        this.facetTimestamps = {};
    }
}