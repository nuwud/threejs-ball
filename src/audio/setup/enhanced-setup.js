/**
 * enhanced-audio-setup.js
 * 
 * This module provides a comprehensive audio enhancement for the Three.js Interactive Ball
 * by replacing the default audio system with an enhanced version that offers:
 * 
 * 1. Improved sound throttling with continuous sound mode
 * 2. Better sound envelope management for smoother transitions
 * 3. Enhanced audio resource management
 * 
 * To use this enhancement, import and call the setupEnhancedAudio function
 * in your main initialization code.
 */

import { SoundScheduler } from '../playback/enhanced-scheduler.js';
import { 
    playFacetSound, 
    playToneForPosition,
    playClickSound, 
    playReleaseSound,
    enableContinuousSoundMode 
} from './enhanced-functions.js';
import { AudioNodePool } from '../utils/node-pool.js';
import { AudioCircuitBreaker } from '../utils/circuit-breaker.js';

/**
 * Set up enhanced audio system
 * @param {Object} app - Application context
 */
export function setupEnhancedAudio(app) {
    console.log("Setting up enhanced audio system...");
    
    // Create or get audio context
    if (!app.audioContext) {
        try {
            app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.error('Failed to create audio context:', error);
            return false;
        }
    }
    
    // Create global audio system if not already available
    window.audioSystem = window.audioSystem || {};
    
    // Create master gain node
    app.masterGain = app.audioContext.createGain();
    app.masterGain.gain.value = 0.8; // Default volume
    app.masterGain.connect(app.audioContext.destination);
    window.audioSystem.masterGain = app.masterGain;
    
    // Initialize node pool with larger size
    app.nodePool = new AudioNodePool(app.audioContext, 32); // Increased from 24
    if (typeof app.nodePool.initialize === 'function') {
        app.nodePool.initialize();
    }
    window.audioSystem.nodePool = app.nodePool;
    
    // Initialize sound scheduler with enhanced version
    app.soundScheduler = new SoundScheduler(30); // Increased max sounds
    app.soundScheduler.initialize();
    window.audioSystem.soundScheduler = app.soundScheduler;
    
    // Initialize circuit breaker
    app.circuitBreaker = new AudioCircuitBreaker();
    if (typeof app.circuitBreaker.initialize === 'function') {
        app.circuitBreaker.initialize();
    }
    window.audioSystem.circuitBreaker = app.circuitBreaker;
    
    // Set up circuit breaker callbacks
    app.circuitBreaker.registerCallbacks({
        onQualityChange: (quality) => {
            console.log(`Audio quality changed to: ${quality}`);
            
            // Update sound scheduler based on quality level
            if (quality === 'high') {
                app.soundScheduler.maxSoundsPerSecond = 30;
            } else if (quality === 'medium') {
                app.soundScheduler.maxSoundsPerSecond = 20;
            } else {
                app.soundScheduler.maxSoundsPerSecond = 10;
            }
        }
    });
    
    // Expose enhanced functions
    app.playFacetSound = playFacetSound;
    app.playToneForPosition = playToneForPosition;
    app.playClickSound = playClickSound;
    app.playReleaseSound = playReleaseSound;
    
    // Also expose to global audioSystem
    window.audioSystem.playFacetSound = playFacetSound;
    window.audioSystem.playToneForPosition = playToneForPosition;
    window.audioSystem.playClickSound = playClickSound;
    window.audioSystem.playReleaseSound = playReleaseSound;
    
    // Enable continuous sound mode by default
    enableContinuousSoundMode(app);
    
    // Resume audio context if suspended
    if (app.audioContext.state === 'suspended') {
        app.audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(err => {
            console.error('Failed to resume AudioContext:', err);
        });
    }
    
    console.log('Enhanced audio system successfully initialized');
    return true;
}

/**
 * Set up enhanced audio on module load
 */
try {
    // Create event listener for automatic setup
    document.addEventListener('DOMContentLoaded', function() {
        // Wait for app to be available
        const setupInterval = setInterval(() => {
            if (window.app && window.app.audioContext) {
                clearInterval(setupInterval);
                
                // Patch existing functions to use enhanced versions
                const originalPlayFacetSound = window.app.playFacetSound || 
                    (window.app.audio && window.app.audio.playFacetSound);
                    
                const originalPlayToneForPosition = window.app.playToneForPosition || 
                    (window.app.audio && window.app.audio.playToneForPosition);
                
                // Only replace if not already using enhanced version
                if (originalPlayFacetSound && originalPlayFacetSound !== playFacetSound) {
                    console.log("Patching existing audio functions with enhanced versions");
                    
                    // Replace with enhanced versions if not already enhanced
                    window.app.playFacetSound = playFacetSound;
                    window.app.playToneForPosition = playToneForPosition;
                    
                    // Set up enhanced audio system
                    setupEnhancedAudio(window.app);
                    
                    console.log("Audio system enhanced automatically");
                }
            }
        }, 500);
        
        // Stop checking after 10 seconds to avoid memory leaks
        setTimeout(() => clearInterval(setupInterval), 10000);
    });
} catch (error) {
    console.error("Error in enhanced audio setup:", error);
}

/**
 * Toggle between standard and continuous audio modes
 * @param {Object} app - Application context
 * @param {string} mode - 'standard' or 'continuous'
 */
export function setAudioMode(app, mode = 'continuous') {
    // Make sure app and sound scheduler are available
    if (!app || !app.soundScheduler) {
        console.warn("Cannot set audio mode: app or sound scheduler not available");
        return false;
    }
    
    if (mode === 'continuous') {
        // Enable continuous mode
        enableContinuousSoundMode(app);
        return true;
    } else if (mode === 'standard') {
        // Disable continuous mode
        if (typeof app.soundScheduler.setContinuousMode === 'function') {
            app.soundScheduler.setContinuousMode(false);
        }
        
        // Reduce max sounds per second
        app.soundScheduler.maxSoundsPerSecond = 20;
        
        console.log('Standard audio mode enabled');
        return true;
    }
    
    return false;
}

/**
 * Get audio system status for debugging
 * @param {Object} app - Application context
 * @returns {Object} Status information
 */
export function getAudioStatus(app) {
    if (!app) {
        return { status: 'error', message: 'App not available' };
    }
    
    const status = {
        initialized: !!app.audioContext,
        audioContextState: app.audioContext ? app.audioContext.state : 'unavailable',
        soundScheduler: app.soundScheduler ? app.soundScheduler.getStatus() : null,
        circuitBreaker: app.circuitBreaker ? {
            inFailureMode: app.circuitBreaker.isInFailureMode(),
            qualityLevel: app.circuitBreaker.getQualityLevel()
        } : null,
        nodePool: app.nodePool ? {
            activeNodes: app.nodePool.getActiveCount()
        } : null,
        masterGain: app.masterGain ? {
            value: app.masterGain.gain.value
        } : null,
        continuousModeEnabled: app.soundScheduler ? 
            app.soundScheduler.continuousSoundMode : false
    };
    
    return status;
}

// Make functions available globally for easier access
window.audioSystem = window.audioSystem || {};
window.audioSystem.setupEnhancedAudio = setupEnhancedAudio;
window.audioSystem.setAudioMode = setAudioMode;
window.audioSystem.getAudioStatus = getAudioStatus;
