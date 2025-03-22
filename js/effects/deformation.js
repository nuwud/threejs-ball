// effects/deformation.js - Deformation utilities for the ball
import * as THREE from 'three';

/**
 * Apply deformation to the mesh at a specific point
 * @param {Object} app - Application context
 * @param {Vector3} point - Point in 3D space to apply deformation
 * @param {number} intensity - Strength of the deformation
 * @param {number} radius - Radius of effect
 */
function applyDeformation(app, point, intensity, radius) {
    if (!app || !app.ballGroup || !app.ballGroup.userData) {
        console.error("Cannot apply deformation: ball or ball data missing");
        return;
    }
    
    // Get position attribute for direct manipulation
    const mesh = app.ballGroup.userData.mesh;
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) {
        console.error("Cannot apply deformation: ball mesh or geometry missing");
        return;
    }
    
    const positions = mesh.geometry.attributes.position;
    const originalPositions = app.ballGroup.userData.originalPositions;
    
    if (!originalPositions) {
        console.error("Original positions not found");
        return;
    }
    
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
    
    // Mark attributes as needing update
    positions.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    
    // Update wireframe geometry to match the deformed shape
    const wireMesh = app.ballGroup.userData.wireMesh;
    if (wireMesh && wireMesh.geometry) {
        wireMesh.geometry = new THREE.EdgesGeometry(mesh.geometry);
    }
    
    // Emit deformation event for audio feedback
    if (app.ballGroup.emit) {
        app.ballGroup.emit('deformation', { intensity, radius, point });
    }
}

/**
 * Gradually reset deformation
 * @param {Object} app - Application context
 * @param {number} speed - Speed of reset (0-1)
 */
function resetDeformation(app, speed) {
    if (!app || !app.ballGroup || !app.ballGroup.userData) {
        console.error("Cannot reset deformation: ball or ball data missing");
        return;
    }
    
    const mesh = app.ballGroup.userData.mesh;
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes || !mesh.geometry.attributes.position) {
        console.error("Cannot reset deformation: ball mesh or geometry missing");
        return;
    }
    
    const positions = mesh.geometry.attributes.position;
    const originalPositions = app.ballGroup.userData.originalPositions;
    
    if (!originalPositions) {
        console.error("Original positions not found");
        return;
    }
    
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
        // Mark attributes as needing update
        positions.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        
        // Update wireframe geometry to match the deformed shape
        const wireMesh = app.ballGroup.userData.wireMesh;
        if (wireMesh && wireMesh.geometry) {
            wireMesh.geometry = new THREE.EdgesGeometry(mesh.geometry);
        }
        
        // Emit reset event with progress information
        if (app.ballGroup.emit) {
            app.ballGroup.emit('deformationReset', { speed, progress: speed });
        }
    }
}

export { applyDeformation, resetDeformation };