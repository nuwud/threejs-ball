// ball.js - Ball creation and manipulation functions
import * as THREE from 'three';
import { createGradientTexture } from './effects/gradients.js';

// Ball event system for audio and other triggers
class BallEventEmitter {
    constructor() {
        this.events = {};
    }
    
    addEventListener(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    removeEventListener(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

// Create the 3D ball
function createBall(app) {
    if (!app) {
        console.error("createBall: App context is undefined");
        return null;
    }
    
    try {
        console.log("Creating ball...");
        
        // Create an icosahedron with subdivision level 4 for smooth deformation
        const geo = new THREE.IcosahedronGeometry(1.0, 4);
        console.log("Geometry created");
        
        // Initial gradient colors
        const colorStart = '#FF00FF'; // Neon pink at center
        const colorMid = '#8800FF';   // Purple in middle
        const colorEnd = '#00FFFF';   // Cyan at edges
        
        // Create a gradient texture for the ball
        const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
        console.log("Gradient texture created");
        
        // Create a material with physically based rendering properties
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0xFFFFFF,
            map: gradientTexture,
            transparent: true,
            opacity: 0.8,
            metalness: 0.2,
            roughness: 0.3,
            clearcoat: 0.5,
            clearcoatRoughness: 0.3,
            side: THREE.DoubleSide
        });
        
        // Create a second material for wireframe effect
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            wireframe: true,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        // Create a wireframe geometry based on the edges
        const wireGeo = new THREE.EdgesGeometry(geo);
        console.log("Wireframe geometry created");
        
        // Create a line segments mesh for the wireframe
        const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
        
        // Create the main mesh
        const mesh = new THREE.Mesh(geo, mat);
        console.log("Main mesh created");
        
        // Group both meshes for easier manipulation
        const ballGroup = new THREE.Group();
        ballGroup.add(mesh);
        ballGroup.add(wireMesh);
        console.log("Ball group created with meshes");
        
        // Add event emitter capabilities to the ball group
        const eventEmitter = new BallEventEmitter();
        ballGroup.addEventListener = eventEmitter.addEventListener.bind(eventEmitter);
        ballGroup.removeEventListener = eventEmitter.removeEventListener.bind(eventEmitter);
        ballGroup.emit = eventEmitter.emit.bind(eventEmitter);
        console.log("Event emitter added to ball");
        
        // Store the original vertex positions for deformation
        const positions = geo.attributes.position.array.slice();
        
        // Store references and data in userData for easy access
        ballGroup.userData = {
            mesh: mesh,
            wireMesh: wireMesh,
            mat: mat,
            wireMat: wireMat,
            geo: geo,
            wireGeo: wireGeo,
            originalPositions: positions,
            gradientTexture: gradientTexture,
            colorStart: colorStart,
            colorMid: colorMid,
            colorEnd: colorEnd,
            // For special effects
            spikes: [],
            deformationPoints: []
        };
        
        // Add to scene
        if (app.scene) {
            app.scene.add(ballGroup);
            console.log("Ball added to scene");
        } else {
            console.error("Scene is not defined, cannot add ball");
            return null;
        }
        
        app.ballGroup = ballGroup;
        
        console.log("Ball created successfully");
        return ballGroup;
    } catch (error) {
        console.error("Error creating ball:", error);
        return null;
    }
}

// Apply deformation to the mesh at a specific point
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
    app.ballGroup.emit('deformation', { intensity, radius, point });
}

// Gradually reset deformation
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
        app.ballGroup.emit('deformationReset', { speed, progress: speed });
    }
}

// Update mesh scale based on hover state
function updateBallScale(app) {
    if (!app) return;
    
    // Smoothly interpolate current scale towards target scale
    app.currentScale += (app.targetScale - app.currentScale) * 0.1;
    
    // Apply scale to the ball group
    if (app.ballGroup) {
        app.ballGroup.scale.set(app.currentScale, app.currentScale, app.currentScale);
        
        // Emit scale change event if significant
        if (Math.abs(app.currentScale - app.targetScale) > 0.01) {
            app.ballGroup.emit('scaleChange', { scale: app.currentScale });
        }
    }
}

// Update mesh rotation for idle animation
function updateBallRotation(app) {
    if (!app) return;
    
    // Only apply automatic rotation if not being dragged
    if (!app.isDragging && app.ballGroup) {
        // Very slow automatic rotation for subtle movement
        app.ballGroup.rotation.y += 0.001;
        app.ballGroup.rotation.x += 0.0005;
    }
}

// Update mesh position for "breathing" effect
function updateBallPosition(app) {
    if (!app || !app.ballGroup || !app.clock) return;
    
    // Get elapsed time for animation
    const time = app.clock.getElapsedTime();
    
    // Calculate subtle floating motion using sine waves
    const newX = Math.sin(time) * 0.03;
    const newY = Math.cos(time * 1.3) * 0.02;
    
    // Apply position with smoothing
    app.ballGroup.position.x += (newX - app.ballGroup.position.x) * 0.05;
    app.ballGroup.position.y += (newY - app.ballGroup.position.y) * 0.05;
    
    // Emit subtle movement event for gentle audio feedback
    const movement = Math.abs(newX) + Math.abs(newY);
    if (movement > 0.01) {
        app.ballGroup.emit('move', { intensity: movement * 10 });
    }
}

// Reset the ball to its original state
function resetBall(app) {
    if (!app || !app.ballGroup) {
        console.error("Cannot reset ball: ball not created");
        return;
    }
    
    // Reset deformation
    resetDeformation(app, 1.0);
    
    // Reset scale
    app.targetScale = 1.0;
    app.currentScale = 1.0;
    app.ballGroup.scale.set(1, 1, 1);
    
    // Reset position
    app.ballGroup.position.set(0, 0, 0);
    
    // Reset rotation
    app.ballGroup.rotation.set(0, 0, 0);
    
    // Reset colors
    const colorStart = '#FF00FF'; // Neon pink at center
    const colorMid = '#8800FF';   // Purple in middle
    const colorEnd = '#00FFFF';   // Cyan at edges
    
    // Update textures and materials
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
    app.ballGroup.userData.mat.map = gradientTexture;
    app.ballGroup.userData.mat.needsUpdate = true;
    app.ballGroup.userData.wireMat.color.set(0x00FFFF);
    
    // Update stored colors
    app.ballGroup.userData.colorStart = colorStart;
    app.ballGroup.userData.colorMid = colorMid;
    app.ballGroup.userData.colorEnd = colorEnd;
    
    // Reset special effects flags
    app.isRainbowMode = false;
    app.isMagneticMode = false;
    app.spikiness = 0;
    
    // Stop any special sounds
    if (app.soundSynth) {
        app.soundSynth.stopAllSounds();
    }
    
    // Emit reset event
    app.ballGroup.emit('reset', { complete: true });
    
    console.log("Ball reset to original state");
}

export { 
    createBall, 
    applyDeformation, 
    resetDeformation, 
    updateBallScale,
    updateBallRotation,
    updateBallPosition,
    resetBall
};