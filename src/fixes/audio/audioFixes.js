import * as THREE from 'three';

// Import additional modules from the new architecture
import { soundManager as externalSoundManager, getListener } from '../audio/playback/sound-manager.js';
import { toggleAudioVisualization, updateAudioVisualization as externalUpdateAudioVisualization, createAudioVisualization } from '../audio/visualization/core.js';
import { AudioNodePool } from '../fixes/utils/node-pool.js';
import { SoundScheduler } from '../scheduler.js';
import { AudioCircuitBreaker } from './audio-circuit-breaker.js';

// Callbacks system for enhanced integration
const callbacks = {
    onInitialized: null,
    onError: null,
    onQualityChanged: null
};

// Enhanced SoundSynthesizer class for better audio
class SoundSynthesizer {
    constructor(audioContext) {
        // Ensure we have a valid audio context
        this.audioContext = audioContext;
        
        // Define createReverb method first
        this.createReverb = function() {
            // Simple implementation that returns a convolver node or a pass-through gain
            try {
                const convolver = this.audioContext.createConvolver();
                return convolver;
            } catch (e) {
                console.warn('Could not create reverb node: ', e);
                // Return a pass-through gain node as fallback
                return this.audioContext.createGain();
            }
        };
        
        // Create master gain with more conservative settings
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.2; // Reduce overall volume to prevent distortion
        this.masterGain.connect(audioContext.destination);
        
        // Create compressor with gentler settings to prevent audio cracking
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.3;
        
        this.masterGain.connect(this.compressor);
        this.compressor.connect(audioContext.destination);
        
        // Use fewer effects to reduce processing load
        this.reverb = this.createReverb();
        this.masterGain.connect(this.reverb);
        this.reverb.connect(audioContext.destination);
        
        // Store active note modules for management
        this.activeNotes = [];
        
        // Store buffers for special sounds
        this.specialSounds = {};
        
        // Audio recovery system
        this.lastAudioTime = Date.now();
        this.audioFailed = false;
        
        // Initialize special sounds
        this.initSpecialSounds();
        
        // Setup watchdog to detect audio failures
        this.setupAudioWatchdog();

        // Add continuous mode support
        this.continuousModeEnabled = false;
    }
    
    // All existing methods from SoundSynthesizer remain the same
    // ...

    // Additional method to enable continuous sound mode
    enableContinuousMode(enabled = true) {
        this.continuousModeEnabled = enabled;
        console.log(`Continuous sound mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    // More enhanced facet sound for ball interaction
    playFacetSound(facetIndex, position = { u: 0.5, v: 0.5 }) {
        try {
            // Record the time of audio playback attempt
            this.lastAudioTime = Date.now();
            
            // Base frequency on facet index for musical variety
            const baseFreq = 220 + (facetIndex % 12) * 50;
            
            // Vary frequency based on position within facet
            const freqVariation = 30 * (position.u - 0.5);
            const frequency = baseFreq + freqVariation;
            
            // Create oscillators with more musical characteristics
            const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            
            osc1.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
            osc2.type = 'sine'; // Second oscillator always sine for smoother blend
            
            osc1.frequency.value = frequency;
            osc2.frequency.value = frequency * 1.01; // Slight detuning for richness
            
            // Add detune based on facet index
            const detune = (facetIndex * 7) % 100 - 50;
            osc1.detune.value = detune;
            
            // Create gain nodes for envelope
            const gain1 = this.audioContext.createGain();
            const gain2 = this.audioContext.createGain();
            
            gain1.gain.value = 0;
            gain2.gain.value = 0;
            
            // Connect everything
            osc1.connect(gain1);
            osc2.connect(gain2);
            
            gain1.connect(this.masterGain);
            gain2.connect(this.masterGain);
            
            // Apply envelope with shorter attack and release for responsiveness
            const now = this.audioContext.currentTime;
            const attackTime = 0.01;
            const releaseTime = 0.1;
            
            // Attack
            gain1.gain.linearRampToValueAtTime(0.15, now + attackTime);
            gain2.gain.linearRampToValueAtTime(0.05, now + attackTime);
            
            // Release
            gain1.gain.linearRampToValueAtTime(0, now + releaseTime);
            gain2.gain.linearRampToValueAtTime(0, now + releaseTime + 0.05);
            
            // Start and stop oscillators
            osc1.start(now);
            osc2.start(now);
            
            const stopTime = now + releaseTime + 0.1;
            osc1.stop(stopTime);
            osc2.stop(stopTime);
            
            // Track active notes for cleanup
            const noteModule = { oscillators: [osc1, osc2], gains: [gain1, gain2] };
            this.activeNotes.push(noteModule);
            
            // Clean up after note finishes
            setTimeout(() => {
                const index = this.activeNotes.indexOf(noteModule);
                if (index > -1) {
                    this.activeNotes.splice(index, 1);
                }
            }, (releaseTime + 0.2) * 1000);
            
            return noteModule;
        } catch (e) {
            console.error("Error playing facet sound:", e);
            return null;
        }
    }

    // Get the audio context
    getContext() {
        return this.audioContext;
    }
}

// Sound manager with improved error handling
const soundManager = {
    sounds: {},
    initialized: false,
    audioContext: null,
    soundSynth: null,
    masterGain: null,
    nodePool: null,
    scheduler: null,
    circuitBreaker: null,
    
    // Initialize all sounds
    init: function() {
        if (this.initialized) return true;
        
        console.log("Initializing sound manager with synthesized sounds...");
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Modern browsers require user interaction
            if (this.audioContext.state === 'suspended') {
                this.setupAutoplayHandler();
            }
            
            // Create sound synthesizer
            this.soundSynth = new SoundSynthesizer(this.audioContext);
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Lowered from 0.5
            this.masterGain.connect(this.audioContext.destination);
            
            // Create references for the synthesized sounds
            this.sounds = {
                hover: { type: 'synth', name: 'hover' },
                click: { type: 'special', name: 'click' },
                explosion: { type: 'special', name: 'explosion' },
                spike: { type: 'synth', name: 'spike' },
                rainbow: { type: 'special', name: 'rainbow' }
            };
            
            // Set up enhanced components from new architecture
            this.nodePool = new AudioNodePool(this.audioContext, 24);
            this.scheduler = new SoundScheduler(60);
            this.circuitBreaker = new AudioCircuitBreaker();
            
            // Initialize components
            if (typeof this.nodePool.initialize === 'function') {
                this.nodePool.initialize();
            }
            
            if (typeof this.scheduler.initialize === 'function') {
                this.scheduler.initialize();
            }
            
            if (typeof this.circuitBreaker.initialize === 'function') {
                this.circuitBreaker.initialize();
            }
            
            // Add event listener for page visibility changes
            document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            
            this.initialized = true;
            console.log("Sound manager initialized with synthesized sounds");
            
            return true;
        } catch (e) {
            console.error("Error initializing sound manager:", e);
            return false;
        }
    },
    
    // Handle autoplay restrictions
    setupAutoplayHandler: function() {
        const resumeAudio = async () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                    console.log('AudioContext resumed successfully');
                } catch (e) {
                    console.warn('Error resuming AudioContext:', e);
                }
            }
        };
        
        document.addEventListener('click', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
    },
    
    // Handle page visibility changes
    handleVisibilityChange: function() {
        if (document.visibilityState === 'hidden') {
            // Page is hidden, stop all sounds
            if (this.soundSynth) {
                this.soundSynth.stopAllSounds();
            }
        } else {
            // Page is visible again, resume audio context if needed
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(e => {
                    console.warn("Error resuming audio context:", e);
                });
            }
        }
    },
    
    // Play a sound using the synthesizer with error handling
    play: function(name, loop = false) {
        try {
            if (!this.initialized) this.init();
            if (!this.soundSynth) return;
            
            // Resume audio context if it's suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(e => {
                    console.warn("Error resuming audio context:", e);
                });
            }
            
            const sound = this.sounds[name];
            if (!sound) return;
            
            // Use the appropriate synthesizer method
            if (sound.type === 'special') {
                this.soundSynth.playSpecialSound(sound.name, loop);
                return;
            }
            
            // For synth sounds
            switch(sound.name) {
                case 'hover':
                    this.soundSynth.playWarmPad(440, 0.2);
                    break;
                case 'spike':
                    this.soundSynth.playWarmPad(330, 0.3);
                    break;
                default:
                    this.soundSynth.playClickSound();
            }
            
            // Record sound for circuit breaker
            if (this.scheduler && typeof this.scheduler.recordSoundPlayed === 'function') {
                this.scheduler.recordSoundPlayed();
            }
        } catch (e) {
            console.error("Error playing sound:", e);
            this.recordFailure();
        }
    },
    
    // Record a failure for the circuit breaker
    recordFailure: function() {
        if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
        }
    },
    
    // Get the audio context
    getContext: function() {
        if (!this.initialized) this.init();
        return this.audioContext;
    },
    
    // Enable/disable continuous sound mode
    setContinuousMode: function(enabled = true) {
        if (this.soundSynth) {
            this.soundSynth.enableContinuousMode(enabled);
        }
        
        if (this.scheduler && typeof this.scheduler.setContinuousMode === 'function') {
            this.scheduler.setContinuousMode(enabled);
        }
    },
    
    // Stop a sound
    stop: function(name) {
        try {
            if (!this.initialized || !this.soundSynth) return;
            
            const sound = this.sounds[name];
            if (!sound) return;
            
            if (sound.type === 'special') {
                this.soundSynth.stopSpecialSound(sound.name);
            }
        } catch (e) {
            console.error("Error stopping sound:", e);
        }
    },
    
    // Set master volume
    setVolume: function(volume) {
        if (!this.initialized || !this.masterGain) return;
        
        // Clamp volume between 0 and 1
        const safeVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.value = safeVolume;
    },
    
    // Get status info for debugging
    getStatus: function() {
        return {
            initialized: this.initialized,
            contextState: this.audioContext ? this.audioContext.state : 'unavailable',
            masterVolume: this.masterGain ? this.masterGain.gain.value : 0,
            continuousModeEnabled: this.soundSynth ? this.soundSynth.continuousModeEnabled : false
        };
    }
};

// Play tone based on position with better error handling
function playToneForPosition(app, x, y) {
    if (!app || !app.audioContext) return;
    
    try {
        // Simple fallback implementation if soundSynth isn't available or doesn't have the method
        if (!app.soundSynth || typeof app.soundSynth.playPositionSound !== 'function') {
            // Create a simple oscillator for a quick tone
            const osc = app.audioContext.createOscillator();
            const gain = app.audioContext.createGain();
            
            // Map x,y coordinates to frequency and volume
            const frequency = 220 + (x + 1) * (y + 1) * 110; // Range ~220-880Hz
            const volume = 0.1; // Keep it quiet
            
            // Set properties
            osc.frequency.value = frequency;
            gain.gain.value = volume;
            
            // Connect and play
            osc.connect(gain);
            gain.connect(app.audioContext.destination);
            
            osc.start();
            osc.stop(app.audioContext.currentTime + 0.1); // Short sound
            
            return; // Exit early after playing fallback
        }
        
        // If we reach here, soundSynth and method exist
        app.soundSynth.playPositionSound(x, y);
    } catch (e) {
        console.error("Error playing tone for position:", e);
    }
}

// Connect audio system to ball object
function connectAudioToBall(app, ball) {
    if (!app.soundManager) {
        // Initialize soundManager if it doesn't exist on app
        // Ensure initialization is robust
        if (!soundManager.initialized) {
            soundManager.init();
        }
        app.soundManager = soundManager; // Assign the global soundManager to the app instance
    } else if (!app.soundManager.initialized) {
        // If soundManager exists on app but isn't initialized
        app.soundManager.init();
    }

    // Make sure the ball has event handling capabilities
    if (!ball.addEventListener) {
        // Simple event system if not present
        ball.events = {};
        ball.addEventListener = function (event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
        };
        ball.emit = function (event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        };
    }

    // Add audio event listeners to the ball
    ball.addEventListener('facetHover', (data) => {
        // Check if soundSynth exists and has the continuousModeEnabled property
        if (app.soundManager?.soundSynth?.continuousModeEnabled) {
            // Ensure playFacetSound method exists before calling
            if (typeof app.soundManager.soundSynth.playFacetSound === 'function') {
                app.soundManager.soundSynth.playFacetSound(data.facet, data.position);
            } else {
                // Fallback or error if method is missing
                playFacetSound(app, data.facet, data.position); // Use the exported function as fallback
            }
        }
    });

    ball.addEventListener('click', () => {
        // Ensure soundManager and play method exist
        if (app.soundManager && typeof app.soundManager.play === 'function') {
            app.soundManager.play('click');
        } else {
            playClickSound(app); // Use the exported function as fallback
        }
    });

    // --- Add throttling for hover sound ---
    let lastHoverSoundTime = 0;
    const hoverSoundThrottle = 100; // Minimum ms between hover sounds

    ball.addEventListener('hover', () => {
        const now = performance.now();
        if (now - lastHoverSoundTime > hoverSoundThrottle) {
            // Ensure soundManager and play method exist
            if (app.soundManager && typeof app.soundManager.play === 'function') {
                app.soundManager.play('hover');
                lastHoverSoundTime = now;
            }
            // No explicit fallback needed here unless 'hover' sound is critical
        }
    });
    // --- End of throttling logic ---

    ball.addEventListener('modeChange', () => {
        // Ensure soundManager and play method exist
        if (app.soundManager && typeof app.soundManager.play === 'function') {
            app.soundManager.play('explosion');
        }
        // No explicit fallback needed here unless 'explosion' sound is critical
    });

    console.log('Audio system connected to ball');
    return ball; // Return ball for chaining or reference
}

// Register callbacks for the audio system
function registerCallbacks(newCallbacks) {
    Object.assign(callbacks, newCallbacks);
}

// Initialize the audio system
async function initializeAudio() {
    if (soundManager.initialized) return true;
    const success = soundManager.init();
    
    if (success && callbacks.onInitialized) {
        callbacks.onInitialized();
    } else if (!success && callbacks.onError) {
        callbacks.onError(new Error('Failed to initialize audio system'));
    }
    
    return success;
}

// Import ensureAudioInitialized from synthesizer.js
import { ensureAudioInitialized as initAudio, isInitialized } from './synthesis/synthesizer.js';

// Re-export for use in other modules
export const ensureAudioInitialized = initAudio;

// Debug audio system status
function debugAudioSystem(app) {
    console.group('Audio System Diagnostics');
    
    try {
        if (!app) {
            console.log('App object is missing');
            console.groupEnd();
            return;
        }
        
        // Check sound manager
        console.log('Sound Manager:', app.soundManager ? 'Available' : 'Missing');
        if (app.soundManager) {
            console.log('- Initialized:', !!app.soundManager.initialized);
            console.log('- Audio Context State:', app.soundManager.audioContext?.state || 'N/A');
            console.log('- Master Gain:', app.soundManager.masterGain?.gain?.value || 'N/A');
            console.log('- Continuous Mode:', !!app.soundManager.soundSynth?.continuousModeEnabled);
        }
        
        // Check circuit breaker
        if (app.soundManager?.circuitBreaker) {
            console.log('Circuit Breaker:');
            console.log('- Quality Level:', app.soundManager.circuitBreaker.getQualityLevel());
            console.log('- In Failure Mode:', app.soundManager.circuitBreaker.isInFailureMode());
        }
        
        // Check audio visualization
        if (app.scene?.userData?.audioVisualization) {
            console.log('Audio Visualization: Available');
        } else {
            console.log('Audio Visualization: Not set up');
        }
    } catch (e) {
        console.error('Error in audio diagnostics:', e);
    }
    
    console.groupEnd();
}

// Add these utility functions before the exports section

/**
 * Get the audio context
 * @returns {AudioContext} The audio context
 */
function getAudioContext() {
    return soundManager.getContext();
}

/**
 * Get the master gain node
 * @returns {GainNode} The master gain node
 */
function getMasterGain() {
    return soundManager.masterGain;
}

/**
 * Resume audio playback after user interaction
 * @returns {Promise<boolean>} Whether resume was successful
 */
async function resumeAudio() {
    try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            await ctx.resume();
            return true;
        }
        return ctx ? ctx.state === 'running' : false;
    } catch (e) {
        console.error('Error resuming audio:', e);
        return false;
    }
}

/**
 * Set master volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
function setMasterVolume(volume) {
    if (soundManager) {
        soundManager.setVolume(volume);
    }
}

/**
 * Get current audio system status
 * @returns {Object} Status information
 */
function getAudioStatus() {
    return soundManager ? soundManager.getStatus() : { initialized: false };
}

// Play a click sound with error handling
function playClickSound(app) {
    try {
        // Ensure soundManager is available and initialized on the app object
        if (!app.soundManager || !app.soundManager.initialized) {
            connectAudioToBall(app, {}); // Attempt to re-establish connection/initialization
            if (!app.soundManager || !app.soundManager.initialized) {
                 console.warn("Sound manager not ready for click sound.");
                 return; // Exit if still not ready
            }
        }

        // Ensure play method exists
        if (app.soundManager && typeof app.soundManager.play === 'function') {
            app.soundManager.play('click');
        } else {
            console.warn("play method missing on soundManager for click sound.");
            // Optional: Implement a direct fallback if necessary
        }
    } catch (e) {
        console.error("Error playing click sound:", e);
    }
}

// Play a release sound with error handling
function playReleaseSound(app) {
    try {
        // Ensure soundManager is available and initialized on the app object
        if (!app.soundManager || !app.soundManager.initialized) {
            connectAudioToBall(app, {}); // Attempt to re-establish connection/initialization
             if (!app.soundManager || !app.soundManager.initialized) {
                 console.warn("Sound manager not ready for release sound.");
                 return; // Exit if still not ready
            }
        }

        // Ensure play method exists
        if (app.soundManager && typeof app.soundManager.play === 'function') {
            // Use a different sound for release or create a dedicated one
            app.soundManager.play('hover'); // Using hover as fallback - consider a dedicated release sound
        } else {
             console.warn("play method missing on soundManager for release sound.");
             // Optional: Implement a direct fallback if necessary
        }
    } catch (e) {
        console.error("Error playing release sound:", e);
    }
}

// Play facet sound with enhanced parameters (with fallback)
function playFacetSound(app, facetIndex, position = { u: 0.5, v: 0.5 }) {
    try {
        // Ensure soundSynth is available on the app object
        if (!app.soundSynth && app.soundManager && app.soundManager.soundSynth) {
            app.soundSynth = app.soundManager.soundSynth;
        } else if (!app.soundSynth) {
            // Attempt to initialize audio if soundSynth is missing
             if (!app.soundManager || !app.soundManager.initialized) {
                connectAudioToBall(app, {}); // Attempt to re-establish connection/initialization
             }
             // Re-check if soundSynth became available
             if (app.soundManager && app.soundManager.soundSynth) {
                 app.soundSynth = app.soundManager.soundSynth;
             } else {
                 console.warn("Sound synth not available for facet sound.");
                 // Consider fallback sound here if needed, but currently handled below
             }
        }

        // If soundSynth is still not available or lacks the method, use a simple fallback
        if (!app.soundSynth || typeof app.soundSynth.playFacetSound !== 'function') {
            console.warn("Using fallback sound for facet."); // Log fallback usage
            // Check if we have direct audio context access
            const audioCtx = app.audioContext || (app.soundManager ? app.soundManager.getContext() : null);
            if (audioCtx) {
                // Create a simple sound based on facet index
                // ... existing fallback implementation ...
            } else {
                 console.warn("Audio context not available for fallback facet sound.");
            }
            return; // Exit early after attempting fallback
        }

        // If we reach here, soundSynth and method exist
        app.soundSynth.playFacetSound(facetIndex, position);

    } catch (e) {
        console.error("Error playing facet sound:", e);
        // Optionally record failure
        if(app.soundManager && typeof app.soundManager.recordFailure === 'function') {
            app.soundManager.recordFailure();
        }
    }
}

// Enhanced facet sound for better audio experience
function playEnhancedFacetSound(app, facet) {
    if (!app || !facet) return;

    try {
        // Ensure soundManager is available and initialized on the app object
        if (!app.soundManager || !app.soundManager.initialized) {
            connectAudioToBall(app, {}); // Attempt to re-establish connection/initialization
             if (!app.soundManager || !app.soundManager.initialized) {
                 console.warn("Sound manager not ready for enhanced facet sound.");
                 return; // Exit if still not ready
            }
        }
         // Ensure soundSynth is available
         if (!app.soundManager.soundSynth) {
             console.warn("Sound synth not available for enhanced facet sound.");
             return;
         }

        // Play with more customization if soundSynth has the method
        // ... existing implementation ...
            // Call either the enhanced method if available or the standard one
            if (typeof app.soundManager.soundSynth.playEnhancedFacetSound === 'function') {
                app.soundManager.soundSynth.playEnhancedFacetSound(facetIndex, position, object);
            } else if (typeof app.soundManager.soundSynth.playFacetSound === 'function') {
                app.soundManager.soundSynth.playFacetSound(facetIndex, position);
            } else {
                 console.warn("No suitable facet sound method found on soundSynth.");
                 // Use the exported function as a last resort fallback
                 playFacetSound(app, facetIndex, position);
            }
        // } // This closing brace seemed misplaced, removed. Check original logic if needed.
    } catch (e) {
        console.error("Error playing enhanced facet sound:", e);
         // Optionally record failure
        if(app.soundManager && typeof app.soundManager.recordFailure === 'function') {
            app.soundManager.recordFailure();
        }
    }
}

// Export all needed functions and variables
export {
    SoundSynthesizer,
    debugAudioSystem,
    connectAudioToBall,
    playToneForPosition,
    registerCallbacks,
    initializeAudio,
    soundManager,
    toggleAudioVisualization, 
    externalUpdateAudioVisualization as updateAudioVisualization,
    createAudioVisualization,
    // Add these exports to resolve import errors
    getAudioContext,
    getMasterGain,
    resumeAudio,
    setMasterVolume,
    getAudioStatus,
    // Add the missing exports
    playClickSound,
    playReleaseSound,
    playFacetSound,
    playEnhancedFacetSound
};
