    // Create a basic reverb effect
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        
        // Create impulse response for reverb
        const rate = this.audioContext.sampleRate;
        const length = rate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const impulseData = impulse.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                // Decay curve for reverb
                impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        // Create gain node for reverb amount
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.2; // Subtle reverb
        
        convolver.connect(reverbGain);
        
        return reverbGain;
    }
    
    // Create a delay effect
    createDelay() {
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = 0.3; // 300ms delay
        
        // Feedback for delay
        const feedback = this.audioContext.createGain();
        feedback.gain.value = 0.2; // 20% feedback
        
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Create gain node for delay amount
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.15; // Subtle delay
        
        delay.connect(delayGain);
        
        return delayGain;
    }
    
    // Create a distortion effect
    createDistortion() {
        const distortion = this.audioContext.createWaveShaper();
        
        // Create a distortion curve
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            
            return curve;
        }
        
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
        
        // Create gain node for distortion amount
        const distortionGain = this.audioContext.createGain();
        distortionGain.gain.value = 0.1; // Subtle distortion by default
        
        distortion.connect(distortionGain);
        
        return distortionGain;
    }
    
    // Play a note with warm pad sound
    playWarmPad(note, duration = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create oscillators for rich sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        // Set waveforms for warmer sound
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc3.type = 'sine';
        
        // Set frequencies with slight detuning for warmth
        osc1.frequency.value = note;
        osc2.frequency.value = note * 1.005; // Slight detuning
        osc3.frequency.value = note * 0.5;   // Octave below
        
        // Create gain nodes for envelope
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        // Set initial gain to 0
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        gain3.gain.value = 0;
        
        // Connect everything
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        gain3.connect(this.masterGain);
        
        // Apply envelope for smooth attack and release
        const attackTime = 0.1;
        const releaseTime = 0.6;
        
        // Attack
        gain1.gain.linearRampToValueAtTime(0.2, now + attackTime);
        gain2.gain.linearRampToValueAtTime(0.15, now + attackTime);
        gain3.gain.linearRampToValueAtTime(0.1, now + attackTime);
        
        // Release
        gain1.gain.linearRampToValueAtTime(0, now + duration + releaseTime);
        gain2.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.1);
        gain3.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.2);
        
        // Start and stop oscillators
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        
        osc1.stop(now + duration + releaseTime + 0.3);
        osc2.stop(now + duration + releaseTime + 0.3);
        osc3.stop(now + duration + releaseTime + 0.3);
        
        // Track active notes
        const noteModule = { oscillators: [osc1, osc2, osc3], gains: [gain1, gain2, gain3] };
        this.activeNotes.push(noteModule);
        
        // Clean up after note finishes
        setTimeout(() => {
            const index = this.activeNotes.indexOf(noteModule);
            if (index > -1) {
                this.activeNotes.splice(index, 1);
            }
        }, (duration + releaseTime + 0.3) * 1000);
        
        return noteModule;
    }