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
            
            // Track this sound in active sounds
            const soundId = Date.now() + '-' + Math.floor(Math.random() * 10000);
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
            
            // Clean up automatically after sound completes
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
            
            // Provide control object
            return {
                id: soundId,
                
                stop: () => {
                    try {
                        oscillator.stop();
                        oscillator.disconnect();
                        gainNode.disconnect();
                        nodePool.release(gainNode);
                        this.activeSounds.delete(soundId);
                    } catch (e) {
                        // Ignore stop errors
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
        } catch (error) {
            console.error('Error creating tone:', error);
            recordAudioFailure();
            return null;
        }
    }
    
    /**
     * Play a special sound effect
     * @param {string} type - Type of sound effect to play
     * @param {Object} options - Sound options
     * @returns {boolean} Whether the sound was played
     */
    playSpecialSound(type, options = {}) {
        const audioContext = getAudioContext();
        if (!audioContext) return false;
        
        switch (type) {
            case 'spike':
                // Create a spike sound
                this.createTone({
                    frequency: 220,
                    type: 'sawtooth',
                    duration: 0.2,
                    volume: 0.3,
                    attack: 0.001,
                    release: 0.1
                });
                return true;
                
            case 'rainbow':
                // Create a rainbow activation sound
                this.createTone({
                    frequency: 880,
                    type: 'sine',
                    duration: 0.5,
                    volume: 0.4,
                    attack: 0.05,
                    release: 0.2
                });
                return true;
                
            case 'explosion':
                // Create an explosion sound
                this.createTone({
                    frequency: 100,
                    type: 'square',
                    duration: 0.3,
                    volume: 0.5,
                    attack: 0.001,
                    release: 0.2
                });
                return true;
                
            default:
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