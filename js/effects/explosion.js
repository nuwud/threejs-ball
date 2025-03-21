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
    
    // Play explosion sound if available
    if (app.soundSynth) {
        app.soundSynth.playSpecialSound('explosion');
    }
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

export { createParticleExplosion, updateParticleExplosion };