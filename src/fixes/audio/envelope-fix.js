import * as Tone from 'tone';
import { soundSynth } from './synths';

/**
 * Audio envelope fix for Three.js ball
 * Fixes scratchy whistle sounds with proper audio envelope management
 */

(function() {
  console.log("🔊 Applying audio envelope fix...");

  function fixEnvelope() {
    console.log('Applying envelope fix.');
    // Ensure envelope release is not too short
    if (soundSynth.envelope && soundSynth.envelope.release < 0.05) {
      soundSynth.envelope.release = 0.05;
      console.log('Adjusted synth envelope release.');
    }
    // Add any other necessary fixes here
  }

  // Listen for the audioReady event instead of polling
  window.addEventListener('audioReady', () => {
    console.log('Audio ready event received in envelope-fix.');
    fixEnvelope();
  });

  // Example function to contain the rest of the script's logic
  function initializeEnvelopeFix() {
    console.log("🚀 Initializing envelope fix logic...");

    // Enhanced facet sound with proper envelope
    function enhancedPlayFacetSound(app, facetIndex, position = null) {
      if (!app.audioContext || app.audioContext.state !== 'running') return;

      try {
        // Get normalized position (default to center)
        const pos = position || { u: 0.5, v: 0.5 };
        
        // Calculate musical scale frequency based on facet index
        // Using pentatonic scale for pleasant sounds
        const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // Pentatonic across multiple octaves
        const baseFreq = 220; // A3
        const scaleIndex = facetIndex % scale.length;
        const octaveShift = Math.floor(facetIndex / scale.length) % 3;
        const semitones = scale[scaleIndex] + (octaveShift * 12);
        const frequency = baseFreq * Math.pow(2, semitones / 12);
        
        // Add variation based on position within facet
        const posVariation = (pos.u * 2 - 1) * 15; // +/- 15 cents
        
        // Create oscillator with clean envelope
        const oscillator = app.audioContext.createOscillator();
        const gainNode = app.audioContext.createGain();
        
        // Use sine or triangle waves for smoother tones
        oscillator.type = (facetIndex % 2 === 0) ? 'sine' : 'triangle';
        oscillator.frequency.value = frequency;
        oscillator.detune.value = posVariation; // Subtle variation
        
        // Start with zero gain to avoid clicks
        gainNode.gain.value = 0;
        
        // Connect nodes
        oscillator.connect(gainNode);
        
        // Connect to destination (use masterGain if available)
        const destination = app.masterGain || app.audioContext.destination;
        gainNode.connect(destination);
        
        // Start oscillator
        oscillator.start();
        
        // Apply smooth ADSR envelope - key to fixing scratchy sounds
        const now = app.audioContext.currentTime;
        
        // Attack - gradual ramp up (15ms)
        gainNode.gain.linearRampToValueAtTime(0.00001, now); // Start at near-zero
        gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.015); // Fast gentle attack
        
        // Decay and Sustain - gentle decay to sustain level (100ms)
        gainNode.gain.exponentialRampToValueAtTime(0.15, now + 0.1);
        
        // Release - smooth fade out (200ms)
        gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);
        
        // Cleanup after sound completes
        setTimeout(() => {
          try {
            oscillator.stop();
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 350);
        
        return true;
      } catch (error) {
        console.error("Error in enhanced facet sound:", error);
        return false;
      }
    }

    // Replace the original functions with our enhanced versions
    function patchAudioFunctions() {
      if (typeof window.app.playFacetSound === 'function') {
        window.app.originalPlayFacetSound = window.app.playFacetSound;
        window.app.playFacetSound = enhancedPlayFacetSound;
        console.log("Replaced app.playFacetSound with enhanced version");
      }
    }
    
    patchAudioFunctions();
    console.log("🎵 Audio fix successfully applied! Tones should now sound clean and musical.");
  }

  // Start the fix
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initializeEnvelopeFix, 500);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initializeEnvelopeFix, 500));
  }
})();
