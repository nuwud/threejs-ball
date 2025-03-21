    // Play a chord based on a root note
    playChord(rootNote, duration = 0.8) {
        this.playWarmPad(rootNote, duration);
        this.playWarmPad(rootNote * 5/4, duration); // Major third
        this.playWarmPad(rootNote * 3/2, duration); // Perfect fifth
    }
    
    // Play sound based on position (for hover)
    playPositionSound(x, y) {
        // Map x and y to meaningful musical values
        // Using pentatonic scale for pleasing sounds
        const pentatonicScale = [220, 247.5, 277.2, 329.6, 370.0];
        
        // Map x to note in scale (-1 to 1 maps to 0 to 4)
        const noteIndex = Math.floor(((x + 1) / 2) * pentatonicScale.length);
        const note = pentatonicScale[Math.min(noteIndex, pentatonicScale.length - 1)];
        
        // Map y to volume (-1 to 1 maps to 0 to 0.4)
        const volume = ((y + 1) / 2) * 0.4;
        this.masterGain.gain.value = volume;
        
        // Play the note
        this.playWarmPad(note, 0.2);
    }
    
    // Play click sound
    playClickSound() {
        // Play a pleasant chord
        this.playChord(329.6, 0.5); // E4 chord
    }
    
    // Play release sound
    playReleaseSound() {
        // Play a different chord
        this.playChord(261.6, 0.3); // C4 chord
    }
    
    // Play a crunchy facet sound
    playFacetSound(facetIndex, intensity = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create a more percussive synth for the facet sounds
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const noise = this.createNoiseGenerator();
        
        // Use facetIndex to determine frequency - create a unique sound for each facet
        // Map facet index to frequencies in a pleasing scale
        const baseNote = 60 + (facetIndex % 12); // C4 (midi note 60) + offset based on facet
        const frequency = 440 * Math.pow(2, (baseNote - 69) / 12); // Convert MIDI note to frequency
        
        // Set waveforms for crunchy sound
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        // Set frequencies with different relationships for each facet
        osc1.frequency.value = frequency;
        osc2.frequency.value = frequency * (1 + (facetIndex % 5) * 0.02); // Creates harmonic beating
        
        // Create gain nodes
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();
        
        // Set initial gain values
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        noiseGain.gain.value = 0;
        
        // Connect the oscillators through distortion for crunchiness
        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseGain);
        
        // Create individual distortion for each sound source
        const distortion1 = this.audioContext.createWaveShaper();
        const distortion2 = this.audioContext.createWaveShaper();
        
        // Create distortion curves with different characteristics
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
        
        // Different distortion amounts based on facet index
        const distAmt1 = 50 + (facetIndex % 5) * 20;
        const distAmt2 = 30 + (facetIndex % 7) * 15;
        
        distortion1.curve = makeDistortionCurve(distAmt1);
        distortion2.curve = makeDistortionCurve(distAmt2);
        distortion1.oversample = '4x';
        distortion2.oversample = '4x';
        
        // Connect through distortion chains
        gain1.connect(distortion1);
        gain2.connect(distortion2);