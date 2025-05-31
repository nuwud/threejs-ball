/**
 * synthesizer.js
 * Enhanced SoundSynthesizer implementation
 * Uses pooled audio nodes and manages sound lifecycles
 */



// Utility functions to interact with soundManager
function getAudioContext() {
    return soundManager.getContext();
}

function getMasterGain() {
    return soundManager.masterGain;
}

function getNodePool() {
    return soundManager.nodePool;
}

function getSoundScheduler() {
    return soundManager.scheduler;
}

function getCircuitBreaker() {
    return soundManager.circuitBreaker;
}

function recordAudioFailure() {
    if (soundManager.circuitBreaker) {
        soundManager.circuitBreaker.recordFailure();
    }
}

/**
 * Check if the synthesizer is initialized
 * @returns {boolean} Whether synthesizer is ready
 */
export function isInitialized() {
    return soundManager.initialized;
}

/**
 * Ensure that the audio system is initialized
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function ensureAudioInitialized() {
    // If already initialized, return immediately
    if (soundManager.initialized) {
        return true;
    }
    
    // Try to initialize the audio system
    try {
        if (typeof soundManager.initialize === 'function') {
            await soundManager.initialize();
            return soundManager.initialized;
        }
        return false;
    } catch (error) {
        console.error("Failed to initialize audio system:", error);
        return false;
    }
}

// Additional exports for any other imports from core.js that might be needed
export { getAudioContext };

/**
 * Enhanced SoundSynthesizer class
 * Replaces the original implementation with optimized audio processing
 */
export class SoundSynthesizer {
    /**
     * Create a new SoundSynthesizer
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.options = {
            analyze: false,
            ...options
        };
        
        this.analyser = null;
        this.analyserData = null;
        this.activeSounds = new Set();
        this._activeTones = {}; // For tracking tone objects
        this.specialSoundIds = {}; // For tracking special sounds
    }
    
    /**
     * Initialize the synthesizer
     * @returns {Promise<boolean>} Whether initialization succeeded
     */
    async initialize() {
        try {
            // Check if we already have an audio context from the app
            const app = window.app || {};
            if (app.audioContext) {
                // Use existing audio context
                this.audioContext = app.audioContext;
            } else {
                // Create new audio context if needed
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
                
                // Store for later use
                if (window.app) {
                    window.app.audioContext = this.audioContext;
                }
            }
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5; // 50% volume
            this.masterGain.connect(this.audioContext.destination);
            
            // If used in app, store reference
            if (window.app) {
                window.app.masterGain = window.app.masterGain || this.masterGain;
            }
            
            // Set up analyzer if requested
            if (this.options.analyze) {
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = 1024;
                this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
                this.masterGain.connect(this.analyser);
            }
            
            console.log("Synthesizer initialized successfully");
            return true;
        } catch (error) {
            console.error('Failed to initialize synthesizer:', error);
            return false;
        }
    }
    
    /**
     * Play a facet sound using internal tone generation.
     * @param {number} facetIndex - Index of the facet
     * @param {object} position - Optional position data { u, v }
     * @returns {boolean} Whether the sound was played
     */
    playFacetSound(facetIndex, position = { u: 0.5, v: 0.5 }) {
        try {
            // Base frequency on facet index for musical variety
            const baseFreq = 220 + (facetIndex % 12) * 50;
            // Vary frequency based on position within facet
            const freqVariation = 30 * (position.u - 0.5);
            const frequency = baseFreq + freqVariation;

            // Create a short, percussive sound
            const tone = this.createTone({
                frequency: frequency,
                type: 'triangle', // Triangle wave for a softer click/pluck
                duration: 0.15,   // Short duration
                volume: 0.2,      // Relatively quiet
                attack: 0.005,    // Quick attack
                release: 0.1      // Quick release
            });
            return !!tone; // Return true if tone was created
        } catch (error) {
            console.error('Error playing facet sound via synthesizer:', error);
            recordAudioFailure();
            return false;
        }
    }

    /**
     * Play a click sound using internal tone generation.
     * @returns {boolean} Whether the sound was played
     */
    playClickSound() {
        try {
            // Create a very short, sharp sound
            const tone = this.createTone({
                frequency: 660,     // Higher frequency for a click
                type: 'square',     // Square wave for sharpness
                duration: 0.08,     // Very short
                volume: 0.25,
                attack: 0.001,      // Extremely fast attack
                release: 0.05       // Fast release
            });
            return !!tone;
        } catch (error) {
            console.error('Error playing click sound via synthesizer:', error);
            recordAudioFailure();
            return false;
        }
    }

    /**
     * Play a release sound using internal tone generation.
     * @returns {boolean} Whether the sound was played
     */
    playReleaseSound() {
        try {
            // Create a soft, decaying sound
            const tone = this.createTone({
                frequency: 330,     // Lower frequency
                type: 'sine',       // Sine wave for smoothness
                duration: 0.2,
                volume: 0.15,
                attack: 0.01,
                release: 0.15
            });
            return !!tone;
        } catch (error) {
            console.error('Error playing release sound via synthesizer:', error);
            recordAudioFailure();
            return false;
        }
    }
    
    /**
     * Create a simple tone using an oscillator
     * @param {Object} options - Tone options
     * @returns {Object} Tone control object or null if tone couldn't be created
     */
    createTone(options = {}) {
        const audioContext = getAudioContext();
        const masterGain = getMasterGain();
        const nodePool = getNodePool();
        
        if (!audioContext || !masterGain || !nodePool) {
            return null;
        }
        
        try {
            // Get settings from options with defaults
            const frequency = options.frequency || 440;
            const type = options.type || 'sine';
            const duration = options.duration || 1.0;
            const volume = options.volume || 0.5;
            
            // Create oscillator directly
            const oscillator = audioContext.createOscillator();
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            // Create gain node from pool
            const gainNode = nodePool.acquire('gain');
            gainNode.gain.value = 0;
            
            oscillator.connect(gainNode);
            gainNode.connect(masterGain);
            
            // Generate a unique ID for this sound
            const soundId = Date.now() + '-' + Math.floor(Math.random() * 10000);
            
            // Track this sound ID in the active sounds set
            this.activeSounds.add(soundId);
            
            // Start oscillator
            oscillator.start();
            
            // Apply envelope
            const startTime = audioContext.currentTime;
            const attackTime = options.attack || 0.01;
            const releaseTime = options.release || 0.1;
            
            // Attack
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + attackTime);
            
            // Release
            gainNode.gain.setValueAtTime(volume, startTime + duration - releaseTime);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
            
            // For non-looping sounds, schedule cleanup
            if (!options.loop) {
                setTimeout(() => {
                    try {
                        oscillator.stop();
                        oscillator.disconnect();
                        gainNode.disconnect();
                        nodePool.release(gainNode);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    this.activeSounds.delete(soundId);
                }, (duration + 0.1) * 1000);
            }
            
            // Create the tone control object
            const toneObj = {
                id: soundId,
                
                stop: () => {
                    try {
                        oscillator.stop();
                        oscillator.disconnect();
                        gainNode.disconnect();
                        nodePool.release(gainNode);
                        
                        // Clean up tracking
                        this.activeSounds.delete(soundId);
                        delete this._activeTones[soundId];
                    } catch (e) {
                        console.warn('Error stopping tone:', e);
                    }
                },
                
                setFrequency: (value) => {
                    oscillator.frequency.value = value;
                },
                
                setVolume: (value) => {
                    // Adjust current gain while preserving envelope
                    const currentGain = gainNode.gain.value;
                    if (currentGain > 0) {
                        gainNode.gain.value = value;
                    }
                },
                
                isActive: true
            };
            
            // Store the tone object in our tracking collection
            this._activeTones[soundId] = toneObj;
            
            return toneObj;
        } catch (error) {
            console.error('Error creating tone:', error);
            recordAudioFailure();
            return null;
        }
    }
    
    /**
     * Play a special sound effect
     * @param {string} type - Type of sound effect to play
     * @param {boolean} loop - Whether to loop the sound
     * @returns {boolean} Whether the sound was played
     */
    playSpecialSound(type, loop = false) {
        const audioContext = getAudioContext();
        if (!audioContext) return false;
        
        // Store the sound type for tracking
        if (!this.specialSoundIds) {
            this.specialSoundIds = {};
        }
        
        // Stop existing sound of this type if it's playing
        this.stopSpecialSound(type);
        
        let sound = null;
        
        switch (type) {
            case 'spike':
                // Create a spike sound
                sound = this.createTone({
                    frequency: 220,
                    type: 'sawtooth',
                    duration: loop ? 10.0 : 0.2, // Long duration if looped
                    volume: 0.3,
                    attack: 0.001,
                    release: 0.1,
                    loop: loop
                });
                break;
                
            case 'rainbow':
                // Create a rainbow activation sound
                sound = this.createTone({
                    frequency: 880,
                    type: 'sine',
                    duration: loop ? 10.0 : 0.5, // Long duration if looped
                    volume: 0.4,
                    attack: 0.05,
                    release: 0.2,
                    loop: loop
                });
                break;
                
            case 'explosion':
                // Create an explosion sound
                sound = this.createTone({
                    frequency: 100,
                    type: 'square',
                    duration: loop ? 10.0 : 0.3, // Long duration if looped
                    volume: 0.5,
                    attack: 0.001,
                    release: 0.2,
                    loop: loop
                });
                break;
                
            default:
                return false;
        }
        
        // If sound was created successfully, store its ID for tracking
        if (sound && sound.id) {
            this.specialSoundIds[type] = sound.id;
            return true;
        }
        
        return false;
    }
    
    /**
     * Stop a special sound effect
     * @param {string} type - Type of sound effect to stop
     * @returns {boolean} Whether the sound was stopped
     */
    stopSpecialSound(type) {
        // Early return if no special sounds or this type isn't tracked
        if (!this.specialSoundIds || !this.specialSoundIds[type]) {
            return false;
        }
        
        try {
            // Get the sound ID for this type
            const soundId = this.specialSoundIds[type];
            
            // Check if this sound ID is still in our active sounds
            if (this.activeSounds.has(soundId)) {
                // Simply mark the sound as no longer special
                this.activeSounds.delete(soundId);
                
                // Look for this tone in any active sounds
                Object.keys(this._activeTones || {}).forEach(toneId => {
                    if (toneId === soundId && this._activeTones[toneId]) {
                        try {
                            // Call the stop method on the tone object
                            this._activeTones[toneId].stop();
                            delete this._activeTones[toneId];
                        } catch (e) {
                            console.warn('Error stopping tone:', e);
                        }
                    }
                });
            }
            
            // Clean up tracking
            delete this.specialSoundIds[type];
            return true;
        } catch (error) {
            console.error(`Error stopping special sound '${type}':`, error);
            // Clean up tracking even on error
            delete this.specialSoundIds[type];
            return false;
        }
    }
    
    /**
     * Get analyzer data for visualization
     * @returns {Uint8Array|null} Frequency data or null if analyzer not active
     */
    getAnalyzerData() {
        if (!this.analyser || !this.analyserData) return null;
        
        this.analyser.getByteFrequencyData(this.analyserData);
        return this.analyserData;
    }
    
    /**
     * Get the current status of the synthesizer
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            activeSounds: this.activeSounds.size,
            analyzerActive: Boolean(this.analyser)
        };
    }
}

// Single instance for the module
let synthesizer = null;

/**
 * Get the synthesizer instance
 * @returns {SoundSynthesizer} The synthesizer object
 */
export function getSynthesizer() {
    if (!synthesizer) {
        synthesizer = new SoundSynthesizer({ analyze: true });
        synthesizer.initialize().catch(err => {
            console.error("Error initializing synthesizer:", err);
        });
    }
    return synthesizer;
}

// Make available globally
window.SoundSynthesizer = SoundSynthesizer;
window.getSynthesizer = getSynthesizer;