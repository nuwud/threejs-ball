import * as THREE from 'three';

// Import additional modules from the new architecture
import { soundManager as externalSoundManager, getListener } from './playback/sound-manager.js';
import { toggleAudioVisualization, updateAudioVisualization as externalUpdateAudioVisualization, createAudioVisualization } from './visualization/audioVisualizor.js';
import { AudioNodePool } from '../fixes/utils/node-pool.js';
import { SoundScheduler } from './playback/scheduler.js';
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
        this.createReverb = function () {
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
        // Connect masterGain to compressor later, not directly to destination here

        // Create compressor with gentler settings to prevent audio cracking
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 20;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.01;
        this.compressor.release.value = 0.3;

        // Chain: masterGain -> compressor -> destination
        this.masterGain.connect(this.compressor);
        this.compressor.connect(audioContext.destination);

        // Use fewer effects to reduce processing load
        this.reverb = this.createReverb();
        // Chain: masterGain -> reverb -> destination (parallel to compressor)
        this.masterGain.connect(this.reverb);
        this.reverb.connect(audioContext.destination); // Reverb should also go to destination

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

    // ADDED initSpecialSounds method definition
    initSpecialSounds() {
        // Placeholder for initializing special sounds like click, explosion etc.
        // You might load audio buffers or define synthesis logic here.
        // Example using simple tones (similar to fallback):
        this.specialSounds = {
            click: { play: () => this.playTone(880, 0.1, 0.05) },
            explosion: { play: () => this.playTone(110, 0.5, 0.5) },
            rainbow: { play: () => this.playTone(660, 0.3, 0.4) },
            // Add other special sounds as needed
            // Add blackhole special sound - deep resonant bass
            blackhole: {
                play: () => {
                    // Deep bass frequency
                    const baseFreq = 40;
                    // Create the primary deep bass oscillator
                    this.playTone(baseFreq, 0.8, 3.0);
                    // Add a second oscillator with slight pitch variation for richness
                    setTimeout(() => this.playTone(baseFreq * 1.5, 0.4, 2.5), 50);
                    // Add a third oscillator for an eerie high harmonic
                    setTimeout(() => this.playTone(baseFreq * 6, 0.2, 2.0), 100);
                }
            }
        };
        console.log("Special sounds initialized in SoundSynthesizer");
    }

    // ADDED a simple playTone method for the initSpecialSounds example
    playTone(frequency, volume = 0.2, duration = 0.2) {
        try {
            if (!this.audioContext) return;
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(frequency, now);
            gain.gain.setValueAtTime(0, now);

            osc.connect(gain);
            gain.connect(this.masterGain); // Connect to the synth's master gain

            gain.gain.linearRampToValueAtTime(volume, now + 0.01);
            gain.gain.linearRampToValueAtTime(0, now + duration);

            osc.start(now);
            osc.stop(now + duration + 0.05); // Stop slightly after fade out

            // Basic cleanup
            setTimeout(() => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (e) {/* ignore */ }
            }, (duration + 0.1) * 1000);

        } catch (e) {
            console.error("Error playing tone in SoundSynthesizer:", e);
        }
    }

    // ADDED playSpecialSound method
    playSpecialSound(name, loop = false) { // Added loop parameter, though not used in this simple example
        if (this.specialSounds[name] && typeof this.specialSounds[name].play === 'function') {
            this.specialSounds[name].play();
        } else {
            console.warn(`Special sound "${name}" not found or not playable.`);
            // Fallback to a generic click sound
            this.playTone(500, 0.1, 0.1);
        }
    }

    // ADDED stopSpecialSound method (basic placeholder)
    stopSpecialSound(name) {
        // Implementation depends heavily on how sounds are played (e.g., stopping loops)
        console.log(`Stopping special sound: ${name} (implementation needed)`);
    }

    // ADDED setupAudioWatchdog method (basic placeholder)
    setupAudioWatchdog() {
        // Periodically check if audio context is running, etc.
        console.log("Audio watchdog setup (implementation needed)");
    }

    // ADDED stopAllSounds method (basic placeholder)
    stopAllSounds() {
        // Stop all active oscillators, scheduled sounds, etc.
        console.log("Stopping all sounds (implementation needed)");
        // Example: Disconnect master gain to mute everything quickly
        // this.masterGain.disconnect();
        // Note: Proper implementation requires tracking and stopping individual nodes.
    }

    // ADDED playWarmPad method (basic placeholder for synth sounds)
    playWarmPad(frequency, volume) {
        console.log(`Playing warm pad: freq=${frequency}, vol=${volume} (implementation needed)`);
        // Example: Play a simple tone as placeholder
        this.playTone(frequency, volume * 0.5, 0.5); // Adjust volume/duration as needed
    }

    // ADDED playClickSound method (basic placeholder for synth sounds)
    playClickSound() {
        console.log(`Playing click sound (implementation needed)`);
        // Example: Play a simple tone as placeholder
        this.playTone(880, 0.15, 0.1);
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
    init: function () {
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
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);

            // Create references for the synthesized sounds
            this.sounds = {
                hover: { type: 'synth', name: 'hover' },
                click: { type: 'special', name: 'click' },
                explosion: { type: 'special', name: 'explosion' },
                spike: { type: 'synth', name: 'spike' },
                rainbow: { type: 'special', name: 'rainbow' },
                blackhole: { type: 'special', name: 'blackhole' } // Add this line
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
    setupAutoplayHandler: function () {
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
    handleVisibilityChange: function () {
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
    play: function (name, loop = false) {
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
            switch (sound.name) {
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
    recordFailure: function () {
        if (this.circuitBreaker) {
            this.circuitBreaker.recordFailure();
        }
    },

    // Get the audio context
    getContext: function () {
        if (!this.initialized) this.init();
        return this.audioContext;
    },

    // Enable/disable continuous sound mode
    setContinuousMode: function (enabled = true) {
        if (this.soundSynth) {
            this.soundSynth.enableContinuousMode(enabled);
        }

        if (this.scheduler && typeof this.scheduler.setContinuousMode === 'function') {
            this.scheduler.setContinuousMode(enabled);
        }
    },

    // Stop a sound
    stop: function (name) {
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
    setVolume: function (volume) {
        if (!this.initialized || !this.masterGain) return;

        // Clamp volume between 0 and 1
        const safeVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.value = safeVolume;
    },

    // Get status info for debugging
    getStatus: function () {
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
        soundManager.init();
        app.soundManager = soundManager;
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
        if (app.soundManager.soundSynth.continuousModeEnabled) {
            app.soundManager.soundSynth.playFacetSound(data.facet, data.position);
        }
    });

    ball.addEventListener('click', () => {
        app.soundManager.play('click');
    });

    ball.addEventListener('hover', () => {
        app.soundManager.play('hover');
    });

    ball.addEventListener('modeChange', () => {
        app.soundManager.play('explosion');
    });

    console.log('Audio system connected to ball');
    return ball;
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
        if (!app.soundManager) {
            if (!soundManager.initialized) {
                soundManager.init();
            }
            app.soundManager = soundManager;
        }

        app.soundManager.play('click');
    } catch (e) {
        console.error("Error playing click sound:", e);
    }
}

// Play a release sound with error handling
function playReleaseSound(app) {
    try {
        if (!app.soundManager) {
            if (!soundManager.initialized) {
                soundManager.init();
            }
            app.soundManager = soundManager;
        }

        // Use a different sound for release or create a dedicated one
        app.soundManager.play('hover'); // Using hover as fallback
    } catch (e) {
        console.error("Error playing release sound:", e);
    }
}

// Play facet sound with enhanced parameters (with fallback)
function playFacetSound(app, facetIndex, position = { u: 0.5, v: 0.5 }) {
    try {
        if (!app.soundSynth && app.soundManager && app.soundManager.soundSynth) {
            app.soundSynth = app.soundManager.soundSynth;
        } else if (!app.soundSynth) {
            ensureAudioInitialized(app);
        }

        // If soundSynth is still not available, use a simple fallback
        if (!app.soundSynth || typeof app.soundSynth.playFacetSound !== 'function') {
            // Check if we have direct audio context access
            if (app.audioContext) {
                // Create a simple sound based on facet index
                const osc = app.audioContext.createOscillator();
                const gain = app.audioContext.createGain();

                // Map facet index to sound properties
                const baseFreq = 220;
                const frequency = baseFreq + (facetIndex % 12) * 20;
                const volume = 0.05; // Very quiet

                // Set properties
                osc.frequency.value = frequency;
                gain.gain.value = volume;

                // Connect and play
                osc.connect(gain);
                gain.connect(app.audioContext.destination);

                osc.start();
                osc.stop(app.audioContext.currentTime + 0.05); // Very short sound
            }
            return; // Exit early after playing fallback
        }

        // If we reach here, soundSynth and method exist
        if (app.soundSynth && typeof app.soundSynth.playFacetSound === 'function') {
            app.soundSynth.playFacetSound(facetIndex, position);
        }
    } catch (e) {
        console.error("Error playing facet sound:", e);
    }
}

// Enhanced facet sound for better audio experience
function playEnhancedFacetSound(app, facet) {
    if (!app || !facet) return;

    try {
        if (!app.soundManager) {
            soundManager.init();
            app.soundManager = soundManager;
        }

        // Play with more customization if soundSynth has the method
        if (app.soundManager.soundSynth) {
            // Pass the facet index and additional parameters
            const facetIndex = facet.index || 0;
            const object = facet.object || null;

            // Position can be random if not provided
            const position = {
                u: Math.random(),
                v: Math.random()
            };

            // Call either the enhanced method if available or the standard one
            if (typeof app.soundManager.soundSynth.playEnhancedFacetSound === 'function') {
                app.soundManager.soundSynth.playEnhancedFacetSound(facetIndex, position, object);
            } else if (typeof app.soundManager.soundSynth.playFacetSound === 'function') {
                app.soundManager.soundSynth.playFacetSound(facetIndex, position);
            }
        }
    } catch (e) {
        console.error("Error playing enhanced facet sound:", e);
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

/**
 * Audio core module - Provides fallback functions and fixes for audio
 */

// Ensure audio context is available
let audioContext = null;

/**
 * Gets or creates an audio context
 */
if (typeof getAudioContext !== 'function') {
    function getAudioContext() {
        if (!audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                console.log("Audio context created");
            } catch (error) {
                console.error("Could not create audio context:", error);
            }
        }

        // Ensure running state
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(err => {
                console.warn("Failed to resume audio context:", err);
            });
        }

        return audioContext;
    }
}
/**
 * SoundSynthesizer fallback implementation
 */
export class FallbackSoundSynthesizer {
    constructor(context) {
        this.context = context || getAudioContext();

        // Create master gain
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.context.destination);

        // Create lookup table for tones
        this.tones = {};

        // Initialize special sounds
        this.initSpecialSounds();

        console.log("Sound synthesizer fallback initialized");
    }

    /**
     * Initialize special sounds used for UI effects
     */
    initSpecialSounds() {
        // Create minimal special sounds
        this.specialSounds = {
            hover: {
                trigger: () => this.playTone(300, 0.1, 0.3),
                triggerRelease: () => { }
            },
            click: {
                trigger: () => this.playTone(500, 0.1, 0.2),
                triggerRelease: () => { }
            },
            release: {
                trigger: () => this.playTone(200, 0.1, 0.3),
                triggerRelease: () => { }
            }
        };

        console.log("Special sounds initialized (fallback)");
        return this.specialSounds;
    }

    /**
     * Play a simple tone
     */
    playTone(frequency, volume = 0.2, duration = 0.2) {
        try {
            if (!this.context) return;

            const oscillator = this.context.createOscillator();
            const gainNode = this.context.createGain();

            // Configure
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.value = 0;

            // Connect
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Envelope
            const now = this.context.currentTime;
            oscillator.start(now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);

            // Cleanup
            setTimeout(() => {
                try {
                    oscillator.stop();
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, duration * 1000 + 50);

            return true;
        } catch (error) {
            console.error("Error playing tone:", error);
            return false;
        }
    }

    /**
     * Play a sound based on facet
     */
    playFacetSound(app, facetIndex, position = null) {
        const pos = position || { u: 0.5, v: 0.5 };
        const baseFreq = 220 + (facetIndex % 12) * 50;
        const freqVariation = 30 * (pos.u - 0.5);
        const frequency = baseFreq + freqVariation;

        return this.playTone(frequency, 0.2, 0.3);
    }

    /**
     * Play a sound based on position
     */
    playToneForPosition(app, x, y) {
        // Map x to frequency
        const normX = (x + 1) / 2;
        const frequency = 220 + normX * 660;

        // Map y to volume
        const normY = (y + 1) / 2;
        const volume = 0.1 + normY * 0.15;

        return this.playTone(frequency, volume, 0.2);
    }
}

/**
 * Get or create a sound synthesizer
 */
export function getSynthesizer(app) {
    if (!app) app = window.app || {};

    if (!app.soundSynth) {
        app.soundSynth = new SoundSynthesizer(getAudioContext());
        console.log("Created new sound synthesizer");
    }

    return app.soundSynth;
}

/**
 * Play a facet sound with the synthesizer
 */
export function simpleFacetSound(app, facetIndex, position = null) {
    const synth = getSynthesizer(app);
    return synth.playFacetSound(app, facetIndex, position);
}

// Removed duplicate declaration of playToneForPosition

// Make functions available globally
window.getAudioContext = getAudioContext;
window.SoundSynthesizer = SoundSynthesizer;
window.getSynthesizer = getSynthesizer;
window.playFacetSound = playFacetSound;
window.simpleFacetSound = simpleFacetSound;
window.playToneForPosition = playToneForPosition;

export async function setupAudio(app) { // Assuming it takes app
    console.log("🔊 Starting audio init...");
    console.log("🔍 App object received:", app); // Check if app object is valid

    if (app.audioInitialized) {
        console.warn("🔊 Audio already initialized, skipping setup.");
        return true; // Or return existing context/functions if needed
    }

    try {
        // Check if AudioContext is available
        if (!window.AudioContext && !window.webkitAudioContext) {
            console.error("❌ AudioContext not supported in this browser.");
            return false;
        }
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        console.log("🔊 AudioContext created. Initial state:", audioContext.state);

        // Attempt to resume context (required after user interaction)
        if (audioContext.state === 'suspended') {
            console.log("🔊 AudioContext suspended, attempting resume...");
            await audioContext.resume();
            console.log("🔊 AudioContext resumed. Current state:", audioContext.state);
        }

        // Define core audio functions (Example: playFacetSound)
        // Make sure this function is correctly defined and accessible
        const playFacetSound = (...args) => {
            // Check if muted globally
            if (window.debugToggles?.mute) {
                if (window.debugToggles?.verbose) console.log("🔇 Sound muted via debug toggle.");
                return;
            }
            console.log("🎵 playFacetSound called with:", args);
            // Actual sound playing logic using audioContext or synth...
            // Example: app.soundSynth?.playNote(...);
        };
        console.log("🔊 playFacetSound function defined.");

        // Assign to app object *only after successful setup*
        app.audioContext = audioContext;
        app.playFacetSound = playFacetSound; // Ensure this matches what envelope-fix checks
        app.audioInitialized = true; // Set the flag
        console.log("✅ Audio components assigned to app object.");
        console.log("🔊 Audio Init successful.");
        return true;

    } catch (err) {
        console.error("❌ Audio init failed:", err);
        // Ensure properties are nullified on failure
        app.audioContext = null;
        app.playFacetSound = null;
        app.audioInitialized = false;
        return false;
    }
}
