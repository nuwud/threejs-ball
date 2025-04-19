// effects/blackhole.js - Blackhole visual effect
import * as THREE from 'three';

// Global variables for storing effect elements
let blackholeEffect = null;
let blackholeRingParticles = [];

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
    if (app.soundSynth) {
        app.soundSynth.playSpecialSound('blackhole', true);
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
    if (app.soundSynth) {
        app.soundSynth.stopSpecialSound('blackhole');
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

export { createBlackholeEffect, removeBlackholeEffect, updateBlackholeEffect };