// audio/soundBuffers.js - Create buffers for special sound effects

// Create all special sound buffers and return them
function createSpecialSoundBuffers(audioContext) {
    return {
        'click': createClickBuffer(audioContext),
        'explosion': createExplosionBuffer(audioContext),
        'rainbow': createRainbowBuffer(audioContext),
        'magnetic': createMagneticBuffer(audioContext),
        'blackhole': createBlackholeBuffer(audioContext)
    };
}

// Create buffer for click sound
function createClickBuffer(audioContext) {
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
    
    return buffer;
}

// Create buffer for explosion sound
function createExplosionBuffer(audioContext) {
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
    
    return buffer;
}

// Create buffer for rainbow sound
function createRainbowBuffer(audioContext) {
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
    
    return buffer;
}

// Create buffer for magnetic sound
function createMagneticBuffer(audioContext) {
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
    
    return buffer;
}

// Create buffer for blackhole sound
function createBlackholeBuffer(audioContext) {
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
    
    return buffer;
}

export { createSpecialSoundBuffers };