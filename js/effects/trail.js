// effects/trail.js - Motion trail effect
import * as THREE from 'three';

let trailPoints = [];

/**
 * Create a motion trail effect that follows the ball
 * @param {Object} app - Application context
 * @returns {Object} Trail effect object
 */
function createTrailEffect(app) {
    console.log("Creating trail effect");
    
    // Safety check
    if (!app || !app.scene || !app.ballGroup) {
        console.error("Cannot create trail effect: missing app context");
        return null;
    }
    
    try {
        // Get current ball position
        const ballPosition = app.ballGroup.position.clone();
        
        // Create trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(100 * 3); // 100 points
        const colors = new Float32Array(100 * 3);
        
        // Initialize all positions to ball center
        for (let i = 0; i < 100; i++) {
            positions[i * 3] = ballPosition.x;
            positions[i * 3 + 1] = ballPosition.y;
            positions[i * 3 + 2] = ballPosition.z;
            
            // Gradient color from ball color to transparent
            const t = i / 100; // 0 at start, 1 at end
            colors[i * 3] = 0.8 * (1 - t); // Red component fades out
            colors[i * 3 + 1] = 0.5 * (1 - t); // Green component fades out faster
            colors[i * 3 + 2] = 1.0 * (1 - t); // Blue component fades out
        }
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Create material with glow effect
        const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        // Create line
        const trailEffect = new THREE.Line(trailGeometry, trailMaterial);
        app.scene.add(trailEffect);
        
        // Store initial points
        trailPoints = Array(100).fill().map(() => ballPosition.clone());
        
        // Store reference for updates
        trailEffect.userData = {
            points: trailPoints
        };
        
        console.log("Trail effect created successfully");
        return trailEffect;
    } catch (error) {
        console.error("Error creating trail effect:", error);
        return null;
    }
}

/**
 * Update the trail effect based on ball movement
 * @param {Object} app - Application context
 */
function updateTrailEffect(app) {
    // Safety check
    if (!app || !app.trailEffect || !app.ballGroup) return;
    
    try {
        // Get current ball position in world space
        const ballPosition = new THREE.Vector3();
        app.ballGroup.getWorldPosition(ballPosition);
        
        // Get trail data
        const trailEffect = app.trailEffect;
        const trailPoints = trailEffect.userData?.points || [];
        
        // Only update if ball has moved significantly
        const lastPoint = trailPoints[0];
        if (!lastPoint) return;
        
        const distance = lastPoint.distanceTo(ballPosition);
        
        if (distance > 0.01 || app.isDragging) {
            // Add new point at beginning
            trailPoints.unshift(ballPosition.clone());
            
            // Remove last point to maintain fixed array length
            if (trailPoints.length > 100) {
                trailPoints.pop();
            }
            
            // Update geometry positions
            const positions = trailEffect.geometry.attributes.position.array;
            
            for (let i = 0; i < trailPoints.length; i++) {
                if (i < 100) { // Safety check
                    positions[i * 3] = trailPoints[i].x;
                    positions[i * 3 + 1] = trailPoints[i].y;
                    positions[i * 3 + 2] = trailPoints[i].z;
                }
            }
            
            // Mark for update
            trailEffect.geometry.attributes.position.needsUpdate = true;
        }
    } catch (error) {
        console.error("Error updating trail effect:", error);
    }
}

export { createTrailEffect, updateTrailEffect };