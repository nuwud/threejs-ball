/**
 * UI Bridge Enhancer - Adds robust implementations for all menu features
 * Handles fallbacks and safety for each operation
 */
import * as THREE from 'three';
import { createParticleExplosion, updateParticleExplosion } from '../../effects/visual/explosion.js';
import { 
  createBlackholeEffect, 
  removeBlackholeEffect, 
  updateBlackholeEffect,
  toggleBlackholeEffect 
} from '../../effects/effectManager.js';
import { createTrailEffect, updateTrailEffect } from '../../effects/visual/trail.js';
import { updateRainbowMode, toggleRainbowMode } from '../../effects/visual/rainbow.js';
import { createGradientTexture, updateGradientColors } from '../../effects/visual/gradients.js';
import { callEffect } from '../../effects/effectManager.js';

// Enhance the existing uiBridge
export function enhanceUIBridge(app) {
    // Skip if app is not defined
    if (!app || !app.uiBridge) {
        console.error('Cannot enhance uiBridge: app or uiBridge not available');
        return false;
    }

    // Store original uiBridge for reference
    const originalBridge = { ...app.uiBridge };

    // Make sure important functions are available
    window.createParticleExplosion = createParticleExplosion;
    window.updateParticleExplosion = updateParticleExplosion;
    window.createBlackholeEffect = createBlackholeEffect;
    window.removeBlackholeEffect = removeBlackholeEffect;
    window.updateBlackholeEffect = updateBlackholeEffect;
    window.createTrailEffect = createTrailEffect;
    window.updateTrailEffect = updateTrailEffect;
    window.updateRainbowMode = updateRainbowMode;
    window.toggleRainbowMode = toggleRainbowMode;
    window.createGradientTexture = createGradientTexture;
    window.updateGradientColors = updateGradientColors;

    // Create animation loop hook
    if (!app.effectsHooked) {
        const originalAnimate = app.animate;
        app.animate = function() {
            // Call original animate function
            if (typeof originalAnimate === 'function') {
                originalAnimate();
            }
            
            // Update explosion effect if active
            if (app.explosionActive && typeof updateParticleExplosion === 'function') {
                updateParticleExplosion(app);
            }
            
            // Update blackhole effect if active
            if (app.isBlackholeActive && typeof updateBlackholeEffect === 'function') {
                updateBlackholeEffect(app);
            }
            
            // Update magnetic trail effect if active
            if (app.isMagneticActive && typeof updateTrailEffect === 'function') {
                updateTrailEffect(app);
            }
            
            // Update audio visualization if active
            if (app.audioVisualization?.enabled && typeof app.updateAudioVisualization === 'function') {
                app.updateAudioVisualization();
            }
            
            // Update rainbow mode if active
            if (app.isRainbowMode && typeof updateRainbowMode === 'function') {
                updateRainbowMode(app);
            }

            // Unified update for all effects
            import('../../effects/effectManager.js').then(({ updateEffects }) => {
                updateEffects(app);
            });
        };
        app.effectsHooked = true;
    }

    // Enhanced uiBridge implementation
    Object.assign(app.uiBridge, {
        // Reset ball with improved implementation
        resetBall: () => {
            if (!app.ballGroup) {
                console.warn('Cannot reset ball: ballGroup not found');
                return false;
            }

            try {
                // Save original state before resetting
                const originalPosition = app.ballGroup.position.clone();
                const originalRotation = app.ballGroup.rotation.clone();
                
                // Reset position and rotation with animation using GSAP if available
                if (window.gsap) {
                    gsap.to(app.ballGroup.position, {
                        x: 0, y: 0, z: 0,
                        duration: 0.5,
                        ease: "back.out"
                    });
                    gsap.to(app.ballGroup.rotation, {
                        x: 0, y: 0, z: 0,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                } else {
                    // Fallback to direct setting
                    app.ballGroup.position.set(0, 0, 0);
                    app.ballGroup.rotation.set(0, 0, 0);
                }
                
                // Reset any deformation if the function exists
                if (typeof app.resetDeformation === 'function') {
                    app.resetDeformation(1.0); // Fast reset
                }
                
                console.log('Ball position and rotation reset');
                return true;
            } catch (e) {
                console.error('Error in resetBall:', e);
                return false;
            }
        },

        // Enhanced explosion effect with automatic cleanup
        createExplosion: () => callEffect('explosion', app),

        // Enhanced blackhole effect with proper toggle behavior
        createBlackholeEffect: () => callEffect('blackhole', app),

        // Enhanced magnetic trails effect with proper toggle
        createMagneticEffect: () => callEffect('magnetic', app),

        // Enhanced audio visualization with proper toggle
        toggleAudioVisualization: (enabled) => callEffect('audioVisualization', app, enabled),

        // Enhanced rainbow mode with proper toggle
        toggleRainbowMode: (enabled) => callEffect('rainbow', app, enabled),

        // Enhanced spikiness control
        setSpikiness: (value) => {
            try {
                app.spikiness = value;
                
                if (app.ballGeometry && app.originalPositions) {
                    // Apply spiky effect if spikiness > 0
                    if (value > 0) {
                        if (typeof app.applyBasicSpikyEffect === 'function') {
                            app.applyBasicSpikyEffect(value);
                            success = true;
                        } else {
                            console.warn('No spiky effect implementation found');
                            return false;
                        }
                    } else if (typeof app.resetDeformation === 'function') {
                        // Reset deformation if spikiness is 0
                        app.resetDeformation(0.5);
                        success = true;
                    }
                    
                    // Store in localStorage
                    try { localStorage.setItem('ballSpikiness', value); } catch(e) {}
                    console.log(`Spikiness set to ${value.toFixed(2)}`);
                    return true;
                }
                
                console.warn('Spikiness control not available');
                return false;
            } catch (e) {
                console.error('Error setting spikiness:', e);
                return false;
            }
        },

        // Enhanced gradient colors functionality
        updateBallColors: (innerColor, middleColor, outerColor) => {
            try {
                if (typeof updateGradientColors === 'function') {
                    updateGradientColors(app, innerColor, middleColor, outerColor);
                } else if (app.updateGradientTexture) {
                    app.updateGradientTexture(innerColor, middleColor, outerColor);
                } else {
                    console.warn('No gradient update implementation found');
                    return false;
                }
                
                // Store colors in localStorage
                try {
                    localStorage.setItem('ballInnerColor', innerColor);
                    localStorage.setItem('ballMiddleColor', middleColor);
                    localStorage.setItem('ballOuterColor', outerColor);
                } catch(e) {}
                
                console.log('Ball colors updated');
                return true;
            } catch (e) {
                console.error('Error updating ball colors:', e);
                return false;
            }
        },

        // Reset ball colors to defaults
        resetBallColors: () => {
            try {
                // Default colors
                const defaultInner = '#FF00FF';
                const defaultMiddle = '#8800FF';
                const defaultOuter = '#00FFFF';
                
                return app.uiBridge.updateBallColors(defaultInner, defaultMiddle, defaultOuter);
            } catch (e) {
                console.error('Error resetting ball colors:', e);
                return false;
            }
        },

        // Enhanced audio toggle with better error handling
        toggleAudio: (enabled) => {
            try {
                if (!app.audioContext) {
                    console.warn('Audio context not available, trying to create one');
                    try {
                        const AudioContext = window.AudioContext || window.webkitAudioContext;
                        app.audioContext = new AudioContext();
                        
                        // Create master gain if needed
                        if (!app.masterGain) {
                            app.masterGain = app.audioContext.createGain();
                            app.masterGain.gain.value = 0.5;
                            app.masterGain.connect(app.audioContext.destination);
                        }
                    } catch (e) {
                        console.error('Failed to create audio context:', e);
                        return false;
                    }
                }
                
                // Now try to toggle audio
                if (enabled) {
                    if (app.audioContext.state === 'suspended') {
                        app.audioContext.resume().then(() => {
                            console.log('AudioContext resumed successfully');
                        }).catch(err => {
                            console.error('Failed to resume AudioContext:', err);
                        });
                    }
                    app.soundMuted = false;
                } else {
                    if (app.audioContext.state === 'running') {
                        app.audioContext.suspend().then(() => {
                            console.log('AudioContext suspended successfully');
                        }).catch(err => {
                            console.error('Failed to suspend AudioContext:', err);
                        });
                    }
                    app.soundMuted = true;
                }
                
                // Store audio state in localStorage for persistence
                try { localStorage.setItem('ballAudioEnabled', enabled); } catch(e) {}
                console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            } catch (e) {
                console.error('Error toggling audio:', e);
                
                // Manual fallback
                app.soundMuted = !enabled;
                try { localStorage.setItem('ballAudioEnabled', enabled); } catch(e) {}
                console.log(`Audio ${enabled ? 'enabled' : 'disabled'} (fallback mode)`);
                return true;
            }
        },

        // Enhanced loadPersistedSettings
        loadPersistedSettings: () => {
            try {
                // Call original function first if it exists
                if (typeof originalBridge.loadPersistedSettings === 'function') {
                    originalBridge.loadPersistedSettings();
                }
                
                // Load volume
                const volume = localStorage.getItem('ballVolume');
                if (volume !== null && app.masterGain) {
                    app.masterGain.gain.value = parseFloat(volume);
                }
                
                // Load audio state
                const audioEnabled = localStorage.getItem('ballAudioEnabled');
                if (audioEnabled !== null) {
                    app.uiBridge.toggleAudio(audioEnabled === 'true');
                }
                
                // Load wireframe state
                const wireframeEnabled = localStorage.getItem('ballWireframeEnabled');
                if (wireframeEnabled !== null) {
                    app.uiBridge.toggleWireframe(wireframeEnabled === 'true');
                }
                
                // Load rainbow state
                const rainbowEnabled = localStorage.getItem('ballRainbowEnabled');
                if (rainbowEnabled !== null) {
                    app.uiBridge.toggleRainbowMode(rainbowEnabled === 'true');
                }
                
                // Load blackhole effect
                const blackholeEnabled = localStorage.getItem('ballBlackholeActive');
                if (blackholeEnabled === 'true' && !app.isBlackholeActive) {
                    app.uiBridge.createBlackholeEffect();
                }
                
                // Load magnetic effect
                const magneticEnabled = localStorage.getItem('ballMagneticActive');
                if (magneticEnabled === 'true' && !app.isMagneticActive) {
                    app.uiBridge.createMagneticEffect();
                }
                
                // Load visualization state
                const visualizationEnabled = localStorage.getItem('ballVisualizationEnabled');
                if (visualizationEnabled !== null) {
                    app.uiBridge.toggleAudioVisualization(visualizationEnabled === 'true');
                }
                
                // Load spikiness
                const spikiness = localStorage.getItem('ballSpikiness');
                if (spikiness !== null) {
                    app.uiBridge.setSpikiness(parseFloat(spikiness));
                }
                
                // Load gradient colors
                const innerColor = localStorage.getItem('ballInnerColor');
                const middleColor = localStorage.getItem('ballMiddleColor');
                const outerColor = localStorage.getItem('ballOuterColor');
                if (innerColor && middleColor && outerColor) {
                    app.uiBridge.updateBallColors(innerColor, middleColor, outerColor);
                }
                
                console.log('Persisted settings loaded successfully');
                return true;
            } catch (e) {
                console.error('Error in loadPersistedSettings:', e);
                return false;
            }
        },

        togglePlaneVisibility: (visible) => callEffect('plane', app, visible)
    });

    // Make available for debugging
    window.enhancedUIBridge = app.uiBridge;
    console.log('UI Bridge successfully enhanced with improved effect handling');
    return true;
}
