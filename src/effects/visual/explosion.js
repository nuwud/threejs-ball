// effects/explosion.js - Particle explosion effects
import * as THREE from 'three';

// Global variables for storing effect elements
let particleSystem = null;

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

    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        sizeAttenuation: true
    });

    // Create particle system
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    particleSystem.userData.velocities = velocities;
    particleSystem.userData.creationTime = Date.now();
    app.scene.add(particleSystem);

    // Try to play explosion sound if synthesizer exists
    if (app.soundSynth) {
        try {
            app.soundSynth.playSpecialSound('explosion');
        } catch (e) {
            console.warn('Could not play explosion sound', e);
        }
    }

    return particleSystem;
}

// Update particle explosion animation
function updateParticleExplosion(app) {
    if (!particleSystem) return;

    // Get time since creation to auto-remove after duration
    const age = Date.now() - particleSystem.userData.creationTime;
    if (age > 3000) { // Remove after 3 seconds
        app.scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        particleSystem.material.dispose();
        particleSystem = null;
        return;
    }

    const positions = particleSystem.geometry.attributes.position;
    const velocities = particleSystem.userData.velocities;

    // Apply physics to all particles
    for (let i = 0; i < positions.count; i++) {
        // Get current position
        const x = positions.array[i * 3];
        const y = positions.array[i * 3 + 1];
        const z = positions.array[i * 3 + 2];

        // Apply velocity with gravity and drag
        const velocity = velocities[i];
        velocity.y -= 0.001; // Gravity
        velocity.multiplyScalar(0.99); // Drag

        // Update position
        positions.array[i * 3] += velocity.x;
        positions.array[i * 3 + 1] += velocity.y;
        positions.array[i * 3 + 2] += velocity.z;
    }

    // Tell THREE.js to update the positions
    positions.needsUpdate = true;
}

// Export the functions
export { createParticleExplosion, updateParticleExplosion };