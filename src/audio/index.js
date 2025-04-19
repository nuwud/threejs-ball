/**
 * index.js
 * Main audio system exports for Three.js Interactive Ball
 */

import * as THREE from 'three';
import { 
    toggleAudioVisualization
} from './visualization/core.js';
import { 
    initializeAudio, 
    getAudioContext, 
    getMasterGain,
    resumeAudio,
    ensureAudioInitialized,
    setMasterVolume,
    getAudioStatus
} from './core.js';
// Import isInitialized from synthesizer.js instead of core.js
import { SoundSynthesizer, isInitialized } from './synthesis/synthesizer.js';

// Create a THREE.js Audio Listener for 3D spatial audio
export const listener = new THREE.AudioListener();

// Re-export core functionality
export * from './core.js';

// Re-export SoundSynthesizer and isInitialized
export { SoundSynthesizer, isInitialized };

/**
 * Set up audio systems for the application
 * @param {Object} app - The application object
 * @returns {Promise<boolean>} Promise that resolves when audio is set up
 */
export function setupAudio(app) {
    if (!app) return Promise.resolve(false);
    
    return new Promise(async (resolve) => {
        try {
            // Initialize audio context if not already done
            if (!app.audioContext) {
                app.audioContext = getAudioContext();
            }
            
            // Ensure audio is initialized through the core system
            await ensureAudioInitialized(app);
            
            // Create synthesizer if not exists
            if (!app.soundSynth) {
                app.soundSynth = getSynthesizer();
                console.log("Created synthesizer during setupAudio");
            }
            
            // Init sound manager if available
            if (typeof soundManager?.init === 'function' && !soundManager.initialized) {
                soundManager.init();
                app.soundManager = soundManager;
            }
            
            // Try to resume the audio context if it's suspended
            if (app.audioContext.state === 'suspended') {
                try {
                    await app.audioContext.resume();
                    console.log('Audio context resumed during setup');
                } catch (err) {
                    console.warn('Could not resume audio context:', err);
                }
            }
            
            console.log("Audio setup initialized");
            resolve(true);
        } catch (error) {
            console.error("Error setting up audio:", error);
            resolve(false);
        }
    });
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
        bars: bars,
        active: false // Default to inactive
    };
    
    // Hide the visualization by default
    visualizerContainer.visible = false;
    
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

/**
 * Initialize audio and connect to the app
 * @param {Object} app - The application object
 * @returns {Promise<boolean>} Promise that resolves when audio is initialized
 */
export async function initAudio(app = window.app) {
    if (!app) {
        console.warn("No app object provided to initAudio");
        app = window.app || {};
        window.app = app;
    }
    
    try {
        // Create audio context
        if (!app.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            app.audioContext = new AudioContext();
        }
        
        // Resume the context if suspended
        if (app.audioContext.state === 'suspended') {
            try {
                await app.audioContext.resume();
                console.log("Audio context resumed");
            } catch (err) {
                console.warn("Could not resume audio context:", err);
            }
        }
        
        // Create master gain node
        if (!app.masterGain) {
            app.masterGain = app.audioContext.createGain();
            app.masterGain.gain.value = 0.5; // 50% volume by default
            app.masterGain.connect(app.audioContext.destination);
        }
        
        // Setup synthesizer
        if (!app.soundSynth) {
            app.soundSynth = new SoundSynthesizer({ analyze: true });
            await app.soundSynth.initialize();
        }
        
        // Set up audio analyzer
        if (!app.analyser) {
            setupAudioAnalyzer(app);
        }
        
        // Mark as initialized
        app.audioInitialized = true;
        
        return true;
    } catch (error) {
        console.error("Error initializing audio:", error);
        return false;
    }
}

// Create a function to manually trigger sound test
export function testAudioSystem(app = window.app) {
    if (!app) return false;
    
    try {
        console.log("Testing audio system...");
        
        // Ensure audio is initialized
        if (!app.audioContext) {
            console.log("Initializing audio for test...");
            initAudio(app);
        }
        
        // Play a test sound using different methods
        if (app.soundSynth) {
            console.log("Playing test sound with synthesizer...");
            if (typeof app.soundSynth.playClickSound === 'function') {
                app.soundSynth.playClickSound();
            } else if (typeof app.soundSynth.createTone === 'function') {
                app.soundSynth.createTone({
                    frequency: 440,
                    volume: 0.5,
                    duration: 0.5
                });
            }
        } else if (app.soundManager) {
            console.log("Playing test sound with sound manager...");
            app.soundManager.play('click');
        } else {
            console.log("No sound system available for testing");
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("Error testing audio system:", error);
        return false;
    }
}

// Make all important functions available globally
window.initAudio = initAudio;
window.testAudioSystem = testAudioSystem;
window.setupAudio = setupAudio;
window.playSound = (name) => {
    const app = window.app || {};
    if (app.soundManager) {
        app.soundManager.play(name);
    }
};

export * from './core.js';
export * from './synthesis/synthesizer.js';
export { setupEnhancedAudio } from './setup/enhanced-setup.js';
export { 
    playFacetSound, 
    playToneForPosition,
    enableContinuousSoundMode 
} from './setup/enhanced-functions.js';