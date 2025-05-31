// Import Three.js properly - using the import map from index.html
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { updateRainbowMode, toggleRainbowMode } from '../effects/visual/rainbow.js';
import { callEffect } from '../effects/effectManager.js';
import {
    updateEffects,
    createBlackholeEffect,
    toggleBlackholeEffect,
    updateBlackholeEffect,
    removeBlackholeEffect
} from '../effects/effectManager.js';

// Define window.app and uiBridge as early as possible
window.app = window.app || {};

// Make it accessible to other scripts
window.blackholeActivated = false;

// Attach uiBridge with all control bridges before DOMContentLoaded
window.app.uiBridge = {
    // Getters for current state
    get wireMesh() {
        // Look in both possible locations for the wireMesh
        return window.app?.ballGroup?.userData?.wireMesh || window.app?.wireMesh;
    },
    get isRainbowMode() { return window.app?.isRainbowMode || false; },
    get isSoundEnabled() { return window.app?.audioContext ? !window.app?.soundMuted : false; },
    get isMagneticActive() { return window.app?.isMagneticActive || false; },
    get isBlackholeActive() { return window.app?.isBlackholeActive || false; },

    // Audio controls
    setVolume: (level) => {
        if (window.app?.audioContext && window.app?.masterGain) {
            window.app.masterGain.gain.value = level;
            console.log(`Volume set to ${(level * 100).toFixed(0)}%`);
            // Store volume in localStorage for persistence
            try { localStorage.setItem('ballVolume', level); } catch (e) { }
            return true;
        }
        console.warn('Audio system not initialized, cannot set volume');
        return false;
    },

    toggleAudio: (enabled) => {
        if (!window.app.audioContext) {
            try {
                // Create audio context if it doesn't exist
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                window.app.audioContext = new AudioContext();
                window.app.masterGain = window.app.audioContext.createGain();
                window.app.masterGain.gain.value = enabled ? 0.5 : 0.0;
                window.app.masterGain.connect(window.app.audioContext.destination);
                window.app.soundMuted = !enabled;
                console.log('Created audio context');
                return true;
            } catch (e) {
                console.error('Failed to create audio context:', e);
                return false;
            }
        }

        try {
            // Always ensure the context is running regardless of mute state
            if (window.app.audioContext.state === 'suspended') {
                window.app.audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                }).catch(err => {
                    console.error('Failed to resume AudioContext:', err);
                });
            }

            // Actually control volume instead of suspending context
            if (window.app.masterGain) {
                if (enabled) {
                    // Fade in volume
                    window.app.masterGain.gain.setValueAtTime(window.app.masterGain.gain.value, window.app.audioContext.currentTime);
                    window.app.masterGain.gain.linearRampToValueAtTime(0.5, window.app.audioContext.currentTime + 0.1);
                } else {
                    // Fade out volume
                    window.app.masterGain.gain.setValueAtTime(window.app.masterGain.gain.value, window.app.audioContext.currentTime);
                    window.app.masterGain.gain.linearRampToValueAtTime(0.0, window.app.audioContext.currentTime + 0.1);
                }
            }

            window.app.soundMuted = !enabled;

            // Store audio state in localStorage for persistence
            try { localStorage.setItem('ballAudioEnabled', enabled); } catch (e) { }
            console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
            return true;
        } catch (e) {
            console.error('Error toggling audio:', e);
            return false;
        }
    },

    // Add this method to your app.uiBridge object
    toggleBlackholeEffect: () => {
        return callEffect('blackhole', window.app);
    },

    playTestSound: () => {
        if (!window.app.audioContext) {
            try {
                // Create audio context if it doesn't exist
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                window.app.audioContext = new AudioContext();
                window.app.masterGain = window.app.audioContext.createGain();
                window.app.masterGain.gain.value = 0.5;
                window.app.masterGain.connect(window.app.audioContext.destination);
            } catch (e) {
                console.error('Failed to create audio context:', e);
                return false;
            }
        }

        try {
            const ctx = window.app.audioContext;

            // If suspended, resume first
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    playTestTone(ctx);
                }).catch(err => {
                    console.error('Failed to resume AudioContext:', err);
                });
            } else {
                playTestTone(ctx);
            }

            function playTestTone(ctx) {
                // Create oscillator for a pleasant test tone
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.value = 440; // A4 note

                gain.gain.value = 0.2;

                osc.connect(gain);
                gain.connect(window.app.masterGain || ctx.destination);

                // Simple envelope
                const now = ctx.currentTime;
                gain.gain.setValueAtValue ? gain.gain.setValueAtTime(0, now) : gain.gain.value = 0;
                gain.gain.linearRampToValueAtTime ? gain.gain.linearRampToValueAtTime(0.2, now + 0.05) : gain.gain.value = 0.2;
                gain.gain.exponentialRampToValueAtTime ? gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5) : null;

                osc.start();
                osc.stop(now + 0.6);

                console.log('Test sound played');
            }

            return true;
        } catch (e) {
            console.error('Error playing test sound:', e);
            return false;
        }
    },

    // Ball controls
    resetBall: () => {
        if (!window.app.ballGroup) {
            console.warn('Ball not initialized, cannot reset position');
            return false;
        }

        try {
            // Reset position and rotation with animation using GSAP if available
            if (window.gsap) {
                gsap.to(window.app.ballGroup.position, {
                    x: 0, y: 0, z: 0,
                    duration: 0.5,
                    ease: "back.out"
                });
                gsap.to(window.app.ballGroup.rotation, {
                    x: 0, y: 0, z: 0,
                    duration: 0.5,
                    ease: "power2.out"
                });
            } else {
                // Fallback to direct setting
                window.app.ballGroup.position.set(0, 0, 0);
                window.app.ballGroup.rotation.set(0, 0, 0);
            }

            // Reset any deformation
            if (typeof window.app.resetDeformation === 'function') {
                window.app.resetDeformation(1.0); // Fast reset
            }

            console.log('Ball position and rotation reset');
            return true;
        } catch (e) {
            console.error('Error resetting ball:', e);
            return false;
        }
    },

    toggleWireframe: (enabled) => {
        // Check both possible locations for the wireMesh
        const wireMesh = window.app.uiBridge.wireMesh;
        if (wireMesh) {
            wireMesh.visible = enabled;
            // Store wireframe state in localStorage for persistence
            try { localStorage.setItem('ballWireframeEnabled', enabled); } catch (e) { }
            console.log(`Wireframe mode ${enabled ? 'enabled' : 'disabled'}`);
            return true;
        } else {
            console.warn('Wireframe mesh not found');
            return false;
        }
    },

    toggleRainbowMode: (enabled) => {
        window.app.isRainbowMode = enabled;
        // Store rainbow state in localStorage for persistence
        try { localStorage.setItem('ballRainbowEnabled', enabled); } catch (e) { }
        console.log(`Rainbow mode ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    },

    createBlackholeEffect: () => {
        // Try both approaches to ensure it works
        if (window.createBlackholeEffect) {
            console.log("Calling window.createBlackholeEffect directly");
            return window.createBlackholeEffect(window.app);
        } else {
            console.log("Calling via callEffect");
            return callEffect('blackhole', window.app);
        }
    },

    createMagneticEffect: () => {
        callEffect('magnetic', window.app);
    },

    // Effects methods with improved implementation
    createExplosion: () => {
        try {
            if (typeof window.createParticleExplosion === 'function') {
                window.createParticleExplosion(window.app);
                return true;
            } else if (typeof window.app.createExplosion === 'function' &&
                window.app.createExplosion !== window.app.uiBridge.createExplosion) {
                return window.app.createExplosion();
            }
            return false;
        } catch (e) {
            console.error('Error creating explosion:', e);
            return false;
        }
    },

    // Create the magnetic trail visuals
    createMagneticTrail: () => {
        if (!window.app.scene || !window.app.ballGroup) return false;

        // Remove any existing trail first
        window.app.removeMagneticTrail();

        // Create orbiting particles around the ball
        window.app.magneticParticles = [];
        for (let i = 0; i < 30; i++) {
            const size = Math.random() * 0.08 + 0.04;
            const particleGeometry = new THREE.SphereGeometry(size, 8, 8);

            // Use a bright glowing material with some randomized color
            const hue = 0.6 + Math.random() * 0.2; // Cyan to blue range
            const color = new THREE.Color().setHSL(hue, 0.9, 0.6);

            const particleMaterial = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            });

            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Random orbit parameters
            particle.userData = {
                orbitRadius: Math.random() * 0.5 + 0.5,
                orbitSpeed: Math.random() * 0.02 + 0.01,
                orbitPhase: Math.random() * Math.PI * 2,
                orbitHeight: (Math.random() - 0.5) * 0.5,
                pulseSpeed: Math.random() * 2 + 1
            };

            window.app.scene.add(particle);
            window.app.magneticParticles.push(particle);
        }

        // Create trail line
        const maxTrailPoints = 100;
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(maxTrailPoints * 3);
        const trailColors = new Float32Array(maxTrailPoints * 3);

        // Initialize positions to ball position
        const ballPos = new THREE.Vector3();
        window.app.ballGroup.getWorldPosition(ballPos);

        for (let i = 0; i < maxTrailPoints; i++) {
            trailPositions[i * 3] = ballPos.x;
            trailPositions[i * 3 + 1] = ballPos.y;
            trailPositions[i * 3 + 2] = ballPos.z;

            // Gradient color from blue to cyan to white
            const ratio = i / maxTrailPoints;
            trailColors[i * 3] = ratio;        // R increases along trail
            trailColors[i * 3 + 1] = 0.5 + ratio * 0.5; // G is higher at end of trail
            trailColors[i * 3 + 2] = 1.0;      // B always high
        }

        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

        const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: 3,
            opacity: 0.7,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const trail = new THREE.Line(trailGeometry, trailMaterial);
        window.app.scene.add(trail);
        window.app.magneticTrail = trail;

        // Add glow effect to the ball
        if (window.app.ballGroup.userData.mat) {
            window.app.ballGroup.userData.mat.emissive = new THREE.Color(0x0066FF);
            window.app.ballGroup.userData.mat.emissiveIntensity = 0.5;
        }

        window.app.trailPositions = [];
        window.app.trailHue = 0;

        return true;
    },

    // Update the magnetic trail
    updateMagneticTrail: () => {
        if (!window.app.isMagneticActive) return;

        // Update orbiting particles around the ball
        if (window.app.magneticParticles && window.app.magneticParticles.length > 0) {
            const time = Date.now() * 0.001;
            const ballPos = new THREE.Vector3();
            window.app.ballGroup.getWorldPosition(ballPos);

            window.app.magneticParticles.forEach((particle, index) => {
                const params = particle.userData;

                // Calculate orbital position
                const angle = time * params.orbitSpeed + params.orbitPhase;
                const x = Math.cos(angle) * params.orbitRadius;
                const y = Math.sin(angle) * params.orbitRadius;
                const z = Math.sin(time * 0.5 + params.orbitPhase) * params.orbitHeight;

                // Position relative to ball
                particle.position.set(
                    ballPos.x + x,
                    ballPos.y + y,
                    ballPos.z + z
                );

                // Add pulsating effect
                const pulse = Math.sin(time * params.pulseSpeed + index) * 0.3 + 0.7;
                particle.scale.set(pulse, pulse, pulse);

                // Update color for rainbow effect
                const hue = (window.app.trailHue + index * 0.02) % 1.0;
                particle.material.color.setHSL(hue, 0.9, 0.6);
            });
        }

        // Update trail
        if (window.app.magneticTrail) {
            const positions = window.app.magneticTrail.geometry.attributes.position;
            const colors = window.app.magneticTrail.geometry.attributes.color;

            // Get ball position
            const ballPos = new THREE.Vector3();
            window.app.ballGroup.getWorldPosition(ballPos);

            // Shift all positions one step back
            for (let i = positions.count - 1; i > 0; i--) {
                positions.array[i * 3] = positions.array[(i - 1) * 3];
                positions.array[i * 3 + 1] = positions.array[(i - 1) * 3 + 1];
                positions.array[i * 3 + 2] = positions.array[(i - 1) * 3 + 2];
            }

            // Add new position at front
            positions.array[0] = ballPos.x;
            positions.array[1] = ballPos.y;
            positions.array[2] = ballPos.z;

            // Update hue for rainbow effect
            window.app.trailHue = (window.app.trailHue + 0.01) % 1.0;

            // Update the front color
            colors.array[0] = 0.5 + Math.sin(window.app.trailHue * Math.PI * 2) * 0.5; // R
            colors.array[1] = 0.5 + Math.sin((window.app.trailHue + 0.33) * Math.PI * 2) * 0.5; // G
            colors.array[2] = 0.5 + Math.sin((window.app.trailHue + 0.66) * Math.PI * 2) * 0.5; // B

            positions.needsUpdate = true;
            colors.needsUpdate = true;
        }
    },

    // Remove magnetic trail
    removeMagneticTrail: () => {
        // Remove particles
        if (window.app.magneticParticles && window.app.magneticParticles.length > 0) {
            window.app.magneticParticles.forEach(particle => {
                if (window.app.scene) {
                    window.app.scene.remove(particle);
                }
            });
            window.app.magneticParticles = [];
        }

        // Remove trail
        if (window.app.magneticTrail) {
            window.app.scene.remove(window.app.magneticTrail);
            window.app.magneticTrail = null;
        }

        // Remove glow
        if (window.app.ballGroup && window.app.ballGroup.userData.mat) {
            window.app.ballGroup.userData.mat.emissiveIntensity = 0;
        }

        return true;
    },

    // Visualization and appearance controls
    toggleAudioVisualization: (enabled) => {
        try {
            if (window.app.audioVisualization) {
                window.app.audioVisualization.enabled = enabled;

                if (window.app.scene?.userData?.audioVisualization) {
                    window.app.scene.userData.audioVisualization.visible = enabled;
                }

                // Store visualization state in localStorage for persistence
                try { localStorage.setItem('ballVisualizationEnabled', enabled); } catch (e) { }
                console.log(`Audio visualization ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            }

            // If no visualization exists but we want to enable it, try to create one
            if (enabled && !window.app.audioVisualization) {
                if (typeof window.createEnhancedVisualization === 'function') {
                    window.app.audioVisualization = window.createEnhancedVisualization(window.app);
                    return true;
                } else if (window.app.createBasicAudioVisualization) {
                    return window.app.createBasicAudioVisualization();
                }
            }

            console.warn('Audio visualization not available');
            return false;
        } catch (e) {
            console.error('Error toggling audio visualization:', e);
            return false;
        }
    },

    createBasicAudioVisualization: () => {
        // Create a simple audio visualization if one doesn't exist
        if (!window.app.audioContext || !window.app.scene) return false;

        // Create analyzer if it doesn't exist
        if (!window.app.analyser) {
            window.app.analyser = window.app.audioContext.createAnalyser();
            window.app.analyser.fftSize = 32;

            if (window.app.masterGain) {
                window.app.masterGain.connect(window.app.analyser);
            } else {
                // Try to insert analyzer in audio chain
                const destination = window.app.audioContext.destination;
                window.app.analyser.connect(destination);
            }

            window.app.analyserData = new Uint8Array(window.app.analyser.frequencyBinCount);
        }

        // Create visualization bars
        const visGroup = new THREE.Group();
        window.app.scene.add(visGroup);
        window.app.scene.userData.audioVisualization = visGroup;

        const barCount = 16;
        const barGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const x = Math.cos(angle) * 2;
            const z = Math.sin(angle) * 2;

            const bar = new THREE.Mesh(
                barGeo,
                new THREE.MeshPhongMaterial({ color: 0x00FFFF })
            );

            bar.position.set(x, 0, z);
            visGroup.add(bar);
        }

        // Update function
        window.app.updateAudioVisualization = function () {
            if (!window.app.analyser || !window.app.scene?.userData?.audioVisualization) return;

            window.app.analyser.getByteFrequencyData(window.app.analyserData);

            const bars = window.app.scene.userData.audioVisualization.children;
            const binCount = window.app.analyserData.length;

            for (let i = 0; i < bars.length; i++) {
                const binIndex = Math.floor((i / bars.length) * binCount);
                const value = window.app.analyserData[binIndex] / 256;

                bars[i].scale.y = value * 5 + 0.1;
                bars[i].position.y = value * 1.5;
            }
        };

        // Add the update function to the animation loop
        const originalAnimate = window.app.animate;
        window.app.animate = function () {
            originalAnimate();
            if (window.app.audioVisualization && window.app.audioVisualization.enabled) {
                window.app.updateAudioVisualization();
            }
        };

        window.app.audioVisualization = {
            enabled: true,
            update: window.app.updateAudioVisualization
        };

        console.log('Basic audio visualization created');
        return true;
    },

    setSpikiness: (value) => {
        try {
            window.app.spikiness = value;

            // Skip applying effects during initial load
            if (!window.app.initialLoadComplete || document.readyState !== 'complete') {
                console.log('Skipping spikiness application during initialization');
                try { localStorage.setItem('ballSpikiness', value); } catch (e) { }
                return true;
            }

            // Only apply effect if user explicitly interacted with the control
            if (window.app.userInitiatedSpikiness) {
                if (value > 0 && typeof window.app.applyDeformationInteraction === 'function') {
                    console.log(`Applying interactive deformation with value ${value}`);
                    // Use interactive deformation instead of simple spiky effect
                    window.app.applyDeformationInteraction(value);
                } else if (value === 0 && typeof window.app.resetDeformation === 'function') {
                    console.log('Resetting deformation');
                    window.app.resetDeformation(0.1);
                }
            }

            // Store in localStorage for persistence
            try { localStorage.setItem('ballSpikiness', value); } catch (e) { }
            return true;
        } catch (e) {
            console.error('Error setting spikiness:', e);
            return false;
        }
    },

    // Gradient customization
    setGradientColors: (innerColor, middleColor, outerColor) => {
        try {
            if (typeof window.app.updateGradientTexture === 'function') {
                window.app.updateGradientTexture(innerColor, middleColor, outerColor);

                // Store colors in localStorage for persistence
                try {
                    localStorage.setItem('ballInnerColor', innerColor);
                    localStorage.setItem('ballMiddleColor', middleColor);
                    localStorage.setItem('ballOuterColor', outerColor);
                } catch (e) { }

                console.log('Gradient colors updated');
                return true;
            }

            console.warn('Gradient texture update function not available');
            return false;
        } catch (e) {
            console.error('Error updating gradient colors:', e);
            return false;
        }
    },

    // Improved function to reset colors to default
    resetColors: () => {
        try {
            const defaultInner = '#FF00FF';  // Magenta
            const defaultMiddle = '#8800FF'; // Purple
            const defaultOuter = '#00FFFF'; // Cyan

            return window.app.uiBridge.setGradientColors(defaultInner, defaultMiddle, defaultOuter);
        } catch (e) {
            console.error('Error resetting colors:', e);
            return false;
        }
    },

    // Menu state synchronization
    syncToggleStates: () => {
        if (!window.menuSystem) return false;

        try {
            // Call the existing sync method if available
            if (typeof window.menuSystem.syncToggleStates === 'function') {
                window.menuSystem.syncToggleStates();
                return true;
            }
        } catch (e) {
            console.error('Error syncing toggle states:', e);
        }
        return false;
    },

    // Load persisted settings from localStorage
    loadPersistedSettings: () => {
        try {
            // Load volume
            const volume = localStorage.getItem('ballVolume');
            if (volume !== null && window.app.masterGain) {
                window.app.masterGain.gain.value = parseFloat(volume);
            }

            // Load audio state
            const audioEnabled = localStorage.getItem('ballAudioEnabled');
            if (audioEnabled !== null) {
                window.app.uiBridge.toggleAudio(audioEnabled === 'true');
            }

            // Load wireframe state
            const wireframeEnabled = localStorage.getItem('ballWireframeEnabled');
            if (wireframeEnabled !== null) {
                window.app.uiBridge.toggleWireframe(wireframeEnabled === 'true');
            }

            // Load rainbow state
            const rainbowEnabled = localStorage.getItem('ballRainbowEnabled');
            if (rainbowEnabled !== null) {
                window.app.uiBridge.toggleRainbowMode(rainbowEnabled === 'true');
            }

            // Load visualization state
            const visualizationEnabled = localStorage.getItem('ballVisualizationEnabled');
            if (visualizationEnabled !== null) {
                window.app.uiBridge.toggleAudioVisualization(visualizationEnabled === 'true');
            }

            // Load spikiness
            const spikiness = localStorage.getItem('ballSpikiness');
            if (spikiness !== null) {
                window.app.spikiness = parseFloat(spikiness);
                // Don't automatically apply it, just store the value
                console.log(`Loaded spikiness value: ${window.app.spikiness} (not applied yet)`);
            }

            // Load gradient colors
            const innerColor = localStorage.getItem('ballInnerColor');
            const middleColor = localStorage.getItem('ballMiddleColor');
            const outerColor = localStorage.getItem('ballOuterColor');
            if (innerColor && middleColor && outerColor) {
                window.app.uiBridge.setGradientColors(innerColor, middleColor, outerColor);
            }

            console.log('Persisted settings loaded successfully');
            return true;
        } catch (e) {
            console.error('Error loading persisted settings:', e);
            return false;
        }
    }
};

// Debug flag to help troubleshoot
window.app.debug = true;

// Alias uiBridge methods to app-level if needed
window.app.createBlackholeVisuals = window.app.uiBridge.createBlackholeVisuals;
window.app.removeBlackholeVisuals = window.app.uiBridge.removeBlackholeVisuals;
window.app.createMagneticTrail = window.app.uiBridge.createMagneticTrail;
window.app.removeMagneticTrail = window.app.uiBridge.removeMagneticTrail;
window.app.createBlackholeEffect = window.app.uiBridge.createBlackholeEffect;
window.app.createExplosion = window.app.uiBridge.createExplosion;
window.app.createMagneticEffect = window.app.uiBridge.createMagneticEffect;

// Expose effectManager functions globally for cleanup
window.effectManager = {
  removeBlackholeEffect,
  createBlackholeEffect,
  updateBlackholeEffect
};

// Also expose the removeBlackholeEffect function directly
window.removeBlackholeEffect = removeBlackholeEffect;

// Assign effect manager methods to window.effectManager
window.effectManager = {
    updateEffects,
    createBlackholeEffect,
    toggleBlackholeEffect,
    updateBlackholeEffect
};

// Also expose for direct access
window.updateEffects = updateEffects;
window.createBlackholeEffect = createBlackholeEffect;
window.toggleBlackholeEffect = toggleBlackholeEffect;
window.updateBlackholeEffect = updateBlackholeEffect;

// Function to initialize the application
function init() {
    console.log('Initializing application...');

    // Create renderer first
    initRenderer();

    // Create scene
    initScene();

    // Create camera
    initCamera();

    // Create lighting
    initLighting();

    // Create fancy ball
    createFancyBall();

    // Add OrbitControls for camera manipulation
    initControls();

    // Start animation loop
    animate();

    // Initialize audio system
    initializeAudio();

    console.log('Core application initialized');

    // Mark initial load as complete
    window.app.initialLoadComplete = true;

    // Fix the script loading timing
    setTimeout(() => {
        // Make sure THREE is available to the loaded scripts
        window.THREE = THREE;

        // Add basic functions before loading scripts
        if (!window.app.applyBasicSpikyEffect) {
            window.app.applyBasicSpikyEffect = function (intensity) {
                // Implementation from above...
                // (Copy the function implementation here if needed)
            };
        }

        // Now load the scripts
        const mouseControlsScript = document.createElement('script');
        mouseControlsScript.src = './src/core/mouse-controls.js';
        mouseControlsScript.onload = function () {
            console.log("Mouse controls script loaded successfully");

            // Also load our emergency fix script
            const fixScript = document.createElement('script');
            fixScript.src = './src/core/mouse-controls-fix.js';
            document.head.appendChild(fixScript);

            // Use a delay to ensure the app is fully initialized before calling setup
            setTimeout(() => {
                if (typeof window.setupMouseButtonEffects === 'function') {
                    window.setupMouseButtonEffects();
                } else if (window.setupMouseButtonEffects) {
                    window.setupMouseButtonEffects();
                } else {
                    console.warn("setupMouseButtonEffects function not found after script load");

                    // Create simplified version as fallback
                    const fallbackSetup = function () {
                        // Prevent context menu
                        window.addEventListener('contextmenu', e => {
                            // Only prevent default if in a special mode
                            if (window.app && window.app.mouseControls &&
                                (window.app.mouseControls.isBlackholeModeActive ||
                                    window.app.mouseControls.isSpikinessModeActive)) {
                                e.preventDefault();
                            }
                        });

                        // Mouse button handling
                        window.addEventListener('mousedown', e => {
                            // Handle different mouse buttons
                            switch (e.button) {
                                case 1: // Middle click - toggle camera inside/outside
                                    e.preventDefault();
                                    if (window.app && window.app.uiBridge && window.app.uiBridge.toggleCameraPosition) {
                                        window.app.uiBridge.toggleCameraPosition();
                                    }
                                    break;

                                case 2: // Right click - handled by mouse-controls-fix.js
                                    // Do nothing - let the long-press system handle this
                                    break;

                                case 3: // First side button - explosion
                                    if (window.app && window.app.uiBridge && window.app.uiBridge.createExplosion) {
                                        console.log("Side button - creating explosion via fallback");
                                        window.app.uiBridge.createExplosion();
                                    }
                                    break;

                                case 4: // Second side button - magnetic effect
                                    if (window.app && window.app.uiBridge && window.app.uiBridge.createMagneticEffect) {
                                        console.log("Side button - toggling magnetic effect via fallback");
                                        window.app.uiBridge.createMagneticEffect();
                                    }
                                    break;
                            }
                        });

                        // Add wheel handler for zooming in/out
                        window.addEventListener('wheel', function (e) {
                            e.preventDefault();

                            // Get current camera position
                            if (window.app && window.app.camera) {
                                const cameraPos = window.app.camera.position.clone();
                                const distance = cameraPos.length();

                                // Determine zoom direction
                                const zoomDirection = Math.sign(e.deltaY);

                                // Calculate new distance
                                let newDistance = distance + zoomDirection * 0.1;
                                newDistance = Math.max(0.5, Math.min(4.0, newDistance));

                                // Set new camera position
                                const newPos = cameraPos.normalize().multiplyScalar(newDistance);
                                window.app.camera.position.copy(newPos);

                                // Handle inside/outside transition
                                if (newDistance < 0.9) {
                                    // Make material translucent
                                    if (window.app.ballMesh && window.app.ballMesh.material) {
                                        window.app.ballMesh.material.opacity = 0.4;
                                        window.app.ballMesh.material.side = THREE.BackSide;
                                        window.app.insidePullMode = true;
                                    }
                                } else {
                                    // Restore normal material
                                    if (window.app.ballMesh && window.app.ballMesh.material) {
                                        window.app.ballMesh.material.opacity = 0.8;
                                        window.app.ballMesh.material.side = THREE.DoubleSide;
                                        window.app.insidePullMode = false;
                                    }
                                }
                            }
                        }, { passive: false });

                        console.log("Fallback mouse controls set up");
                    };

                    fallbackSetup();
                }
            }, 1000); // Use a longer delay to ensure app is fully initialized
        };
        document.head.appendChild(mouseControlsScript);

        // Load ui-connections.js with correct path
        const uiConnectionsScript = document.createElement('script');
        uiConnectionsScript.src = './src/core/ui-connections.js';
        document.head.appendChild(uiConnectionsScript);

        console.log('Additional scripts loaded');
    }, 500);
};

// Initialize renderer
function initRenderer() {
    try {
        console.log('Initializing renderer...');
        window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
        window.app.renderer.setSize(window.innerWidth, window.innerHeight);
        window.app.renderer.setPixelRatio(window.devicePixelRatio);
        window.app.renderer.setClearColor(0x000000);

        // Append to container
        const container = document.getElementById('container');
        if (container) {
            container.appendChild(window.app.renderer.domElement);
            console.log('Renderer attached to container');
        } else {
            console.error('Container element not found, attaching to body');
            document.body.appendChild(window.app.renderer.domElement);
        }
    } catch (error) {
        console.error('Error initializing renderer:', error);
        showError('Failed to initialize renderer');
    }
};

// Initialize scene
function initScene() {
    try {
        console.log('Initializing scene...');
        window.app.scene = new THREE.Scene();

        // Add a debug grid to help with orientation
        if (window.app.debug) {
            const gridHelper = new THREE.GridHelper(10, 10);
            gridHelper.visible = window.app.showGrid || false; // Only show if explicitly enabled
            window.app.scene.add(gridHelper);
            window.app.gridHelper = gridHelper;
            console.log('Debug grid added to scene (visibility: ' + gridHelper.visible + ')');
        }
    } catch (error) {
        console.error('Error initializing scene:', error);
    }
};

// Initialize camera
function initCamera() {
    try {
        console.log('Initializing camera...');
        window.app.camera = new THREE.PerspectiveCamera(
            75,                                         // Field of view
            window.innerWidth / window.innerHeight,     // Aspect ratio
            0.1,                                        // Near plane
            1000                                        // Far plane
        );
        window.app.camera.position.z = 2; // Position camera 2 units away from origin
    } catch (error) {
        console.error('Error initializing camera:', error);
    }
};

// Initialize lighting
function initLighting() {
    try {
        console.log('Initializing lighting...');

        // Create lighting as per your fancy ball implementation
        const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        hemilight.position.set(0, 1, 0).normalize();
        window.app.scene.add(hemilight);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        window.app.scene.add(light);

        const light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.set(-1, -1, -1).normalize();
        window.app.scene.add(light2);

        const light3 = new THREE.DirectionalLight(0xffffff, 0.5);
        light3.position.set(0, 1, 0).normalize();
        window.app.scene.add(light3);

        // Add a point light that follows the mouse for interactive lighting
        const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
        pointLight.position.set(0, 0, 2);
        window.app.scene.add(pointLight);
        window.app.pointLight = pointLight;
    } catch (error) {
        console.error('Error initializing lighting:', error);
    }
};

// Create the fancy interactive ball
function createFancyBall() {
    try {
        console.log('Creating fancy interactive ball...');

        // Create an icosahedron geometry with subdivision level 4 for smoother deformation
        const geo = new THREE.IcosahedronGeometry(1.0, 4);

        // Store original vertices for resetting the shape
        const originalPositions = geo.attributes.position.array.slice();

        // Create a gradient texture for the faces
        const createGradientTexture = (colorStart, colorMid, colorEnd) => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;

            const context = canvas.getContext('2d');

            // Create gradient
            const gradient = context.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width / 2
            );

            // Add gradient colors
            gradient.addColorStop(0, colorStart);
            gradient.addColorStop(0.5, colorMid);
            gradient.addColorStop(1, colorEnd);

            // Fill with gradient
            context.fillStyle = gradient;
            context.fillRect(0, 0, canvas.width, canvas.height);

            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            return texture;
        };

        // Initial gradient colors
        let colorStart = '#FF00FF'; // Neon pink at center
        let colorMid = '#8800FF';   // Purple in middle
        let colorEnd = '#00FFFF';   // Cyan at edges

        let gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);

        // Create a material for the main mesh with physically based rendering
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xFFFFFF,
            map: gradientTexture,
            transparent: true,
            opacity: 0.8,
            metalness: 0.2,
            roughness: 0.3,
            clearcoat: 0.5,
            clearcoatRoughness: 0.3,
            side: THREE.DoubleSide
        });

        // Create a second material specifically for wireframe effect
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            wireframe: true,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });

        // Create a wireframe geometry based on the edges of the icosahedron
        const wireGeo = new THREE.EdgesGeometry(geo);
        // Create a line segments mesh using the wireframe geometry and material
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);

        // Create the main mesh using the icosahedron geometry and material
        const mesh = new THREE.Mesh(geo, mat);

        // Group both meshes for easier interaction
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        ballGroup.add(wireMesh);
        window.app.scene.add(ballGroup);

        // Store references for later use
        window.app.ballGroup = ballGroup;
        window.app.ballMesh = mesh;
        window.app.wireMesh = wireMesh;

        // Store wireMesh in userData for consistent access via uiBridge
        window.app.ballGroup.userData.wireMesh = wireMesh;
        // Store materials in userData for rainbow effect
        window.app.ballGroup.userData.mat = mat;
        window.app.ballGroup.userData.wireMat = wireMat;

        window.app.ballGeometry = geo;
        window.app.originalPositions = originalPositions;
        window.app.updateGradientTexture = function (newColorStart, newColorMid, newColorEnd) {
            // Create a new texture with updated colors
            gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);

            // Apply it to the material
            mat.map = gradientTexture;
            mat.needsUpdate = true;
        };

        // Create a sphere to visualize the touch point
        const touchSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 })
        );
        touchSphere.visible = false;
        window.app.scene.add(touchSphere);
        window.app.touchSphere = touchSphere;

        // Set up interaction variables
        window.app.mouse = new THREE.Vector2();
        window.app.mouseWorld = new THREE.Vector3();
        window.app.raycaster = new THREE.Raycaster();
        window.app.isDragging = false;
        window.app.previousMousePosition = { x: 0, y: 0 };
        window.app.isHovered = false;
        window.app.touchPoint = null;
        window.app.targetScale = 1.0;
        window.app.currentScale = 1.0;

        // Mark ball as created
        window.app.ballCreated = true;

        // Initialize audio connection with the ball
        initializeAudioForBall();

        // Set up interaction listeners
        setupInteraction();

        console.log('Ball created successfully');
    } catch (error) {
        console.error('Error creating ball:', error);
        showError('Failed to create ball');
    }
};

// Initialize audio connection with the ball
function initializeAudioForBall() {
    // Wait a moment to ensure ball is fully created
    setTimeout(() => {
        try {
            if (window.audioSystem && typeof window.audioSystem.setupEnhancedAudio === 'function') {
                console.log('Setting up enhanced audio for ball...');
                window.audioSystem.setupEnhancedAudio(window.app);
            }

            // Connect to ball using the ball-audio-connector
            if (typeof window.autoConnectBallAudio === 'function') {
                console.log('Auto-connecting ball audio...');
                window.autoConnectBallAudio();
            } else if (window.app.ballGroup && typeof window.connectAudioToExistingBall === 'function') {
                console.log('Manually connecting ball audio...');
                window.connectAudioToExistingBall(window.app.ballGroup);
            }

            // Initialize positional audio listener
            if (window.app.camera && !window.app.camera.children.find(child => child instanceof THREE.AudioListener)) {
                console.log('Adding audio listener to camera...');
                const listener = new THREE.AudioListener();
                window.app.camera.add(listener);
                window.app.audioListener = listener;
            }

            console.log('Audio initialization for ball complete');
        } catch (error) {
            console.error('Error initializing audio for ball:', error);
        }
    }, 500);
};

// Enhanced setupInteraction function with improved audio integration
function setupInteraction() {
    // Function to handle mouse/touch movement for interaction
    function onPointerMove(event) {
        // CRITICAL: Only block hover during blackhole cleanup phase, not during active blackhole
        if (window.blackholeActivated === true &&
            window.effectState &&
            window.effectState.isBlackholeActive === true) {
            // During active blackhole, allow normal pointer tracking for blackhole deformation
            // but skip hover-specific effects like wireframe color changes
            window.app.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            window.app.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);

            // Update point light position
            window.app.pointLight.position.copy(window.app.raycaster.ray.direction).multiplyScalar(2).add(window.app.camera.position);

            // Skip hover effects but allow blackhole to work
            return;
        }

        // Block hover effects briefly after cleanup (much shorter period)
        if (Date.now() - (window._lastBlackholeCleanup || 0) < 50) {
            return; // Very brief 50ms protection instead of 100ms
        }

        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        window.app.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        window.app.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Update the raycaster with the new mouse position
        window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);

        // Move the point light to follow the mouse
        window.app.pointLight.position.copy(window.app.raycaster.ray.direction).multiplyScalar(2).add(window.app.camera.position);

        // Calculate objects intersecting the ray
        const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);

        // Change appearance when hovered or touched
        if (intersects.length > 0) {
            if (!window.app.isHovered) {
                document.body.style.cursor = 'pointer';

                // Change wireframe color smoothly
                gsapFade(window.app.wireMesh.material.color, { r: 1, g: 0, b: 1 }, 0.3);

                // Smoothly change gradient colors
                window.app.updateGradientTexture('#FF77FF', '#AA55FF', '#55FFFF');

                window.app.isHovered = true;

                // Play hover sound if available
                if (window.app.audioContext && typeof window.app.soundSynth?.playTone === 'function') {
                    window.app.soundSynth.playTone(330, 0.05, 0.1);
                }
            }

            // Store the intersection point for deformation
            window.app.touchPoint = intersects[0].point.clone();
            window.app.touchSphere.position.copy(window.app.touchPoint);
            window.app.touchSphere.visible = true;

            // Apply deformation when hovering
            applyDeformation(window.app.touchPoint, 0.2, 0.3);

            // Get facet information for audio
            const facetIndex = intersects[0].faceIndex;
            const position = intersects[0].uv || { u: 0.5, v: 0.5 };

            // Emit facet event for audio system to pick up
            if (window.app.ballGroup && typeof window.app.ballGroup.emit === 'function') {
                window.app.ballGroup.emit('facetHover', {
                    facet: facetIndex,
                    position: position
                });
            }
        } else {
            if (window.app.isHovered) {
                document.body.style.cursor = 'default';

                // Reset wireframe color smoothly
                gsapFade(window.app.wireMesh.material.color, { r: 0, g: 1, b: 1 }, 0.3);

                // Reset gradient colors
                window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');

                window.app.isHovered = false;
            }

            window.app.touchPoint = null;
            window.app.touchSphere.visible = false;

            // Gradually restore the original shape
            resetDeformation(0.1);
        }

        // Handle dragging
        if (window.app.isDragging) {
            const deltaMove = {
                x: event.clientX - window.app.previousMousePosition.x,
                y: event.clientY - window.app.previousMousePosition.y
            };

            // Rotate the ball based on mouse movement
            window.app.ballGroup.rotation.y += deltaMove.x * 0.01;
            window.app.ballGroup.rotation.x += deltaMove.y * 0.01;

            window.app.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }

        // Add audio feedback for hovering/moving over facets
        if (intersects.length > 0 && window.app.audioContext && window.app.isHovered) {
            // Get the facet index
            const facetIndex = intersects[0].faceIndex || 0;

            // Try different methods to play facet sound
            if (typeof window.app.playFacetSound === 'function') {
                window.app.playFacetSound(window.app, facetIndex, ballData.touchPoint);
            } else if (window.audioSystem && typeof window.audioSystem.playFacetSound === 'function') {
                window.audioSystem.playFacetSound(window.app, facetIndex, ballData.touchPoint);
            }
        }
    }

    function onPointerDown(event) {
        window.app.isDragging = true;

        window.app.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };

        // Check if we're clicking on the ball
        window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);
        const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);

        if (intersects.length > 0) {
            // Set target scale for smooth animation
            window.app.targetScale = 1.1;

            // Change color more dramatically on click
            window.app.updateGradientTexture('#FFAAFF', '#CC66FF', '#66FFFF');

            // Emit click event for audio system
            if (window.app.ballGroup && typeof window.app.ballGroup.emit === 'function') {
                window.app.ballGroup.emit('click', {});
            }

            // Play click sound directly if available
            if (window.app.audioContext) {
                // Try global function first
                if (typeof window.playClickSound === 'function') {
                    window.playClickSound(window.app);
                }
                // Then try app method
                else if (typeof window.app.playClickSound === 'function') {
                    window.app.playClickSound(window.app);
                }
                // Then try synthesizer
                else if (window.app.soundSynth && typeof window.app.soundSynth.playClickSound === 'function') {
                    window.app.soundSynth.playClickSound();
                }
            }
        }
    }

    function onPointerUp() {
        window.app.isDragging = false;

        // Reset target scale for smooth animation
        window.app.targetScale = 1.0;

        // Reset colors if not hovering
        if (!window.app.isHovered) {
            window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');
        }
    }

    // Helper function for smooth color transitions using GSAP-like tweening
    function gsapFade(colorObj, targetColor, duration) {
        const startColor = { r: colorObj.r, g: colorObj.g, b: colorObj.b };
        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);

        function updateColor() {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);

            // Simple easing function
            const eased = progress * (2 - progress);

            // Interpolate colors
            colorObj.r = startColor.r + (targetColor.r - startColor.r) * eased;
            colorObj.g = startColor.g + (targetColor.g - startColor.g) * eased;
            colorObj.b = startColor.b + (targetColor.b - startColor.b) * eased;

            if (progress < 1) {
                requestAnimationFrame(updateColor);
            }
        }

        updateColor();
    }

    // Function to apply deformation to the mesh at a specific point
    function applyDeformation(point, intensity, radius) {
        // Get position attribute for direct manipulation
        const positions = window.app.ballGeometry.attributes.position;

        // Apply deformation to each vertex based on distance from touch point
        for (let i = 0; i < positions.count; i++) {
            const vertexPosition = new THREE.Vector3(
                positions.array[i * 3],
                positions.array[i * 3 + 1],
                positions.array[i * 3 + 2]
            );

            // Calculate world position of the vertex
            const worldPosition = vertexPosition.clone()
                .applyMatrix4(window.app.ballMesh.matrixWorld);

            // Calculate distance from touch point
            const distance = worldPosition.distanceTo(point);

            // Only affect vertices within radius
            if (distance < radius) {
                // Calculate direction vector from touch point to vertex
                const direction = worldPosition.clone().sub(point).normalize();

                // Calculate deformation factor based on distance (closer = more deformation)
                const factor = (1 - (distance / radius)) * intensity;

                // Move vertex in the direction from touch point (inward deformation)
                const deformation = direction.multiplyScalar(-factor);

                // Apply deformation (in local space)
                const localDeformation = deformation.clone()
                    .applyMatrix4(window.app.ballMesh.matrixWorld.clone().invert());

                // Get original position (pre-deformation)
                const originalX = window.app.originalPositions[i * 3];
                const originalY = window.app.originalPositions[i * 3 + 1];
                const originalZ = window.app.originalPositions[i * 3 + 2];

                // Apply deformation and blend with original position
                positions.array[i * 3] = originalX + localDeformation.x;
                positions.array[i * 3 + 1] = originalY + localDeformation.y;
                positions.array[i * 3 + 2] = originalZ + localDeformation.z;
            }
        }

        // Update wireframe to match the deformed shape
        const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
        window.app.wireMesh.geometry = wireGeo;

        // Mark attributes as needing update
        positions.needsUpdate = true;
        window.app.ballGeometry.computeVertexNormals();
    }

    // Function to gradually reset deformation
    function resetDeformation(speed) {
        const positions = window.app.ballGeometry.attributes.position;
        let needsUpdate = false;

        for (let i = 0; i < positions.count; i++) {
            const currentX = positions.array[i * 3];
            const currentY = positions.array[i * 3 + 1];
            const currentZ = positions.array[i * 3 + 2];

            const originalX = window.app.originalPositions[i * 3];
            const originalY = window.app.originalPositions[i * 3 + 1];
            const originalZ = window.app.originalPositions[i * 3 + 2];

            // Move vertices gradually back to their original positions
            positions.array[i * 3] = currentX + (originalX - currentX) * speed;
            positions.array[i * 3 + 1] = currentY + (originalY - currentY) * speed;
            positions.array[i * 3 + 2] = currentZ + (originalZ - currentZ) * speed;

            // Check if there's still significant deformation
            if (Math.abs(positions.array[i * 3] - originalX) > 0.001 ||
                Math.abs(positions.array[i * 3 + 1] - originalY) > 0.001 ||
                Math.abs(positions.array[i * 3 + 2] - originalZ) > 0.001) {
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            // Update wireframe to match the deformed shape
            const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
            window.app.wireMesh.geometry = wireGeo;

            positions.needsUpdate = true;
            window.app.ballGeometry.computeVertexNormals();
        }
    }

    // Add event listeners for mouse/touch
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
    window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
    window.addEventListener('touchend', onPointerUp);

    // Make these functions available
    window.app.onPointerMove = onPointerMove;
    window.app.onPointerDown = onPointerDown;
    window.app.onPointerUp = onPointerUp;
    window.app.applyDeformation = applyDeformation;
    window.app.resetDeformation = resetDeformation;
};

// Initialize orbit controls
function initControls() {
    try {
        console.log('Initializing controls...');
        window.app.controls = new OrbitControls(window.app.camera, window.app.renderer.domElement);
        window.app.controls.enableDamping = true;
        window.app.controls.dampingFactor = 0.05;

        // Disable controls when interacting with ball
        window.app.controls.enabled = false;
    } catch (error) {
        console.error('Error initializing controls:', error);
    }
};

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    if (!window.app.ballGroup) return;

    // Smoothly transition to target scale
    window.app.currentScale += (window.app.targetScale - window.app.currentScale) * 0.1;

    // Only apply automated scale changes if not being interacted with
    if (!window.app.isDragging && !window.app.isHovered) {
        // Add subtle breathing animation
        const breathingScale = Math.sin(Date.now() * 0.001) * 0.05 + 1;
        window.app.ballGroup.scale.set(
            breathingScale * window.app.currentScale,
            breathingScale * window.app.currentScale,
            breathingScale * window.app.currentScale
        );
    } else {
        // Just apply the target scale
        window.app.ballGroup.scale.set(
            window.app.currentScale,
            window.app.currentScale,
            window.app.currentScale
        );
    }
};

// Animation function to make the mesh continuously rotate when not interacted with
function updateMeshRotation() {
    if (!window.app.ballGroup) return;

    // Only auto-rotate if not being dragged
    if (!window.app.isDragging) {
        window.app.ballGroup.rotation.x += 0.003;
        window.app.ballGroup.rotation.y += 0.004;
    }
};

// Animation function to make the mesh move in a circular path
function updateMeshPosition() {
    if (!window.app.ballGroup) return;

    // Only apply automatic position changes if not being interacted with
    if (!window.app.isDragging && !window.app.isHovered) {
        // Calculate new position with smooth sine wave movement
        const time = Date.now() * 0.0005;
        const newX = Math.sin(time) * 0.3;
        const newY = Math.cos(time * 1.3) * 0.2;

        // Apply position with smoothing
        window.app.ballGroup.position.x += (newX - window.app.ballGroup.position.x) * 0.05;
        window.app.ballGroup.position.y += (newY - window.app.ballGroup.position.y) * 0.05;
    }
};

// Main animation loop that runs continuously
function animate() {
    requestAnimationFrame(animate);

    // Check if camera is inside the ball
    const cameraIsInside = window.app.camera && window.app.camera.position.length() < 0.9;

    // FIXED: Only do auto-movement when camera is outside AND no blackhole effects are active AND not paused
    if (!cameraIsInside && 
        !window.blackholeActivated && 
        !window.app.isBlackholeActive && 
        !window.app._autoMovementPaused) {  // Added this check
        
        updateMeshScale();
        updateMeshRotation();
        updateMeshPosition();

        // Reset material properties when outside
        if (window.app.ballMesh && window.app.ballMesh.material && window.app._originalOpacity) {
            window.app.ballMesh.material.opacity = window.app._originalOpacity;
            window.app.ballMesh.material.side = THREE.DoubleSide;
        }
    } else if (cameraIsInside) {
        // Special handling for interior view
        if (window.app.ballMesh && window.app.ballMesh.material) {
            if (!window.app._originalOpacity) {
                window.app._originalOpacity = window.app.ballMesh.material.opacity;
            }
            window.app.ballMesh.material.opacity = 0.4;
            window.app.ballMesh.material.side = THREE.BackSide;
        }

        // Add subtle camera motion for immersive feel
        const time = Date.now() * 0.0005;
        window.app.camera.position.x += Math.sin(time) * 0.0005;
        window.app.camera.position.y += Math.cos(time) * 0.0003;
    }

    // Update rainbow mode if enabled
    if (window.app.isRainbowMode) {
        updateRainbowMode(window.app);
    }

    // Add audio visualization update if available
    if (window.app.analyser && window.app.analyserData) {
        window.app.analyser.getByteFrequencyData(window.app.analyserData);

        if (typeof window.updateAudioVisualization === 'function') {
            window.updateAudioVisualization(window.app);
        }
    }

    // Update position-based sound
    if (window.app.audioContext && window.app.isHovered && typeof window.playToneForPosition === 'function') {
        const position = new THREE.Vector3();
        window.app.ballGroup.getWorldPosition(position);
        position.project(window.app.camera);

        if (Math.random() < 0.05) {
            window.playToneForPosition(window.app, position.x, position.y);
        }
    }

    if (window.app.controls) {
        window.app.controls.update();
    }

    // BLACKHOLE EFFECT HANDLING
    if (window.effectState &&
        window.effectState.blackholeEffect &&
        window.effectState.isBlackholeActive === true &&
        window.app.isBlackholeActive === true &&
        window.blackholeActivated === true) {
        
        if (window.updateBlackholeEffect) {
            window.updateBlackholeEffect(window.app);
        }
    } else {
        // FORCE ball to stay at origin when blackhole is not active
        if (window.app.ballGroup && 
            (window.app.isBlackholeActive === false || !window.blackholeActivated)) {
            const pos = window.app.ballGroup.position;
            if (pos.length() > 0.01) {
                window.app.ballGroup.position.set(0, 0, 0);
                window.app.ballGroup.rotation.set(0, 0, 0);
            }
        }
    }

    // Update effects
    if (window.app && window.effectManager && window.effectManager.updateEffects) {
        window.effectManager.updateEffects(window.app);
    } else if (window.updateEffects) {
        window.updateEffects(window.app);
    }

    if (window.app.renderer && window.app.scene && window.app.camera) {
        window.app.renderer.render(window.app.scene, window.app.camera);
    }
};

// Make sure to update the reference
window.app.animate = animate;

// Handle window resize
function onWindowResize() {
    if (!window.app.camera || !window.app.renderer) return;

    window.app.camera.aspect = window.innerWidth / window.innerHeight;
    window.app.camera.updateProjectionMatrix();

    window.app.renderer.setSize(window.innerWidth, window.innerHeight);
};

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        console.error(message);
    }
};

// Initialize audio when document is ready
function initializeAudio() {
    console.log('Initializing audio for ball...');

    // Try multiple methods to ensure audio initialization happens
    if (typeof window.initializeAudio === 'function') {
        window.initializeAudio().then(audioContext => {
            if (audioContext) {
                window.app.audioContext = audioContext;
                console.log('Audio system initialized via global initializeAudio');

                // Ensure facet audio is initialized
                if (typeof window.initFacetAudio === 'function') {
                    window.initFacetAudio();
                }
            }
        }).catch(error => {
            console.error('Failed to initialize audio:', error);

            // Try facet audio as fallback
            if (typeof window.initFacetAudio === 'function') {
                window.initFacetAudio();
            }
        });
    } else {
        // Fall back to creating audio context directly
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.app.audioContext = new AudioContext();

            // Create master gain node
            window.app.masterGain = window.app.audioContext.createGain();
            window.app.masterGain.gain.value = 0.5;
            window.app.masterGain.connect(window.app.audioContext.destination);

            console.log('Audio context created directly');

            // Ensure facet audio is initialized
            if (typeof window.initFacetAudio === 'function') {
                window.initFacetAudio();
            }
        } catch (e) {
            console.error('Could not create audio context:', e);
        }
    }
};

// Add missing implementations for menu triggers
window.app.setRainbowMode = function (enabled) {
    // Set the flag directly first
    window.app.isRainbowMode = enabled;

    // If enabled is true, ensure rainbow mode is on, otherwise ensure it's off
    if (enabled) {
        if (!window.app.isRainbowMode) {
            toggleRainbowMode(window.app);
        }
    } else {
        if (window.app.isRainbowMode) {
            toggleRainbowMode(window.app);
        }
    }

    console.log(`Rainbow mode ${enabled ? 'enabled' : 'disabled'}`);
    return window.app.isRainbowMode;
};

// Optional: Add these if you want the menu buttons to do something
window.app.createExplosion = function () {
    console.log('Explosion effect triggered');
    // TODO: Implement explosion effect
};

window.app.createBlackholeEffect = function () {
    console.log('Blackhole effect triggered');
    // TODO: Implement blackhole effect

};

window.app.createMagneticEffect = function () {
    console.log('Magnetic effect triggered');
    // TODO: Implement magnetic effect
};

// Add event listeners
window.addEventListener('resize', onWindowResize);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    init();

    // Let other components know the scene is ready
    window.dispatchEvent(new Event('sceneReady'));

    // Fallback: ensure menu system is connected to app/uiBridge
    if (window.menuSystem && typeof window.menuSystem.setApp === 'function') {
        window.menuSystem.setApp(window.app);
    } else if (window.MenuSystem) {
        window.menuSystem = new window.MenuSystem(window.app);
    }

    // After app initialization is complete, load persisted settings
    setTimeout(() => {
        if (window.app && window.app.uiBridge) {
            window.app.uiBridge.loadPersistedSettings();
            window.app.uiBridge.syncToggleStates();
        }
    }, 1000);
});

// Make functions available to other scripts
window.app.createFancyBall = createFancyBall;
window.app.init = init;
window.app.animate = animate;

// Emergency function to recreate the ball if it's missing
window.recoverBall = function () {
    console.log('Attempting to recover missing ball...');

    // Clean up any lingering explosion particles
    if (window.app.explosionParticles) {
        window.app.scene.remove(window.app.explosionParticles);
        window.app.explosionParticles.geometry.dispose();
        window.app.explosionParticles.material.dispose();
        window.app.explosionParticles = null;
        window.app.isExploded = false;
        console.log('Explosion particles cleaned up');
    }

    // Check if ball exists
    if (!window.app.ballGroup || !window.app.ballMesh) {
        console.log('Ball missing, recreating...');
        window.app.createFancyBall();
        return 'Ball recreated';
    }

    // Make ball visible if it exists but is hidden
    if (window.app.ballGroup && !window.app.ballGroup.visible) {
        window.app.ballGroup.visible = true;
        console.log('Ball was invisible, now visible');
        return 'Ball visibility restored';
    }

    return 'Ball seems to be OK';
};

// Update the setSpikiness function in window.app.uiBridge

window.app.uiBridge.setSpikiness = function (value) {
    try {
        window.app.spikiness = value;

        // Skip applying effects during initial load
        if (!window.app.initialLoadComplete || document.readyState !== 'complete') {
            console.log('Skipping spikiness application during initialization');
            try { localStorage.setItem('ballSpikiness', value); } catch (e) { }
            return true;
        }

        // Only apply effect if user explicitly interacted with the control
        if (window.app.userInitiatedSpikiness) {
            if (value > 0 && typeof window.app.applyDeformationInteraction === 'function') {
                console.log(`Applying interactive deformation with value ${value}`);
                // Use interactive deformation instead of simple spiky effect
                window.app.applyDeformationInteraction(value);
            } else if (value === 0 && typeof window.app.resetDeformation === 'function') {
                console.log('Resetting deformation');
                window.app.resetDeformation(0.1);
            }
        }

        // Store in localStorage for persistence
        try { localStorage.setItem('ballSpikiness', value); } catch (e) { }
        return true;
    } catch (e) {
        console.error('Error setting spikiness:', e);
        return false;
    }
};

// Add this to your UI bridge to make spikiness modes accessible from UI

// Toggle between inside and outside deformation modes
window.app.uiBridge.toggleDeformationMode = function () {
    if (window.app.mouseControls && window.app.mouseControls.isSpikinessModeActive) {
        window.app.insidePullMode = !window.app.insidePullMode;
        console.log(`Deformation mode: ${window.app.insidePullMode ? 'Internal Pull' : 'External Push'}`);

        // Apply the current effect with the new mode
        if (window.app.spikiness > 0 && window.app.applyDeformationInteraction) {
            window.app.userInitiatedSpikiness = true;
            window.app.applyDeformationInteraction(window.app.spikiness * 2);
        }

        return window.app.insidePullMode;
    }
    return false;
};

// Add this function anywhere after the initCamera function

// Function to toggle camera position between inside and outside the ball
window.app.uiBridge.toggleCameraPosition = function () {
    if (!window.app.camera || !window.app.ballGroup) return false;

    // Get current camera distance
    const cameraDistance = window.app.camera.position.length();

    // If we're already inside, move back outside
    if (cameraDistance < 0.9) {
        console.log('Moving camera outside the ball');

        // Animate camera move outward
        const targetPosition = window.app.camera.position.clone().normalize().multiplyScalar(2.5);

        if (window.gsap) {
            gsap.to(window.app.camera.position, {
                x: targetPosition.x,
                y: targetPosition.y,
                z: targetPosition.z,
                duration: 1.0,
                ease: "power2.inOut",
                onUpdate: function () {
                    // Update camera during animation
                    if (window.app.controls) {
                        window.app.controls.update();
                    }
                },
                onComplete: function () {
                    // Restore original material properties
                    if (window.app.ballMesh && window.app.ballMesh.material && window.app._originalOpacity) {
                        window.app.ballMesh.material.opacity = window.app._originalOpacity;
                        window.app.ballMesh.material.side = THREE.DoubleSide;
                    }
                }
            });
        } else {
            // Simple fallback without gsap
            window.app.camera.position.copy(targetPosition);

            // Restore original material properties
            if (window.app.ballMesh && window.app.ballMesh.material && window.app._originalOpacity) {
                window.app.ballMesh.material.opacity = window.app._originalOpacity;
                window.app.ballMesh.material.side = THREE.DoubleSide;
            }
        }

        // Enable orbit controls when outside
        if (window.app.controls) {
            window.app.controls.enabled = true;
        }

        // Switch deformation mode
        window.app.insidePullMode = false;

        return false;
    } else {
        console.log('Moving camera inside the ball');

        // Move camera inside
        // Shrink to 10% of current distance - toward center
        const targetPosition = window.app.camera.position.clone().normalize().multiplyScalar(0.5);

        if (window.gsap) {
            gsap.to(window.app.camera.position, {
                x: targetPosition.x,
                y: targetPosition.y,
                z: targetPosition.z,
                duration: 1.0,
                ease: "power2.inOut",
                onUpdate: function () {
                    // Update camera during animation
                    if (window.app.controls) {
                        window.app.controls.update();
                    }
                },
                onComplete: function () {
                    // Make material translucent when viewing from inside
                    if (window.app.ballMesh && window.app.ballMesh.material) {
                        if (!window.app._originalOpacity) {
                            window.app._originalOpacity = window.app.ballMesh.material.opacity;
                        }
                        window.app.ballMesh.material.opacity = 0.4;
                        window.app.ballMesh.material.side = THREE.BackSide;
                    }
                }
            });
        } else {
            // Simple fallback without gsap
            window.app.camera.position.copy(targetPosition);

            // Make material translucent when viewing from inside
            if (window.app.ballMesh && window.app.ballMesh.material) {
                if (!window.app._originalOpacity) {
                    window.app._originalOpacity = window.app.ballMesh.material.opacity;
                }
                window.app.ballMesh.material.opacity = 0.4;
                window.app.ballMesh.material.side = THREE.BackSide;
            }
        }

        // Disable orbit controls when inside to prevent getting lost
        if (window.app.controls) {
            window.app.controls.enabled = false;
        }

        // Enable inside pull mode when going inside
        window.app.insidePullMode = true;

        return true;
    }
};

// Add this enhanced explosion effect with proper ball restoration

window.app.uiBridge.createExplosion = function () {
    try {
        console.log('Creating explosion effect');

        // If explosion already in progress, don't create another one
        if (window.app.isExploded) {
            return false;
        }

        window.app.isExploded = true;

        // Store original ball visibility
        const originalBallVisible = window.app.ballGroup.visible;

        // Hide the ball during explosion
        window.app.ballGroup.visible = false;

        // Create explosion particles
        const particleCount = 300;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const sizes = new Float32Array(particleCount);
        const colors = new Float32Array(particleCount * 3);

        // Create particles in a sphere shape
        for (let i = 0; i < particleCount; i++) {
            // Random position on a sphere
            const phi = Math.acos(-1 + (2 * Math.random()));
            const theta = Math.random() * Math.PI * 2;

            const x = Math.sin(phi) * Math.cos(theta);
            const y = Math.sin(phi) * Math.sin(theta);
            const z = Math.cos(phi);

            // Initial position at 80% of sphere radius
            positions[i * 3] = x * 0.8;
            positions[i * 3 + 1] = y * 0.8;
            positions[i * 3 + 2] = z * 0.8;

            // Random size
            sizes[i] = Math.random() * 0.05 + 0.02;

            // Hot colors for explosion (yellows, oranges, reds)
            colors[i * 3] = Math.random() * 0.2 + 0.8; // Red (0.8-1.0)
            colors[i * 3 + 1] = Math.random() * 0.6; // Green (0.0-0.6) 
            colors[i * 3 + 2] = Math.random() * 0.1; // Blue (0.0-0.1)

            // Create velocity vector (direction * speed)
            velocities.push(new THREE.Vector3(x, y, z).multiplyScalar(0.02 + Math.random() * 0.03));
        }

        // Set geometry attributes
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        });

        // Create particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        window.app.scene.add(particleSystem);
        window.app.explosionParticles = particleSystem;
        window.app.explosionParticles.userData = {
            velocities: velocities,
            creationTime: Date.now()
        };

        // Play explosion sound if available
        if (window.app.soundManager && typeof window.app.soundManager.play === 'function') {
            window.app.soundManager.play('explosion');
        }

        // Animation function for explosion
        const updateExplosion = function () {
            if (!window.app.explosionParticles) return;

            const positions = window.app.explosionParticles.geometry.attributes.position;
            const velocities = window.app.explosionParticles.userData.velocities;

            // Calculate age of explosion
            const age = Date.now() - window.app.explosionParticles.userData.creationTime;

            // Auto-cleanup after 2 seconds
            if (age > 2000) {
                window.app.scene.remove(window.app.explosionParticles);
                window.app.explosionParticles.geometry.dispose();
                window.app.explosionParticles.material.dispose();
                window.app.explosionParticles = null;
                window.app.isExploded = false;

                // Restore ball
                window.app.ballGroup.visible = originalBallVisible;

                console.log("Explosion complete - ball restored");
                return;
            }

            // Update each particle position
            for (let i = 0; i < positions.count; i++) {
                const velocity = velocities[i];

                // Apply velocity
                positions.array[i * 3] += velocity.x;
                positions.array[i * 3 + 1] += velocity.y;
                positions.array[i * 3 + 2] += velocity.z;

                // Add slight gravity
                velocity.y -= 0.0002;

                // Apply drag
                velocity.multiplyScalar(0.98);
            }

            // Update opacity based on age
            window.app.explosionParticles.material.opacity = 1.0 - (age / 2000);

            positions.needsUpdate = true;

            // Request next frame
            requestAnimationFrame(updateExplosion);
        };

        // Start the explosion animation
        updateExplosion();

        // Safety timeout to ensure ball gets restored
        setTimeout(() => {
            if (window.app.isExploded) {
                console.log("Safety timeout - restoring ball");

                // Clean up explosion if it still exists
                if (window.app.explosionParticles) {
                    window.app.scene.remove(window.app.explosionParticles);
                    window.app.explosionParticles.geometry.dispose();
                    window.app.explosionParticles.material.dispose();
                    window.app.explosionParticles = null;
                }

                // Restore ball
                window.app.ballGroup.visible = true;
                window.app.isExploded = false;
            }
        }, 3000);

        return true;
    } catch (e) {
        console.error("Error creating explosion:", e);

        // Emergency recovery
        if (window.app.ballGroup) {
            window.app.ballGroup.visible = true;
        }
        window.app.isExploded = false;
        return false;
    }
};

// Make resetDeformation available globally for cleanup
window.app.resetDeformation = function (speed = 0.1) {
    if (!window.app.ballGeometry || !window.app.originalPositions) {
        console.warn("Cannot reset deformation: missing geometry or original positions");
        return;
    }

    const positions = window.app.ballGeometry.attributes.position;
    let needsUpdate = false;

    for (let i = 0; i < positions.count; i++) {
        const currentX = positions.array[i * 3];
        const currentY = positions.array[i * 3 + 1];
        const currentZ = positions.array[i * 3 + 2];

        const originalX = window.app.originalPositions[i * 3];
        const originalY = window.app.originalPositions[i * 3 + 1];
        const originalZ = window.app.originalPositions[i * 3 + 2];

        // Move vertices gradually back to their original positions
        positions.array[i * 3] = currentX + (originalX - currentX) * speed;
        positions.array[i * 3 + 1] = currentY + (originalY - currentY) * speed;
        positions.array[i * 3 + 2] = currentZ + (originalZ - currentZ) * speed;

        needsUpdate = true;
    }

    if (needsUpdate) {
        // Update wireframe
        const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
        window.app.wireMesh.geometry = wireGeo;

        positions.needsUpdate = true;
        window.app.ballGeometry.computeVertexNormals();
    }
};

// src/core/mouse-controls-fix.js
// Replace the forceBlackholeCleanup function completely:

function forceBlackholeCleanup() {
    console.log("[🌀 CLEANUP] COMPLETE blackhole termination - restoring to initial state");

    if (!window.app) return;

    // STEP 1: Stop all blackhole systems immediately
    window.app.isBlackholeActive = false;
    window.app.blackholeActive = false;
    window.app.gravitationalPull = 0;
    window.blackholeActivated = false;

    if (window.effectState) {
        window.effectState.blackholeEffect = null;
        window.effectState.isBlackholeActive = false;
        window.effectState.gravitationalPull = 0;
        window.effectState.blackholeRingParticles = [];
    }

    // STEP 2: Stop all animations immediately
    if (window.gsap && window.app.ballGroup) {
        window.gsap.killTweensOf(window.app.ballGroup.position);
        window.gsap.killTweensOf(window.app.ballGroup.rotation);
        window.gsap.killTweensOf(window.app.ballGroup.scale);
    }

    // STEP 3: Reset ball state variables to initial values
    window.app.isHovered = false;
    window.app.isDragging = false;
    window.app.touchPoint = null;
    window.app.targetScale = 1.0;
    window.app.currentScale = 1.0;
    window.app.spikiness = 0;

    // STEP 4: IMMEDIATE position/rotation/scale reset to initial state
    if (window.app.ballGroup) {
        // Force immediate reset to exact initial state
        window.app.ballGroup.position.set(0, 0, 0);
        window.app.ballGroup.rotation.set(0, 0, 0);
        window.app.ballGroup.scale.set(1, 1, 1);

        // Clear any userData that might affect behavior
        if (window.app.ballGroup.userData) {
            window.app.ballGroup.userData.isDeformed = false;
            window.app.ballGroup.userData.effectIntensity = 0;
            window.app.ballGroup.userData.gravitationalPull = 0;
        }

        console.log("[🌀 CLEANUP] Ball transform reset to initial state (0,0,0)");
    }

    // STEP 5: Complete geometry restoration to original vertices
    const ballMesh = window.app.ballGroup?.userData?.mesh || window.app.ballMesh;
    const ballGeometry = ballMesh?.geometry || window.app.ballGeometry || window.app.ballGroup?.userData?.geo;

    if (ballGeometry && window.app.originalPositions) {
        const positions = ballGeometry.attributes.position;

        // Restore EVERY vertex to exact original position
        for (let i = 0; i < positions.array.length; i++) {
            positions.array[i] = window.app.originalPositions[i];
        }

        positions.needsUpdate = true;
        ballGeometry.computeVertexNormals();

        // Update wireframe to match restored geometry
        if (window.app.ballGroup?.userData?.wireMesh) {
            try {
                const newWireGeo = new THREE.EdgesGeometry(ballGeometry);
                window.app.ballGroup.userData.wireMesh.geometry.dispose();
                window.app.ballGroup.userData.wireMesh.geometry = newWireGeo;
            } catch (e) {
                console.warn("Wireframe update failed:", e);
            }
        }

        console.log("[🌀 CLEANUP] Geometry completely restored to original vertices");
    }

    // STEP 6: Reset materials to initial state (from createFancyBall)
    if (window.app.ballGroup?.userData?.mat) {
        const mat = window.app.ballGroup.userData.mat;
        mat.emissive.set(0x000000);
        mat.emissiveIntensity = 0;
        mat.opacity = 0.8; // Initial opacity from createFancyBall
        mat.needsUpdate = true;
    }

    if (window.app.ballGroup?.userData?.wireMat) {
        const wireMat = window.app.ballGroup.userData.wireMat;
        wireMat.color.set(0x00FFFF); // Initial cyan color
        wireMat.opacity = 0.5; // Initial wireframe opacity
        wireMat.needsUpdate = true;
    }

    // STEP 7: Reset gradient to initial colors (from createFancyBall)
    if (window.app.updateGradientTexture) {
        window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');
    }

    // STEP 8: Reset UI state
    document.body.style.cursor = 'default';

    // STEP 9: Remove all blackhole visuals from scene
    if (window.app.scene) {
        const toRemove = [];
        window.app.scene.traverse((obj) => {
            if (obj.material && obj.geometry) {
                // Remove dark spheres (blackhole centers)
                if (obj.geometry.type === 'SphereGeometry' &&
                    obj.material.color &&
                    obj.material.color.r === 0 &&
                    obj.material.color.g === 0 &&
                    obj.material.color.b === 0) {
                    toRemove.push(obj);
                }
                // Remove purple/magenta particles
                if (obj.material.color &&
                    obj.material.color.r > 0.8 &&
                    obj.material.color.g < 0.2 &&
                    obj.material.color.b > 0.8) {
                    toRemove.push(obj);
                }
            }
        });

        toRemove.forEach(obj => {
            if (obj.parent) obj.parent.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });

        if (toRemove.length > 0) {
            console.log(`[🌀 CLEANUP] Removed ${toRemove.length} blackhole objects`);
        }
    }

    // STEP 10: Stop blackhole audio
    if (window.app._blackholeSound) {
        try {
            if (window.app._blackholeSound.osc) window.app._blackholeSound.osc.stop(0);
            window.app._blackholeSound = null;
        } catch (e) {
            window.app._blackholeSound = null;
        }
    }

    // STEP 11: Call any additional cleanup functions
    if (window.removeBlackholeEffect) {
        window.removeBlackholeEffect(window.app);
    }

    // STEP 12: Set cleanup timestamp
    window._lastBlackholeCleanup = Date.now();

    // STEP 13: Multiple verification passes to ensure complete restoration
    setTimeout(() => {
        if (window.app.ballGroup) {
            // Force position/rotation again in case something overwrote it
            window.app.ballGroup.position.set(0, 0, 0);
            window.app.ballGroup.rotation.set(0, 0, 0);
            window.app.ballGroup.scale.set(1, 1, 1);

            // Ensure all state is cleared
            window.app.isHovered = false;
            window.app.touchPoint = null;
            window.app.isDragging = false;

            console.log("[🌀 VERIFY] Ball verified at initial state (0,0,0)");
        }
    }, 50);

    // STEP 14: Final verification
    setTimeout(() => {
        if (window.app.ballGroup) {
            // Final enforcement of initial state
            window.app.ballGroup.position.set(0, 0, 0);
            window.app.ballGroup.rotation.set(0, 0, 0);
            window.app.ballGroup.scale.set(1, 1, 1);

            console.log("[🌀 FINAL] Ball locked at initial state");
        }
    }, 200);

    console.log("[🌀 CLEANUP] Complete restoration to initial state finished");
}

// src/core/main.js
// Add this after createFancyBall() function:

// Store the true initial state for restoration
window.app.initialState = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    colors: {
        gradient: ['#FF00FF', '#8800FF', '#00FFFF'],
        wireframe: 0x00FFFF,
        opacity: 0.8
    }
};

// Enhanced resetToInitialState function
window.app.resetToInitialState = function () {
    if (!window.app.ballGroup) return;

    const initial = window.app.initialState;

    // Reset transform
    window.app.ballGroup.position.set(initial.position.x, initial.position.y, initial.position.z);
    window.app.ballGroup.rotation.set(initial.rotation.x, initial.rotation.y, initial.rotation.z);
    window.app.ballGroup.scale.set(initial.scale.x, initial.scale.y, initial.scale.z);

    // Reset geometry
    if (window.app.resetDeformation) {
        window.app.resetDeformation(1.0);
    }

    // Reset colors
    if (window.app.updateGradientTexture) {
        window.app.updateGradientTexture(...initial.colors.gradient);
    }

    // Reset state variables
    window.app.isHovered = false;
    window.app.isDragging = false;
    window.app.touchPoint = null;
    window.app.targetScale = 1.0;
    window.app.currentScale = 1.0;
    window.app.spikiness = 0;

    console.log('Ball reset to initial state');
};