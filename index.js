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

// Create an icosahedron geometry (20-sided polyhedron) with subdivision level 4 for smoother deformation
const geo = new THREE.IcosahedronGeometry(1.0, 4);

// Store original vertices for resetting the shape
const originalPositions = geo.attributes.position.array.slice();

// Create a gradient texture for the faces
const createGradientTexture = (colorStart, colorMid, colorEnd) => {
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
let colorStart = '#FF00FF'; // Neon pink at center
let colorMid = '#8800FF';   // Purple in middle
let colorEnd = '#00FFFF';   // Cyan at edges

let gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);

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
scene.add(ballGroup);

// Create lighting
const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
hemilight.position.set(0, 1, 0).normalize();
scene.add(hemilight);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(1, 1, 1).normalize();
scene.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-1, -1, -1).normalize();
scene.add(light2);

const light3 = new THREE.DirectionalLight(0xffffff, 0.5);
light3.position.set(0, 1, 0).normalize();
scene.add(light3);

// Add a point light that follows the mouse for interactive lighting
const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
pointLight.position.set(0, 0, 2);
scene.add(pointLight);

// Track mouse/touch position
const mouse = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let isHovered = false;
let touchPoint = null;
let targetScale = 1.0;
let currentScale = 1.0;

// Create a sphere to visualize the touch point
const touchSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 })
);
touchSphere.visible = false;
scene.add(touchSphere);

// Function to handle mouse/touch movement for interaction
function onPointerMove(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update the raycaster with the new mouse position
    raycaster.setFromCamera(mouse, camera);
    
    // Move the point light to follow the mouse
    pointLight.position.copy(raycaster.ray.direction).multiplyScalar(2).add(camera.position);
    
    // Calculate objects intersecting the ray
    const intersects = raycaster.intersectObject(mesh);
    
    // Change appearance when hovered or touched
    if (intersects.length > 0) {
        if (!isHovered) {
            document.body.style.cursor = 'pointer';
            
            // Change wireframe color smoothly
            gsapFade(wireMat.color, { r: 1, g: 0, b: 1 }, 0.3);
            
            // Smoothly change gradient colors
            updateGradientColors('#FF77FF', '#AA55FF', '#55FFFF');
            
            isHovered = true;
        }
        
        // Store the intersection point for deformation
        touchPoint = intersects[0].point.clone();
        touchSphere.position.copy(touchPoint);
        touchSphere.visible = true;
        
        // Apply deformation when hovering
        applyDeformation(touchPoint, 0.2, 0.3);
    } else {
        if (isHovered) {
            document.body.style.cursor = 'default';
            
            // Reset wireframe color smoothly
            gsapFade(wireMat.color, { r: 0, g: 1, b: 1 }, 0.3);
            
            // Reset gradient colors
            updateGradientColors(colorStart, colorMid, colorEnd);
            
            isHovered = false;
        }
        
        touchPoint = null;
        touchSphere.visible = false;
        
        // Gradually restore the original shape
        resetDeformation(0.1);
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
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        // Set target scale for smooth animation
        targetScale = 1.1;
        
        // Change color more dramatically on click
        updateGradientColors('#FFAAFF', '#CC66FF', '#66FFFF');
    }
}

function onPointerUp() {
    isDragging = false;
    
    // Reset target scale for smooth animation
    targetScale = 1.0;
    
    // Reset colors if not hovering
    if (!isHovered) {
        updateGradientColors(colorStart, colorMid, colorEnd);
    }
}

// Helper function for smooth color transitions using GSAP-like tweening
function gsapFade(colorObj, targetColor, duration) {
    const startColor = { r: colorObj.r, g: colorObj.g, b: colorObj.b };
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    function updateColor() {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Simple easing function
        const eased = progress * (2 - progress);
        
        // Interpolate colors
        colorObj.r = startColor.r + (targetColor.r - startColor.r) * eased;
        colorObj.g = startColor.g + (targetColor.g - startColor.g) * eased;
        colorObj.b = startColor.b + (targetColor.b - startColor.b) * eased;
        
        if (progress < 1) {
            requestAnimationFrame(updateColor);
        }
    }
    
    updateColor();
}

// Function to update gradient colors with smooth transition
function updateGradientColors(newColorStart, newColorMid, newColorEnd) {
    // Create a new texture with updated colors
    gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);
    
    // Apply it to the material
    mat.map = gradientTexture;
    mat.needsUpdate = true;
}

// Function to apply deformation to the mesh at a specific point
function applyDeformation(point, intensity, radius) {
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

// Function to gradually reset deformation
function resetDeformation(speed) {
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

// Add event listeners for mouse/touch
window.addEventListener('mousemove', onPointerMove);
window.addEventListener('mousedown', onPointerDown);
window.addEventListener('mouseup', onPointerUp);
window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
window.addEventListener('touchend', onPointerUp);

// Resize handler to make the scene responsive
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(newWidth, newHeight);
});

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    // Smoothly transition to target scale
    currentScale += (targetScale - currentScale) * 0.1;
    
    // Only apply automated scale changes if not being interacted with
    if (!isDragging && !isHovered) {
        // Add subtle breathing animation
        const breathingScale = Math.sin(Date.now() * 0.001) * 0.05 + 1;
        ballGroup.scale.set(
            breathingScale * currentScale, 
            breathingScale * currentScale, 
            breathingScale * currentScale
        );
    } else {
        // Just apply the target scale
        ballGroup.scale.set(currentScale, currentScale, currentScale);
    }
}

// Animation function to make the mesh continuously rotate when not interacted with
function updateMeshRotation() {
    // Only auto-rotate if not being dragged
    if (!isDragging) {
        ballGroup.rotation.x += 0.003;
        ballGroup.rotation.y += 0.004;
    }
}

// Animation function to make the mesh move in a circular path
function updateMeshPosition() {
    // Only apply automatic position changes if not being interacted with
    if (!isDragging && !isHovered) {
        // Calculate new position with smooth sine wave movement
        const time = Date.now() * 0.0005;
        const newX = Math.sin(time) * 0.3;
        const newY = Math.cos(time * 1.3) * 0.2;
        
        // Apply position with smoothing
        ballGroup.position.x += (newX - ballGroup.position.x) * 0.05;
        ballGroup.position.y += (newY - ballGroup.position.y) * 0.05;
    }
}

// Main animation loop that runs continuously
function animate() {
    requestAnimationFrame(animate);
    updateMeshScale();
    updateMeshRotation();
    updateMeshPosition();
    renderer.render(scene, camera);
}

// Start the animation loop
animate();