/**
 * sound-buffers.js
 * Manages pre-buffered sound data for efficient playback
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
            createImpactSound(),
            createResonantPing(),
            createWhooshSound(),
            createAmbienceSound()
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