// audio/core.js - Core audio system functionality
import * as THREE from 'three';
import { SoundSynthesizer } from './synthesizer.js';

// Create an audio listener for 3D audio
const listener = new THREE.AudioListener();

// Setup audio system
function setupAudio(app) {
    try {
        // Initialize Web Audio API
        app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Make sure to resume the AudioContext on first user interaction
        if (app.audioContext.state === 'suspended') {
            app.audioContext.resume().then(() => {
                console.log("AudioContext successfully resumed");
            }).catch(err => {
                console.error("Failed to resume AudioContext:", err);
            });
        }
        
        // Create sound synthesizer
        app.soundSynth = new SoundSynthesizer(app.audioContext);
        
        console.log("Audio system initialized");
        return app.soundSynth;
    } catch (e) {
        console.error("Web Audio API not supported:", e);
        return null;
    }
}

// Initialize Web Audio API synthesizer and effects
function initAudioEffects(app) {
    if (!app.audioContext) {
        try {
            app.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Resume the AudioContext (needed in some browsers like Chrome)
            if (app.audioContext.state === 'suspended') {
                const resumeAudio = function() {
                    if (app.audioContext.state === 'suspended') {
                        app.audioContext.resume().then(() => {
                            console.log("AudioContext successfully resumed");
                            
                            // Remove the event listeners once audio is resumed
                            document.removeEventListener('click', resumeAudio);
                            document.removeEventListener('touchstart', resumeAudio);
                            document.removeEventListener('mousedown', resumeAudio);
                            document.removeEventListener('keydown', resumeAudio);
                        }).catch(err => {
                            console.error("Failed to resume AudioContext:", err);
                        });
                    }
                };
                
                // Add event listeners for user interactions
                document.addEventListener('click', resumeAudio);
                document.addEventListener('touchstart', resumeAudio);
                document.addEventListener('mousedown', resumeAudio);
                document.addEventListener('keydown', resumeAudio);
            }
            
            // Create our synthesizer
            app.soundSynth = new SoundSynthesizer(app.audioContext);
            
            console.log("Audio effects initialized");
        } catch (e) {
            console.error("Web Audio API not supported:", e);
        }
    }
}

// Map a value to a frequency range (for mouse movement)
function mapToFrequency(value, min, max, freqMin = 220, freqMax = 880) {
    return freqMin + ((value - min) / (max - min)) * (freqMax - freqMin);
}

// Play a tone based on position
function playToneForPosition(app, x, y) {
    if (!app.soundSynth) return;
    
    // Ensure the audio context is running
    if (app.audioContext && app.audioContext.state === 'suspended') {
        app.audioContext.resume().catch(err => {
            console.error("Failed to resume AudioContext:", err);
        });
    }
    
    // Use the improved synthesizer for position-based sounds
    app.soundSynth.playPositionSound(x, y);
}

// Play a sound when crossing facet boundaries
function playFacetSound(app, facetIndex) {
    if (!app.soundSynth) return;
    
    // Ensure the audio context is running
    if (app.audioContext && app.audioContext.state === 'suspended') {
        app.audioContext.resume().catch(err => {
            console.error("Failed to resume AudioContext:", err);
        });
    }
    
    // Play a facet-specific sound with a medium intensity
    app.soundSynth.playFacetSound(facetIndex, 0.7);
}

// Play a click sound
function playClickSound(app) {
    if (!app.soundSynth) return;
    
    // Ensure the audio context is running
    if (app.audioContext && app.audioContext.state === 'suspended') {
        app.audioContext.resume().catch(err => {
            console.error("Failed to resume AudioContext:", err);
        });
    }
    
    // Play a pleasant chord
    app.soundSynth.playClickSound();
}

// Play a release sound
function playReleaseSound(app) {
    if (!app.soundSynth) return;
    
    // Ensure the audio context is running
    if (app.audioContext && app.audioContext.state === 'suspended') {
        app.audioContext.resume().catch(err => {
            console.error("Failed to resume AudioContext:", err);
        });
    }
    
    // Play a different chord
    app.soundSynth.playReleaseSound();
}

// Stop playing the tone
function stopTone(app) {
    if (!app.soundSynth) return;
    
    // Stop all currently playing sounds
    app.soundSynth.stopAllSounds();
}

// Create an audio analyzer to visualize sound
function setupAudioAnalyzer(app) {
    if (!app.audioContext) return;
    
    // Create an analyzer node
    app.analyser = app.audioContext.createAnalyser();
    app.analyser.fftSize = 256;
    app.bufferLength = app.analyser.frequencyBinCount;
    app.audioDataArray = new Uint8Array(app.bufferLength);
    
    // Connect analyzer to the audio context
    if (app.soundSynth && app.soundSynth.masterGain) {
        app.soundSynth.masterGain.connect(app.analyser);
    }
    
    console.log("Audio analyzer set up");
}

// Create visualization for sound
function createAudioVisualization(app) {
    if (!app.audioContext) return;
    
    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;
    
    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );
        
        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );
        
        visualizationGroup.add(cube);
    }
    
    app.scene.add(visualizationGroup);
    
    // Store it for updates
    app.scene.userData.audioVisualization = visualizationGroup;
}

// Update audio visualization
function updateAudioVisualization(app) {
    if (!app.audioContext || !app.scene.userData.audioVisualization) return;
    
    // Get frequency data
    if (!app.analyser || !app.audioDataArray) return;
    
    // Get frequency data
    app.analyser.getByteFrequencyData(app.audioDataArray);
    
    // Update visualization cubes
    const visualization = app.scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * app.audioDataArray.length);
        const value = app.audioDataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

// Test audio functionality to make sure it's working
function testAudio(app) {
    if (!app.audioContext || !app.soundSynth) {
        console.warn("Cannot test audio: AudioContext or SoundSynthesizer not available");
        return;
    }
    
    console.log("Testing audio functionality...");
    
    // Play a test sound to verify audio is working
    const testNote = 440; // A4 note
    app.soundSynth.playWarmPad(testNote, 0.5);
    
    console.log("Audio test completed");
}

// Ensure audio is properly initialized
function ensureAudioInitialized(app) {
    if (!app.audioContext || !app.soundSynth) {
        console.log("Initializing audio on demand");
        setupAudio(app);
        setupAudioAnalyzer(app);
        
        if (app.audioContext && app.audioContext.state === 'suspended') {
            app.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
                testAudio(app);
            }).catch(err => {
                console.error("Failed to resume AudioContext:", err);
            });
        } else {
            testAudio(app);
        }
        
        return true;
    }
    
    return false;
}

// Export functions and objects
export {
    listener,
    setupAudio,
    initAudioEffects,
    mapToFrequency,
    playToneForPosition,
    playFacetSound,
    playClickSound,
    playReleaseSound,
    stopTone,
    setupAudioAnalyzer,
    createAudioVisualization, 
    updateAudioVisualization,
    testAudio,
    ensureAudioInitialized
};