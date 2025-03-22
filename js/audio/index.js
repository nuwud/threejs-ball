/**
 * index.js
 * Main audio system exports for Three.js Interactive Ball
 */

import * as THREE from 'three';
import { createAudioVisualizer } from './visualization.js';
import { 
    initializeAudio, 
    getAudioContext, 
    getMasterGain,
    resumeAudio,
    ensureAudioInitialized,
    isInitialized,
    setMasterVolume,
    getAudioStatus
} from './core.js';
import { SoundSynthesizer } from './synthesizer.js';

// Create a THREE.js Audio Listener for 3D spatial audio
export const listener = new THREE.AudioListener();

// Re-export core functionality
export * from './core.js';

// Re-export SoundSynthesizer
export { SoundSynthesizer };

// Setup function for basic audio initialization
export function setupAudio(app) {
    // Initialize audio context if needed
    ensureAudioInitialized(app);
}

// Setup audio analyzer
export function setupAudioAnalyzer(app) {
    if (!app.audioContext) {
        console.warn("Cannot set up audio analyzer: AudioContext not available");
        return;
    }
    
    try {
        // Create analyzer node
        const analyser = app.audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        
        // Connect to master output
        const masterGain = getMasterGain();
        if (masterGain) {
            masterGain.connect(analyser);
        }
        
        // Store the analyzer in the app
        app.analyser = analyser;
        app.analyserData = new Uint8Array(analyser.frequencyBinCount);
        
        console.log("Audio analyzer set up successfully");
    } catch (error) {
        console.error("Error setting up audio analyzer:", error);
    }
}

// Create audio visualization adapter function
export function createAudioVisualization(app) {
    if (!app.audioContext || !app.analyser) {
        console.warn("Cannot create audio visualization: AudioContext or Analyser not available");
        return;
    }
    
    // Create visualization mesh
    const visualizerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const visualizerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    const visualizerContainer = new THREE.Group();
    app.scene.add(visualizerContainer);
    
    // Create audio bars
    const numBars = 32;
    const bars = [];
    
    for (let i = 0; i < numBars; i++) {
        const bar = new THREE.Mesh(visualizerGeometry, visualizerMaterial);
        const angle = (i / numBars) * Math.PI * 2;
        bar.position.x = Math.cos(angle) * 1.5;
        bar.position.z = Math.sin(angle) * 1.5;
        bar.scale.y = 0.1;
        visualizerContainer.add(bar);
        bars.push(bar);
    }
    
    app.audioVisualization = {
        container: visualizerContainer,
        bars: bars
    };
    
    console.log("Audio visualization created");
}

// Update audio visualization
export function updateAudioVisualization(app) {
    if (!app.analyser || !app.audioVisualization) return;
    
    // Get frequency data
    app.analyser.getByteFrequencyData(app.analyserData);
    
    // Update visualization
    const bars = app.audioVisualization.bars;
    const dataLength = app.analyserData.length;
    
    for (let i = 0; i < bars.length; i++) {
        const index = Math.floor(i * dataLength / bars.length);
        const value = app.analyserData[index] / 255; // Normalize to 0-1
        
        // Update bar height
        bars[i].scale.y = 0.1 + value * 2;
    }
}

// Create and export a convenient audio API for ball interactions

// Singleton synthesizer instance
let synthInstance = null;

/**
 * Get or create the global synthesizer instance
 * @returns {SoundSynthesizer} The global synthesizer instance
 */
export function getSynthesizer() {
    if (!synthInstance) {
        synthInstance = new SoundSynthesizer({ analyze: true });
        
        // Initialize the synthesizer (will not throw even if audio isn't ready)
        synthInstance.initialize().catch(error => {
            console.error('Error initializing synthesizer:', error);
        });
    }
    
    return synthInstance;
}

/**
 * Create sound effects for ball interaction
 * @param {Object} ball - The 3D ball object
 * @returns {Object} Sound control functions
 */
export function createBallSoundEffects(ball) {
    const synth = getSynthesizer();
    
    // Object to store active sound references for the ball
    const activeSounds = {
        movement: null,
        ambience: null
    };
    
    // Start ambient sound
    function startAmbience() {
        if (!isInitialized()) return;
        
        if (!activeSounds.ambience || !activeSounds.ambience.isActive) {
            activeSounds.ambience = synth.playAmbience({
                volume: 0.2,
                pitch: 0.8 + Math.random() * 0.4
            });
        }
    }
    
    // Play collision sound
    function playCollision(intensity = 1.0) {
        if (!isInitialized()) return;
        
        synth.playImpact({
            intensity: intensity
        });
    }
    
    // Play movement sound
    function playMovement(speed) {
        if (!isInitialized()) return;
        
        // Only create a new movement sound if none is active or speed changed significantly
        const shouldCreateNew = !activeSounds.movement || 
                               !activeSounds.movement.isActive || 
                               (activeSounds.movement._lastSpeed && 
                                Math.abs(activeSounds.movement._lastSpeed - speed) > 0.3);
        
        if (shouldCreateNew) {
            // Stop previous movement sound if any
            if (activeSounds.movement && activeSounds.movement.isActive) {
                activeSounds.movement.stop();
            }
            
            // Create new movement sound
            activeSounds.movement = synth.playWhoosh({
                speed: speed,
                volume: Math.min(0.5, speed * 0.4)
            });
            
            // Store speed for comparison
            if (activeSounds.movement) {
                activeSounds.movement._lastSpeed = speed;
            }
        }
    }
    
    // Play interaction sound
    function playInteraction(type = 'click') {
        if (!isInitialized()) return;
        
        switch (type) {
            case 'click':
                synth.playPing({
                    pitch: 1.2,
                    volume: 0.6
                });
                break;
                
            case 'hover':
                synth.playPing({
                    pitch: 0.8,
                    volume: 0.3
                });
                break;
                
            case 'mode':
                synth.playPing({
                    pitch: 1.5,
                    volume: 0.7,
                    important: true
                });
                break;
        }
    }
    
    // Stop all ball sounds
    function stopAllSounds() {
        if (activeSounds.movement && activeSounds.movement.isActive) {
            activeSounds.movement.stop();
        }
        
        if (activeSounds.ambience && activeSounds.ambience.isActive) {
            activeSounds.ambience.stop();
        }
    }
    
    // Create event handlers for the ball
    function setupBallEvents() {
        if (!ball) return;
        
        try {
            // Start ambient sound on first interaction
            ball.addEventListener('interaction', startAmbience);
            
            // Play collision sound when ball collides
            ball.addEventListener('collision', (event) => {
                const intensity = event.intensity || 1.0;
                playCollision(intensity);
            });
            
            // Play movement sound when ball moves fast
            ball.addEventListener('move', (event) => {
                const speed = event.speed || 0;
                
                if (speed > 0.2) {
                    playMovement(speed);
                }
            });
            
            // Play interaction sounds
            ball.addEventListener('click', () => {
                playInteraction('click');
            });
            
            ball.addEventListener('hover', () => {
                playInteraction('hover');
            });
            
            ball.addEventListener('modeChange', () => {
                playInteraction('mode');
            });
        } catch (error) {
            console.warn('Error setting up ball events:', error);
        }
    }
    
    // Return public API
    return {
        setupBallEvents,
        playCollision,
        playMovement,
        playInteraction,
        startAmbience,
        stopAllSounds
    };
}