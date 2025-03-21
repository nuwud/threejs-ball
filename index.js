// Import the Three.js library
import * as THREE from "three";

// Set up the renderer with the window dimensions
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
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

// Create a gradient texture for the faces
const createGradientTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    
    const context = canvas.getContext('2d');
    
    // Create gradient
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Add gradient colors
    gradient.addColorStop(0, '#FF00FF'); // Neon pink at center
    gradient.addColorStop(1, '#00FFFF'); // Cyan at edges
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
};

const gradientTexture = createGradientTexture();

// Create a material for the main mesh with specific properties
// This creates a material with gradient and transparent faces
const mat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF, // Base color (will be modified by the texture)
    emissive: 0x00FF00, // Neon green glow
    emissiveIntensity: 0.3,
    map: gradientTexture, // Apply the gradient texture
    flatShading: true,
    transparent: true,
    opacity: 0.7, // Increased opacity to make faces more visible
    wireframe: false, // Turn off wireframe to show faces
    side: THREE.DoubleSide // Show both sides of faces
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

// Group both meshes for easier interaction
const ballGroup = new THREE.Group();
ballGroup.add(mesh);
ballGroup.add(wireMesh);
scene.add(ballGroup);

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

// Add touch/mouse interactivity
// Track mouse/touch position
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let isHovered = false;

// Function to handle mouse/touch movement for interaction
function onPointerMove(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster with the new mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Calculate objects intersecting the ray
    const intersects = raycaster.intersectObject(mesh, true);
    
    // Change appearance when hovered
    if (intersects.length > 0) {
        if (!isHovered) {
            document.body.style.cursor = 'pointer';
            wireMat.color.set(0xFF00FF); // Change wireframe color to pink on hover
            isHovered = true;
        }
    } else {
        if (isHovered) {
            document.body.style.cursor = 'default';
            wireMat.color.set(0x00FFFF); // Reset wireframe color when not hovering
            isHovered = false;
        }
    }
    
    // Handle dragging
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };
        
        // Rotate the ball based on mouse movement
        ballGroup.rotation.y += deltaMove.x * 0.01;
        ballGroup.rotation.x += deltaMove.y * 0.01;
        
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onPointerDown(event) {
    isDragging = true;
    
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Check if we're clicking on the ball
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mesh, true);
    
    if (intersects.length > 0) {
        // Scale up the ball when clicked
        ballGroup.scale.set(1.2, 1.2, 1.2);
    }
}

function onPointerUp() {
    isDragging = false;
    // Reset scale when released
    ballGroup.scale.set(1, 1, 1);
}

// Add event listeners for mouse/touch
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mouseup', onPointerUp);
window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
window.addEventListener('touchend', onPointerUp);

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    // Only pulse if not being interacted with
    if (!isDragging && !isHovered) {
        const scale = Math.sin(Date.now() * 0.001) * 0.1 + 1;
        ballGroup.scale.set(scale, scale, scale);
    }
}

// Animation function to make the mesh continuously rotate when not interacted with
function updateMeshRotation() {
    // Only auto-rotate if not being dragged
    if (!isDragging) {
        ballGroup.rotation.x += 0.005;
        ballGroup.rotation.y += 0.005;
    }
}

// Animation function to make the mesh move in a circular path
function updateMeshPosition() {
    // Only apply automatic position changes if not being interacted with
    if (!isDragging && !isHovered) {
        ballGroup.position.x = Math.sin(Date.now() * 0.001) * 0.5;
        ballGroup.position.y = Math.cos(Date.now() * 0.001) * 0.5;
    }
}

// Resize handler to make the scene responsive
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(newWidth, newHeight);
});

// Main animation loop that runs continuously
function animate() {
    requestAnimationFrame(animate); // Request the next frame
    updateMeshScale();             // Update the mesh scale
    updateMeshRotation();          // Update the mesh rotation
    updateMeshPosition();          // Update the mesh position
    renderer.render(scene, camera); // Render the scene
}
animate(); // Start the animation loop