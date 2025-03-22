// effects/rainbow.js - Rainbow color cycling effect
import * as THREE from 'three';
import { createGradientTexture } from './gradients.js';

// Rainbow color cycling effect (called in animation loop)
function updateRainbowMode(app) {
    if (!app.isRainbowMode) return;

    const time = Date.now() * 0.001;

    // Create smooth cycling colors
    const r = Math.sin(time * 0.5) * 0.5 + 0.5;
    const g = Math.sin(time * 0.5 + Math.PI * 2 / 3) * 0.5 + 0.5;
    const b = Math.sin(time * 0.5 + Math.PI * 4 / 3) * 0.5 + 0.5;

    // Convert to hex colors
    const colorStart = '#' +
        Math.floor(r * 255).toString(16).padStart(2, '0') +
        Math.floor(g * 255).toString(16).padStart(2, '0') +
        Math.floor(b * 255).toString(16).padStart(2, '0');

    const colorMid = '#' +
        Math.floor((1 - r) * 255).toString(16).padStart(2, '0') +
        Math.floor((1 - g) * 255).toString(16).padStart(2, '0') +
        Math.floor(b * 255).toString(16).padStart(2, '0');

    const colorEnd = '#' +
        Math.floor(g * 255).toString(16).padStart(2, '0') +
        Math.floor(r * 255).toString(16).padStart(2, '0') +
        Math.floor((1 - b) * 255).toString(16).padStart(2, '0');

    // Update gradient colors
    const ballGroup = app.ballGroup;
    const mat = ballGroup.userData.mat;

    // Create a new texture with updated colors
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);

    // Apply it to the material
    mat.map = gradientTexture;
    mat.needsUpdate = true;

    // Update wireframe color
    const wireMat = ballGroup.userData.wireMat;
    wireMat.color.setRGB(r, 1 - g, b);

    // Store the texture in userData for potential future use
    ballGroup.userData.gradientTexture = gradientTexture;
    
    // Play rainbow sound if not already playing
    if (app.soundSynth && !app.rainbowSoundPlaying) {
        app.soundSynth.playSpecialSound('rainbow', true);
        app.rainbowSoundPlaying = true;
    }
}

// Toggle rainbow mode
function toggleRainbowMode(app) {
    app.isRainbowMode = !app.isRainbowMode;
    
    // Handle sound based on mode
    if (app.soundSynth) {
        try {
            if (app.isRainbowMode) {
                app.soundSynth.playSpecialSound('rainbow', true);
                app.rainbowSoundPlaying = true;
            } else {
                // Check if stopSpecialSound method exists
                if (typeof app.soundSynth.stopSpecialSound === 'function') {
                    app.soundSynth.stopSpecialSound('rainbow');
                }
                app.rainbowSoundPlaying = false;
            }
        } catch (e) {
            console.error('Error handling rainbow sound:', e);
            app.rainbowSoundPlaying = app.isRainbowMode; // Keep the flag in sync with mode
        }
    }
    
    return app.isRainbowMode;
}

export { updateRainbowMode, toggleRainbowMode };