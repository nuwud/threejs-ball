// Ensure correct import paths for the fixed versions
import { AudioNodePool } from '../fixes/utils/node-pool.js';
import { SoundSynthesizer } from '../fixes/audio/synthesis/synthesizer.js';
// ... other imports ...

class SoundManager {
    constructor(audioContext) {
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.globalGain = this.audioContext.createGain();
        this.globalGain.gain.value = 0.5; // Default volume
        this.globalGain.connect(this.audioContext.destination);

        // Correctly instantiate AudioNodePool
        this.nodePool = new AudioNodePool(this.audioContext, 'GainNode', 24); // Example size

        // Pass the nodePool INSTANCE to the synthesizer
        this.soundSynth = new SoundSynthesizer(this.audioContext, this.nodePool, this.globalGain);

        // ... existing constructor code ...
    }

    // Example of wrapping a sound play call with the debug toggle
    playHoverSound(intensity) {
        // Check the global mute toggle before playing
        if (window.debugToggles && window.debugToggles.mute) {
            if (window.debugToggles.verbose) console.log("Sound muted via debug toggle (hover).");
            return;
        }
        if (this.soundSynth) {
            this.soundSynth.playHoverSound(intensity);
        }
    }

    playCollisionSound(velocity) {
         // Check the global mute toggle before playing
        if (window.debugToggles && window.debugToggles.mute) {
            if (window.debugToggles.verbose) console.log("Sound muted via debug toggle (collision).");
            return;
        }
        if (this.soundSynth) {
            this.soundSynth.playCollisionSound(velocity);
        }
    }

    playSpecialSound(type) {
         // Check the global mute toggle before playing
        if (window.debugToggles && window.debugToggles.mute) {
            if (window.debugToggles.verbose) console.log(`Sound muted via debug toggle (${type}).`);
            return;
        }
        // Debounce or remove this call if it's causing loops
        console.log(`Playing ${type}: (implementation needed in SoundSynthesizer)`);
        // Example: if (this.soundSynth && typeof this.soundSynth.playSpecialSound === 'function') {
        //     this.soundSynth.playSpecialSound(type);
        // }
    }

    // ... other methods ...
}

// Export or instantiate the manager as needed
export const soundManager = new SoundManager();
