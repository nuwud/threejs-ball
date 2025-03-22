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
 * Set master volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export function setMasterVolume(volume) {
    if (!initialized || !masterGain) return;

    const safeVolume = Math.max(0, Math.min(1, volume));
    masterGain.gain.value = safeVolume;
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
    if (!initialized) {
        console.warn('Audio not initialized, cannot play tone');
        return;
    }

    // Removed throttling check for continuous audio

    try {
        // Normalize coordinates to 0-1 range
        const normX = (x + 1) / 2;
        const normY = (y + 1) / 2;

        // Map x to frequency (e.g., 220Hz to 880Hz)
        const frequency = 220 + normX * 660;

        // Map y to volume (0.1 to 0.5) - lower volume for positional sounds
        const volume = 0.05 + normY * 0.2;

        // Create a new oscillator each time (don't reuse from pool)
        const oscillatorNode = audioContext.createOscillator();
        
        // Get a gain node from the pool
        let gainNode;
        if (nodePool && typeof nodePool.acquire === 'function') {
            gainNode = nodePool.acquire('gain');
        } else {
            gainNode = audioContext.createGain();
        }

        // Configure oscillator
        oscillatorNode.type = 'sine';
        oscillatorNode.frequency.value = frequency;

        // Set volume
        gainNode.gain.value = 0;

        // Connect nodes
        oscillatorNode.connect(gainNode);
        gainNode.connect(masterGain);

        // Start oscillator
        oscillatorNode.start();

        // Ramp up volume
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);

        // Ramp down and stop after a short duration
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);

        // Schedule cleanup
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
        }, 150);

        // Record successful sound trigger
        if (soundScheduler && typeof soundScheduler.recordSoundPlayed === 'function') {
            soundScheduler.recordSoundPlayed();
        }
    } catch (error) {
        console.error('Error playing tone for position:', error);
        
        // Record failure if circuit breaker exists
        if (circuitBreaker && typeof circuitBreaker.recordFailure === 'function') {
            circuitBreaker.recordFailure();
        }
    }
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
 * Get audio system status
 * @returns {Object} Status information about the audio system
 */
export function getAudioStatus() {
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
    sounds: {},
    
    // Initialize all sounds
    init: function() {
        if (!listener) getListener();
        
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
    },
    
    // Create a global sound
    createSound: function(name, url) {
        if (!listener) getListener();
        const sound = new THREE.Audio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Create a positional sound
    createPositionalSound: function(name, url) {
        if (!listener) getListener();
        const sound = new THREE.PositionalAudio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // The distance at which the volume reduction starts
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Play a sound
    play: function(name, loop = false) {
        const sound = this.sounds[name];
        if (sound && sound.buffer) {
            // Don't restart if it's already playing
            if (!sound.isPlaying) {
                sound.setLoop(loop);
                sound.play();
            }
        }
    },
    
    // Stop a sound
    stop: function(name) {
        const sound = this.sounds[name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    },
    
    // Attach a positional sound to an object
    attachToObject: function(name, object) {
        const sound = this.sounds[name];
        if (sound && !object.children.includes(sound)) {
            object.add(sound);
        }
    },
    
    // Set the frequency of an oscillator
    setFrequency: function(name, value) {
        const sound = this.sounds[name];
        if (sound && sound.source && sound.source.frequency) {
            sound.source.frequency.value = value;
        }
    }
};

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
    if (!app.audioContext || !app.scene.userData.audioVisualization) return;
    
    // Get frequency data
    if (!app.analyser || !app.audioDataArray) return;
    
    // Get frequency data
    app.analyser.getByteFrequencyData(app.audioDataArray);
    
    // Update visualization cubes
    const visualization = app.scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * app.audioDataArray.length);
        const value = app.audioDataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}