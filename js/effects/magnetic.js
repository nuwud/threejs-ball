// effects/magnetic.js - Magnetic particles effect
import * as THREE from 'three';

// Global variables for storing effect elements
let magneticParticles = [];

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
    
    // Play magnetic sound if available
    if (app.soundSynth) {
        app.soundSynth.playSpecialSound('magnetic', true);
    }
}

// Remove magnetic particles
function removeMagneticTrail(app) {
    for (const particle of magneticParticles) {
        app.scene.remove(particle);
    }
    magneticParticles = [];
    
    // Stop magnetic sound if available
    if (app.soundSynth) {
        app.soundSynth.stopSpecialSound('magnetic');
    }
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
        particle.rotation.x += 0.01;
        particle.rotation.y += 0.01;
        particle.rotation.z += 0.01;
        particle.scale.setScalar(1 + Math.sin(time * 2) * 0.1);
    }
    // Play magnetic sound if available
    if (app.soundSynth) {
        app.soundSynth.playSpecialSound('magnetic', true);
    }
}
// Export functions
export { createMagneticTrail, removeMagneticTrail, updateMagneticParticles };
// This code creates a magnetic trail effect with particles that follow the ball in a 3D scene.
// The particles are created with random positions, sizes, and colors, and they smoothly follow the ball's movement.
// The effect can be toggled on and off, and the particles are removed when not needed.
// The sound effect is also played when the magnetic trail is active.
// The code is designed to be modular and can be integrated into a larger application with an audio context and sound synthesis capabilities.
// The magnetic trail effect is visually appealing and can enhance the overall experience of the application.
// The particles are created using Three.js, a popular 3D graphics library for JavaScript.
// The code is structured to allow for easy updates and modifications, making it flexible for different use cases.
// The magnetic trail effect is designed to be visually appealing and can enhance the overall experience of the application.
// The particles are created using Three.js, a popular 3D graphics library for JavaScript.
// The code is structured to allow for easy updates and modifications, making it flexible for different use cases.