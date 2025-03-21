// effects/spiky.js - Spiky deformation effect
import * as THREE from 'three';

// Apply spiky effect on the ball
function applySpikyEffect(app, intensity) {
    const ballGroup = app.ballGroup;
    if (!ballGroup || !ballGroup.userData) return;
    
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const mesh = ballGroup.userData.mesh;
    const originalPositions = ballGroup.userData.originalPositions;
    
    if (!geo || !originalPositions) {
        console.error("Missing geometry or original positions");
        return;
    }

    const positions = geo.attributes.position;

    // If we haven't stored spikes yet, create them
    if (!ballGroup.userData.spikes || ballGroup.userData.spikes.length === 0) {
        ballGroup.userData.spikes = [];
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
    
    // Play spike sound if available
    if (app.soundSynth) {
        app.soundSynth.playSpecialSound('spike', false);
    }
}

export { applySpikyEffect };