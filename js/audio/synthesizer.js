/**
 * synthesizer.js
 * Enhanced SoundSynthesizer implementation to replace the problematic original
 * Uses pooled audio nodes and pre-buffered sounds for better performance
 */

import { 
    getAudioContext, 
    getMasterGain, 
    getNodePool, 
    getSoundScheduler, 
    getCircuitBreaker,
    recordAudioFailure,
    isInitialized
} from './core.js';

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
        if (!isInitialized()) {
            console.error('Cannot initialize synthesizer: audio system not initialized');
            return false;
        }
        
        try {
            // Set up analyzer if requested
            if (this.options.analyze) {
                const audioContext = getAudioContext();
                const masterGain = getMasterGain();
                const nodePool = getNodePool();
                
                if (audioContext && masterGain && nodePool) {
                    // Create analyzer directly instead of using nodePool.getNode
                    this.analyser = audioContext.createAnalyser();
                    this.analyser.fftSize = 1024;
                    
                    if (this.analyser) {
                        this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);
                        masterGain.connect(this.analyser);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Failed to initialize synthesizer:', error);
            return false;
        }
    }
    
    /**
     * Play a facet sound directly using the core functions
     * @param {number} facetIndex - Index of the facet
     * @returns {boolean} Whether the sound was played
     */
    playFacetSound(facetIndex) {
        try {
            // Just delegate to the core.js function
            const { playFacetSound } = require('./core.js');
            playFacetSound({ audioContext: getAudioContext() }, facetIndex);
            return true;
        } catch (error) {
            console.error('Error playing facet sound via synthesizer:', error);
            return false;
        }
    }
    
    /**
     * Play a click sound directly using the core functions
     * @returns {boolean} Whether the sound was played
     */
    playClickSound() {
        try {
            // Just delegate to the core.js function
            const { playClickSound } = require('./core.js');
            playClickSound({ audioContext: getAudioContext() });
            return true;
        } catch (error) {
            console.error('Error playing click sound via synthesizer:', error);
            return false;
        }
    }
    
    /**
     * Play a release sound directly using the core functions
     * @returns {boolean} Whether the sound was played
     */
    playReleaseSound() {
        try {
            // Just delegate to the core.js function
            const { playReleaseSound } = require('./core.js');
            playReleaseSound({ audioContext: getAudioContext() });
            return true;
        } catch (error) {
            console.error('Error playing release sound via synthesizer:', error);
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