import * as Tone from 'tone';
import { loadSounds } from './soundManager';
import { setAudioReadyFlag } from './safe-audio-utils'; // Import the setter

/**
 * Initializes the audio context and loads sounds.
 * Requires user interaction (e.g., a click) to start the audio context.
 */
export async function setupAudio() {
	// Add a listener for the first user interaction to start Tone.js
	const startAudio = async () => {
		try {
			await Tone.start();
			console.log('Audio context started successfully.');
			await loadSounds(); // Load sounds after context is ready
			console.log('Sounds loaded.');
			// Dispatch an event indicating audio is ready
			window.dispatchEvent(new CustomEvent('audioReady'));
			// Set the flag
			setAudioReadyFlag(true);
		} catch (error) {
			console.error('Failed to start audio context or load sounds:', error);
			setAudioReadyFlag(false); // Ensure flag is false on error
		} finally {
			// Remove the event listeners after the first interaction
			document.removeEventListener('click', startAudio);
			document.removeEventListener('keydown', startAudio);
		}
	};

	// Add event listeners for user interaction
	document.addEventListener('click', startAudio);
	document.addEventListener('keydown', startAudio);
}