/**
 * sound-manager.js
 * Handles 3D sound effects and audio listener management
 */

import * as THREE from 'three';

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

            this.initialized = true;
            console.log("Sound manager initialized without external sound files");
        } catch (error) {
            console.error("Failed to initialize sound manager:", error);
        }
    },

    // Create a global sound
    createSound: function (name, url) {
        if (!listener) getListener();
        const sound = new THREE.Audio(listener);

        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        
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
                createProceduralSound(name, sound);
            }
        );

        this.sounds[name] = sound;
    },

    // Create a positional sound
    createPositionalSound: function (name, url) {
        if (!listener) getListener();
        const sound = new THREE.PositionalAudio(listener);

        // Load a sound
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function (buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // Distance where volume reduction starts
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
        
        // For looping sounds
        if (loop) {
            setTimeout(() => {
                if (this.sounds[name] && !this.sounds[name].buffer) {
                    this.playFallbackSound(name, loop);
                }
            }, 1800);
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

// Create a procedural sound as fallback
function createProceduralSound(name, sound) {
    if (!sound.context) return;
    
    const sampleRate = sound.context.sampleRate;
    const buffer = sound.context.createBuffer(1, sampleRate * 0.3, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Create a simple tone with envelope
    const frequency = 250; // Default frequency
    for (let i = 0; i < buffer.length; i++) {
        const time = i / sampleRate;
        // Simple envelope: attack, decay, release
        const envelope = Math.min(1, i / (sampleRate * 0.05)) * Math.exp(-i / (sampleRate * 0.2));
        
        // Basic sine wave
        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * 0.3 * envelope;
    }
    
    sound.setBuffer(buffer);
    console.log(`Created procedural sound for '${name}'`);
}

// Expose soundManager globally for debugging
window.soundManager = soundManager;
