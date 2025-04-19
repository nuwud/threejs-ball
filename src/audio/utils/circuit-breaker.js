/**
 * audio-circuit-breaker.js
 * Implements the Circuit Breaker pattern to prevent complete audio failure
 * Automatically degrades audio quality when the system is under stress
 */

/**
 * AudioCircuitBreaker class
 * Monitors audio system health and reduces quality when performance issues occur
 */
export class AudioCircuitBreaker {
    constructor() {
        this.failureCount = 0;
        this.recoveryAttempts = 0;
        this.lastFailureTime = 0;
        this.inFailureMode = false;
        this.qualityLevel = 'high'; // high, medium, low
        this.callbacks = {
            onQualityChange: null
        };
    }

    /**
     * Register callbacks
     * @param {Object} callbacks - Callback functions
     */
    registerCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Initialize the circuit breaker
     */
    initialize() {
        this.failureCount = 0;
        this.recoveryAttempts = 0;
        this.lastFailureTime = 0;
        this.inFailureMode = false;
        this.qualityLevel = 'high';
        console.log('Audio circuit breaker initialized');
        return true;
    }

    /**
     * Record an audio failure
     */
    recordFailure() {
        const now = Date.now();
        
        // Reset failure count if it's been more than 10 seconds since last failure
        if (now - this.lastFailureTime > 10000) {
            this.failureCount = 0;
        }
        
        this.failureCount++;
        this.lastFailureTime = now;
        
        // If we've had multiple failures in a short time, enter failure mode
        if (this.failureCount >= 3 && !this.inFailureMode) {
            this.enterFailureMode();
        }
    }

    /**
     * Enter failure mode - reduce audio quality
     */
    enterFailureMode() {
        if (this.inFailureMode) return;
        
        this.inFailureMode = true;
        this.recoveryAttempts = 0;
        
        // Reduce quality
        if (this.qualityLevel === 'high') {
            this.qualityLevel = 'medium';
        } else if (this.qualityLevel === 'medium') {
            this.qualityLevel = 'low';
        }
        
        console.warn(`Audio system entering failure mode with quality: ${this.qualityLevel}`);
        
        // Notify quality change
        if (this.callbacks.onQualityChange) {
            this.callbacks.onQualityChange(this.qualityLevel);
        }
        
        // Schedule recovery attempt
        setTimeout(() => this.attemptRecovery(), 5000);
    }

    /**
     * Attempt recovery from failure mode
     */
    attemptRecovery() {
        if (!this.inFailureMode) return;
        
        this.recoveryAttempts++;
        
        // If we've tried to recover too many times, stay in failure mode
        if (this.recoveryAttempts > 3) {
            console.warn('Multiple recovery attempts failed, staying in failure mode');
            return;
        }
        
        // Exit failure mode
        this.inFailureMode = false;
        this.failureCount = 0;
        
        console.log('Attempting recovery from audio failure mode');
    }

    /**
     * Check if the system is in failure mode
     * @returns {boolean} True if in failure mode
     */
    isInFailureMode() {
        return this.inFailureMode;
    }

    /**
     * Get current quality level
     * @returns {string} Quality level (high, medium, low)
     */
    getQualityLevel() {
        return this.qualityLevel;
    }
}