// ... other imports and setup ...
import { getSynthesizer } from './soundSynth.js'; // Assuming soundSynth is here

export function setupAudio() {
    // ... existing setup logic ...
    window.app.soundSynth = getSynthesizer();
    // Assign wrapper functions to window.app if they aren't already
    window.app.playFacetSound = playFacetSound;
    window.app.playClickSound = playClickSound;
    // ... other assignments ...
    console.log("Audio setup complete, soundSynth assigned.");
}

// Example wrapper function for playing a facet sound
export function playFacetSound(note = 'C4', duration = '8n') {
    // Guard the call to the synthesizer method
    if (window.app?.soundSynth?.triggerAttackRelease) {
        console.log(`Playing facet sound: ${note}`);
        window.app.soundSynth.triggerAttackRelease(note, duration);
    } else {
        console.warn("Attempted to play facet sound, but soundSynth is not ready.");
    }
}

// Example wrapper function for playing a click sound
export function playClickSound(note = 'G2', duration = '16n', velocity = 0.5) {
    // Guard the call to the synthesizer method
    if (window.app?.soundSynth?.triggerAttackRelease) {
        console.log(`Playing click sound: ${note}`);
        // Assuming triggerAttackRelease can handle velocity or you have another method
        window.app.soundSynth.triggerAttackRelease(note, duration, undefined, velocity);
    } else {
        console.warn("Attempted to play click sound, but soundSynth is not ready.");
    }
}

// Add similar guards to any other functions that directly call methods on window.app.soundSynth

export function connectAudioToBall(scene, ball) {
    // ... existing connection logic ...
    console.log("Connecting audio logic to ball:", ball.name);
    // Ensure any audio playback triggered within this function also uses guarded calls
    // e.g., if collision detection triggers sounds:
    // ball.userData.onCollision = (impactVelocity) => {
    //     const note = calculateNoteFromVelocity(impactVelocity);
    //     playFacetSound(note); // Uses the guarded function
    // };
    // ...
}

// ... rest of audio.js 