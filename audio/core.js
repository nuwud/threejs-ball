// Audio Core Module

let audioContext;
let masterGain;
let reverbNode = null;
let isAudioInitialized = false;

// Musical scales for melodic mapping with lower base frequencies
const musicalScales = {
    // Lower octave scales (C3 instead of C4)
    cMajor: [130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63],
    pentatonic: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63],
    chromatic: [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94],
    // Warm scales with pleasing intervals
    warmPentatonic: [220.00, 246.94, 261.63, 293.66, 329.63], // A3, B3, C4, D4, E4
    earthyScale: [110.00, 146.83, 165.00, 196.00, 220.00], // A2, D3, E3, G3, A3
    richScale: [164.81, 196.00, 220.00, 246.94, 261.63, 293.66] // E3, G3, A3, B3, C4, D4
};

// Refined oscillator types - favor smoother waveforms
const oscillatorTypes = ['sine', 'triangle', 'sine', 'triangle'];

/**
 * Initialize the audio context and main audio nodes
 * @returns {boolean} Whether initialization was successful
 */
function initializeAudio() {
    if (isAudioInitialized) return true;
    
    try {
        // Check for browser support
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('Web Audio API not supported in this browser');
            return false;
        }
        
        audioContext = new AudioContext();
        
        // Resume context if suspended (needed for autoplay policy)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        // Create master gain with lower initial volume for gentler sound
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.2; // Reduced from 0.3 for softer overall sound
        
        // Create filters for warmer tone
        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 2500; // Cut harsh high frequencies
        lowPassFilter.Q.value = 0.7; // Gentle slope
        
        // Connect filter to audio chain
        lowPassFilter.connect(audioContext.destination);
        masterGain.connect(lowPassFilter);
        
        // Create reverb with warmer settings
        reverbNode = createReverb();
        reverbNode.connect(masterGain);
        
        isAudioInitialized = true;
        console.log('Audio system initialized');
        return true;
    } catch (error) {
        console.error('Failed to initialize audio system:', error);
        return false;
    }
}

/**
 * Create multiple harmonically-related oscillators with richer harmonics
 */
function createHarmonicOscillators(baseFreq, type = 'sine') {
    if (!isAudioInitialized && !initializeAudio()) {
        return { oscillators: [], gains: [] };
    }
    const oscillators = [];
    const gains = [];
    
    // More refined harmonic structure with pleasing ratios
    const harmonics = [
        { freq: 1, vol: 0.4 },     // fundamental (reduced volume)
        { freq: 2, vol: 0.15 },    // octave
        { freq: 1.5, vol: 0.12 },  // perfect fifth
        { freq: 1.33, vol: 0.07 }, // perfect fourth
        { freq: 1.25, vol: 0.05 }  // major third (subtle)
    ];

    // Add subtle detuning for richness (up to 5 cents)
    harmonics.forEach((h, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.type = type;
        // Slight detuning for a richer sound
        const detune = index === 0 ? 0 : (Math.random() * 10 - 5);
        osc.frequency.value = baseFreq * h.freq;
        osc.detune.value = detune;
        gain.gain.value = h.vol;

        osc.connect(gain);
        oscillators.push(osc);
        gains.push(gain);
    });

    return { oscillators, gains };
}

/**
 * Create a warmer, more natural reverb
 */
function createReverb() {
    // Remove the initializeAudio call here to avoid circular dependency
    const reverb = audioContext.createConvolver();
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * 2; // 2 seconds
    const impulse = audioContext.createBuffer(2, length, sampleRate);

    // Create warmer impulse response
    for (let channel = 0; channel < 2; channel++) {
        const impulseData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            // Warmer decay curve with bias toward low frequencies
            const decay = Math.pow(1 - i / length, 1.5);
            const noise = Math.random() * 2 - 1;
            // Add low-frequency bias for warmth (more energy in lower frequencies)
            const lowFreqEmphasis = 0.2 * Math.sin(i / length * Math.PI * 2);
            impulseData[i] = (noise * decay) + lowFreqEmphasis;
        }
    }
    reverb.buffer = impulse;
    return reverb;
}

/**
 * Apply more musical ADSR envelope to a gain node
 */
function applyADSR(gainNode, attackTime = 0.02, decayTime = 0.3, sustainLevel = 0.4, releaseTime = 0.8) {
    // Longer default values for smoother, more natural sound
    if (!isAudioInitialized && !initializeAudio()) {
        return 0;
    }
    const now = audioContext.currentTime;
    
    // Use exponential ramps for more natural sound where possible
    gainNode.gain.setValueAtTime(0.001, now); // Start from near-zero (not zero)
    gainNode.gain.exponentialRampToValueAtTime(1, now + attackTime);
    gainNode.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel, now + attackTime + decayTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime + releaseTime);
    
    // Schedule final zero (can't use exponential to reach zero)
    gainNode.gain.linearRampToValueAtTime(0, now + attackTime + decayTime + releaseTime + 0.01);

    return attackTime + decayTime + releaseTime;
}

/**
 * Get a frequency from a musical scale with preference for warmer scales
 */
function getFrequencyFromScale(scale, position) {
    // Default to warmer scales for more pleasing sounds
    const scaleName = scale || 'warmPentatonic';
    const notes = musicalScales[scaleName] || musicalScales.warmPentatonic;
    const index = Math.floor(position * notes.length) % notes.length;
    return notes[index];
}

/**
 * Create an FM sound with more musical parameters
 */
function createFMSound(carrier, modulator, index) {
    if (!isAudioInitialized && !initializeAudio()) {
        return null;
    }
    
    const carrierOsc = audioContext.createOscillator();
    const modulatorOsc = audioContext.createOscillator();
    const modulatorGain = audioContext.createGain();

    carrierOsc.frequency.value = carrier;
    modulatorOsc.frequency.value = modulator;
    
    // Use a more musical modulation index (ratio between 1:1 and 1:2 is often sweet)
    const modulationIndex = Math.min(index, 2); // Limit index for less harshness
    modulatorGain.gain.value = modulationIndex * modulator * 0.5; // Reduced intensity

    modulatorOsc.connect(modulatorGain);
    modulatorGain.connect(carrierOsc.frequency);
    
    // Don't start oscillators here, let playFacetSound handle it
    
    return { carrier: carrierOsc, modulator: modulatorOsc, modulatorGain: modulatorGain };
}

/**
 * Play a sound for a specific facet with more refined sonic qualities
 * @param {number} facetIndex - Index of the facet
 * @param {Object} pos - Position information with u property
 */
function playFacetSound(facetIndex, pos) {
    if (!isAudioInitialized && !initializeAudio()) {
        return;
    }
    
    // Ensure we can play audio (browser autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    // Calculate frequency based on musical scale - use warmer scales
    const notePos = (facetIndex % 12) / 12;
    // Choose scale based on facet properties for variety
    const scaleChoice = facetIndex % 3 === 0 ? 'earthyScale' : 
                       (facetIndex % 3 === 1 ? 'warmPentatonic' : 'richScale');
    const baseFreq = getFrequencyFromScale(scaleChoice, notePos);
    
    // Smaller frequency variation for more consistent tonality
    const freqVariation = baseFreq * 0.025 * (pos.u - 0.5);
    const frequency = baseFreq + freqVariation;

    // Create gain node
    const gainNode = audioContext.createGain();

    try {
        // Determine sound type based on facet 
        if (facetIndex % 5 === 0) { // Less frequent FM use (every 5th instead of 4th)
            // Create more musical FM parameters
            const ratio = 1 + (facetIndex % 4) / 8; // Smaller ratio variation
            const fmSynth = createFMSound(frequency, frequency / ratio, 1.5);
            
            if (!fmSynth) return;
            
            fmSynth.carrier.connect(gainNode);
            // Start both oscillators here
            fmSynth.carrier.start();
            fmSynth.modulator.start();

            // Apply gentler ADSR with longer release
            const duration = applyADSR(gainNode, 0.03, 0.2, 0.3, 1.0);

            // Connect to reverb and master
            gainNode.connect(reverbNode);

            // Cleanup
            setTimeout(() => {
                try {
                    fmSynth.carrier.stop();
                    fmSynth.modulator.stop();
                    fmSynth.carrier.disconnect();
                    fmSynth.modulator.disconnect();
                    fmSynth.modulatorGain.disconnect();
                    gainNode.disconnect();
                } catch (err) {
                    console.warn('Error during FM synthesis cleanup:', err);
                }
            }, duration * 1000 + 50);
        } else {
            // Use harmonic oscillators with refined settings
            const { oscillators, gains } = createHarmonicOscillators(
                frequency,
                oscillatorTypes[facetIndex % oscillatorTypes.length]
            );
            
            if (oscillators.length === 0) return;
            
            // Start oscillators
            oscillators.forEach(osc => osc.start());

            // Connect to gain node
            gains.forEach(gain => gain.connect(gainNode));

            // Apply nuanced ADSR settings based on facet properties
            // Higher notes get faster attack, lower notes get longer release
            const isHigherNote = frequency > 200;
            const attackTime = isHigherNote ? 0.02 : 0.04;
            const releaseTime = isHigherNote ? 0.6 : 1.0;
            
            const duration = applyADSR(gainNode, attackTime, 0.2, 0.4, releaseTime);

            // Connect to reverb and master
            gainNode.connect(reverbNode);

            // Cleanup
            setTimeout(() => {
                try {
                    oscillators.forEach(osc => {
                        osc.stop();
                        osc.disconnect();
                    });
                    gains.forEach(gain => gain.disconnect());
                    gainNode.disconnect();
                } catch (err) {
                    console.warn('Error during oscillator cleanup:', err);
                }
            }, duration * 1000 + 50);
        }
    } catch (error) {
        console.error('Error playing facet sound:', error);
    }
}

/**
 * Resume audio context - call this on user interaction
 */
function resumeAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(error => {
            console.error('Failed to resume AudioContext:', error);
        });
    }
}

// Export functions
export {
    initializeAudio,
    playFacetSound,
    resumeAudioContext
};
