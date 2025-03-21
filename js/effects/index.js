// effects/index.js - Main entry point for visual effects
import { createParticleExplosion, updateParticleExplosion } from './explosion.js';
import { applySpikyEffect } from './spiky.js';
import { createMagneticTrail, removeMagneticTrail, updateMagneticParticles } from './magnetic.js';
import { createBlackholeEffect, removeBlackholeEffect, updateBlackholeEffect } from './blackhole.js';
import { updateRainbowMode, toggleRainbowMode } from './rainbow.js';
import { createGradientTexture, updateGradientColors } from './gradients.js';

// Export all effects
export {
    createParticleExplosion,
    updateParticleExplosion,
    applySpikyEffect,
    createMagneticTrail,
    removeMagneticTrail,
    updateMagneticParticles,
    createBlackholeEffect,
    removeBlackholeEffect,
    updateBlackholeEffect,
    updateRainbowMode,
    toggleRainbowMode,
    createGradientTexture,
    updateGradientColors
};