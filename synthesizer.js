class SoundSynthesizer {
    constructor(audioContext) {
        // Create audio context if not provided
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        
        // Master gain node
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.8; // Start at 80% volume
        this.masterGain.connect(this.audioContext.destination);
        
        // Track active sound sources for cleanup
        this.activeSources = new Set();
        
        // Debug mode
        this.debugMode = false;
        
        // Add protection against overload
        this.lastSoundTime = 0;
        this.minTimeBetweenSounds = 0.05; // 50ms minimum between sounds
        this.maxConcurrentSounds = 12; // Limit simultaneous sounds
        this.soundsInLastSecond = 0;
        this.soundRateLimit = 20; // Max sounds per second
        this.lastRateLimitCheck = 0;
        
        // Crash recovery
        this.recoveryMode = false;
        this.crashCount = 0;
        
        this.log("SoundSynthesizer initialized");
    }
    
    log(message) {
        if (this.debugMode) {
            console.log(`🔊 [SoundSynthesizer] ${message}`);
        }
    }
    
    // ADSR Envelope creator - returns a configured gain node
    createEnvelope(attackTime, decayTime, sustainLevel, releaseTime) {
        const envelopeGain = this.audioContext.createGain();
        envelopeGain.gain.value = 0; // Start silent
        
        return {
            gainNode: envelopeGain,
            
            // Apply envelope to the gain node
            apply: (startTime, duration) => {
                const now = startTime || this.audioContext.currentTime;
                const releaseStart = now + (duration || 0);
                
                // Attack phase (0 to peak)
                envelopeGain.gain.setValueAtTime(0, now);
                envelopeGain.gain.linearRampToValueAtTime(1, now + attackTime);
                
                // Decay phase (peak to sustain level)
                envelopeGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
                
                // Sustain phase happens naturally (constant value)
                // Release phase starts after the specified duration
                envelopeGain.gain.setValueAtTime(sustainLevel, releaseStart);
                
                // Use exponentialRampToValueAtTime for better sounding release
                // But need to avoid going to exactly 0 (which is invalid for exponential ramp)
                envelopeGain.gain.exponentialRampToValueAtTime(0.0001, releaseStart + releaseTime);
                
                // Schedule a safety cleanup after release is done
                return releaseStart + releaseTime;
            },
            
            // Force immediate release
            triggerRelease: () => {
                const now = this.audioContext.currentTime;
                const currentValue = envelopeGain.gain.value;
                
                // Only trigger release if there's something to release
                if (currentValue > 0.0001) {
                    envelopeGain.gain.cancelScheduledValues(now);
                    envelopeGain.gain.setValueAtTime(currentValue, now);
                    envelopeGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
                    return now + releaseTime;
                }
                return now;
            }
        };
    }
    
    // Create and track an oscillator
    createOscillator(type, frequency) {
        const osc = this.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        
        // Add to active sources for lifecycle management
        const sourceInfo = { 
            node: osc, 
            stopped: false,
            type: 'oscillator',
            startTime: this.audioContext.currentTime
        };
        
        this.activeSources.add(sourceInfo);
        
        // Override stop method to track state and remove from active sources
        const originalStop = osc.stop;
        osc.stop = (when) => {
            try {
                if (!sourceInfo.stopped) {
                    originalStop.call(osc, when);
                    sourceInfo.stopped = true;
                    sourceInfo.stopTime = when || this.audioContext.currentTime;
                    
                    // Remove from active sources after a safety buffer
                    if (when) {
                        setTimeout(() => {
                            this.activeSources.delete(sourceInfo);
                        }, (when - this.audioContext.currentTime) * 1000 + 100);
                    } else {
                        this.activeSources.delete(sourceInfo);
                    }
                }
            } catch (e) {
                this.log(`Error stopping oscillator: ${e.message}`);
            }
        };
        
        return osc;
    }
    
    // Check if we should allow a new sound to play (rate limiting)
    canPlayNewSound() {
        const now = this.audioContext.currentTime;
        
        // If in recovery mode, be more conservative
        if (this.recoveryMode) {
            return this.activeSources.size < 3 && 
                   (now - this.lastSoundTime) > 0.2;
        }
        
        // Time-based rate limiting
        if ((now - this.lastSoundTime) < this.minTimeBetweenSounds) {
            this.log("Rate limited: Too soon after last sound");
            return false;
        }
        
        // Count-based limiting (max concurrent sounds)
        if (this.activeSources.size >= this.maxConcurrentSounds) {
            this.log(`Rate limited: Too many active sources (${this.activeSources.size})`);
            return false;
        }
        
        // Per-second rate limiting
        if (now - this.lastRateLimitCheck > 1.0) {
            // Reset counter every second
            this.soundsInLastSecond = 0;
            this.lastRateLimitCheck = now;
        }
        
        if (this.soundsInLastSecond >= this.soundRateLimit) {
            this.log(`Rate limited: Too many sounds per second (${this.soundsInLastSecond})`);
            return false;
        }
        
        return true;
    }
    
    // Simplify node creation to avoid potential issues
    safeCreateGain() {
        try {
            return this.audioContext.createGain();
        } catch (e) {
            this.log(`Error creating gain node: ${e.message}`);
            this.enterRecoveryMode();
            return null;
        }
    }
    
    // Recovery mode - reduce audio complexity when system seems unstable
    enterRecoveryMode() {
        if (!this.recoveryMode) {
            this.recoveryMode = true;
            this.crashCount++;
            this.log("⚠️ Entering audio recovery mode - simplifying audio");
            
            // Emergency cleanup - stop all sounds with a fade out
            this.emergencyCleanup();
            
            // Auto-exit recovery mode after 3 seconds
            setTimeout(() => {
                this.recoveryMode = false;
                this.log("Exiting recovery mode");
            }, 3000);
            
            // If we've crashed many times, suggest a refresh
            if (this.crashCount > 3 && app.audioDebugPanel) {
                app.audioDebugPanel.log("Multiple audio crashes detected. Consider refreshing the page.");
            }
        }
    }
    
    emergencyCleanup() {
        try {
            // Fade master volume to avoid clicks
            const now = this.audioContext.currentTime;
            const currentGain = this.masterGain.gain.value;
            this.masterGain.gain.cancelScheduledValues(now);
            this.masterGain.gain.setValueAtTime(currentGain, now);
            this.masterGain.gain.linearRampToValueAtTime(0.001, now + 0.1);
            
            // Then cleanup and restore volume
            setTimeout(() => {
                // Stop all sound sources
                this.stopAllSounds();
                
                // Clear out all entries in activeSources
                this.activeSources.clear();
                
                // Restore volume cautiously
                const newNow = this.audioContext.currentTime;
                this.masterGain.gain.cancelScheduledValues(newNow);
                this.masterGain.gain.setValueAtTime(0.001, newNow);
                this.masterGain.gain.linearRampToValueAtTime(0.8, newNow + 0.5);
            }, 110);
        } catch (e) {
            this.log(`Error in emergency cleanup: ${e.message}`);
        }
    }
    
    playWarmPad(frequency, duration = 0.5) {
        if (!this.canPlayNewSound()) {
            return { triggerRelease: () => {} }; // Return dummy object
        }
        
        try {
            const now = this.audioContext.currentTime;
            this.lastSoundTime = now;
            this.soundsInLastSecond++;
            
            // Use simpler oscillator setup in recovery mode
            if (this.recoveryMode) {
                const osc = this.createOscillator('sine', frequency);
                const gain = this.safeCreateGain();
                if (!gain) return { triggerRelease: () => {} };
                
                // Simple envelope
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
                gain.gain.linearRampToValueAtTime(0, now + 0.4);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.5);
                
                return { triggerRelease: () => {} };
            }
            
            // Full implementation for normal mode
            // ADSR parameters for warm pad sound
            const attackTime = 0.1;
            const decayTime = 0.2;
            const sustainLevel = 0.6;
            const releaseTime = 0.8; // Longer release for pads
            
            // Create the oscillators
            const osc1 = this.createOscillator('sine', frequency);
            const osc2 = this.createOscillator('sine', frequency * 2);
            const osc3 = this.createOscillator('triangle', frequency * 0.5);
            
            // Create individual gain nodes for mixing
            const gain1 = this.safeCreateGain();
            const gain2 = this.safeCreateGain();
            const gain3 = this.safeCreateGain();
            
            if (!gain1 || !gain2 || !gain3) {
                return { triggerRelease: () => {} };
            }
            
            gain1.gain.value = 0.5;  // Main note
            gain2.gain.value = 0.2;  // Octave up, quieter
            gain3.gain.value = 0.3;  // Octave down for richness
            
            // Create master envelope for this sound
            const envelope = this.createEnvelope(attackTime, decayTime, sustainLevel, releaseTime);
            
            // Connect everything
            osc1.connect(gain1);
            osc2.connect(gain2);
            osc3.connect(gain3);
            
            gain1.connect(envelope.gainNode);
            gain2.connect(envelope.gainNode);
            gain3.connect(envelope.gainNode);
            
            envelope.gainNode.connect(this.masterGain);
            
            // Start oscillators
            osc1.start(now);
            osc2.start(now);
            osc3.start(now);
            
            // Apply envelope
            const stopTime = envelope.apply(now, duration);
            
            // Schedule oscillator stops after envelope completes
            const safetyBuffer = 0.1; // Extra time to ensure envelope completes
            osc1.stop(stopTime + safetyBuffer);
            osc2.stop(stopTime + safetyBuffer);
            osc3.stop(stopTime + safetyBuffer);
            
            this.log(`Playing warm pad at ${frequency}Hz for ${duration}s with release ${releaseTime}s`);
            
            // Return envelope controller for external control
            return {
                triggerRelease: () => {
                    const releaseTime = envelope.triggerRelease();
                    osc1.stop(releaseTime + safetyBuffer);
                    osc2.stop(releaseTime + safetyBuffer);
                    osc3.stop(releaseTime + safetyBuffer);
                }
            };
        } catch (e) {
            this.log(`Error in playWarmPad: ${e.message}`);
            this.enterRecoveryMode();
            return { triggerRelease: () => {} };
        }
    }
    
    playClickSound(frequency = 800) {
        if (!this.canPlayNewSound()) {
            return;
        }
        
        try {
            const now = this.audioContext.currentTime;
            this.lastSoundTime = now;
            this.soundsInLastSecond++;
            
            // Simplified version in recovery mode
            if (this.recoveryMode) {
                const osc = this.createOscillator('sine', frequency);
                const gain = this.safeCreateGain();
                if (!gain) return;
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + 0.05);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.06);
                
                return;
            }
            
            // Very short ADSR for click sound
            const attackTime = 0.001;
            const decayTime = 0.02;
            const sustainLevel = 0.3;
            const releaseTime = 0.05;
            
            const osc = this.createOscillator('sine', frequency);
            const envelope = this.createEnvelope(attackTime, decayTime, sustainLevel, releaseTime);
            
            osc.connect(envelope.gainNode);
            envelope.gainNode.connect(this.masterGain);
            
            osc.start(now);
            const stopTime = envelope.apply(now, 0.01); // Very short duration
            osc.stop(stopTime + 0.05);
            
            this.log(`Playing click at ${frequency}Hz`);
        } catch (e) {
            this.log(`Error in playClickSound: ${e.message}`);
            this.enterRecoveryMode();
        }
    }
    
    playCrunchSound(frequency = 100) {
        if (!this.canPlayNewSound()) {
            return;
        }
        
        try {
            const now = this.audioContext.currentTime;
            this.lastSoundTime = now;
            this.soundsInLastSecond++;
            
            // Simplified version in recovery mode
            if (this.recoveryMode) {
                const osc = this.createOscillator('sawtooth', frequency);
                const gain = this.safeCreateGain();
                if (!gain) return;
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                osc.start(now);
                osc.stop(now + 0.25);
                
                return;
            }
            
            // ADSR for a crunch/impact sound
            const attackTime = 0.001;
            const decayTime = 0.1;
            const sustainLevel = 0.2;
            const releaseTime = 0.3;
            
            // Create noise source (using distorted oscillator)
            const noiseOsc = this.createOscillator('sawtooth', frequency);
            const distortion = this.audioContext.createWaveShaper();
            
            // Create distortion curve
            const curve = new Float32Array(44100);
            for (let i = 0; i < 44100; i++) {
                const x = i * 2 / 44100 - 1;
                curve[i] = (Math.random() * 0.3 + 0.7) * (3 + 10 * Math.abs(x)) * x / (1 + 10 * Math.abs(x));
            }
            distortion.curve = curve;
            
            // Create filter for shaping the sound
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);
            filter.Q.value = 10;
            
            // Create envelope
            const envelope = this.createEnvelope(attackTime, decayTime, sustainLevel, releaseTime);
            
            // Connect everything
            noiseOsc.connect(distortion);
            distortion.connect(filter);
            filter.connect(envelope.gainNode);
            envelope.gainNode.connect(this.masterGain);
            
            // Start and schedule stop
            noiseOsc.start(now);
            const stopTime = envelope.apply(now, 0.1);
            noiseOsc.stop(stopTime + 0.1);
            
            this.log(`Playing crunch sound at base frequency ${frequency}Hz`);
        } catch (e) {
            this.log(`Error in playCrunchSound: ${e.message}`);
            this.enterRecoveryMode();
        }
    }
    
    stopAllSounds() {
        this.log(`Stopping all sounds, active sources: ${this.activeSources.size}`);
        
        // Safely stop all active sound sources
        for (const source of this.activeSources) {
            try {
                // If it's an oscillator or audio buffer source
                if (!source.stopped && source.node && 
                    typeof source.node.stop === 'function') {
                    
                    // For oscillators, do a quick fade out rather than abrupt stop
                    if (source.type === 'oscillator') {
                        const now = this.audioContext.currentTime;
                        // Find the gain node in the source's graph if possible
                        // For simplicity, just use master gain for quick fade
                        source.node.stop(now + 0.05);
                    } else {
                        source.node.stop();
                    }
                    source.stopped = true;
                }
            } catch (e) {
                this.log(`Error stopping source: ${e.message}`);
            }
        }
        
        // We don't cut the master gain anymore - just stop individual sources
    }
    
    masterMute() {
        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        this.log("Master audio muted");
    }
    
    masterUnmute() {
        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.8, now + 0.1);
        this.log("Master audio unmuted");
    }
    
    setDebugMode(enabled) {
        this.debugMode = enabled;
        this.log(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    // Get current state for debugging
    getState() {
        return {
            contextState: this.audioContext.state,
            currentTime: this.audioContext.currentTime,
            masterGain: this.masterGain.gain.value,
            activeSources: this.activeSources.size,
            sampleRate: this.audioContext.sampleRate
        };
    }
    
    // Add panic button to reset audio system
    panicReset() {
        this.log("🚨 Audio panic reset triggered");
        
        try {
            // Silent all audio immediately
            this.masterMute();
            
            // Stop everything
            this.emergencyCleanup();
            
            // Wait a moment before re-enabling
            setTimeout(() => {
                // Reset crash counters
                this.crashCount = 0;
                this.recoveryMode = false;
                this.soundsInLastSecond = 0;
                
                // Restore audio
                this.masterUnmute();
                this.log("Audio system reset complete");
            }, 500);
        } catch (e) {
            this.log(`Error during panic reset: ${e.message}`);
        }
    }
}
