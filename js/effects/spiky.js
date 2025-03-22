// effects/spiky.js - Spiky deformation effect
import * as THREE from 'three';

export function applySpikyEffect(app, intensity) {
    if (!app.ballGroup || !app.ballGroup.userData) return;
    
    const mesh = app.ballGroup.userData.mesh;
    if (!mesh || !mesh.geometry) return;
    
    // Save original positions if not already saved
    if (!app.ballGroup.userData.originalPositions) {
        const positions = mesh.geometry.attributes.position;
        const originalPositions = new Float32Array(positions.array.length);
        for (let i = 0; i < positions.array.length; i++) {
            originalPositions[i] = positions.array[i];
        }
        app.ballGroup.userData.originalPositions = originalPositions;
    }
    
    const positions = mesh.geometry.attributes.position;
    const originalPositions = app.ballGroup.userData.originalPositions;
    
    // Apply spiky deformation to each vertex
    for (let i = 0; i < positions.count; i++) {
        const vertexPosition = new THREE.Vector3(
            originalPositions[i * 3],
            originalPositions[i * 3 + 1],
            originalPositions[i * 3 + 2]
        );
        
        // Normalize to get direction
        const direction = vertexPosition.clone().normalize();
        
        // Random variation per vertex
        const spikeIntensity = intensity * (0.8 + Math.random() * 0.4);
        
        // Move vertex outward in its normal direction
        positions.array[i * 3] = originalPositions[i * 3] + direction.x * spikeIntensity;
        positions.array[i * 3 + 1] = originalPositions[i * 3 + 1] + direction.y * spikeIntensity;
        positions.array[i * 3 + 2] = originalPositions[i * 3 + 2] + direction.z * spikeIntensity;
    }
    
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
}

export function resetBall(app) {
    if (!app.ballGroup || !app.ballGroup.userData) return;
    
    const mesh = app.ballGroup.userData.mesh;
    if (!mesh || !mesh.geometry || !app.ballGroup.userData.originalPositions) return;
    
    const positions = mesh.geometry.attributes.position;
    const originalPositions = app.ballGroup.userData.originalPositions;
    
    // Reset to original positions
    for (let i = 0; i < positions.array.length; i++) {
        positions.array[i] = originalPositions[i];
    }
    
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
}