// effects.js - Handles visual effects for the 3D ball
import * as THREE from 'three';
import { createParticleExplosion, updateParticleExplosion } from './effects/explosion.js';
import { createTrailEffect, updateTrailEffect } from './effects/trail.js';
import { highlightFacet, updateFacetHighlights } from './effects/facet.js';
import { createGradientTexture, updateGradientColors } from './effects/gradients.js';

// Global variables for storing effect elements
let magneticParticles = [];
let blackholeEffect = null;
let particleSystem = null;
let blackholeRingParticles = [];

// Create explosion effect
function createParticleExplosion(app) {
    // Clean up any existing particle system
    if (particleSystem) {
        app.scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
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
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    app.scene.add(particleSystem);

    // Store velocities for animation
    particleSystem.userData.velocities = velocities;
    particleSystem.userData.age = 0;

    // Trigger removal after 3 seconds
    setTimeout(() => {
        if (particleSystem) {
            app.scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
            particleSystem = null;
        }
    }, 3000);
}

// Update particle explosion animation
function updateParticleExplosion() {
    if (!particleSystem) return;

    // Increase particle age
    particleSystem.userData.age += 0.016; // Approx 60fps

    // Get positions attribute for update
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;

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
    particleSystem.material.opacity = Math.max(0, 1 - particleSystem.userData.age / 2);

    // Mark positions for update
    particleSystem.geometry.attributes.position.needsUpdate = true;
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
    if (ballGroup.userData.spikes.length === 0) {
        for (let i = 0; i < positions.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];
            const z = originalPositions[i * 3 + 2];

            const vertex = new THREE.Vector3(x, y, z).normalize();

            ballGroup.userData.spikes.push({
                index: i,
                direction: vertex,
                phase: Math.random() * Math.PI * 2 // Random phase for animation
            });
        }
    }

    // Apply spiky effect
    for (const spike of ballGroup.userData.spikes) {
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
        color.r += (1 - size) * 0.8;
        color.g += (1 - size) * 0.8;
        color.b += (1 - size) * 0.1;

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
        magneticParticles.push(particle);
    }
}

// Remove magnetic particles
function removeMagneticTrail(app) {
    for (const particle of magneticParticles) {
        app.scene.remove(particle);
    }
    magneticParticles = [];
}

// Update magnetic particles
function updateMagneticParticles(app) {
    if (!app.isMagneticMode || magneticParticles.length === 0) return;

    const time = Date.now() * 0.001;

    for (const particle of magneticParticles) {
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
    // Make sure we don't have an existing effect
    if (blackholeEffect) {
        app.scene.remove(blackholeEffect);
    }

    // Create a dark sphere with a distortion shader
    const blackholeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8
    });

    blackholeEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 32),
        blackholeMaterial
    );

    // Position it slightly offset from the ball
    blackholeEffect.position.set(
        app.ballGroup.position.x + 1,
        app.ballGroup.position.y,
        app.ballGroup.position.z
    );

    app.scene.add(blackholeEffect);

    // Start gravitational pull
    app.gravitationalPull = 1.0;

    // Create ring particles around the blackhole
    createBlackholeRing(app);

    // Play blackhole sound
    if (app.soundManager) {
        app.soundManager.play('blackhole');
    }

    // Automatically remove after a few seconds
    setTimeout(() => {
        removeBlackholeEffect(app);
    }, 5000);
}

// Remove blackhole effect
function removeBlackholeEffect(app) {
    if (blackholeEffect) {
        app.scene.remove(blackholeEffect);
        blackholeEffect = null;
    }

    // Remove ring particles
    for (const particle of blackholeRingParticles) {
        if (particle.parent) {
            particle.parent.remove(particle);
        }
    }

    blackholeRingParticles = [];

    // Reset gravitational pull
    app.gravitationalPull = 0;

    // Stop blackhole sound
    if (app.soundManager) {
        app.soundManager.stop('blackhole');
    }
}

// Create particles forming a ring around the blackhole
function createBlackholeRing(app) {
    // Clean up any existing particles
    for (const particle of blackholeRingParticles) {
        if (particle.parent) {
            particle.parent.remove(particle);
        }
    }

    blackholeRingParticles = [];

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

        blackholeEffect.add(particle);
        blackholeRingParticles.push(particle);
    }
}

// Update blackhole effect (called in animation loop)
function updateBlackholeEffect(app) {
    if (!blackholeEffect) return;

    const time = Date.now() * 0.001;

    // Animate the blackhole
    blackholeEffect.rotation.y += 0.02;
    blackholeEffect.rotation.z += 0.01;

    // Calculate pull effect on the ball
    if (app.gravitationalPull > 0 && app.ballGroup) {
        // Direction from ball to blackhole
        const pullDirection = new THREE.Vector3()
            .subVectors(blackholeEffect.position, app.ballGroup.position)
            .normalize();

        // Move ball slightly towards blackhole
        app.ballGroup.position.add(pullDirection.multiplyScalar(0.005 * app.gravitationalPull));

        // Apply deformation to the ball (stretched towards blackhole)
        const geo = app.ballGroup.userData.geo;
        const wireGeo = app.ballGroup.userData.wireGeo;
        const wireMesh = app.ballGroup.userData.wireMesh;
        const mesh = app.ballGroup.userData.mesh;
        const originalPositions = app.ballGroup.userData.originalPositions;

        const positions = geo.attributes.position;

        // Vector from blackhole to ball center (for distortion direction)
        const distortionDir = new THREE.Vector3()
            .subVectors(app.ballGroup.position, blackholeEffect.position)
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
                .subVectors(blackholeEffect.position, worldPosition);

            const distance = toBlackhole.length();

            // Only affect vertices within reasonable distance
            if (distance < 3) {
                const strength = (1 / (distance * distance)) * app.gravitationalPull * 0.1;

                // Get direction to blackhole
                toBlackhole.normalize();

                // Apply pull effect
                const pull = toBlackhole.multiplyScalar(strength);

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

    // Animate ring particles
    for (const particle of blackholeRingParticles) {
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
}

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
}

// Create a gradient texture for the rainbow effect
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
    createGradientTexture,
    createTrailEffect,
    updateTrailEffect,
    highlightFacet,
    updateFacetHighlights,
    updateGradientColors
};