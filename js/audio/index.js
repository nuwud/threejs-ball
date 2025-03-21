// audio/index.js - Main entry point for audio system
import { listener, setupAudio, initAudioEffects, mapToFrequency, playToneForPosition, stopTone, setupAudioAnalyzer } from './core.js';
import { SoundSynthesizer } from './synthesizer.js';
import { createAudioVisualization, updateAudioVisualization } from './visualization.js';
import { soundManager, createNoiseGenerator } from './utils.js';

// Export all audio components
export {
    listener,
    soundManager,
    setupAudio,
    initAudioEffects,
    setupAudioAnalyzer,
    createAudioVisualization,
    updateAudioVisualization,
    playToneForPosition,
    stopTone,
    mapToFrequency,
    SoundSynthesizer,
    createNoiseGenerator
};