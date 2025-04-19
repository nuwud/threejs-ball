import { connectAudioToBall } from './audio.js'; // Assuming connectAudioToBall is exported from audio.js

// Remove existing sceneReady listener or setTimeout logic if present

window.addEventListener('ballReady', () => {
  console.log("ballReady event received by connector.");
  const scene = window.app?.scene;
  // Use getObjectByName to find the specific ball group
  const ball = scene?.getObjectByName("BallGroup");

  if (scene && ball) {
    console.log("BallGroup found, connecting audio...");
    connectAudioToBall(scene, ball); // Pass the found ball group
  } else {
    console.warn("BallGroup or scene not found when ballReady event fired.");
    // Optional: Add retry logic here if needed, though ballReady should guarantee presence
    if (!scene) console.warn("Scene was not available.");
    if (!ball) console.warn("BallGroup was not found by name.");
  }
});

// Ensure any old logic trying to find the ball via traversal or setTimeout is removed.

// ✅ Correct imports:
import { AudioNodePool } from '../fixes/utils/node-pool.js';
import { SoundSynthesizer } from '../fixes/audio/synthesis/synthesizer.js';
// ... other imports like THREE ...

// Ensure AudioContext is initialized once
let audioContext;
try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.error("Web Audio API is not supported in this browser.", e);
    // Handle the error appropriately, maybe disable audio features
}

// Instantiate the node pool and synthesizer *once*
let nodePool;
let soundSynth; // Use 'let' if it might be reassigned, 'const' if not.

if (audioContext) {
    nodePool = new AudioNodePool(audioContext, 'GainNode', 24);
    soundSynth = new SoundSynthesizer(audioContext, nodePool); // Pass the nodePool instance
} else {
    // Handle case where audio context failed to initialize
    console.warn("Audio system disabled because AudioContext could not be created.");
    // Assign dummy objects or null to prevent errors later if needed
    nodePool = null;
    soundSynth = null; // Or a dummy object with no-op methods
}

// Store the synthesizer instance for access, e.g., on the app object or globally (use carefully)
// Assuming 'app' is passed into connectAudioToBall or accessible somehow
// app.audioSystem = soundSynth; // Example: attaching to an 'app' object

// Wrap function definition to prevent redeclaration error
if (typeof connectAudioToBall === 'undefined') {
    function connectAudioToBall(app, ball) {
        // Make sure soundSynth is available
        if (!soundSynth) {
            console.warn("Audio system not initialized, cannot connect audio to ball.");
            return;
        }

        // Example usage within the function or event listeners:
        // Assuming you have frequency (freq) and volume (vol) calculated
        // let freq = calculateFrequency(...);
        // let vol = calculateVolume(...);
        // let facetId = getFacetId(...); // Important for managing voices

        // Optional Debug Enhancer & Safety Check:
        // console.log('Attempting to play sound. Pool:', soundSynth?.nodePool);
        // console.log('acquire available?', typeof soundSynth?.nodePool?.acquire);

        // Check if the audio system and method exist, and respect mute toggle
        // if (soundSynth?.playFacetSound && !window.debugToggles?.mute) {
        //    soundSynth.playFacetSound(freq, vol, facetId);
        // } else if (!soundSynth?.playFacetSound) {
        //     console.warn("playFacetSound method not found on soundSynth");
        // }

        // ... rest of the connectAudioToBall logic ...

        // Example of how playFacetSound might be called within an event listener
        ball.addEventListener('collision', (event) => {
             if (!soundSynth) return; // Guard against missing audio system

             const contact = event.contact;
             const impactVelocity = contact.getImpactVelocityAlongNormal();
             const facetIndex = event.facetIndex; // Assuming event provides this

             if (impactVelocity > 0.1 && facetIndex !== undefined) { // Threshold check
                 const baseFreq = 110; // A2
                 const freq = baseFreq * Math.pow(2, facetIndex / 12); // Example frequency calculation
                 const vol = Math.min(1.0, impactVelocity * 0.5); // Example volume calculation

                 // Optional Debug Enhancer & Safety Check:
                 console.log(`Playing sound for facet ${facetIndex}. Freq: ${freq.toFixed(2)}, Vol: ${vol.toFixed(2)}`);
                 console.log('Pool before acquire:', soundSynth?.nodePool);
                 console.log('acquire available?', typeof soundSynth?.nodePool?.acquire);

                 if (soundSynth?.playFacetSound && !(window.debugToggles?.mute)) {
                    soundSynth.playFacetSound(freq, vol, facetIndex); // Pass facetIndex as ID
                 } else if (!soundSynth?.playFacetSound) {
                     console.warn("playFacetSound method not found on soundSynth");
                 } else if (window.debugToggles?.mute) {
                     console.log("Audio muted via debug toggle.");
                 }
             }
        });

         // Example for stopping sound on separation (if needed)
         ball.addEventListener('separation', (event) => {
             if (!soundSynth) return;
             const facetIndex = event.facetIndex; // Assuming event provides this
             if (facetIndex !== undefined) {
                 // console.log(`Stopping sound for facet ${facetIndex}`);
                 // soundSynth.stopNote(facetIndex); // Stop the specific note
             }
         });


        // Make sure 'app' has access to the audio system if needed elsewhere
        if (app) {
            app.audioSystem = soundSynth;
        }
    }
}

// Export or call connectAudioToBall as needed by your application structure
// export { connectAudioToBall };
// Or maybe it's called directly:
// connectAudioToBall(myAppInstance, myBallInstance);
