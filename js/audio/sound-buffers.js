/**
 * sound-buffers.js
 * Manages pre-buffered sound data for efficient playback
 * Includes both general ambient sounds and special effect sounds
 */

let audioContext = null;
export const soundBuffers = {};

/**
 * Initialize the sound buffer manager
 * @param {AudioContext} context - The audio context to use
 * @returns {Promise<boolean>} Whether initialization succeeded
 */
export async function initializeSoundBuffers(context) {
    if (!context) return false;
    
    audioContext = context;
    
    try {
        // Create pre-computed sound buffers for common sounds
        await Promise.all([
            // Basic sounds
            createImpactSound(),
            createResonantPing(),
            createWhooshSound(),
            createAmbienceSound(),
            
            // Special effect sounds
            createClickSound(),
            createExplosionSound(),
            createRainbowSound(),
            createMagneticSound(),
            createBlackholeSound()
        ]);
        
        console.log('Sound buffers initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize sound buffers:', error);
        return false;
    }
}

/**
 * Creates and stores an impact sound buffer
 */
async function createImpactSound() {
    const bufferSize = audioContext.sampleRate * 1.5; // 1.5 second buffer
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    
    // Fill both channels with sound data
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Create an impact sound with a fast attack and decay
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            
            // Initial impact
            let sample = 0;
            
            if (t < 0.01) {
                // Sharp attack
                sample = Math.sin(t * 400 * Math.PI) * (1 - t / 0.01);
            } else if (t < 0.3) {
                // Fast decay
                sample = Math.sin(t * 150 * Math.PI) * Math.exp(-(t - 0.01) * 15);
            }
            
            // Add some noise to make it sound more natural
            if (t < 0.1) {
                sample += (Math.random() * 2 - 1) * 0.2 * Math.exp(-t * 20);
            }
            
            data[i] = sample * 0.8; // Reduce overall volume
        }
    }
    
    // Store for reuse
    soundBuffers['impact'] = buffer;
}

/**
 * Creates and stores a resonant ping sound buffer
 */
async function createResonantPing() {
    const bufferSize = audioContext.sampleRate * 2; // 2 second buffer
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    
    // Fill both channels with sound data
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Create a ping sound with long decay
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            
            // Ping with harmonic overtones
            const baseFreq = 440 + (channel * 5); // Slight detuning between channels
            const decay = Math.exp(-t * 2);
            
            let sample = Math.sin(t * baseFreq * 2 * Math.PI) * decay * 0.6;
            sample += Math.sin(t * baseFreq * 3 * Math.PI) * decay * 0.3;
            sample += Math.sin(t * baseFreq * 4 * Math.PI) * decay * 0.1;
            
            data[i] = sample * 0.7; // Reduce overall volume
        }
    }
    
    // Store for reuse
    soundBuffers['ping'] = buffer;
}

/**
 * Creates and stores a whoosh sound buffer
 */
async function createWhooshSound() {
    const bufferSize = audioContext.sampleRate * 1; // 1 second buffer
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    
    // Fill both channels with sound data
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Create a whoosh sound using filtered noise
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            const noiseAmount = Math.random() * 2 - 1;
            
            // Shape the noise with an envelope
            let envelope;
            if (t < 0.1) {
                envelope = t / 0.1; // Attack
            } else if (t < 0.8) {
                envelope = 1 - (t - 0.1) / 0.7; // Decay
            } else {
                envelope = 0;
            }
            
            // Filter the noise (simple low-pass simulation)
            const filterCoefficient = 0.2;
            if (i > 0) {
                data[i] = data[i-1] * filterCoefficient + noiseAmount * (1 - filterCoefficient) * envelope * 0.7;
            } else {
                data[i] = noiseAmount * envelope * 0.7;
            }
        }
    }
    
    // Store for reuse
    soundBuffers['whoosh'] = buffer;
}

/**
 * Creates and stores an ambience sound buffer
 */
async function createAmbienceSound() {
    const bufferSize = audioContext.sampleRate * 4; // 4 second buffer
    const buffer = audioContext.createBuffer(2, bufferSize, audioContext.sampleRate);
    
    // Fill both channels with sound data
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Create an ambient pad sound
        for (let i = 0; i < bufferSize; i++) {
            const t = i / audioContext.sampleRate;
            
            // Multiple sine waves at different frequencies for rich texture
            const f1 = 100 + (channel * 3);
            const f2 = 150 + (channel * 2);
            const f3 = 210 - (channel * 4);
            
            let sample = Math.sin(t * f1 * 2 * Math.PI) * 0.3;
            sample += Math.sin(t * f2 * 2 * Math.PI) * 0.2;
            sample += Math.sin(t * f3 * 2 * Math.PI) * 0.1;
            
            // Add slow modulation
            sample *= 0.7 + 0.3 * Math.sin(t * 0.5 * Math.PI);
            
            data[i] = sample * 0.4; // Reduce overall volume
        }
    }
    
    // Store for reuse
    soundBuffers['ambience'] = buffer;
}

/**
 * Creates and stores a click sound buffer
 */
async function createClickSound() {
    // Create a buffer for a short click sound
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * 0.5, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Attack
        for (let i = 0; i < sampleRate * 0.01; i++) {
            data[i] = Math.random() * i / (sampleRate * 0.01);
        }
        
        // Body - warm tone with slight distortion
        for (let i = sampleRate * 0.01; i < sampleRate * 0.2; i++) {
            const t = (i - sampleRate * 0.01) / (sampleRate * 0.19);
            const x = Math.sin(i * 0.05) * 0.3 + Math.sin(i * 0.08) * 0.2 + Math.sin(i * 0.11) * 0.1;
            data[i] = x * (1 - t);
        }
        
        // Fade out
        for (let i = sampleRate * 0.2; i < sampleRate * 0.5; i++) {
            const t = (i - sampleRate * 0.2) / (sampleRate * 0.3);
            data[i] = (1 - t) * 0.05 * Math.sin(i * 0.02);
        }
    }
    
    // Store for reuse
    soundBuffers['click'] = buffer;
}

/**
 * Creates and stores an explosion sound buffer
 */
async function createExplosionSound() {
    // Create a buffer for an explosion sound
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * 2, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Initial burst
        for (let i = 0; i < sampleRate * 0.1; i++) {
            const t = i / (sampleRate * 0.1);
            data[i] = (Math.random() * 2 - 1) * (1 - t * 0.5);
        }
        
        // Rumble with decreasing amplitude
        for (let i = sampleRate * 0.1; i < sampleRate * 2; i++) {
            const t = (i - sampleRate * 0.1) / (sampleRate * 1.9);
            const noise = Math.random() * 2 - 1;
            const lowFreq = Math.sin(i * 0.01) * 0.5;
            data[i] = (noise * 0.4 + lowFreq) * Math.pow(1 - t, 1.5);
        }
    }
    
    // Store for reuse
    soundBuffers['explosion'] = buffer;
}

/**
 * Creates and stores a rainbow sound buffer
 */
async function createRainbowSound() {
    // Create a buffer for a shimmering sound
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * 3, sampleRate);
    
    // Base frequencies for a major chord
    const frequencies = [261.6, 329.6, 392.0, 523.2];
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Fill with silence first
        for (let i = 0; i < data.length; i++) {
            data[i] = 0;
        }
        
        // Add sine waves at different frequencies
        for (const freq of frequencies) {
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                data[i] += Math.sin(t * freq * Math.PI * 2) * 0.1 * Math.sin(t * 0.5);
            }
        }
        
        // Add some shimmer
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            data[i] += Math.sin(t * 1000 + Math.sin(t * 4) * 500) * 0.01 * Math.sin(t * 0.8);
        }
    }
    
    // Store for reuse
    soundBuffers['rainbow'] = buffer;
}

/**
 * Creates and stores a magnetic sound buffer
 */
async function createMagneticSound() {
    // Create a buffer for a humming magnetic sound
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * 3, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Fill with a humming sound
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Base frequency
            const baseFreq = 80 + Math.sin(t * 0.5) * 10;
            // Harmonics
            const h1 = Math.sin(t * baseFreq * Math.PI * 2) * 0.3;
            const h2 = Math.sin(t * baseFreq * 2 * Math.PI * 2) * 0.15;
            const h3 = Math.sin(t * baseFreq * 3 * Math.PI * 2) * 0.08;
            const h4 = Math.sin(t * baseFreq * 4 * Math.PI * 2) * 0.04;
            // Combined with a high resonant sweep
            const sweep = Math.sin(t * (1000 + Math.sin(t * 0.3) * 800) * Math.PI * 2) * 0.05;
            
            data[i] = (h1 + h2 + h3 + h4 + sweep) * 0.5;
        }
    }
    
    // Store for reuse
    soundBuffers['magnetic'] = buffer;
}

/**
 * Creates and stores a blackhole sound buffer
 */
async function createBlackholeSound() {
    // Create a buffer for an ominous blackhole sound
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * 5, sampleRate);
    
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        
        // Fill with deep rumbling sound
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            // Deep bass
            const deepBass = Math.sin(t * 30 * Math.PI * 2) * 0.4;
            // Low rumble
            const rumble = (Math.random() * 2 - 1) * 0.1 * Math.pow(Math.sin(t * 0.25) * 0.5 + 0.5, 2);
            // Sweeping sound
            const sweep = Math.sin(t * (50 + Math.sin(t * 0.1) * 20) * Math.PI * 2) * 0.1;
            
            // Combine with volume envelope
            const envelope = Math.min(t * 0.5, 1) * Math.min((5 - t) * 0.5, 1);
            data[i] = (deepBass + rumble + sweep) * envelope;
        }
    }
    
    // Store for reuse
    soundBuffers['blackhole'] = buffer;
}

/**
 * Get the specified sound buffer
 * @param {string} name - Name of the buffer to get
 * @returns {AudioBuffer|null} The audio buffer or null if not found
 */
export function getBuffer(name) {
    return soundBuffers[name] || null;
}

/**
 * Check if a buffer exists
 * @param {string} name - Name of the buffer to check
 * @returns {boolean} Whether the buffer exists
 */
export function hasBuffer(name) {
    return name in soundBuffers;
}

/**
 * Get list of all available buffer names
 * @returns {string[]} Array of buffer names
 */
export function getAvailableBuffers() {
    return Object.keys(soundBuffers);
}

/**
 * Create all special sound buffers and return them
 * This function maintains backward compatibility with the old API
 * @param {AudioContext} context - Audio context to use
 * @returns {Object} Object containing all special sound buffers
 */
export function createSpecialSoundBuffers(context) {
    // If context is provided and different from our global context, initialize with it
    if (context && context !== audioContext) {
        audioContext = context;
        
        // Initialize relevant buffers
        createClickSound();
        createExplosionSound();
        createRainbowSound();
        createMagneticSound();
        createBlackholeSound();
    }
    
    // Return references to the buffers (for backward compatibility)
    return {
        'click': soundBuffers['click'],
        'explosion': soundBuffers['explosion'],
        'rainbow': soundBuffers['rainbow'],
        'magnetic': soundBuffers['magnetic'],
        'blackhole': soundBuffers['blackhole']
    };
}