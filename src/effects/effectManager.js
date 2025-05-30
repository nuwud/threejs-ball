// effects.js - Handles visual effects for the 3D ball
import * as THREE from 'three';
//import { createParticleExplosion as originalCreateParticleExplosion, updateParticleExplosion as originalUpdateParticleExplosion } from './visual/explosion.js';
import { createTrailEffect, updateTrailEffect } from './visual/trail.js';
import { highlightFacet, updateFacetHighlights } from './deformation/facet.js';
//import { createGradientTexture as originalCreateGradientTexture, updateGradientColors as originalUpdateGradientColors } from './visual/gradients.js';

// Global state for effects
const effectState = {
    isRainbowMode: false,
    isMagneticMode: false,
    magneticParticles: [],
    blackholeEffect: null,
    blackholeRingParticles: [],
    gravitationalPull: 0,
    spikiness: 0,
    spikes: [],
    audioVisualization: null,
    isExploded: false,
    particleSystem: null,
    touchPoint: null,
    isHovered: false,
    targetScale: 1.0,
    currentScale: 1.0,
    isDragging: false,
    previousMousePosition: null
};

// Default gradient colors
const defaultColors = {
    start: '#FF00FF', // Neon pink at center
    mid: '#8800FF',   // Purple in middle
    end: '#00FFFF'    // Cyan at edges
};

// Create gradient texture for the rainbow effect
function createGradientTexture(colorStart, colorMid, colorEnd) {
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
}

// Update gradient colors
function updateGradientColors(app, newColorStart, newColorMid, newColorEnd) {
    if (!app.ballGroup || !app.ballGroup.userData || !app.ballGroup.userData.mat) {
        return;
    }

    // Create a new texture with updated colors
    const gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);

    // Apply it to the material
    const mat = app.ballGroup.userData.mat;
    mat.map = gradientTexture;
    mat.needsUpdate = true;

    // Store the texture in userData for potential future use
    app.ballGroup.userData.gradientTexture = gradientTexture;
}

// Helper function for smooth color transitions
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

// Create explosion effect
function createParticleExplosion(app) {
    // Clean up any existing particle system
    if (effectState.particleSystem) {
        app.scene.remove(effectState.particleSystem);
        effectState.particleSystem.geometry.dispose();
        effectState.particleSystem.material.dispose();
    }

    // Number of particles
    const particleCount = 1000;

    // Create geometry for particles
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = []; // Store velocity for each particle

    // Get ball position
    const ballPosition = app.ballGroup.position.clone();

    // Populate positions, colors, and sizes
    for (let i = 0; i < particleCount; i++) {
        // Calculate positions - start all particles at ball center
        positions[i * 3] = ballPosition.x;
        positions[i * 3 + 1] = ballPosition.y;
        positions[i * 3 + 2] = ballPosition.z;

        // Create random colors (hot colors for explosion)
        colors[i * 3] = Math.random() * 0.5 + 0.5; // Red (0.5-1.0)
        colors[i * 3 + 1] = Math.random() * 0.5; // Green (0-0.5)
        colors[i * 3 + 2] = Math.random() * 0.2; // Blue (0-0.2)

        // Random sizes
        sizes[i] = Math.random() * 0.1 + 0.01;

        // Random velocities (exploding outward)
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
        );
        velocities.push(velocity);
    }

    // Add attributes to geometry
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create material for particles
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    // Create particle system
    effectState.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    app.scene.add(effectState.particleSystem);

    // Store velocities for animation
    effectState.particleSystem.userData.velocities = velocities;
    effectState.particleSystem.userData.age = 0;
    effectState.particleSystem.userData.startTime = Date.now();

    // Hide the original ball if explosion effect
    if (effectState.isExploded) {
        app.ballGroup.visible = false;
    }

    // Play explosion sound if available
    if (app.soundManager) {
        app.soundManager.play('explosion', false);
    }

    // Trigger removal after 3 seconds
    setTimeout(() => {
        if (effectState.particleSystem) {
            app.scene.remove(effectState.particleSystem);
            effectState.particleSystem.geometry.dispose();
            effectState.particleSystem.material.dispose();
            effectState.particleSystem = null;

            // Show the ball again if it was an explosion effect
            if (effectState.isExploded) {
                app.ballGroup.visible = true;
                effectState.isExploded = false;

                // Reset colors
                updateGradientColors(app, defaultColors.start, defaultColors.mid, defaultColors.end);
            }
        }
    }, 3000);
}

// Update particle explosion animation
function updateParticleExplosion(app) {
    if (!effectState.particleSystem) return;

    // Increase particle age
    effectState.particleSystem.userData.age += 0.016; // Approx 60fps

    // Get positions attribute for update
    const positions = effectState.particleSystem.geometry.attributes.position.array;
    const velocities = effectState.particleSystem.userData.velocities;

    // Update each particle
    for (let i = 0; i < positions.length / 3; i++) {
        // Apply velocity
        positions[i * 3] += velocities[i].x;
        positions[i * 3 + 1] += velocities[i].y;
        positions[i * 3 + 2] += velocities[i].z;

        // Add gravity effect
        velocities[i].y -= 0.0005;

        // Add drag/friction
        velocities[i].x *= 0.99;
        velocities[i].y *= 0.99;
        velocities[i].z *= 0.99;
    }

    // Fade out as particles age
    const elapsed = (Date.now() - effectState.particleSystem.userData.startTime) / 1000;
    const life = 3.0; // 3 seconds
    const normalizedTime = Math.min(elapsed / life, 1.0);
    effectState.particleSystem.material.opacity = Math.max(0, 1 - normalizedTime);

    // Mark positions for update
    effectState.particleSystem.geometry.attributes.position.needsUpdate = true;
}

// Function to handle explosion effect
function explodeEffect(app) {
    if (effectState.isExploded) return;

    effectState.isExploded = true;

    // Update colors for hot effect
    updateGradientColors(app, '#FF5500', '#FF0000', '#FFFF00');

    // Create the particle explosion
    createParticleExplosion(app);

    if (app.showStatus) {
        app.showStatus('Explosion Effect!');
    }

    return effectState.isExploded;
}

// Apply spiky effect on the ball
function applySpikyEffect(app, intensity) {
    const ballGroup = app.ballGroup;
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const originalPositions = ballGroup.userData.originalPositions;

    const positions = geo.attributes.position;

    // If we haven't stored spikes yet, create them
    if (effectState.spikes.length === 0) {
        for (let i = 0; i < positions.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];
            const z = originalPositions[i * 3 + 2];

            const vertex = new THREE.Vector3(x, y, z).normalize();

            effectState.spikes.push({
                index: i,
                direction: vertex,
                phase: Math.random() * Math.PI * 2 // Random phase for animation
            });
        }
    }

    // Play spike sound if it exists
    if (app.soundManager) {
        app.soundManager.play('spike', false);
    }

    // Apply spiky effect
    for (const spike of effectState.spikes) {
        const i = spike.index;
        const time = Date.now() * 0.002;

        // Calculate spike extension with some wobble
        const wobble = Math.sin(time + spike.phase) * 0.1;
        const extension = (1.0 + wobble) * intensity;

        // Apply to vertex
        positions.array[i * 3] = originalPositions[i * 3] + spike.direction.x * extension;
        positions.array[i * 3 + 1] = originalPositions[i * 3 + 1] + spike.direction.y * extension;
        positions.array[i * 3 + 2] = originalPositions[i * 3 + 2] + spike.direction.z * extension;
    }

    // Update wireframe to match
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;

    // Mark as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();

    // Store current spikiness level
    effectState.spikiness = intensity;
}

// Toggle spiky mode
function toggleSpikyMode(app) {
    if (effectState.spikiness > 0) {
        // Turn off spiky mode
        effectState.spikiness = 0;
        resetDeformation(app, 0.5);
    } else {
        // Turn on spiky mode
        effectState.spikiness = 0.5;
        applySpikyEffect(app, effectState.spikiness);
    }

    if (app.showStatus) {
        app.showStatus(`Spiky Mode ${effectState.spikiness > 0 ? 'Enabled' : 'Disabled'}`);
    }

    return effectState.spikiness > 0;
}

// Reset deformation
function resetDeformation(app, speed) {
    if (!app.ballGroup || !app.ballGroup.userData || !app.ballGroup.userData.geo) {
        return;
    }

    const geo = app.ballGroup.userData.geo;
    const wireGeo = app.ballGroup.userData.wireGeo;
    const wireMesh = app.ballGroup.userData.wireMesh;
    const originalPositions = app.ballGroup.userData.originalPositions;

    if (!geo || !originalPositions) return;

    const positions = geo.attributes.position;
    let needsUpdate = false;

    for (let i = 0; i < positions.count; i++) {
        const currentX = positions.array[i * 3];
        const currentY = positions.array[i * 3 + 1];
        const currentZ = positions.array[i * 3 + 2];

        const originalX = originalPositions[i * 3];
        const originalY = originalPositions[i * 3 + 1];
        const originalZ = originalPositions[i * 3 + 2];

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
        wireGeo.copy(new THREE.EdgesGeometry(geo));
        wireMesh.geometry = wireGeo;

        positions.needsUpdate = true;
        geo.computeVertexNormals();
    }
}

// Function to apply deformation to the mesh at a specific point
function applyDeformation(app, point, intensity, radius) {
    if (!app.ballGroup || !app.ballGroup.userData || !app.ballGroup.userData.geo) {
        return;
    }

    const geo = app.ballGroup.userData.geo;
    const mesh = app.ballGroup.userData.mesh;
    const wireGeo = app.ballGroup.userData.wireGeo;
    const wireMesh = app.ballGroup.userData.wireMesh;
    const originalPositions = app.ballGroup.userData.originalPositions;

    if (!geo || !originalPositions) return;

    // Get position attribute for direct manipulation
    const positions = geo.attributes.position;

    // Apply deformation to each vertex based on distance from touch point
    for (let i = 0; i < positions.count; i++) {
        const vertexPosition = new THREE.Vector3(
            positions.array[i * 3],
            positions.array[i * 3 + 1],
            positions.array[i * 3 + 2]
        );

        // Calculate world position of the vertex
        const worldPosition = vertexPosition.clone()
            .applyMatrix4(mesh.matrixWorld);

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
                .applyMatrix4(mesh.matrixWorld.clone().invert());

            // Get original position (pre-deformation)
            const originalX = originalPositions[i * 3];
            const originalY = originalPositions[i * 3 + 1];
            const originalZ = originalPositions[i * 3 + 2];

            // Apply deformation and blend with original position
            positions.array[i * 3] = originalX + localDeformation.x;
            positions.array[i * 3 + 1] = originalY + localDeformation.y;
            positions.array[i * 3 + 2] = originalZ + localDeformation.z;
        }
    }

    // Update wireframe to match the deformed shape
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;

    // Mark attributes as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();

    // Play deform sound if available
    if (app.soundManager) {
        app.soundManager.play('deform', false);
    }
}

// Create floating particles that follow the ball in magnetic mode
function createMagneticTrail(app) {
    // Clean up any existing particles
    removeMagneticTrail(app);

    // Create a batch of particles
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 0.05 + 0.02;
        const color = new THREE.Color(0x0066FF);

        // Adjust color based on size (smaller = lighter)
        color.r += (1 - size / 0.07) * 0.8;
        color.g += (1 - size / 0.07) * 0.8;
        color.b += (1 - size / 0.07) * 0.1;

        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 8),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            })
        );

        // Random position around the ball
        const radius = Math.random() * 2 + 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        particle.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );

        particle.userData = {
            offset: new THREE.Vector3(
                Math.sin(i * 0.5) * 1.5,
                Math.cos(i * 0.5) * 1.5,
                Math.sin(i * 0.3) * 1.5
            ),
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        };

        app.scene.add(particle);
        effectState.magneticParticles.push(particle);
    }
}

// Remove magnetic particles
function removeMagneticTrail(app) {
    for (const particle of effectState.magneticParticles) {
        app.scene.remove(particle);
    }
    effectState.magneticParticles = [];
}

// Toggle magnetic mode
function toggleMagneticMode(app) {
    effectState.isMagneticMode = !effectState.isMagneticMode;

    if (effectState.isMagneticMode) {
        // Turn on magnetic effect
        updateGradientColors(app, '#0066FF', '#3399FF', '#99CCFF'); // Blue colors
        if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.wireMat) {
            app.ballGroup.userData.wireMat.color.set(0x0066FF); // Blue wireframe
        }

        // Create a trail of small spheres that follow the ball
        createMagneticTrail(app);

        // Play magnetic sound if it exists
        if (app.soundManager) {
            app.soundManager.play('magnetic', true);
        }

        app.isMagneticMode = true;
    } else {
        // Turn off magnetic effect
        updateGradientColors(app, defaultColors.start, defaultColors.mid, defaultColors.end);
        if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.wireMat) {
            app.ballGroup.userData.wireMat.color.set(0x00FFFF);
        }

        // Remove trail
        removeMagneticTrail(app);

        // Stop magnetic sound
        if (app.soundManager) {
            app.soundManager.stop('magnetic');
        }

        app.isMagneticMode = false;
    }

    if (app.showStatus) {
        app.showStatus(`Magnetic Mode ${effectState.isMagneticMode ? 'Enabled' : 'Disabled'}`);
    }

    return effectState.isMagneticMode;
}

// Update magnetic particles
function updateMagneticParticles(app) {
    if (!app.isMagneticMode && !effectState.isMagneticMode) return;
    if (effectState.magneticParticles.length === 0) return;

    const time = Date.now() * 0.001;

    for (const particle of effectState.magneticParticles) {
        // Calculate a position that follows the ball with some delay and orbit
        const targetX = app.ballGroup.position.x;
        const targetY = app.ballGroup.position.y;
        const targetZ = app.ballGroup.position.z;

        // Add orbital motion
        const phase = particle.userData.phase + time * particle.userData.speed;
        const orbitRadius = 0.5 + Math.sin(phase) * 0.3;
        const orbitX = Math.cos(phase) * orbitRadius + particle.userData.offset.x * 0.2;
        const orbitY = Math.sin(phase) * orbitRadius + particle.userData.offset.y * 0.2;
        const orbitZ = Math.cos(phase * 0.7) * orbitRadius + particle.userData.offset.z * 0.2;

        // Smoothly move toward target
        particle.position.x += (targetX + orbitX - particle.position.x) * 0.03;
        particle.position.y += (targetY + orbitY - particle.position.y) * 0.03;
        particle.position.z += (targetZ + orbitZ - particle.position.z) * 0.03;

        // Pulsate size
        const scale = 0.8 + Math.sin(time * 2 + particle.userData.phase) * 0.2;
        particle.scale.set(scale, scale, scale);

        // Pulsate opacity
        particle.material.opacity = 0.5 + Math.sin(time + particle.userData.phase) * 0.3;
    }
}

// Create blackhole effect
function createBlackholeEffect(app) {
    console.log("[🌀 EFFECT] createBlackholeEffect called");

    // CRITICAL FIX: Force removal of any existing blackhole effects first
    if (effectState.blackholeEffect || app._blackholeSound) {
        console.log("[🌀 EFFECT] Forcing cleanup of existing blackhole before creating new one");
        removeBlackholeEffect(app);

        // Allow time for cleanup to complete
        setTimeout(() => {
            actuallyCreateBlackholeEffect(app);
        }, 100);
        return;
    }

    actuallyCreateBlackholeEffect(app);
}

// Move the actual creation logic to a separate function
function actuallyCreateBlackholeEffect(app) {
    // Make sure we don't have an existing effect
    if (effectState.blackholeEffect) {
        app.scene.remove(effectState.blackholeEffect);
        effectState.blackholeEffect = null;
    }

    // Create a dark sphere with a distortion shader
    const blackholeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8
    });

    effectState.blackholeEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 32),
        blackholeMaterial
    );

    // Position it in front of the camera, slightly offset to the right
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(app.camera.quaternion);
    const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(app.camera.quaternion);

    effectState.blackholeEffect.position.copy(app.camera.position)
        .add(cameraDirection.multiplyScalar(3))
        .add(cameraRight.multiplyScalar(1.5));

    app.scene.add(effectState.blackholeEffect);

    // Higher initial gravitational pull for more dramatic effect
    effectState.gravitationalPull = 2.0;
    app.gravitationalPull = 2.0;
    
    // Create ring particles around the blackhole
    createBlackholeRing(app);

    // IMPROVED SOUND HANDLING: Create direct sound if other methods fail
    let soundPlayed = false;

    if (app.soundManager && typeof app.soundManager.play === 'function') {
        console.log("[🔊 AUDIO] Playing blackhole sound via soundManager");
        app.soundManager.play('blackhole', true);
        soundPlayed = true;
    }
    
    if (!soundPlayed && app.soundSynth && typeof app.soundSynth.playSpecialSound === 'function') {
        console.log("[🔊 AUDIO] Playing blackhole sound via soundSynth");
        app.soundSynth.playSpecialSound('blackhole', true);
        soundPlayed = true;
    }
    
    // Direct WebAudio implementation for bass sound if other methods fail
    if (!soundPlayed) {
        console.log("[🔊 AUDIO] Playing blackhole sound via direct WebAudio API");
        try {
            const ctx = app.audioContext || new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            // Deep bass configuration
            osc.type = 'sine';
            osc.frequency.value = 30; // Very low frequency for deep bass

            filter.type = 'lowpass';
            filter.frequency.value = 80;

            osc.connect(filter);
            filter.connect(gain);

            // Connect to master gain if available
            if (app.masterGain) {
                gain.connect(app.masterGain);
            } else {
                gain.connect(ctx.destination);
            }

            // Set initial volume to zero and ramp up
            gain.gain.value = 0;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.8, ctx.currentTime + 0.5);

            osc.start();

            // Store for cleanup
            app._blackholeSound = {
                ctx: ctx,
                osc: osc,
                gain: gain,
                filter: filter,
                stop: function () {
                    console.log("[🔊 AUDIO] Stopping blackhole sound");
                    try {
                        this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime);
                        this.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

                        setTimeout(() => {
                            try {
                                this.osc.stop();
                                this.osc.disconnect();
                                this.filter.disconnect();
                                this.gain.disconnect();
                            } catch (e) {
                                console.error("Error in oscillator cleanup:", e);
                            }
                        }, 250);
                    } catch (e) {
                        console.error("Error in sound stop:", e);
                        try {
                            this.osc.stop();
                            this.gain.gain.value = 0;
                        } catch (err) { }
                    }
                }
            };

            soundPlayed = true;
        } catch (e) {
            console.warn('Could not create blackhole bass sound', e);
        }
    }

    if (app.showStatus) {
        app.showStatus('Blackhole Effect Activated - Hold Right-Click');
    }

    // REMOVED: Automatic timeout - now controlled by mouse release
    // setTimeout(() => {
    //     removeBlackholeEffect(app);
    // }, 5000);
}

// Remove blackhole effect - improved with reliable cleanup
function removeBlackholeEffect(app) {
    console.log("[🌀 EFFECT] Removing blackhole effect and cleaning up");

    if (effectState.blackholeEffect) {
        app.scene.remove(effectState.blackholeEffect);
        effectState.blackholeEffect = null;
    }

    // Remove ring particles
    for (const particle of effectState.blackholeRingParticles) {
        if (particle.parent) {
            particle.parent.remove(particle);
        }
    }
    effectState.blackholeRingParticles = [];

    // Reset gravitational pull state
    effectState.gravitationalPull = 0;
    app.gravitationalPull = 0;

    // IMPROVED AUDIO CLEANUP
    // Stop managed sound
    if (app.soundManager) {
        console.log("[🔊 AUDIO] Stopping blackhole sound via soundManager");
        app.soundManager.stop('blackhole');
    }
    if (app.soundSynth && typeof app.soundSynth.stopSpecialSound === 'function') {
        console.log("[🔊 AUDIO] Stopping blackhole sound via soundSynth");
        app.soundSynth.stopSpecialSound('blackhole');
    }

    // Reset post-processing distortion effects
    if (app.blackholeDistortionPass) {
        console.log("[🌀 EFFECT] Resetting post-processing distortion effects");
        app.blackholeDistortionPass.uniforms.intensity.value = 0;
    }

    // THOROUGH WEB AUDIO CLEANUP
    // IMPROVED AUDIO CLEANUP - with immediate stoppage
    if (app._blackholeSound) {
        console.log("[🔊 AUDIO] Forcefully stopping blackhole sound");
        try {
            // STEP 1: Immediately kill gain to silence the sound
            if (app._blackholeSound.gain) {
                app._blackholeSound.gain.gain.cancelScheduledValues(app._blackholeSound.ctx.currentTime);
                app._blackholeSound.gain.gain.setValueAtTime(0, app._blackholeSound.ctx.currentTime);
            }

            // STEP 2: Immediately stop oscillator - no delay
            if (app._blackholeSound.osc) {
                try {
                    app._blackholeSound.osc.stop(0);
                    app._blackholeSound.osc.disconnect();

                    console.log("[🔊 AUDIO] Oscillator immediately stopped");
                } catch (e) {
                    console.error("Could not stop oscillator:", e);
                }
            }

            // Immediately disconnect everything, don't wait
            if (app._blackholeSound.filter) app._blackholeSound.filter.disconnect();
            if (app._blackholeSound.gain) app._blackholeSound.gain.disconnect();

            // STEP 4: Nullify references immediately
            app._blackholeSound = null;
            console.log("[🔊 AUDIO] All blackhole audio resources released");

        } catch (e) {
            console.error("Error with audio cleanup:", e);
            // Last resort emergency cleanup
            app._blackholeSound = null;
        }
    }

    // IMPROVED MESH RESTORATION
    // Force complete mesh reset with 100% restoration
    resetDeformation(app, 1.0);

    if (app.showStatus) {
        app.showStatus('Blackhole Effect Completed');
    }

    // IMPROVED BALL POSITION RESET - Always reset position
    // Store current position for transition
    const currentPosition = app.ballGroup.position.clone();

    // Always aggressively reset deformation first
    resetDeformation(app, 1.0);

    // Calculate target position (closer to origin)
    // If very far away, bring closer but preserve direction
    const distanceFromOrigin = currentPosition.length();
    let targetPosition;

    if (distanceFromOrigin > 3) {
        // Bring back to a position 2 units from origin in same direction
        console.log("[🌀 EFFECT] Ball was very far away, snapping to closer position");
        targetPosition = new THREE.Vector3(0, 0, 2);
    } else if (distanceFromOrigin > 2) {
        targetPosition = currentPosition.clone().normalize().multiplyScalar(2);
    } else if (distanceFromOrigin > 0.5) {
        // If somewhat far, bring even closer
        targetPosition = currentPosition.clone().normalize().multiplyScalar(0.5);
    } else {
        // If already close, just slightly nudge toward origin
        targetPosition = new THREE.Vector3(0, 0, 0);
    }

    // Smoothly animate return with easing
    const startTime = Date.now();
    const duration = 1200; // milliseconds

    // Also reset rotation to make it look more natural
    const startRotation = {
        x: app.ballGroup.rotation.x,
        y: app.ballGroup.rotation.y,
        z: app.ballGroup.rotation.z
    };

    // Target a slight rotation that looks intentional
    const targetRotation = {
        x: 0,
        y: 0,
        z: 0
    };

    function returnBall() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const t = 1 - Math.pow(1 - progress, 3);

        app.ballGroup.position.lerpVectors(currentPosition, targetPosition, t);

        // Update rotation
        app.ballGroup.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * t;
        app.ballGroup.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * t;
        app.ballGroup.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * t;

        // Continue animation if not done
        if (progress < 1) {
            requestAnimationFrame(returnBall);
        } else {
            console.log("[🌀 EFFECT] Ball position fully reset");

            // Apply one final reset to ensure the mesh is perfectly clean
            resetDeformation(app, 1.0);

            // Force reset any other ball properties that might be affected
            if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.mat) {
                if (app.ballGroup.userData.mat.emissive) {
                    app.ballGroup.userData.mat.emissive.set(0x000000);
                    app.ballGroup.userData.mat.emissiveIntensity = 0;
                }
            }
        }
    }

    returnBall();
}

// Create particles forming a ring around the blackhole
function createBlackholeRing(app) {
    // Clean up any existing particles
    for (const particle of effectState.blackholeRingParticles) {
        if (particle.parent) {
            particle.parent.remove(particle);
        }
    }
    effectState.blackholeRingParticles = [];

    if (!effectState.blackholeEffect) return;

    // Create ring of particles
    const ringCount = 100;
    for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;

        // Create a small stretched cube for the ring particles
        const particle = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.02, 0.02),
            new THREE.MeshBasicMaterial({
                color: 0xFF00FF,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            })
        );

        // Position in a ring
        const ringRadius = 0.6;
        particle.position.set(
            Math.cos(angle) * ringRadius,
            Math.sin(angle) * ringRadius,
            0
        );

        // Store the initial angle for animation
        particle.userData = {
            initialAngle: angle,
            radius: ringRadius,
            speed: 0.02 + Math.random() * 0.02
        };

        // Rotate to face tangent to the ring
        particle.lookAt(new THREE.Vector3(0, 0, 0));
        particle.rotateZ(Math.PI / 2);

        effectState.blackholeEffect.add(particle);
        effectState.blackholeRingParticles.push(particle);
    }
}

// Apply gravitational deformation to the ball
function applyGravitationalDeformation(app, attractorPosition, strength) {
    if (!app.ballGroup || !app.ballGroup.userData || !app.ballGroup.userData.geo) {
        return;
    }

    const ball = app.ballGroup;
    const geo = ball.userData.geo;
    const wireGeo = ball.userData.wireGeo;
    const wireMesh = ball.userData.wireMesh;
    const mesh = ball.userData.mesh;
    const originalPositions = ball.userData.originalPositions;

    if (!geo || !originalPositions) return;

    const positions = geo.attributes.position;

    // Vector from blackhole to ball center (for distortion direction)
    const distortionDir = new THREE.Vector3()
        .subVectors(ball.position, attractorPosition)
        .normalize();

    // Apply deformation to each vertex
    for (let i = 0; i < positions.count; i++) {
        const vertexPosition = new THREE.Vector3(
            positions.array[i * 3],
            positions.array[i * 3 + 1],
            positions.array[i * 3 + 2]
        );

        // Calculate world position of the vertex
        const worldPosition = vertexPosition.clone()
            .applyMatrix4(mesh.matrixWorld);

        // Vector from vertex to blackhole
        const toBlackhole = new THREE.Vector3()
            .subVectors(attractorPosition, worldPosition);

        const distance = toBlackhole.length();

        // Only affect vertices within reasonable distance
        if (distance < 3) {
            const pullStrength = (1 / (distance * distance)) * strength * 0.1;

            // Get direction to blackhole
            toBlackhole.normalize();

            // Apply pull effect
            const pull = toBlackhole.multiplyScalar(pullStrength);

            // Convert to local space
            const localPull = pull.clone()
                .applyMatrix4(mesh.matrixWorld.clone().invert());

            // Get original position (pre-deformation)
            const originalX = originalPositions[i * 3];
            const originalY = originalPositions[i * 3 + 1];
            const originalZ = originalPositions[i * 3 + 2];

            // Apply deformation
            positions.array[i * 3] = originalX + localPull.x;
            positions.array[i * 3 + 1] = originalY + localPull.y;
            positions.array[i * 3 + 2] = originalZ + localPull.z;
        }
    }

    // Update wireframe
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;

    // Mark attributes as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();
}

// Update blackhole effect
function updateBlackholeEffect(app) {
    if (!effectState.blackholeEffect) return;

    const time = Date.now() * 0.001;

    // Animate the blackhole
    effectState.blackholeEffect.rotation.y += 0.02;
    effectState.blackholeEffect.rotation.z += 0.01;

    // Calculate pull effect on the ball
    if (effectState.gravitationalPull > 0 && app.ballGroup) {
        // Direction from ball to blackhole
        const pullDirection = new THREE.Vector3()
            .subVectors(effectState.blackholeEffect.position, app.ballGroup.position)
            .normalize();

        const distance = app.ballGroup.position.distanceTo(effectState.blackholeEffect.position);

        // Non-linear gravitational pull (stronger when closer - inverse square law)
        const pullStrength = 0.4 * effectState.gravitationalPull * (1 / Math.max(0.5, distance));

        // Move ball slightly towards blackhole
        app.ballGroup.position.add(
            pullDirection.clone().multiplyScalar(1.00 * effectState.gravitationalPull)
        );

        // Apply deformation to the ball (stretched towards blackhole)
        applyGravitationalDeformation(app, effectState.blackholeEffect.position, effectState.gravitationalPull);

        // Gradually increase pull
        effectState.gravitationalPull = Math.min(6.0, effectState.gravitationalPull + 0.03);
        app.gravitationalPull = effectState.gravitationalPull;
    }

    // Animate ring particles
    for (const particle of effectState.blackholeRingParticles) {
        const speed = particle.userData.speed;
        const newAngle = particle.userData.initialAngle + time * speed;

        // Vary the radius for more dynamic effect
        const radius = particle.userData.radius * (0.9 + Math.sin(newAngle * 3) * 0.1);

        // Update position
        particle.position.x = Math.cos(newAngle) * radius;
        particle.position.y = Math.sin(newAngle) * radius;

        // Look at the center
        particle.lookAt(new THREE.Vector3(0, 0, 0));
        particle.rotateZ(Math.PI / 2);

        // Pulse opacity
        particle.material.opacity = 0.5 + Math.cos(newAngle * 5) * 0.5;
    }

    // Add this to updateBlackholeEffect function
    // Create a subtle screen-space distortion for immersive effect
    if (app.composer && app.renderPass) {
        // Adjust post-processing intensity based on distance
        const distanceToCam = app.camera.position.distanceTo(effectState.blackholeEffect.position);
        const distortionIntensity = Math.min(1.0, 3.0 / distanceToCam) * effectState.gravitationalPull * 0.1;

        // If using a custom shader, update its uniforms
        if (app.blackholeDistortionPass) {
            app.blackholeDistortionPass.uniforms.intensity.value = distortionIntensity;
            app.blackholeDistortionPass.uniforms.blackholePosition.value.copy(
                effectState.blackholeEffect.position.clone().project(app.camera)
            );
        }
    }
}

// Function to toggle blackhole effect on/off
function toggleBlackholeEffect(app) {
    // Check if blackhole effect is already active
    if (effectState.blackholeEffect) {
        // If active, remove it
        removeBlackholeEffect(app);
        return false;
    } else {
        // If not active, create it
        createBlackholeEffect(app);
        return true;
    }
}

// Function to toggle rainbow mode
function toggleRainbowMode(app) {
    effectState.isRainbowMode = !effectState.isRainbowMode;
    app.isRainbowMode = effectState.isRainbowMode;

    if (effectState.isRainbowMode) {
        // Start with a rainbow gradient
        updateGradientColors(app, '#FF0000', '#00FF00', '#0000FF');

        // Play rainbow sound if it exists
        if (app.soundManager) {
            app.soundManager.play('rainbow', true);
        }
    } else {
        // Reset to original colors
        updateGradientColors(app, defaultColors.start, defaultColors.mid, defaultColors.end);

        // Stop rainbow sound
        if (app.soundManager) {
            app.soundManager.stop('rainbow');
        }
    }

    if (app.showStatus) {
        app.showStatus(`Rainbow Mode ${effectState.isRainbowMode ? 'Enabled' : 'Disabled'}`);
    }

    return effectState.isRainbowMode;
}

// Update rainbow colors with cycling hue
function updateRainbowMode(app) {
    if (!app.isRainbowMode && !effectState.isRainbowMode) return;

    const time = Date.now() * 0.001;

    // Cycle the hue for each color stop, offset by phase
    const hue1 = (time * 0.1) % 1;
    const hue2 = ((time * 0.1) + 0.33) % 1;
    const hue3 = ((time * 0.1) + 0.66) % 1;

    // Convert HSL to hex color
    const color1 = new THREE.Color().setHSL(hue1, 1, 0.5);
    const color2 = new THREE.Color().setHSL(hue2, 1, 0.5);
    const color3 = new THREE.Color().setHSL(hue3, 1, 0.5);

    // Convert THREE.Color to hex string
    const hex1 = '#' + color1.getHexString();
    const hex2 = '#' + color2.getHexString();
    const hex3 = '#' + color3.getHexString();

    // Update the gradient
    updateGradientColors(app, hex1, hex2, hex3);

    // Also update wireframe color if it exists
    if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.wireMat) {
        app.ballGroup.userData.wireMat.color.copy(color1);
    }

    // If we have an analyzer, use it to make audio reactive visuals
    if (app.analyser && effectState.isRainbowMode) {
        // Get frequency data
        const bufferLength = app.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        app.analyser.getByteFrequencyData(dataArray);

        // Calculate average frequency 
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Use to modulate color saturation or brightness
        const normalizedValue = average / 255;

        // Add a bit of audio reactivity to the material
        if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.mat) {
            app.ballGroup.userData.mat.emissiveIntensity = normalizedValue * 2;
        }
    }
}

// Create audio visualization around the ball
function createAudioVisualization(app) {
    if (!app.audioContext || effectState.audioVisualization) return;

    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;

    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );

        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );

        visualizationGroup.add(cube);
    }

    app.scene.add(visualizationGroup);

    // Store it for updates
    effectState.audioVisualization = visualizationGroup;

    // Make invisible by default (will be toggled by visualization toggle)
    visualizationGroup.visible = false;
}

// Update audio visualization
function updateAudioVisualization(app) {
    if (!effectState.audioVisualization || !app.analyser) return;

    // Get frequency data
    const analyser = app.analyser;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Update visualization cubes
    const cubes = effectState.audioVisualization.children;

    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];

        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * bufferLength);
        const value = dataArray[frequencyBin] / 255; // Normalize to 0-1

        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;

        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);

        // Color based on frequency
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

// Function to toggle audio visualization on/off
function toggleAudioVisualization(app) {
    // Create the visualization if it doesn't exist
    if (!effectState.audioVisualization) {
        createAudioVisualization(app);
    }

    // Toggle visibility
    if (effectState.audioVisualization) {
        effectState.audioVisualization.visible = !effectState.audioVisualization.visible;

        // Play/stop sound if available
        if (app.soundManager) {
            if (effectState.audioVisualization.visible) {
                app.soundManager.play('visualization', true);
            } else {
                app.soundManager.stop('visualization');
            }
        }

        if (app.showStatus) {
            app.showStatus(`Audio Visualization ${effectState.audioVisualization.visible ? 'Enabled' : 'Disabled'}`);
        }

        return effectState.audioVisualization.visible;
    }

    return false;
}

// Initialize effects system if needed
function initializeEffects(app) {
    // Set up event listeners for 3D interaction
    if (app.renderer && app.camera && !app._effectsInitialized) {
        // Create raycaster if it doesn't exist
        app.raycaster = app.raycaster || new THREE.Raycaster();

        // Initialize sound manager if needed
        if (!app.soundManager) {
            initSoundManager(app);
        }

        // Initialize effectState colors
        if (app.ballGroup && app.ballGroup.userData && app.ballGroup.userData.mat) {
            // Store original material color
            if (app.ballGroup.userData.mat.color) {
                const originalColor = app.ballGroup.userData.mat.color.clone();
                defaultColors.end = '#' + originalColor.getHexString();
            }
        }

        // Mark as initialized
        app._effectsInitialized = true;

        return true;
    }

    return false;
}

// Initialize sound manager
function initSoundManager(app) {
    // Initialize a basic sound manager if it doesn't exist
    if (!app.soundManager) {
        app.soundManager = {
            sounds: {},

            init: function () {
                // Try to create common sounds 
                this.createSound('hover', '../../assets/sounds/hover.mp3');
                this.createSound('click', '../../assets/sounds/click.mp3');
                this.createSound('explosion', '../../assets/sounds/explosion.mp3');
                this.createSound('spike', '../../assets/sounds/spike.mp3');
                this.createSound('rainbow', '../../assets/sounds/rainbow.mp3');
                this.createSound('blackhole', '../../assets/sounds/blackhole.mp3');
                this.createSound('magnetic', '../../assets/sounds/magnetic.mp3');
                this.createSound('deform', '../../assets/sounds/deform.mp3');
            },

            createSound: function (name, url) {
                const sound = new Audio();
                sound.src = url;
                sound.volume = 0.5;

                this.sounds[name] = {
                    audio: sound,
                    isPlaying: false
                };
            },

            play: function (name, loop = false) {
                const sound = this.sounds[name];
                if (sound && sound.audio) {
                    // Don't restart if it's already playing
                    if (!sound.isPlaying) {
                        sound.audio.loop = loop;
                        sound.audio.play().catch(e => console.log(`Failed to play sound ${name}:`, e));
                        sound.isPlaying = true;

                        // For non-looping sounds, reset isPlaying when done
                        if (!loop) {
                            sound.audio.onended = () => {
                                sound.isPlaying = false;
                            };
                        }
                    }
                }
            },

            stop: function (name) {
                const sound = this.sounds[name];
                if (sound && sound.audio && sound.isPlaying) {
                    sound.audio.pause();
                    sound.audio.currentTime = 0;
                    sound.isPlaying = false;
                }
            }
        };

        app.soundManager.init();
    }
}

// --- Effect Registry ---
const effectRegistry = {};
const updatableEffects = [];

/**
 * Register an effect with a name, toggle, and update function.
 * @param {string} name
 * @param {object} handlers { toggle, update }
 */
function registerEffect(name, handlers) {
    effectRegistry[name] = handlers;
    if (typeof handlers.update === 'function') {
        updatableEffects.push({ name, update: handlers.update });
    }
}

/**
 * Call a registered effect's toggle or update.
 * @param {string} name
 * @param {any[]} args
 * @returns {any}
 */
function callEffect(effectName, app, ...args) {
    switch (effectName) {
        case 'blackhole':
            return createBlackholeEffect(app);
        case 'magnetic':
            return toggleMagneticMode(app);
        case 'explosion':
            return createParticleExplosion(app);
        case 'rainbow':
            return toggleRainbowMode(app);
        case 'spiky':
            return toggleSpikyMode(app);
        case 'audioVisualization':
            return toggleAudioVisualization(app);
        case 'plane':
            return effectRegistry.plane.toggle(app, ...args);
        // Fall back to registry for other effects
        default:
            if (effectRegistry[effectName]?.toggle) {
                return effectRegistry[effectName].toggle(app, ...args);
            }
            console.warn(`Unknown effect '${effectName}'`);
            return false;
    }
}

/**
 * Update all updatable effects (to be called in animation loop).
 * @param {object} app
 */
function updateEffects(app) {
    for (const { update } of updatableEffects) {
        update(app);
    }
}

// --- Register all effects here ---
registerEffect('rainbow', {
    toggle: toggleRainbowMode,
    update: updateRainbowMode
});
registerEffect('blackhole', {
    toggle: toggleBlackholeEffect,
    update: updateBlackholeEffect
});
registerEffect('magnetic', {
    toggle: toggleMagneticMode,
    update: updateMagneticParticles
});
registerEffect('explosion', {
    toggle: createParticleExplosion,
    update: updateParticleExplosion
});
registerEffect('audioVisualization', {
    toggle: toggleAudioVisualization,
    update: updateAudioVisualization
});
registerEffect('plane', {
    toggle: (app, visible) => { if (app.plane) app.plane.visible = !!visible; }
});

export {
    createParticleExplosion,
    updateParticleExplosion,
    applySpikyEffect,
    toggleSpikyMode,
    createMagneticTrail,
    removeMagneticTrail,
    updateMagneticParticles,
    toggleMagneticMode,
    createBlackholeEffect,
    removeBlackholeEffect,
    updateBlackholeEffect,
    toggleBlackholeEffect,
    updateRainbowMode,
    toggleRainbowMode,
    createGradientTexture,
    updateGradientColors,
    explodeEffect,
    createTrailEffect,
    updateTrailEffect,
    highlightFacet,
    updateFacetHighlights,
    applyDeformation,
    resetDeformation,
    createAudioVisualization,
    updateAudioVisualization,
    toggleAudioVisualization,
    applyGravitationalDeformation,
    initializeEffects,
    registerEffect,
    callEffect,
    updateEffects,
    effectRegistry
};

export function logOrphanedEffects() {
    const allExports = Object.keys(module.exports || {});
    const registered = Object.keys(effectRegistry);
    const orphaned = allExports.filter(name =>
        (name.startsWith('create') || name.startsWith('toggle') || name.startsWith('update')) &&
        !registered.includes(name)
    );
    if (orphaned.length) {
        console.warn('[effectManager] Orphaned effect functions:', orphaned);
    }
}

