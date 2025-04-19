// effects/index.js - Main entry point for visual effects

// Fix relative paths - use ./visual/ instead of ../effects/visual/
import { createParticleExplosion, updateParticleExplosion } from './visual/explosion.js';
import { applySpikyEffect, resetBall } from './deformation/spiky.js';

// Fix paths to effects that are now in subdirectories
import { createMagneticTrail, removeMagneticTrail, updateMagneticParticles } from './physics/magnetic.js';
import { createBlackholeEffect, removeBlackholeEffect, updateBlackholeEffect } from './visual/blackhole.js';
import { updateRainbowMode, toggleRainbowMode } from './visual/rainbow.js';
import { createGradientTexture, updateGradientColors } from './visual/gradients.js';
import { highlightFacet, updateFacetHighlights } from './deformation/facet.js';
import { createTrailEffect, updateTrailEffect } from './visual/trail.js';
import { updateVisualFromAudio } from './audio-visual/core.js';  // Updated path

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