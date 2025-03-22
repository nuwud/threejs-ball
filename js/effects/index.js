// effects/index.js - Main entry point for visual effects
import { createParticleExplosion, updateParticleExplosion } from './explosion.js';
import { applySpikyEffect, resetBall } from './spiky.js';
import { createMagneticTrail, removeMagneticTrail, updateMagneticParticles } from './magnetic.js';
import { createBlackholeEffect, removeBlackholeEffect, updateBlackholeEffect } from './blackhole.js';
import { updateRainbowMode, toggleRainbowMode } from './rainbow.js';
import { createGradientTexture, updateGradientColors } from './gradients.js';
import { highlightFacet, updateFacetHighlights } from './facet.js';
import { createTrailEffect, updateTrailEffect } from './trail.js';
import { updateVisualFromAudio } from './audio-visual.js';

// Export all effects
export {
    createParticleExplosion,
    updateParticleExplosion,
    applySpikyEffect,
    resetBall,
    createMagneticTrail,
    removeMagneticTrail,
    updateMagneticParticles,
    createBlackholeEffect,
    removeBlackholeEffect,
    updateBlackholeEffect,
    updateRainbowMode,
    toggleRainbowMode,
    createGradientTexture,
    updateGradientColors,
    highlightFacet,
    updateFacetHighlights,
    createTrailEffect,
    updateTrailEffect,
    updateVisualFromAudio
};