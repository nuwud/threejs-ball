// quick-fix.js - A working Three.js example combining functionality from the original app
import * as THREE from 'three';

// Set up scene, camera, renderer
let scene, camera, renderer;

// Create a simple ball
let ballGroup;

// Tracking variables
let isDragging = false;
let isHovered = false;
let previousMousePosition = { x: 0, y: 0 };
let targetScale = 1.0;
let currentScale = 1.0;

// Initialize the scene
function init() {
    console.log("Initializing application...");
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    console.log("Renderer created");
    
    // Create scene
    scene = new THREE.Scene();
    console.log("Scene created");
    
    // Create camera
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 2);
    console.log("Camera created");
    
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
    
    console.log("Lights created");
    
    // Create the ball
    createBall();
    console.log("Ball created");
    
    // Set up event listeners
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    console.log("Event listeners set up");
    
    // Start animation loop
    animate();
    console.log("Animation started");
}

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
function createBall() {
    // Create an icosahedron geometry with subdivision level 4 for smoother deformation
    const geo = new THREE.IcosahedronGeometry(1.0, 4);
    
    // Initial gradient colors
    const colorStart = '#FF00FF'; // Neon pink at center
    const colorMid = '#8800FF';   // Purple in middle
    const colorEnd = '#00FFFF';   // Cyan at edges
    
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
    ballGroup = new THREE.Group();
    ballGroup.add(mesh);
    ballGroup.add(wireMesh);
    
    // Store additional information in userData for later access
    ballGroup.userData = {
        mesh: mesh,
        wireMesh: wireMesh,
        mat: mat,
        wireMat: wireMat,
        geo: geo,
        wireGeo: wireGeo,
        colorStart: colorStart,
        colorMid: colorMid,
        colorEnd: colorEnd
    };
    
    scene.add(ballGroup);
}

// Update window size
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Handle mouse movement
function onPointerMove(event) {
    // Calculate mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections with the ball
    const mesh = ballGroup.userData.mesh;
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        if (!isHovered) {
            document.body.style.cursor = 'pointer';
            isHovered = true;
        }
    } else {
        if (isHovered) {
            document.body.style.cursor = 'default';
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

// Handle mouse click
function onPointerDown(event) {
    isDragging = true;
    
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Set target scale for smooth animation
    targetScale = 1.1;
}

// Handle mouse release
function onPointerUp() {
    isDragging = false;
    
    // Reset target scale for smooth animation
    targetScale = 1.0;
}

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    // Smoothly transition to target scale
    currentScale += (targetScale - currentScale) * 0.1;
    
    // Only apply automated scale changes if not being interacted with
    if (!isDragging && !isHovered) {
        // Enhanced breathing animation with multiple sine waves for organic movement
        const time = Date.now() * 0.001;
        const primaryBreath = Math.sin(time * 0.5) * 0.1 + 1; // Slower, deeper breath
        const secondaryBreath = Math.sin(time * 1.3) * 0.03; // Faster, smaller modulation
        
        const breathingScale = primaryBreath + secondaryBreath;
        
        ballGroup.scale.set(
            breathingScale * currentScale, 
            breathingScale * currentScale * 0.95 + 0.05, // Slightly less Y-scale for asymmetric breathing 
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

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update mesh animations
    updateMeshScale();
    updateMeshRotation();
    updateMeshPosition();
    
    // Render
    renderer.render(scene, camera);
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);