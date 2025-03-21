// Import the Three.js library
import * as THREE from "three";

// Set up the renderer with the window dimensions
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

// Set up the camera with field of view, aspect ratio, and clipping planes
const fov = 75;
const aspect = w / h;
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 0, 2); // Position camera 2 units away from origin

// Create a new scene
const scene = new THREE.Scene();

// Create an icosahedron geometry (20-sided polyhedron) with subdivision level 2
const geo = new THREE.IcosahedronGeometry(1.0, 2);

// Create a material for the main mesh with specific properties
// This creates a neon pink material with wireframe and various visual settings
const mat = new THREE.MeshStandardMaterial({
    color: 0xFF00FF, // Neon pink color
    emissive: 0x00FF00, // Neon green glow
    emissiveIntensity: .3,
    wireframe: true,
    wireframeLinewidth: 1,
    wireframeLinecap: 'round',
    wireframeLinejoin: 'round',
    flatShading: true,
    transparent: true,
    opacity: 0.5,
    // Many other visual properties...
});

// Create a second material specifically for wireframe effect
// This material will be cyan/blue
const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00FFFF, // Neon cyan/blue
    wireframe: true,
    wireframeLinewidth: 1,
    transparent: true,
    opacity: 0.5,
    emissive: 0x00FFFF,
    emissiveIntensity: 0.5,
    // Many other visual properties...
});

// Create a wireframe geometry based on the edges of the icosahedron
const wireGeo = new THREE.EdgesGeometry(geo);
// Create a line segments mesh using the wireframe geometry and material
const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
wireMesh.position.set(0, 0, 0);
wireMesh.rotation.set(0, 0, 0);
wireMesh.scale.set(1, 1, 1);
wireMesh.geometry.attributes.position.needsUpdate = true;

// Create the main mesh using the icosahedron geometry and material
const mesh = new THREE.Mesh(geo, mat);
// Add both meshes to the scene
scene.add(mesh);
scene.add(wireMesh);

// Create a hemisphere light with cyan top color and orange bottom color
const wireLight = new THREE.HemisphereLight(0x00CCFF, 0xFF6600, 1);
wireLight.position.set(0, 1, 0).normalize();
scene.add(wireLight);

// Set up rendering layers to control which lights affect which objects
wireMesh.layers.set(1);
wireLight.layers.set(1);
mesh.layers.set(0);
camera.layers.enable(0);
camera.layers.enable(1);

// NOTE: The code below is commented out in the original
// It includes various helpers, additional lights, and visual aids
// that are not being used in the current scene

// Set up the main lighting for the scene
// A hemisphere light that provides ambient lighting from above
const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
hemilight.position.set(0, 1, 0).normalize();
scene.add(hemilight);

// Add three directional lights from different angles to create even lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);
const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-1, -1, -1).normalize();
scene.add(light2);
const light3 = new THREE.DirectionalLight(0xffffff, 1);
light3.position.set(0, 1, 0).normalize();
scene.add(light3);

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    mesh.scale.setScalar(Math.sin(Date.now() * 0.001) + 1);
}

// Animation function to make the mesh continuously rotate
function updateMeshRotation() {
    mesh.rotation.x = Math.sin(Date.now() * 0.001);
    mesh.rotation.y = Math.sin(Date.now() * 0.001);
    mesh.rotation.z = Math.sin(Date.now() * 0.001);
    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;
    mesh.rotation.z += 0.01;
}

// Animation function to make the mesh move in a circular path
function updateMeshPosition() {
    mesh.position.x = Math.sin(Date.now() * 0.001);
    mesh.position.y = Math.cos(Date.now() * 0.001);
    mesh.position.z = Math.sin(Date.now() * 0.001);
    mesh.position.set(Math.sin(Date.now() * 0.001), Math.cos(Date.now() * 0.001), Math.sin(Date.now() * 0.001));
}

// Main animation loop that runs continuously
function animate(t = 0) {
    requestAnimationFrame(animate); // Request the next frame
    updateMeshScale();             // Update the mesh scale
    updateMeshRotation();          // Update the mesh rotation
    updateMeshPosition();          // Update the mesh position
    renderer.render(scene, camera); // Render the scene
}
animate(); // Start the animation loop

// NOTE: Additional commented out code at the bottom
// Shows alternative animation approaches that aren't being used