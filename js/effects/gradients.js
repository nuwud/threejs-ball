// effects/gradients.js - Gradient texture creation functions
import * as THREE from 'three';

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

// Update gradient colors with smooth transition
function updateGradientColors(app, newColorStart, newColorMid, newColorEnd) {
    const mesh = app.ballGroup.children[0];
    
    // Create a new texture with updated colors
    const gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);
    
    // Apply it to the material
    mesh.material.map = gradientTexture;
    mesh.material.needsUpdate = true;
    
    // Update stored colors
    app.ballGroup.userData.colorStart = newColorStart;
    app.ballGroup.userData.colorMid = newColorMid;
    app.ballGroup.userData.colorEnd = newColorEnd;
}

export { createGradientTexture, updateGradientColors };