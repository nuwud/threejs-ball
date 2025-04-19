/**
 * core.js - Core audio functionality for Three.js Ball
 */

// AudioContext and main nodes
let audioContext = null;
let masterGain = null;
let analyser = null;

// State tracking
let initialized = false;

/**
 * Initialize audio system
 * @returns {Promise<AudioContext>} The audio context
 */
export async function initializeAudio() {
    if (initialized && audioContext) {
        return audioContext;
    }
    
    console.log("Initializing audio system...");
    
    try {
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // Create master gain node
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(audioContext.destination);
        
        // Create analyzer
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        masterGain.connect(analyser);
        
        // Try to resume context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log("AudioContext resumed");
        }
        
        // Connect to app if available
        if (window.app) {
            window.app.audioContext = audioContext;
            window.app.masterGain = masterGain;
            window.app.analyser = analyser;
            window.app.analyserData = new Uint8Array(analyser.frequencyBinCount);
        }
        
        initialized = true;
        console.log("Audio system initialized successfully");
        return audioContext;
    } catch (error) {
        console.error("Failed to initialize audio:", error);
        return null;
    }
}

/**
 * Check if audio system is initialized
 * @returns {boolean} Whether the audio system is initialized
 */
export function isInitialized() {
    return initialized && audioContext !== null;
}

/**
 * Get the audio context
 * @returns {AudioContext|null} The audio context
 */
export function getAudioContext() {
    return audioContext;
}

/**
 * Get the master gain node
 * @returns {GainNode|null} The master gain node
 */
export function getMasterGain() {
    return masterGain;
}

/**
 * Resume the audio context after user interaction
 * @returns {Promise<boolean>} Whether resuming was successful
 */
export async function resumeAudio() {
    if (!audioContext) {
        return false;
    }
    
    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
            console.log("Audio context resumed");
        }
        return audioContext.state === 'running';
    } catch (error) {
        console.error("Failed to resume audio context:", error);
        return false;
    }
}

/**
 * Set master volume
 * @param {number} volume - Volume level (0-1)
 */
export function setMasterVolume(volume) {
    if (masterGain) {
        masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
}

/**
 * Get audio system status
 * @returns {Object} Status object
 */
export function getAudioStatus() {
    return {
        initialized: initialized,
        contextState: audioContext ? audioContext.state : 'none',
        masterVolume: masterGain ? masterGain.gain.value : 0
    };
}

/**
 * Ensure audio is initialized
 * @param {Object} app - The app object
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function ensureAudioInitialized(app) {
    if (initialized) {
        if (app && !app.audioContext) {
            app.audioContext = audioContext;
            app.masterGain = masterGain;
            app.analyser = analyser;
            if (analyser) {
                app.analyserData = new Uint8Array(analyser.frequencyBinCount);
            }
        }
        return true;
    }
    
    // Initialize audio
    const context = await initializeAudio();
    
    if (context && app) {
        app.audioContext = context;
        app.masterGain = masterGain;
        app.analyser = analyser;
        if (analyser) {
            app.analyserData = new Uint8Array(analyser.frequencyBinCount);
        }
    }
    
    return context !== null;
}

/**
 * Connect audio to a ball
 * @param {Object} app - The app object
 * @param {Object} ball - The ball object
 * @returns {Object} The enhanced ball
 */
export function connectAudioToBall(app, ball) {
    if (!app || !ball) {
        console.error("Cannot connect audio: app or ball is null");
        return ball;
    }
    
    try {
        console.log("Connecting audio to ball...");
        
        // Make sure we have the audio context
        if (!app.audioContext) {
            ensureAudioInitialized(app).catch(error => {
                console.error("Failed to initialize audio:", error);
            });
        }
        
        // Add ball-specific audio properties
        ball.audioData = {
            lastFacetIndex: -1,
            lastPosition: null,
            activeSound: null
        };
        
        // Ensure ball has event handling capabilities
        if (!ball.addEventListener) {
            // Simple event system
            ball.events = {};
            ball.addEventListener = function(event, callback) {
                if (!this.events[event]) {
                    this.events[event] = [];
                }
                this.events[event].push(callback);
            };
            ball.emit = function(event, data) {
                if (this.events[event]) {
                    this.events[event].forEach(callback => callback(data));
                }
            };
        }
        
        console.log("Audio connected to ball successfully");
        return ball;
    } catch (error) {
        console.error("Error connecting audio to ball:", error);
        return ball;
    }
}

/**
 * Play a sound when the ball is clicked
 * @param {Object} app - The app object
 */
export function playClickSound(app) {
    if (!isInitialized() || !app.audioContext) {
        return;
    }
    
    try {
        const oscillator = app.audioContext.createOscillator();
        const gain = app.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.value = 600;
        
        gain.gain.value = 0;
        
        oscillator.connect(gain);
        gain.connect(app.masterGain || app.audioContext.destination);
        
        oscillator.start();
        
        // Short attack
        gain.gain.linearRampToValueAtTime(0.3, app.audioContext.currentTime + 0.01);
        
        // Quick decay
        gain.gain.linearRampToValueAtTime(0, app.audioContext.currentTime + 0.15);
        
        // Stop and clean up
        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
        }, 200);
    } catch (error) {
        console.error("Error playing click sound:", error);
    }
}

/**
 * Play a sound based on facet
 * @param {Object} app - The app object
 * @param {number} facetIndex - The facet index
 * @param {Object} position - Position within facet (u,v coordinates)
 */
export function playFacetSound(app, facetIndex, position = null) {
    if (!isInitialized() || !app.audioContext) {
        return;
    }
    
    try {
        // Default position in facet
        const pos = position || { u: 0.5, v: 0.5 };
        
        // Base frequency on facet index for musical variety
        const baseFreq = 220 + (facetIndex % 12) * 50;
        
        // Vary frequency based on position within facet
        const freqVariation = 30 * (pos.u - 0.5);
        const frequency = baseFreq + freqVariation;
        
        // Create oscillators
        const oscillator = app.audioContext.createOscillator();
        const gain = app.audioContext.createGain();
        
        // Set oscillator parameters
        const oscillatorTypes = ['sine', 'triangle', 'square', 'sawtooth'];
        oscillator.type = oscillatorTypes[facetIndex % oscillatorTypes.length];
        oscillator.frequency.value = frequency;
        
        // Add detune based on facet index
        const detune = (facetIndex * 7) % 100 - 50;
        oscillator.detune.value = detune;
        
        // Set up gain
        gain.gain.value = 0;
        
        // Connect to audio context
        oscillator.connect(gain);
        gain.connect(app.masterGain || app.audioContext.destination);
        
        // Start oscillator
        oscillator.start();
        
        // Apply envelope
        const now = app.audioContext.currentTime;
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Stop and clean up
        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
        }, 150);
    } catch (error) {
        console.error("Error playing facet sound:", error);
    }
}

/**
 * Play tone based on position
 * @param {Object} app - The app object
 * @param {number} x - X coordinate (-1 to 1)
 * @param {number} y - Y coordinate (-1 to 1)
 */
export function playToneForPosition(app, x, y) {
    if (!isInitialized() || !app.audioContext) {
        return;
    }
    
    try {
        // Normalize coordinates to 0-1 range
        const normX = (x + 1) / 2;
        const normY = (y + 1) / 2;
        
        // Map x to frequency (e.g., 220Hz to 880Hz)
        const frequency = 220 + normX * 660;
        
        // Map y to volume (0.1 to 0.3)
        const volume = 0.1 + normY * 0.2;
        
        // Create oscillator and gain
        const oscillator = app.audioContext.createOscillator();
        const gain = app.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gain.gain.value = 0;
        
        oscillator.connect(gain);
        gain.connect(app.masterGain || app.audioContext.destination);
        
        oscillator.start();
        
        // Simple envelope
        const now = app.audioContext.currentTime;
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Stop and clean up
        setTimeout(() => {
            oscillator.stop();
            oscillator.disconnect();
            gain.disconnect();
        }, 150);
    } catch (error) {
        console.error("Error playing position tone:", error);
    }
}

// Make available globally
window.initializeAudio = initializeAudio;
window.isAudioInitialized = isInitialized;
window.playClickSound = playClickSound;
window.playFacetSound = playFacetSound;
window.playToneForPosition = playToneForPosition;
