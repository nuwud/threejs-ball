// ball.js - Handles creation and management of the 3D ball
import * as THREE from 'three';

// Global variables to store the initial ball state
let originalPositions = null;
let colorStart = '#FF00FF'; // Neon pink at center
let colorMid = '#8800FF';   // Purple in middle
let colorEnd = '#00FFFF';   // Cyan at edges

// Create a gradient texture for the faces
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

// Create the ball mesh
function createBall(app) {
    // Create an icosahedron geometry with subdivision level 4 for smoother deformation
    const geo = new THREE.IcosahedronGeometry(1.0, 4);

    // Store original vertices for resetting the shape
    originalPositions = geo.attributes.position.array.slice();

    // Create the initial gradient texture
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);

    // Create a material for the main mesh with physically based rendering
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

    // Create a second material specifically for wireframe effect
    const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00FFFF,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    // Create a wireframe geometry based on the edges of the icosahedron
    const wireGeo = new THREE.EdgesGeometry(geo);

    // Create a line segments mesh using the wireframe geometry and material
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);

    // Create the main mesh using the icosahedron geometry and material
    const mesh = new THREE.Mesh(geo, mat);

    // Group both meshes for easier interaction
    const ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    ballGroup.add(wireMesh);

    // Add the ball group to the scene
    app.scene.add(ballGroup);

    // Store references for access from other modules
    ballGroup.userData = {
        geo: geo,
        wireGeo: wireGeo,
        mesh: mesh,
        wireMesh: wireMesh,
        mat: mat,
        wireMat: wireMat,
        originalPositions: originalPositions,
        gradientTexture: gradientTexture,
        spikes: []
    };

    return ballGroup;
}

// Apply deformation to the mesh at a specific point
function applyDeformation(app, point, intensity, radius) {
    const ballGroup = app.ballGroup;
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const mesh = ballGroup.userData.mesh;
    const originalPositions = ballGroup.userData.originalPositions;

    // Get position attribute for direct manipulation
    const positions = geo.attributes.position;

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

    // Update wireframe to match the deformed shape
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;

    // Mark attributes as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();
}

// Gradually reset deformation
function resetDeformation(app, speed) {
    const ballGroup = app.ballGroup;
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const originalPositions = ballGroup.userData.originalPositions;

    const positions = geo.attributes.position;
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
        // Update wireframe to match the deformed shape
        wireGeo.copy(new THREE.EdgesGeometry(geo));
        wireMesh.geometry = wireGeo;

        positions.needsUpdate = true;
        geo.computeVertexNormals();
    }
}

// Function to update gradient colors with smooth transition
function updateGradientColors(app, newColorStart, newColorMid, newColorEnd) {
    const ballGroup = app.ballGroup;
    const mat = ballGroup.userData.mat;

    // Create a new texture with updated colors
    const gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);

    // Apply it to the material
    mat.map = gradientTexture;
    mat.needsUpdate = true;

    // Store the texture in userData for potential future use
    ballGroup.userData.gradientTexture = gradientTexture;
}

// Animation function to make the mesh scale pulse based on time
function updateMeshScale(app) {
    const ballGroup = app.ballGroup;

    // Smoothly transition to target scale
    app.currentScale += (app.targetScale - app.currentScale) * 0.1;

    // Only apply automated scale changes if not being interacted with
    if (!app.isDragging && !app.isHovered) {
        // Enhanced breathing animation with multiple sine waves for organic movement
        const time = Date.now() * 0.001;
        const primaryBreath = Math.sin(time * 0.5) * 0.1 + 1; // Slower, deeper breath
        const secondaryBreath = Math.sin(time * 1.3) * 0.03; // Faster, smaller modulation
        const breathingScale = primaryBreath + secondaryBreath;

        ballGroup.scale.set(
            breathingScale * app.currentScale,
            breathingScale * app.currentScale * 0.95 + 0.05, // Slightly less Y-scale for asymmetric breathing
            breathingScale * app.currentScale
        );
    } else {
        // Just apply the target scale
        ballGroup.scale.set(app.currentScale, app.currentScale, app.currentScale);
    }
}

// Animation function to make the mesh continuously rotate when not interacted with
function updateMeshRotation(app) {
    const ballGroup = app.ballGroup;

    // Only auto-rotate if not being dragged
    if (!app.isDragging) {
        ballGroup.rotation.x += 0.003;
        ballGroup.rotation.y += 0.004;
    }
}

// Animation function to make the mesh move in a circular path
function updateMeshPosition(app) {
    const ballGroup = app.ballGroup;

    // Only apply automatic position changes if not being interacted with
    if (!app.isDragging && !app.isHovered) {
        // Calculate new position with smooth sine wave movement
        const time = Date.now() * 0.0005;
        const newX = Math.sin(time) * 0.3;
        const newY = Math.cos(time * 1.3) * 0.2;

        // Apply position with smoothing
        ballGroup.position.x += (newX - ballGroup.position.x) * 0.05;
        ballGroup.position.y += (newY - ballGroup.position.y) * 0.05;
    }
}

export {
    createBall,
    applyDeformation,
    resetDeformation,
    updateGradientColors,
    updateMeshScale,
    updateMeshRotation,
    updateMeshPosition,
    createGradientTexture
};