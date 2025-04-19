import * as THREE from 'three';
import { 
    soundManager, 
    connectAudioToBall, 
    playFacetSound, 
    playEnhancedFacetSound,
    registerCallbacks,
    initializeAudio
} from './core.js';

/**
 * Ball Audio Connector
 * 
 * This module connects the audio system to the existing ball implementation.
 * It hooks into the ball's interaction events to trigger appropriate sounds.
 */

// Initialize the audio system when the module loads
initializeAudio().catch(error => {
    console.error("Failed to initialize audio system:", error);
});

// Register callbacks for audio system events
registerCallbacks({
    onInitialized: () => {
        console.log("Audio system initialized successfully");
    },
    onError: (error) => {
        console.error("Audio system error:", error);
    },
    onQualityChanged: (level) => {
        console.log(`Audio quality changed to ${level}`);
    }
});

/**
 * Connect audio to the existing ball implementation
 * @param {Object} ball - The ball object
 * @param {Object} options - Configuration options
 * @returns {Object} The ball with audio capabilities
 */
export function connectAudioToExistingBall(ball, options = {}) {
    if (!ball) {
        console.error("Cannot connect audio to null ball object");
        return null;
    }

    // Make sure we have the app reference
    const app = window.app || {};
    
    // Initialize audio if not already done
    if (!app.audioContext) {
        if (typeof window.initializeAudio === 'function') {
            window.initializeAudio().catch(err => console.warn("Error initializing audio:", err));
        } else if (typeof initializeAudio === 'function') {
            initializeAudio().catch(err => console.warn("Error initializing audio:", err));
        }
    }
    
    // Initialize sound synthesizer if not already created
    if (!app.soundSynth) {
        if (typeof getSynthesizer === 'function') {
            app.soundSynth = getSynthesizer();
            console.log("Created sound synthesizer for ball");
        } else if (window.audioSystem && typeof window.audioSystem.getSynthesizer === 'function') {
            app.soundSynth = window.audioSystem.getSynthesizer();
            console.log("Created sound synthesizer from audioSystem");
        }
    }
    
    if (!app.soundManager) {
        app.soundManager = soundManager;
    }

    // Standard connectAudioToBall function already exists in core.js
    const enhancedBall = connectAudioToBall(app, ball);

    // Add additional audio features specific to your advanced ball
    
    // Ensure ball has proper event handling
    if (!ball.addEventListener) {
        // Simple event system if not present
        ball.events = {};
        ball.addEventListener = function (event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
        };
        ball.emit = function (event, data) {
            if (this.events[event]) {
                this.events[event].forEach(callback => callback(data));
            }
        };
    }
    
    // Connect to facet interaction events for ball's userData
    const ballGroup = ball.isGroup ? ball : (ball.parent || ball);
    if (ballGroup.userData && ballGroup.userData.mesh) {
        const mesh = ballGroup.userData.mesh;
        
        // Create raycast handler for facet detection
        app.addEventListener = app.addEventListener || function() {};
        app.addEventListener('update', () => {
            if (!app.raycaster || !app.camera || !mesh) return;
            
            // Skip if mouse is not over the ball
            if (!app.isHovered) return;
            
            // Run raycast check
            app.raycaster.setFromCamera(app.mouse, app.camera);
            const intersects = app.raycaster.intersectObject(mesh);
            
            if (intersects.length > 0) {
                const facetIndex = intersects[0].faceIndex || 0;
                const position = intersects[0].uv || { u: 0.5, v: 0.5 };
                
                // Emit facet hover event
                ball.emit('facetHover', { 
                    facet: facetIndex,
                    position: position
                });
                
                // Play facet sound if continuous mode enabled
                if (app.soundManager?.soundSynth?.continuousModeEnabled) {
                    if (typeof app.playFacetSound === 'function') {
                        app.playFacetSound(app, facetIndex, position);
                    } else if (app.soundSynth && typeof app.soundSynth.playFacetSound === 'function') {
                        app.soundSynth.playFacetSound(facetIndex, position);
                    }
                }
            }
        });
    }

    // Connect to interaction events
    ball.addEventListener('click', () => {
        if (app.soundSynth && typeof app.soundSynth.playClickSound === 'function') {
            app.soundSynth.playClickSound();
        } else if (app.soundManager) {
            app.soundManager.play('click');
        }
    });

    ball.addEventListener('hover', () => {
        if (app.soundSynth && typeof app.soundSynth.playTone === 'function') {
            app.soundSynth.playTone(330, 0.1, 0.15); // Play soft tone on hover
        } else if (app.soundManager) {
            app.soundManager.play('hover');
        }
    });

    // Enable continuous sound mode if available
    if (app.soundManager && app.soundManager.soundSynth) {
        console.log('Enabling continuous sound mode for better audio experience');
        if (typeof app.soundManager.setContinuousMode === 'function') {
            app.soundManager.setContinuousMode(true);
        } else if (app.soundManager.soundSynth.enableContinuousMode) {
            app.soundManager.soundSynth.enableContinuousMode(true);
        }
    }

    console.log('Audio system connected to ball');
    return enhancedBall;
}

// Auto-connect function
export function autoConnectBallAudio() {
    // Try to find the ball in the scene
    const app = window.app || {};
    if (!app.scene) {
        console.warn("No app.scene found, cannot auto-connect ball audio");
        return null;
    }

    // Look for the ball object in the scene
    let ball = null;
    app.scene.traverse(object => {
        // Check if this object is the ball (by name or by property)
        if (object.isMesh && 
            (object.name.toLowerCase().includes('ball') || 
             object.userData.isBall || 
             (object.geometry && object.geometry.type === 'SphereGeometry'))) {
            ball = object;
        }
    });

    if (ball) {
        console.log("Found ball object, connecting audio");
        return connectAudioToExistingBall(ball);
    } else {
        console.warn("Could not find ball object in scene");
        return null;
    }
}

// Expose functions to window for direct script access
window.connectAudioToExistingBall = connectAudioToExistingBall;
window.autoConnectBallAudio = autoConnectBallAudio;

// Auto-run when the scene is ready
window.addEventListener('sceneReady', autoConnectBallAudio);

// Fallback: Try to connect after a short delay if no event is fired
setTimeout(() => {
    if (window.app && window.app.scene) {
        autoConnectBallAudio();
    }
}, 1000);
