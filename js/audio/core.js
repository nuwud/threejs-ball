/**
 * core.js
 * Core audio system functionality for the Three.js Interactive Ball
 * Handles AudioContext initialization and management
 * MODIFIED: Removed throttling for continuous audio experience
 */

import { AudioNodePool } from './audio-node-pool.js';
import { SoundScheduler } from './sound-scheduler.js';
import { AudioCircuitBreaker } from './audio-circuit-breaker.js';
import { initializeSoundBuffers } from './sound-buffers.js';
import * as THREE from 'three';

// Core audio context and management
let audioContext = null;
let initialized = false;
let masterGain = null;

// Audio system components
let nodePool = null;
let soundScheduler = null;
let circuitBreaker = null;

// Event callbacks
const callbacks = {
    onInitialized: null,
    onError: null,
    onQualityChanged: null
};

/**
 * Register event callbacks
 * @param {Object} newCallbacks - Callback functions
 */
export function registerCallbacks(newCallbacks) {
    Object.assign(callbacks, newCallbacks);
}

/**
 * Initialize the audio system
 * Returns a promise that resolves when audio is ready
 */
export async function initializeAudio() {
    if (initialized) return true;

    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Modern browsers require user interaction to start audio
        if (audioContext.state === 'suspended') {
            console.log('Audio is suspended, waiting for user interaction');

            const resumeAudio = async () => {
                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }
            };

            document.addEventListener('click', resumeAudio);
            document.addEventListener('touchstart', resumeAudio);
        }

        // Create master gain node
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.8; // Default volume at 80%
        masterGain.connect(audioContext.destination);

        // Initialize audio system components
        nodePool = new AudioNodePool(audioContext, 24);
        soundScheduler = new SoundScheduler(60); // Increased for continuous sound
        circuitBreaker = new AudioCircuitBreaker();

        // Initialize each component
        if (typeof nodePool.initialize === 'function') {
            nodePool.initialize();
        }

        if (typeof soundScheduler.initialize === 'function') {
            soundScheduler.initialize();
        }

        if (typeof circuitBreaker.initialize === 'function') {
            circuitBreaker.initialize();
        }

        // Set up quality change handling
        circuitBreaker.registerCallbacks({
            onQualityChange: (quality) => {
                console.log(`Audio quality changed to: ${quality}`);

                // Update sound scheduler based on quality level, but keep high numbers
                if (quality === 'high') {
                    soundScheduler.maxSoundsPerSecond = 60;
                } else if (quality === 'medium') {
                    soundScheduler.maxSoundsPerSecond = 40;
                } else {
                    soundScheduler.maxSoundsPerSecond = 30;
                }

                // Trigger callback if registered
                if (callbacks.onQualityChanged) {
                    callbacks.onQualityChanged(quality);
                }
            }
        });

        initialized = true;
        console.log('Audio system initialized successfully');

        if (callbacks.onInitialized) {
            callbacks.onInitialized();
        }

        return true;
    } catch (error) {
        console.error('Failed to initialize audio system:', error);
        initialized = false;

        if (callbacks.onError) {
            callbacks.onError(error);
        }

        return false;
    }
}

/**
 * Clean up audio resources
 * Call when shutting down the application
 */
export function disposeAudio() {
    if (!initialized) return;

    try {
        // Clean up components
        if (soundScheduler && typeof soundScheduler.dispose === 'function') {
            soundScheduler.dispose();
        }

        if (nodePool && typeof nodePool.releaseAll === 'function') {
            nodePool.releaseAll();
        }

        // Disconnect master gain
        if (masterGain) {
            masterGain.disconnect();
        }

        // Close audio context
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }

        // Reset state
        audioContext = null;
        masterGain = null;
        nodePool = null;
        soundScheduler = null;
        circuitBreaker = null;
        initialized = false;

        console.log('Audio system resources released');
    } catch (error) {
        console.error('Error disposing audio system:', error);
    }
}

/**
 * Get the audio context
 * @returns {AudioContext|null} The audio context or null if not initialized
 */
export function getAudioContext() {
    return audioContext;
}

/**
 * Get the master gain node
 * @returns {GainNode|null} The master gain node or null if not initialized
 */
export function getMasterGain() {
    return masterGain;
}

/**
 * Get the node pool
 * @returns {AudioNodePool|null} The node pool or null if not initialized
 */
export function getNodePool() {
    return nodePool;
}

/**
 * Get the sound scheduler
 * @returns {SoundScheduler|null} The sound scheduler or null if not initialized
 */
export function getSoundScheduler() {
    return soundScheduler;
}

/**
 * Get the circuit breaker
 * @returns {AudioCircuitBreaker|null} The circuit breaker or null if not initialized
 */
export function getCircuitBreaker() {
    return circuitBreaker;
}

/**
 * Check if audio system is initialized
 * @returns {boolean} Whether the audio system is initialized
 */
export function isInitialized() {
    return initialized;
}

/**
 * Ensures audio is initialized before using audio functions
 * @param {Object} app - Application context
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
export async function ensureAudioInitialized(app) {
    if (!initialized) {
        const success = await initializeAudio();

        // Store audio context reference in app for convenience
        if (success && app) {
            app.audioContext = audioContext;
        }

        return success;
    }
    return true;
}

/**
 * Play a tone based on x,y position
 * @param {Object} app - Application context
 * @param {number} x - X coordinate (-1 to 1)
 * @param {number} y - Y coordinate (-1 to 1)
 */
export function playToneForPosition(app, x, y) {
    if (!app.soundManager || !app.soundManager.initialized) {
        soundManager.init();
        app.soundManager = soundManager;
    }

    const audioContext = app.soundManager.getContext();

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Create oscillator
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Map x,y position to audio parameters
    // Normalize x,y from -1,1 to 0,1 range
    const normX = (x + 1) / 2;
    const normY = (y + 1) / 2;

    // Map x to frequency (220Hz to 880Hz)
    const frequency = 220 + normX * 660;

    // Map y to volume (0.1 to 0.4)
    const volume = 0.1 + normY * 0.3;

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Smooth attack and release for continuous sound
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    // Connect and play
    oscillator.connect(gain);
    gain.connect(app.soundManager.masterGain);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);

    // Record for continuous mode
    app.lastTonePosition = { x, y };
}

/**
 * Play a facet sound when a facet is touched
 * @param {Object} app - Application context
 * @param {number} facetIndex - Index of the facet
 * @param {Object} position - Optional normalized position within facet
 */
export function playFacetSound(app, facetIndex, position = null) {
    if (!initialized) return;

    try {
        // Get normalized position (default to center)
        const pos = position || { u: 0.5, v: 0.5 };

        // Use facet index to select different sound characteristics
        const baseFreq = 220 + (facetIndex % 12) * 50;

        // Vary frequency based on position within facet (subtle variation)
        const freqVariation = 30 * (pos.u - 0.5); // +/- 15 Hz based on horizontal position

        // Calculate final frequency including variation
        const frequency = baseFreq + freqVariation;

        // Removed throttling check for continuous audio

        // Always create a new oscillator for each sound
        const oscillatorNode = audioContext.createOscillator();
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

        // Connect nodes
        oscillatorNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start with zero gain to avoid clicks
        gainNode.gain.value = 0;

        // Start the oscillator
        oscillatorNode.start();

        // Envelope shape - SHORTER duration for more responsive sound
        const now = audioContext.currentTime;

        // Faster attack (5ms)
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.005);

        // Shorter sustain (50ms)
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);

        // Quick release (50ms)
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);

        // Shorter timeout for cleanup (150ms)
        setTimeout(() => {
            try {
                oscillatorNode.stop();
                oscillatorNode.disconnect();
                gainNode.disconnect();
                nodePool.release(gainNode);
            } catch (e) {
                console.warn('Error in audio cleanup:', e);
            }
        }, 150);

        // Record successful sound trigger with facet index
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed(facetIndex);
        }
    } catch (error) {
        console.error('Error playing facet sound:', error);
        recordAudioFailure();
    }
}

/**
 * Enhanced facet sound with more musical characteristics
 * @param {Object} app - Application context
 * @param {number} frequency - Base frequency for the note
 * @param {number} harmonicContent - Amount of harmonic content (1-4)
 * @param {number} release - Release time in seconds
 */
export function playEnhancedFacetSound(app, frequency, harmonicContent, release) {
    if (!app.audioContext) return;

    // Create oscillator for the main tone
    const oscillator = app.audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Create gain node for envelope
    const gainNode = app.audioContext.createGain();
    gainNode.gain.value = 0.3; // Lower volume for pleasant sound

    // Connect oscillator to gain
    oscillator.connect(gainNode);

    // Add harmonic content for richer sound
    const harmonics = [];
    for (let i = 1; i <= harmonicContent; i++) {
        const harmonic = app.audioContext.createOscillator();
        const harmonicGain = app.audioContext.createGain();

        // Higher harmonics have less volume
        harmonicGain.gain.value = 0.1 / i;

        // Set harmonic frequency
        harmonic.frequency.value = frequency * (i + 1);

        // Connect harmonic oscillator to its gain node
        harmonic.connect(harmonicGain);

        // Connect to main gain node
        harmonicGain.connect(gainNode);

        // Start harmonic oscillator
        harmonic.start();

        // Store for later stopping
        harmonics.push({
            oscillator: harmonic,
            gain: harmonicGain
        });
    }

    // Add slight detuning for richer sound
    oscillator.detune.value = Math.random() * 10 - 5;

    // Connect to reverb if available
    if (app.reverbNode) {
        const dryWetMix = app.audioContext.createGain();
        dryWetMix.gain.value = 0.3; // 30% wet signal
        gainNode.connect(dryWetMix);
        dryWetMix.connect(app.reverbNode);
        app.reverbNode.connect(app.audioContext.destination);
    }

    // Connect to destination
    gainNode.connect(app.audioContext.destination);

    // Start oscillator
    oscillator.start();

    // Apply envelope for pleasant sound
    gainNode.gain.setValueAtTime(0, app.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, app.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, app.audioContext.currentTime + release);

    // Stop oscillator after release
    oscillator.stop(app.audioContext.currentTime + release + 0.1);

    // Stop harmonics
    harmonics.forEach(h => {
        h.oscillator.stop(app.audioContext.currentTime + release + 0.1);
    });

    // Emit audio event for visualization
    app.ballGroup.emit('audioPlayed', {
        frequency,
        intensity: harmonicContent / 4,
        duration: release
    });
}

/**
 * Play a sound when clicking
 * @param {Object} app - Application context
 */
export function playClickSound(app) {
    if (!initialized) return;

    try {
        // Removed throttling check for continuous audio

        // Always create a new oscillator (don't reuse from pool)
        const oscillatorNode = audioContext.createOscillator();
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

        // Connect nodes
        oscillatorNode.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Click envelope
        gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.005);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

        // Pitch drop for click effect
        oscillatorNode.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.1);

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
            soundScheduler.recordSoundPlayed();
        }
    } catch (error) {
        console.error('Error playing click sound:', error);
        recordAudioFailure();
    }
}

/**
 * Play a sound when releasing
 * @param {Object} app - Application context
 */
export function playReleaseSound(app) {
    if (!initialized) return;

    try {
        // Removed throttling check for continuous audio

        // Always create a new oscillator (don't reuse from pool)
        const oscillatorNode = audioContext.createOscillator();
        const gainNode = nodePool.acquire('gain');

        if (!gainNode) {
            console.warn('Could not acquire audio nodes for release sound');
            return;
        }

        // Configure nodes
        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.value = 440;

        gainNode.gain.value = 0;

        // Connect nodes
        oscillatorNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Release envelope - shorter and lighter than click
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.08);

        // Pitch rise for release effect
        oscillatorNode.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.08);

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
            soundScheduler.recordSoundPlayed();
        }
    } catch (error) {
        console.error('Error playing release sound:', error);
        recordAudioFailure();
    }
}

/**
 * Record a failure in the audio system
 * Will trigger the circuit breaker to degrade quality if needed
 */
export function recordAudioFailure() {
    if (circuitBreaker) {
        circuitBreaker.recordFailure();
    }
}

/**
 * Suspend audio processing (for example when tab is not visible)
 */
export function suspendAudio() {
    if (audioContext && audioContext.state === 'running') {
        audioContext.suspend();
    }
}

/**
 * Resume audio processing
 */
export function resumeAudio() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

/**
 * Get audio system status - MERGED IMPLEMENTATION (combines both versions)
 * @param {Object} [app] - Optional application context
 * @returns {Object} Status information about the audio system
 */
export function getAudioStatus(app) {
    // If called with app parameter, return app-specific status
    if (app) {
        if (!app.soundManager) return { initialized: false };

        return {
            initialized: app.soundManager.initialized,
            contextState: app.soundManager.audioContext?.state,
            volume: app.soundManager.masterGain?.gain.value,
            continuousModeEnabled: app.continuousSoundEnabled,
            visualizationEnabled: app.audioVisualization?.enabled
        };
    }

    // Otherwise return global audio system status
    if (!initialized) {
        return { initialized: false };
    }

    return {
        initialized: true,
        audioContextState: audioContext ? audioContext.state : 'unavailable',
        audioContextSampleRate: audioContext ? audioContext.sampleRate : 0,
        masterVolume: masterGain ? masterGain.gain.value : 0,
        activeNodes: nodePool ? nodePool.getActiveCount() : 0,
        qualityLevel: circuitBreaker ? circuitBreaker.getQualityLevel() : 'unknown',
        soundsPerSecond: soundScheduler ? soundScheduler.getStatus().maxSoundsPerSecond : 0,
        inFailureMode: circuitBreaker ? circuitBreaker.isInFailureMode() : false
    };
}

/**
 * Function to initialize continuous mode for fluid audio experiences
 * @param {Object} app - Application context
 */
export function enableContinuousSoundMode(app) {
    try {
        // Get sound scheduler
        const soundScheduler = app.soundScheduler ||
            (window.audioSystem && window.audioSystem.soundScheduler) ||
            getSoundScheduler();

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
            (window.audioSystem && window.audioSystem.circuitBreaker) ||
            getCircuitBreaker();

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
 * Create a noise generator
 * @param {AudioContext} context - The audio context
 * @returns {AudioBufferSourceNode} - The noise generator
 */
export function createNoiseGenerator(context) {
    const audioCtx = context || audioContext;
    if (!audioCtx) return null;

    // Create audio buffer for noise
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Fill the buffer with noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    // Create buffer source
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.start();

    return noise;
}

// Create a listener for positional audio
let listener = null;

/**
 * Get or create a THREE.AudioListener
 * @returns {THREE.AudioListener} The audio listener
 */
export function getListener() {
    if (!listener && typeof THREE !== 'undefined') {
        listener = new THREE.AudioListener();
    }
    return listener;
}

/**
 * Sound manager for handling 3D sound effects
 */
export const soundManager = {
    initialized: false,
    sounds: {},
    
    // Audio context and master gain node
    audioContext: null,
    masterGain: null,

    // Get the audio context
    getContext: function() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain if not exists
            if (!this.masterGain) {
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.value = 0.7; // 70% volume
                this.masterGain.connect(this.audioContext.destination);
            }
        }
        return this.audioContext;
    },

    // Initialize all sounds
    init: function () {
        if (this.initialized) return;
        
        console.log("Initializing sound manager...");
        
        try {
            // Get or create listener
            if (!listener) getListener();
            
            // Get audio context
            this.getContext();
            
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(err => {
                    console.warn("Couldn't resume audio context:", err);
                });
            }

            // Instead of using non-existent external URLs, let's generate sounds procedurally
            this.initialized = true;
            console.log("Sound manager initialized without external sound files");
            
            return;
            
            // The following code is kept for reference but will never execute
            // Create sound effects
            this.createSound('hover', 'https://assets.codepen.io/729648/hover.mp3');
            this.createSound('click', 'https://assets.codepen.io/729648/click.mp3');
            this.createSound('explosion', 'https://assets.codepen.io/729648/explosion.mp3');
            this.createSound('spike', 'https://assets.codepen.io/729648/spike.mp3');
            this.createSound('rainbow', 'https://assets.codepen.io/729648/rainbow.mp3');
            this.createSound('blackhole', 'https://assets.codepen.io/729648/blackhole.mp3');
            this.createSound('magnetic', 'https://assets.codepen.io/729648/magnetic.mp3');

            // Create positional sounds (these will come from the ball's location)
            this.createPositionalSound('deform', 'https://assets.codepen.io/729648/deform.mp3');
            
            this.initialized = true;
            console.log("Sound manager initialized successfully");
        } catch (error) {
            console.error("Failed to initialize sound manager:", error);
        }
    },

    // Create a global sound - add error handling
    createSound: function (name, url) {
        if (!listener) getListener();
        const sound = new THREE.Audio(listener);

        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        
        // Add error handling for loading
        audioLoader.load(
            url, 
            // Success callback
            function (buffer) {
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
                console.log(`Sound '${name}' loaded successfully`);
            },
            // Progress callback
            function (xhr) {
                // Progress info if needed
            },
            // Error callback
            function (error) {
                console.warn(`Could not load sound '${name}' from ${url}:`, error);
                // Create a simple procedural sound as fallback
                if (name === 'click') {
                    createProceduralClickSound(name, sound);
                } else if (name === 'hover') {
                    createProceduralHoverSound(name, sound);
                } else {
                    createProceduralGenericSound(name, sound);
                }
            }
        );

        this.sounds[name] = sound;
    },

    // Create a positional sound
    createPositionalSound: function (name, url) {
        if (!listener) getListener();
        const sound = new THREE.PositionalAudio(listener);

        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function (buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // The distance at which the volume reduction starts
            sound.setVolume(0.5);
        });

        this.sounds[name] = sound;
    },

    // Play a sound with error handling
    play: function (name, loop = false) {
        const sound = this.sounds[name];
        if (sound) {
            if (sound.buffer) {
                // Don't restart if it's already playing
                if (!sound.isPlaying) {
                    sound.setLoop(loop);
                    sound.play();
                }
            } else {
                // If buffer isn't loaded yet, use fallback method
                this.playFallbackSound(name, loop);
            }
        } else {
            console.warn(`Sound '${name}' not found, using fallback`);
            this.playFallbackSound(name, loop);
        }
    },
    
    // Play a fallback sound if the main one isn't available
    playFallbackSound: function(name, loop = false) {
        if (!this.audioContext) this.getContext();
        
        // Create a basic oscillator sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Configure based on sound type
        switch(name) {
            case 'click':
                oscillator.type = 'square';
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
                break;
                
            case 'hover':
                oscillator.type = 'sine';
                oscillator.frequency.value = 300;
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
                break;
                
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 100;
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
                break;
                
            default:
                oscillator.type = 'triangle';
                oscillator.frequency.value = 250;
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        }
        
        // Connect and play
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + (loop ? 2 : 0.5));
        
        // If loop is requested, create a self-repeating sound
        if (loop) {
            // For looping, recursively call this function with a delay
            setTimeout(() => {
                if (this.sounds[name] && !this.sounds[name].buffer) {
                    this.playFallbackSound(name, loop);
                }
            }, 1800); // Slightly less than 2 seconds to avoid gaps
        }
    },

    // Stop a sound
    stop: function (name) {
        const sound = this.sounds[name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    },

    // Attach a positional sound to an object
    attachToObject: function (name, object) {
        const sound = this.sounds[name];
        if (sound && !object.children.includes(sound)) {
            object.add(sound);
        }
    },

    // Set the frequency of an oscillator
    setFrequency: function (name, value) {
        const sound = this.sounds[name];
        if (sound && sound.source && sound.source.frequency) {
            sound.source.frequency.value = value;
        }
    }
};

// Helper functions to create procedural sounds
function createProceduralClickSound(name, sound) {
    if (!sound.context) return;
    
    // Create a buffer for a click sound
    const sampleRate = sound.context.sampleRate;
    const buffer = sound.context.createBuffer(1, sampleRate * 0.2, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Create a clicking sound - short sharp attack, quick decay
    for (let i = 0; i < buffer.length; i++) {
        // Initial click
        if (i < sampleRate * 0.01) {
            channelData[i] = Math.random() * 0.5;
        } else {
            // Rapid decay
            channelData[i] = Math.random() * 0.5 * Math.exp(-i / (sampleRate * 0.02));
        }
    }
    
    sound.setBuffer(buffer);
    console.log(`Procedural sound created for '${name}'`);
}

function createProceduralHoverSound(name, sound) {
    if (!sound.context) return;
    
    // Create a buffer for a hover sound
    const sampleRate = sound.context.sampleRate;
    const buffer = sound.context.createBuffer(1, sampleRate * 0.3, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Create a gentle hover sound - soft sine wave with modulation
    const frequency = 300; // Hz
    for (let i = 0; i < buffer.length; i++) {
        // Sine wave with gentle envelope
        const envelope = Math.min(1, i / (sampleRate * 0.05)) * Math.exp(-i / (sampleRate * 0.2));
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3 * envelope;
        
        // Add slight modulation
        channelData[i] += Math.sin(2 * Math.PI * (frequency + 5) * i / sampleRate) * 0.1 * envelope;
    }
    
    sound.setBuffer(buffer);
    console.log(`Procedural sound created for '${name}'`);
}

function createProceduralGenericSound(name, sound) {
    if (!sound.context) return;
    
    // Create a buffer for a generic sound
    const sampleRate = sound.context.sampleRate;
    const buffer = sound.context.createBuffer(1, sampleRate * 0.5, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Determine characteristics based on name
    let frequency = 220; // Default base frequency
    let waveType = 0; // 0 = sine, 1 = saw, 2 = noise
    
    // Customize per effect name
    switch(name) {
        case 'explosion':
            waveType = 2; // noise
            break;
        case 'blackhole':
            frequency = 80;
            waveType = 1; // saw
            break;
        case 'magnetic':
            frequency = 350;
            break;
        case 'rainbow':
            frequency = 440;
            // Create a rainbow-like sound with multiple frequencies
            for (let i = 0; i < buffer.length; i++) {
                const time = i / sampleRate;
                const envelope = Math.min(1, i / (sampleRate * 0.1)) * Math.exp(-i / (sampleRate * 0.3));
                
                // Multiple frequencies with changing phase
                channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.2 * envelope;
                channelData[i] += Math.sin(2 * Math.PI * (frequency * 1.5) * time) * 0.15 * envelope;
                channelData[i] += Math.sin(2 * Math.PI * (frequency * 2) * time) * 0.1 * envelope;
            }
            sound.setBuffer(buffer);
            return;
    }
    
    // Generate based on the selected wave type
    for (let i = 0; i < buffer.length; i++) {
        const time = i / sampleRate;
        const envelope = Math.min(1, i / (sampleRate * 0.05)) * Math.exp(-i / (sampleRate * 0.2));
        
        if (waveType === 0) {
            // Sine wave
            channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.3 * envelope;
        } else if (waveType === 1) {
            // Saw wave (good for blackhole)
            channelData[i] = ((time * frequency) % 1) * 2 - 1;
            channelData[i] *= 0.3 * envelope;
        } else {
            // Noise (good for explosion)
            channelData[i] = (Math.random() * 2 - 1) * envelope;
        }
    }
    
    sound.setBuffer(buffer);
    console.log(`Procedural sound created for '${name}'`);
}

// Assign soundManager to global window for debugging
window.soundManager = soundManager;

/**
 * Create visualization for sound
 * @param {Object} app - The application context
 */
export function createAudioVisualization(app) {
    if (!app.audioContext) return;

    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;

    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );

        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );

        visualizationGroup.add(cube);
    }

    app.scene.add(visualizationGroup);

    // Store it for updates
    app.scene.userData.audioVisualization = visualizationGroup;
}

/**
 * Update audio visualization
 * @param {Object} app - The application context
 */
export function updateAudioVisualization(app) {
    if (!app.audioVisualization || !app.audioVisualization.enabled) return;

    const { analyser, dataArray } = app.audioVisualization;
    analyser.getByteFrequencyData(dataArray);

    // Implement different visualization methods based on the app's state
    if (app.visualizationType === 'scale') {
        // Scale the ball based on audio intensity
        if (app.ballGroup) {
            const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const scale = 1 + (avgFrequency / 512);
            app.ballGroup.scale.set(scale, scale, scale);
        }
    } else if (app.visualizationType === 'color') {
        // Change ball color based on audio frequencies
        if (app.ballGroup) {
            const lowFreq = dataArray[1] / 255;
            const midFreq = dataArray[8] / 255;
            const highFreq = dataArray[16] / 255;

            if (app.ballGroup.children[0]?.material) {
                app.ballGroup.children[0].material.color.setRGB(
                    0.5 + highFreq * 0.5,
                    0.5 + midFreq * 0.5,
                    0.5 + lowFreq * 0.5
                );
            }
        }
    } else if (app.visualizationType === 'bars') {
        // Create or update visualization bars
        if (!app.visualizationBars && app.scene) {
            createVisualizationBars(app);
        }

        if (app.visualizationBars) {
            updateVisualizationBars(app, dataArray);
        }
    }
}

// Add these supporting functions for visualization

function createVisualizationBars(app) {
    const barCount = 16; // Number of frequency bars to show
    app.visualizationBars = [];

    const barGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const barMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

    for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const radius = 3;

        bar.position.x = Math.cos(angle) * radius;
        bar.position.z = Math.sin(angle) * radius;
        bar.position.y = 0;

        app.scene.add(bar);
        app.visualizationBars.push(bar);
    }
}

function updateVisualizationBars(app, dataArray) {
    const bars = app.visualizationBars;
    if (!bars || !bars.length) return;

    const dataLength = dataArray.length;

    for (let i = 0; i < bars.length; i++) {
        const index = Math.floor(i * dataLength / bars.length);
        const value = dataArray[index] / 255; // Normalize to 0-1

        // Update bar height
        bars[i].scale.y = 0.1 + value * 3;

        // Center the scaling on the bar
        bars[i].position.y = (bars[i].scale.y / 2) - 0.05;

        // Update color based on intensity
        bars[i].material.color.setHSL(value * 0.3 + 0.3, 0.8, 0.5);
    }
}

// Toggle audio visualization
export function toggleAudioVisualization(app, enabled = true) {
    if (!app.audioVisualization) {
        createAudioVisualization(app);
    }

    app.audioVisualization.enabled = enabled;
    console.log(`Audio visualization ${enabled ? 'enabled' : 'disabled'}`);
    return app.audioVisualization;
}

/**
 * Set master volume
 * @param {Object|number} appOrVolume - Either the application context or volume level directly
 * @param {number} [volume] - Volume level (0.0 to 1.0) when first param is app
 * @returns {boolean} Whether the operation was successful
 */
export function setMasterVolume(appOrVolume, volume) {
    // Check if first parameter is app object or volume level
    const isAppObject = typeof appOrVolume === 'object';
    const volumeLevel = isAppObject ? volume : appOrVolume;

    // Clamp volume between 0 and 1
    const safeVolume = Math.max(0, Math.min(1, volumeLevel));

    if (isAppObject) {
        // Case 1: Called with app object
        const app = appOrVolume;
        if (!app.soundManager) app.soundManager = soundManager;

        if (app.soundManager.masterGain) {
            app.soundManager.masterGain.gain.value = safeVolume;
            console.log(`Master volume set to ${safeVolume}`);
            return true;
        }
        return false;
    } else {
        // Case 2: Called with just volume (global audio system)
        if (!initialized || !masterGain) return false;

        masterGain.gain.value = safeVolume;
        console.log(`Global master volume set to ${safeVolume}`);
        return true;
    }
}

// Disable continuous sound mode
export function disableContinuousSoundMode(app) {
    app.continuousSoundEnabled = false;
    app.lastPlayedFacet = null;
    console.log('Continuous sound mode disabled');
}

// Create a more complex sound for ball interaction
export function playInteractionSound(app, type = 'click') {
    if (!app.soundManager || !app.soundManager.initialized) {
        soundManager.init();
        app.soundManager = soundManager;
    }

    const audioContext = app.soundManager.getContext();

    // Ensure we have a noise generator
    if (!app.noiseGenerator) createNoiseGenerator(app);

    // Create base oscillator
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    // Set up sound based on interaction type
    switch (type) {
        case 'click':
            oscillator.type = 'sine';
            oscillator.frequency.value = 330;
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);
            oscillator.connect(gain);
            gain.connect(app.soundManager.masterGain);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;

        case 'hover':
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            oscillator.connect(gain);
            gain.connect(app.soundManager.masterGain);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;

        case 'mode':
            // Create a noise burst mixed with tone for mode change
            const noiseSource = app.noiseGenerator.createSource();
            const noiseGain = audioContext.createGain();
            noiseGain.gain.setValueAtTime(0, audioContext.currentTime);
            noiseGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

            oscillator.type = 'triangle';
            oscillator.frequency.value = 523.25; // C5
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.7);

            noiseSource.connect(noiseGain);
            noiseGain.connect(app.soundManager.masterGain);
            oscillator.connect(gain);
            gain.connect(app.soundManager.masterGain);

            noiseSource.start();
            oscillator.start();
            noiseSource.stop(audioContext.currentTime + 0.5);
            oscillator.stop(audioContext.currentTime + 0.7);
            break;
    }
}

// Handle browser autoplay policy
export function setupAudioAutoplayHandler(app) {
    // Create a function to resume audio context on user interaction
    const resumeAudioContext = () => {
        if (app.soundManager &&
            app.soundManager.audioContext &&
            app.soundManager.audioContext.state === 'suspended') {

            app.soundManager.audioContext.resume().then(() => {
                console.log('AudioContext successfully resumed');
            }).catch(err => {
                console.error('Failed to resume AudioContext:', err);
            });
        }
    };

    // Add event listeners for common user interactions
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);

    console.log('Audio autoplay handler set up');
}

// Connect audio system to ball object
export function connectAudioToBall(app, ball) {
    if (!app.soundManager) app.soundManager = soundManager;

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
        if (app.continuousSoundEnabled) {
            playEnhancedFacetSound(app, data.facet);
        }
    });

    ball.addEventListener('click', () => {
        playInteractionSound(app, 'click');
    });

    ball.addEventListener('hover', () => {
        playInteractionSound(app, 'hover');
    });

    ball.addEventListener('modeChange', () => {
        playInteractionSound(app, 'mode');
    });

    console.log('Audio system connected to ball');
    return ball;
}

/**
 * Debug audio system - export this function so it can be imported
 * @param {Object} app - Application context
 */
export function debugAudioSystem(app) {
    // Simple version that won't cause errors
    console.group('Audio System Diagnostics');
    
    try {
        // Check for app
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
        }
        
        // Check audio context directly
        console.log('Audio Context:', app.audioContext ? 'Available' : 'Missing');
        if (app.audioContext) {
            console.log('- State:', app.audioContext.state || 'N/A');
            console.log('- Sample Rate:', app.audioContext.sampleRate || 'N/A');
        }
        
        // Check continuous mode
        console.log('Continuous Sound Mode:', !!app.continuousSoundEnabled);
        
        // Check audio visualization
        console.log('Audio Visualization:', app.audioVisualization ? 'Available' : 'Missing');
        if (app.audioVisualization) {
            console.log('- Enabled:', !!app.audioVisualization.enabled);
            console.log('- Analyzer:', app.audioVisualization.analyser ? 'Connected' : 'Disconnected');
        }
    } catch (e) {
        console.error('Error in audio diagnostics:', e);
    }
    
    console.groupEnd();
}