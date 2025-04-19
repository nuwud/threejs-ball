import * as THREE from "three";

export const geo = new THREE.IcosahedronGeometry(1.0, 4);

// Store original vertices for resetting the shape
export const originalPositions = geo.attributes.position.array.slice();

// Create a gradient texture for the faces
export const createGradientTexture = (colorStart, colorMid, colorEnd) => {
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
};

// Initial gradient colors
export let colorStart = '#FF00FF'; // Neon pink at center
export let colorMid = '#8800FF';   // Purple in middle
export let colorEnd = '#00FFFF';   // Cyan at edges

export let gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);

// Create a material for the main mesh with physically based rendering
export const mat = new THREE.MeshPhysicalMaterial({
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
export const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00FFFF,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
});

// Create a wireframe geometry based on the edges of the icosahedron
export const wireGeo = new THREE.EdgesGeometry(geo);
// Create a line segments mesh using the wireframe geometry and material
export const wireMesh = new THREE.LineSegments(wireGeo, wireMat);

// Create the main mesh using the icosahedron geometry and material
export const mesh = new THREE.Mesh(geo, mat);

// Group both meshes for easier interaction
export const ballGroup = new THREE.Group();
ballGroup.add(mesh);
ballGroup.add(wireMesh);

// Add this to your geometry.js file to debug material issues
function debugMaterial() {
  console.log("Material properties:", {
    transparent: app.ball.material.transparent,
    opacity: app.ball.material.opacity,
    visible: app.ball.material.visible,
    side: app.ball.material.side,
    color: app.ball.material.color.getHexString()
  });
  
  // Force reset material to known good state
  app.ball.material.transparent = false;
  app.ball.material.opacity = 1.0;
  app.ball.material.visible = true;
  app.ball.material.side = THREE.DoubleSide;
  app.ball.material.needsUpdate = true;
}
