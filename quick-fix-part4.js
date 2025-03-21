        // Create a bandpass filter to shape the sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency * (1 + (facetIndex % 3) * 0.5);
        filter.Q.value = 1 + (facetIndex % 10); // Different resonance per facet
        
        // Connect everything to the filter
        distortion1.connect(filter);
        distortion2.connect(filter);
        noiseGain.connect(filter);
        
        // Connect to master output with a specific gain for this sound
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0.2 * intensity; // Scale by intensity
        
        filter.connect(outputGain);
        outputGain.connect(this.masterGain);
        
        // Very short, percussive envelope
        const attackTime = 0.005;
        const releaseTime = 0.1 + (facetIndex % 5) * 0.05; // Varied release per facet
        
        // Envelope for oscillator 1
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3 * intensity, now + attackTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime);
        
        // Envelope for oscillator 2
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2 * intensity, now + attackTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.8);
        
        // Envelope for noise
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.1 * intensity, now + attackTime * 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.3);
        
        // Start and stop sources
        osc1.start(now);
        osc2.start(now);
        
        const stopTime = now + attackTime + releaseTime + 0.1;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        
        // Add filter sweep for extra texture
        filter.frequency.setValueAtTime(filter.frequency.value, now);
        filter.frequency.exponentialRampToValueAtTime(
            filter.frequency.value * (0.5 + Math.random()),
            now + attackTime + releaseTime * 0.8
        );
        
        // Clean up noise generator
        setTimeout(() => {
            noise.disconnect();
        }, (attackTime + releaseTime + 0.1) * 1000);
    }
    
    // Create a noise generator
    createNoiseGenerator() {
        // Create audio buffer for noise
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Fill the buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        // Create buffer source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.start();
        
        return noise;
    }
    
    // Stop all currently playing sounds
    stopAllSounds() {
        // Gradually fade out master gain
        const now = this.audioContext.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Reset after fade out
        setTimeout(() => {
            // Stop all active oscillators
            this.activeNotes.forEach(noteModule => {
                noteModule.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Ignore errors if oscillator is already stopped
                    }
                });
            });
            
            // Clear active notes
            this.activeNotes = [];
            
            // Reset master gain
            this.masterGain.gain.value = 0.4;
        }, 100);
    }
}