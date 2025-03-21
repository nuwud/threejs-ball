// ball.js - Creates and manages the 3D ball
import * as THREE from 'three';

// Create the 3D ball
function createBall(app) {
    // Create an icosahedron with subdivision level 4 for smooth deformation
    const geo = new THREE.IcosahedronGeometry(1.0, 4);
    
    // Initial gradient colors
    const colorStart = '#FF00FF'; // Neon pink at center
    const colorMid = '#8800FF';   // Purple in middle
    const colorEnd = '#00FFFF';   // Cyan at edges
    
    // Create a gradient texture for the ball
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
    
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
    
    // Create a line segments mesh for the wireframe
    const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
    
    // Create the main mesh
    const mesh = new THREE.Mesh(geo, mat);
    
    // Group both meshes for easier manipulation
    const ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    ballGroup.add(wireMesh);
    
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
    app.scene.add(ballGroup);
    
    return ballGroup;
}

// Create a gradient texture for the ball
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

// Update the ball's gradient texture with new colors
function updateGradientColors(app, colorStart, colorMid, colorEnd) {
    const ballGroup = app.ballGroup;
    const mat = ballGroup.userData.mat;
    
    // Create new gradient texture with updated colors
    const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
    
    // Apply to the material
    mat.map = gradientTexture;
    mat.needsUpdate = true;
    
    // Update stored colors
    ballGroup.userData.colorStart = colorStart;
    ballGroup.userData.colorMid = colorMid;
    ballGroup.userData.colorEnd = colorEnd;
    ballGroup.userData.gradientTexture = gradientTexture;
}

// Apply deformation to the ball at a specific point
function applyDeformation(app, point, strength = 0.5, radius = 0.5) {
    const ballGroup = app.ballGroup;
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const mesh = ballGroup.userData.mesh;
    const originalPositions = ballGroup.userData.originalPositions;
    
    // Get position attribute
    const positions = geo.attributes.position;
    
    // Convert point to local space if it's in world space
    const localPoint = point.clone().applyMatrix4(mesh.matrixWorld.clone().invert());
    
    // Apply deformation
    for (let i = 0; i < positions.count; i++) {
        const vertexPosition = new THREE.Vector3(
            originalPositions[i * 3],
            originalPositions[i * 3 + 1],
            originalPositions[i * 3 + 2]
        );
        
        // Calculate distance to deformation point
        const distance = vertexPosition.distanceTo(localPoint);
        
        // Only deform vertices within radius
        if (distance < radius) {
            // Calculate deformation based on distance
            const deformation = Math.max(0, 1 - distance / radius) * strength;
            
            // Direction from vertex to point (for pushing inward)
            const direction = new THREE.Vector3().subVectors(localPoint, vertexPosition).normalize();
            
            // Push vertex inward
            const newPosition = vertexPosition.clone().add(direction.multiplyScalar(deformation));
            
            // Apply to position buffer
            positions.array[i * 3] = newPosition.x;
            positions.array[i * 3 + 1] = newPosition.y;
            positions.array[i * 3 + 2] = newPosition.z;
        }
    }
    
    // Update wireframe to match new geometry
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;
    
    // Mark attributes as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    
    // Store deformation point for potential animation
    ballGroup.userData.deformationPoints.push({
        point: localPoint,
        strength: strength,
        radius: radius,
        time: Date.now()
    });
    
    // Limit number of stored deformation points
    if (ballGroup.userData.deformationPoints.length > 5) {
        ballGroup.userData.deformationPoints.shift();
    }
}

// Reset deformation, gradually returning the ball to original shape
function resetDeformation(app, speed = 0.1) {
    const ballGroup = app.ballGroup;
    if (!ballGroup) return;
    
    const geo = ballGroup.userData.geo;
    const wireGeo = ballGroup.userData.wireGeo;
    const wireMesh = ballGroup.userData.wireMesh;
    const originalPositions = ballGroup.userData.originalPositions;
    
    const positions = geo.attributes.position;
    
    // Gradually move vertices back to original positions
    for (let i = 0; i < positions.count; i++) {
        const currentX = positions.array[i * 3];
        const currentY = positions.array[i * 3 + 1];
        const currentZ = positions.array[i * 3 + 2];
        
        const originalX = originalPositions[i * 3];
        const originalY = originalPositions[i * 3 + 1];
        const originalZ = originalPositions[i * 3 + 2];
        
        // Move each vertex a small step toward its original position
        positions.array[i * 3] = currentX + (originalX - currentX) * speed;
        positions.array[i * 3 + 1] = currentY + (originalY - currentY) * speed;
        positions.array[i * 3 + 2] = currentZ + (originalZ - currentZ) * speed;
    }
    
    // Update wireframe
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;
    
    // Mark attributes as updated
    positions.needsUpdate = true;
    geo.computeVertexNormals();
    
    // Clear stored deformation points
    if (speed === 1) {
        ballGroup.userData.deformationPoints = [];
    }
}

// Animate deformations over time for more organic motion
function animateDeformations(app) {
    const ballGroup = app.ballGroup;
    if (!ballGroup) return;
    
    const deformationPoints = ballGroup.userData.deformationPoints;
    if (deformationPoints.length === 0) return;
    
    const now = Date.now();
    
    // Animate each deformation point
    for (let i = deformationPoints.length - 1; i >= 0; i--) {
        const deform = deformationPoints[i];
        const elapsed = (now - deform.time) / 1000; // seconds
        
        // Reduce strength over time
        deform.strength *= 0.98;
        
        // Increase radius slightly for a spreading effect
        deform.radius += 0.001;
        
        // Remove old deformation points
        if (elapsed > 2 || deform.strength < 0.01) {
            deformationPoints.splice(i, 1);
        }
    }
}

export { 
    createBall, 
    updateGradientColors, 
    applyDeformation, 
    resetDeformation,
    animateDeformations
};