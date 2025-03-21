// utils.js - Utility functions and animation loop
import {
    updateMeshScale,
    updateMeshRotation,
    updateMeshPosition
} from './ball.js';

import {
    updateParticleExplosion,
    updateMagneticParticles,
    updateBlackholeEffect,
    updateRainbowMode
} from './effects.js';

import { updateAudioVisualization } from './audio.js';

// Animation loop
function animate(app) {
    requestAnimationFrame(() => animate(app));

    // Update all dynamic elements

    // Ball animations
    updateMeshScale(app);
    updateMeshRotation(app);
    updateMeshPosition(app);

    // Special effects
    updateParticleExplosion(app);
    updateMagneticParticles(app);
    updateBlackholeEffect(app);
    updateRainbowMode(app);

    // Audio visualization
    updateAudioVisualization(app);

    // Render the scene
    app.renderer.render(app.scene, app.camera);
}

// Utility function for simple linear interpolation
function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

// Utility function for clamping a value between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Utility function for mapping a value from one range to another
function map(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// Utility function for easing functions
const easing = {
    // Linear easing
    linear: t => t,

    // Quadratic easing
    easeInQuad: t => t * t,
    easeOutQuad: t => t * (2 - t),
    easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    // Cubic easing
    easeInCubic: t => t * t * t,
    easeOutCubic: t => (--t) * t * t + 1,
    easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    // Elastic easing
    easeOutElastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    }
};

export {
    animate,
    lerp,
    clamp,
    map,
    easing
};