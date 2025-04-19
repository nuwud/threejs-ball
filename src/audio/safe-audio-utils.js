import * as Tone from 'tone';
import { soundManager } from './soundManager';
import { soundSynth } from './synths'; // Assuming soundSynth is exported from synths.js

let isAudioReady = false;

/**
 * Sets the audio readiness flag.
 * @param {boolean} ready - Whether the audio context is ready.
 */
export function setAudioReadyFlag(ready) {
	isAudioReady = ready;
	console.log(`Audio ready state set to: ${isAudioReady}`);
}

/**
 * Checks if the audio context is ready.
 * @returns {boolean} True if audio is ready, false otherwise.
 */
export function getAudioReadyFlag() {
	return isAudioReady;
}

/**
 * Safely triggers the synth sound if audio is ready.
 * Maps velocity to synth parameters.
 * @param {number} velocity - The collision velocity.
 */
export function playSafeSynth(velocity) {
	if (!isAudioReady) {
		console.log('Audio not ready, skipping synth sound.');
		return;
	}
	try {
		const note = 60 + Math.random() * 10; // Example: Base note C4 + random offset
		const volume = Math.min(-10 + velocity * 5, 0); // Map velocity to volume (dB)
		const duration = Math.max(0.1, 0.5 - velocity * 0.1); // Map velocity to duration

		console.log(`Playing synth: Note=${note.toFixed(1)}, Vol=${volume.toFixed(1)}, Dur=${duration.toFixed(1)}`);
		soundSynth.volume.value = volume;
		soundSynth.triggerAttackRelease(Tone.Frequency(note, 'midi').toNote(), duration, Tone.now());
	} catch (error) {
		console.error('Error playing synth sound:', error);
	}
}

/**
 * Safely plays a sound from the soundManager if audio is ready.
 * @param {string} soundName - The name of the sound to play (e.g., 'click').
 */
export function playSafeSound(soundName) {
	if (!isAudioReady) {
		console.log(`Audio not ready, skipping sound: ${soundName}`);
		return;
	}
	try {
		console.log(`Playing sound: ${soundName}`);
		soundManager.play(soundName);
	} catch (error) {
		console.error(`Error playing sound "${soundName}":`, error);
	}
}
