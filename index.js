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

// Create an audio listener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

// Sound manager object to handle all audio
const soundManager = {
    sounds: {},
    
    // Initialize all sounds
    init: function() {
        // Create sound effects
        this.createSound('hover', 'https://assets.codepen.io/729648/hover.mp3');
        this.createSound('click', 'https://assets.codepen.io/729648/click.mp3');
        this.createSound('explosion', 'https://assets.codepen.io/729648/explosion.mp3');
        this.createSound('spike', 'https://assets.codepen.io/729648/spike.mp3');
        this.createSound('rainbow', 'https://assets.codepen.io/729648/rainbow.mp3');
        this.createSound('blackhole', 'https://assets.codepen.io/729648/blackhole.mp3');
        this.createSound('magnetic', 'https://assets.codepen.io/729648/magnetic.mp3');
        
        // Create positional sounds (these will come from the ball's location)
        this.createPositionalSound('deform', 'https://assets.codepen.io/729648/deform.mp3');
    },
    
    // Create a global sound
    createSound: function(name, url) {
        const sound = new THREE.Audio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Create a positional sound
    createPositionalSound: function(name, url) {
        const sound = new THREE.PositionalAudio(listener);
        
        // Load a sound and set it as the Audio object's buffer
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(url, function(buffer) {
            sound.setBuffer(buffer);
            sound.setRefDistance(3); // The distance at which the volume reduction starts
            sound.setVolume(0.5);
        });
        
        this.sounds[name] = sound;
    },
    
    // Play a sound
    play: function(name, loop = false) {
        const sound = this.sounds[name];
        if (sound && sound.buffer) {
            // Don't restart if it's already playing
            if (!sound.isPlaying) {
                sound.setLoop(loop);
                sound.play();
            }
        }
    },
    
    // Stop a sound
    stop: function(name) {
        const sound = this.sounds[name];
        if (sound && sound.isPlaying) {
            sound.stop();
        }
    },
    
    // Attach a positional sound to an object
    attachToObject: function(name, object) {
        const sound = this.sounds[name];
        if (sound && !object.children.includes(sound)) {
            object.add(sound);
        }
    },
    
    // Set the frequency of an oscillator
    setFrequency: function(name, value) {
        const sound = this.sounds[name];
        if (sound && sound.source && sound.source.frequency) {
            sound.source.frequency.value = value;
        }
    }
};

// We'll use the Web Audio API to create a synthesizer for reactive sounds
let audioContext;
let oscillator;
let gainNode;

// Initialize Web Audio API synthesizer
function initSynthesizer() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create gain node (for volume control)
        gainNode = audioContext.createGain();
        gainNode.gain.value = 0; // Start silent
        gainNode.connect(audioContext.destination);
        
        // Create oscillator (for tone generation)
        oscillator = audioContext.createOscillator();
        oscillator.type = 'sine'; // Sine wave
        oscillator.frequency.value = 440; // A4 note
        oscillator.connect(gainNode);
        oscillator.start();
        
        console.log("Audio synthesizer initialized");
    } catch (e) {
        console.error("Web Audio API not supported or error initializing:", e);
    }
}

// Map a value to a frequency range (for mouse movement)
function mapToFrequency(value, min, max, freqMin = 220, freqMax = 880) {
    return freqMin + ((value - min) / (max - min)) * (freqMax - freqMin);
}

// Play a tone based on position
function playToneForPosition(x, y) {
    if (!audioContext) return;
    
    // Map x position to frequency
    const frequency = mapToFrequency(x, -1, 1, 220, 880);
    oscillator.frequency.value = frequency;
    
    // Map y position to volume
    const volume = mapToFrequency(y, -1, 1, 0, 0.2);
    gainNode.gain.value = volume;
}

// Stop playing the tone
function stopTone() {
    if (!audioContext) return;
    
    // Ramp down to avoid clicks
    gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
}

// Create an audio analyzer to visualize sound
let analyzer;
let bufferLength;
let dataArray;

function setupAudioAnalyzer() {
    if (!audioContext) return;
    
    // Create an analyzer node
    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    bufferLength = analyzer.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // Connect the analyzer to the audio context
    gainNode.connect(analyzer);
}

// Create visualization for sound
function createAudioVisualization() {
    if (!analyzer) return;
    
    // Create a circle of small cubes around the ball
    const visualizationGroup = new THREE.Group();
    const cubeCount = 32;
    const radius = 2;
    
    for (let i = 0; i < cubeCount; i++) {
        const angle = (i / cubeCount) * Math.PI * 2;
        
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xFFFFFF,
                transparent: true,
                opacity: 0.8
            })
        );
        
        cube.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            0
        );
        
        visualizationGroup.add(cube);
    }
    
    scene.add(visualizationGroup);
    
    // Store it for updates
    scene.userData.audioVisualization = visualizationGroup;
}

// Update audio visualization
function updateAudioVisualization() {
    if (!analyzer || !scene.userData.audioVisualization) return;
    
    // Get frequency data
    analyzer.getByteFrequencyData(dataArray);
    
    // Update visualization cubes
    const visualization = scene.userData.audioVisualization;
    const cubes = visualization.children;
    
    for (let i = 0; i < cubes.length; i++) {
        const cube = cubes[i];
        
        // Map frequency bin to cube
        const frequencyBin = Math.floor((i / cubes.length) * bufferLength);
        const value = dataArray[frequencyBin] / 255; // Normalize to 0-1
        
        // Scale cube based on frequency value
        cube.scale.y = 0.1 + value * 2;
        
        // Position the cube
        cube.position.y = Math.sin((i / cubes.length) * Math.PI * 2) * 2 + (value * 0.5);
        
        // Color based on frequency (optional)
        cube.material.color.setHSL(i / cubes.length, 0.8, 0.5 + value * 0.5);
    }
}

// Create audio visualizer
function setupVisualizer() {
    if (analyzer) {
        createAudioVisualization();
    }
}

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
let isExploded = false;
let particleSystem = null;
let isRainbowMode = false;
let spikiness = 0;
let isMagneticMode = false;
let gravitationalPull = 0;
let spikes = [];
let blackholeEffect = null;

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
    
    // Play tone based on mouse position
    if (isHovered) {
        playToneForPosition(mouse.x, mouse.y);
    }
}

function onPointerDown(event) {
    // Make sure audio is initialized on first user interaction
    if (!audioContext) {
        initSynthesizer();
        setupAudioAnalyzer();
        soundManager.init();
        
        // Attach positional sounds to ball
        soundManager.attachToObject('deform', ballGroup);
    }
    
    isDragging = true;
    
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
    
    // Check if we're clicking on the ball
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(mesh);
    
    if (intersects.length > 0) {
        // Handle right click differently
        if (event.button === 2 || (event.touches && event.touches.length > 1)) {
            // Explode effect on right click
            explodeEffect();
            // Change to hot colors
            updateGradientColors('#FF5500', '#FF0000', '#FFFF00');
            targetScale = 1.3;
        } else {
            // Regular left click
            // Set target scale for smooth animation
            targetScale = 1.1;
            
            // Change color more dramatically on click
            updateGradientColors('#FFAAFF', '#CC66FF', '#66FFFF');
        }
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
    
    // Stop the tone
    stopTone();
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
window.addEventListener('wheel', onMouseWheel);
window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
window.addEventListener('touchend', onPointerUp);
window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu on right click

// Double click to toggle rainbow mode
window.addEventListener('dblclick', toggleRainbowMode);

// Forward/back mouse buttons
window.addEventListener('mousedown', (e) => {
    if (e.button === 3) { // Forward button (may vary by mouse)
        toggleMagneticMode();
    } else if (e.button === 4) { // Back button (may vary by mouse)
        createBlackholeEffect();
    }
});

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

// Handle mouse wheel scroll
function onMouseWheel(event) {
    // Only affect the ball if we're hovering over it
    if (isHovered) {
        // Prevent default scroll behavior
        event.preventDefault();
        
        // Determine scroll direction
        const delta = Math.sign(event.deltaY);
        
        // Adjust spikiness
        spikiness += delta * 0.05;
        
        // Clamp to a reasonable range
        spikiness = Math.max(0, Math.min(2, spikiness));
        
        // Apply spiky deformation
        if (spikiness > 0) {
            applySpikyEffect(spikiness);
        } else {
            // If spikiness is 0, reset to original shape
            resetDeformation(0.5);
        }
    }
}

// Create spiky effect on the ball
function applySpikyEffect(intensity) {
    const positions = geo.attributes.position;
    
    // If we haven't stored spikes yet, create them
    if (spikes.length === 0) {
        for (let i = 0; i < positions.count; i++) {
            const x = originalPositions[i * 3];
            const y = originalPositions[i * 3 + 1];
            const z = originalPositions[i * 3 + 2];
            
            const vertex = new THREE.Vector3(x, y, z).normalize();
            spikes.push({
                index: i,
                direction: vertex,
                phase: Math.random() * Math.PI * 2 // Random phase for animation
            });
        }
    }
    
    // Apply spiky effect
    for (const spike of spikes) {
        const i = spike.index;
        const time = Date.now() * 0.002;
        
        // Calculate spike extension with some wobble
        const wobble = Math.sin(time + spike.phase) * 0.1;
        const extension = (1.0 + wobble) * intensity;
        
        // Apply to vertex
        positions.array[i * 3] = originalPositions[i * 3] + spike.direction.x * extension;
        positions.array[i * 3 + 1] = originalPositions[i * 3 + 1] + spike.direction.y * extension;
        positions.array[i * 3 + 2] = originalPositions[i * 3 + 2] + spike.direction.z * extension;
    }
    
    // Update wireframe to match
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;
    
    // Mark as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();
}

// Toggle magnetic mode (for forward mouse button)
function toggleMagneticMode() {
    isMagneticMode = !isMagneticMode;
    
    if (isMagneticMode) {
        // Turn on magnetic effect
        updateGradientColors('#0066FF', '#3399FF', '#99CCFF'); // Blue colors
        wireMat.color.set(0x0066FF); // Blue wireframe
        
        // Create a trail of small spheres that follow the ball
        createMagneticTrail();
    } else {
        // Turn off magnetic effect
        updateGradientColors(colorStart, colorMid, colorEnd);
        wireMat.color.set(0x00FFFF);
        
        // Remove trail
        removeMagneticTrail();
    }
}

// Create floating particles that follow the ball in magnetic mode
let magneticParticles = [];
function createMagneticTrail() {
    // Clean up any existing particles
    removeMagneticTrail();
    
    // Create a batch of particles
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 0.05 + 0.02;
        const color = new THREE.Color(0x0066FF);
        
        // Adjust color based on size (smaller = lighter)
        color.r += (1 - size) * 0.8;
        color.g += (1 - size) * 0.8;
        color.b += (1 - size) * 0.1;
        
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(size, 8, 8),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
            })
        );
        
        // Random position around the ball
        const radius = Math.random() * 2 + 1.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        particle.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.sin(phi) * Math.sin(theta),
            radius * Math.cos(phi)
        );
        
        particle.userData = {
            offset: new THREE.Vector3(
                Math.sin(i * 0.5) * 1.5,
                Math.cos(i * 0.5) * 1.5,
                Math.sin(i * 0.3) * 1.5
            ),
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        };
        
        scene.add(particle);
        magneticParticles.push(particle);
    }
}

// Remove magnetic particles
function removeMagneticTrail() {
    for (const particle of magneticParticles) {
        scene.remove(particle);
    }
    magneticParticles = [];
}

// Update magnetic particles
function updateMagneticParticles() {
    if (!isMagneticMode || magneticParticles.length === 0) return;
    
    const time = Date.now() * 0.001;
    
    for (const particle of magneticParticles) {
        // Calculate a position that follows the ball with some delay and orbit
        const targetX = ballGroup.position.x;
        const targetY = ballGroup.position.y;
        const targetZ = ballGroup.position.z;
        
        // Add orbital motion
        const phase = particle.userData.phase + time * particle.userData.speed;
        const orbitRadius = 0.5 + Math.sin(phase) * 0.3;
        
        const orbitX = Math.cos(phase) * orbitRadius + particle.userData.offset.x * 0.2;
        const orbitY = Math.sin(phase) * orbitRadius + particle.userData.offset.y * 0.2;
        const orbitZ = Math.cos(phase * 0.7) * orbitRadius + particle.userData.offset.z * 0.2;
        
        // Smoothly move toward target
        particle.position.x += (targetX + orbitX - particle.position.x) * 0.03;
        particle.position.y += (targetY + orbitY - particle.position.y) * 0.03;
        particle.position.z += (targetZ + orbitZ - particle.position.z) * 0.03;
        
        // Pulsate size
        const scale = 0.8 + Math.sin(time * 2 + particle.userData.phase) * 0.2;
        particle.scale.set(scale, scale, scale);
        
        // Pulsate opacity
        particle.material.opacity = 0.5 + Math.sin(time + particle.userData.phase) * 0.3;
    }
}

// Create blackhole effect (for back mouse button)
function createBlackholeEffect() {
    // Make sure we don't have an existing effect
    if (blackholeEffect) {
        scene.remove(blackholeEffect);
    }
    
    // Create a dark sphere with a distortion shader
    const blackholeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.8
    });
    
    blackholeEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 32),
        blackholeMaterial
    );
    
    // Position it slightly offset from the ball
    blackholeEffect.position.set(
        ballGroup.position.x + 1,
        ballGroup.position.y,
        ballGroup.position.z
    );
    
    scene.add(blackholeEffect);
    
    // Start gravitational pull
    gravitationalPull = 1.0;
    
    // Create ring particles around the blackhole
    createBlackholeRing();
    
    // Automatically remove after a few seconds
    setTimeout(() => {
        removeBlackholeEffect();
    }, 5000);
}

// Create particles forming a ring around the blackhole
let blackholeRingParticles = [];
function createBlackholeRing() {
    // Clean up any existing particles
    for (const particle of blackholeRingParticles) {
        scene.remove(particle);
    }
    blackholeRingParticles = [];
    
    // Create ring of particles
    const ringCount = 100;
    for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        
        // Create a small stretched cube for the ring particles
        const particle = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.02, 0.02),
            new THREE.MeshBasicMaterial({
                color: 0xFF00FF,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            })
        );
        
        // Position in a ring
        const ringRadius = 0.6;
        particle.position.set(
            Math.cos(angle) * ringRadius,
            Math.sin(angle) * ringRadius,
            0
        );
        
        // Store the initial angle for animation
        particle.userData = {
            initialAngle: angle,
            radius: ringRadius,
            speed: 0.02 + Math.random() * 0.02
        };
        
        // Rotate to face tangent to the ring
        particle.lookAt(new THREE.Vector3(0, 0, 0));
        particle.rotateZ(Math.PI / 2);
        
        blackholeEffect.add(particle);
        blackholeRingParticles.push(particle);
    }
}

// Remove blackhole effect
function removeBlackholeEffect() {
    if (blackholeEffect) {
        scene.remove(blackholeEffect);
        blackholeEffect = null;
    }
    gravitationalPull = 0;
}

// Update blackhole effect
function updateBlackholeEffect() {
    if (!blackholeEffect) return;
    
    const time = Date.now() * 0.001;
    
    // Rotate the ring particles
    for (const particle of blackholeRingParticles) {
        const angle = particle.userData.initialAngle + time * particle.userData.speed;
        particle.position.x = Math.cos(angle) * particle.userData.radius;
        particle.position.y = Math.sin(angle) * particle.userData.radius;
        
        // Make particles point in the direction of travel
        particle.lookAt(new THREE.Vector3(0, 0, 0));
        particle.rotateZ(Math.PI / 2);
        
        // Pulsate
        particle.material.opacity = 0.5 + Math.sin(time * 3 + particle.userData.initialAngle) * 0.3;
    }
    
    // Make the blackhole rotate
    blackholeEffect.rotation.z += 0.02;
    
    // Apply gravitational pull effect on the main ball
    if (gravitationalPull > 0) {
        // Calculate direction vector from ball to blackhole
        const direction = new THREE.Vector3()
            .subVectors(blackholeEffect.position, ballGroup.position)
            .normalize();
        
        // Move ball toward the blackhole based on gravitational pull
        ballGroup.position.add(direction.multiplyScalar(gravitationalPull * 0.01));
        
        // Deform the ball in the direction of the blackhole
        applyGravitationalDeformation(blackholeEffect.position, gravitationalPull);
        
        // Slowly increase pull over time
        gravitationalPull += 0.01;
    }
}

// Apply gravitational deformation to the ball
function applyGravitationalDeformation(attractorPosition, strength) {
    const positions = geo.attributes.position;
    
    // Convert attractor position to local space of the mesh
    const localAttractor = attractorPosition.clone()
        .sub(ballGroup.position);
    
    // Apply deformation
    for (let i = 0; i < positions.count; i++) {
        const vertexPosition = new THREE.Vector3(
            positions.array[i * 3],
            positions.array[i * 3 + 1],
            positions.array[i * 3 + 2]
        );
        
        // Calculate direction from vertex to attractor
        const direction = new THREE.Vector3()
            .subVectors(localAttractor, vertexPosition)
            .normalize();
        
        // Calculate distance
        const distance = vertexPosition.distanceTo(localAttractor);
        
        // Deform more based on proximity (inverse square law)
        let factor = strength / (1 + distance * distance);
        factor = Math.min(factor, 0.2); // Cap the deformation
        
        // Apply deformation
        positions.array[i * 3] = originalPositions[i * 3] + direction.x * factor;
        positions.array[i * 3 + 1] = originalPositions[i * 3 + 1] + direction.y * factor;
        positions.array[i * 3 + 2] = originalPositions[i * 3 + 2] + direction.z * factor;
    }
    
    // Update wireframe
    wireGeo.copy(new THREE.EdgesGeometry(geo));
    wireMesh.geometry = wireGeo;
    
    // Mark as needing update
    positions.needsUpdate = true;
    geo.computeVertexNormals();
}

// Function to handle explosion effect (referenced in onPointerDown)
function explodeEffect() {
    if (isExploded) return;
    
    isExploded = true;
    
    // Create an array to hold explosion particles
    const particles = [];
    const particleCount = 100;
    
    // Create a particle system for the explosion
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];
    
    // Sample positions from the original geometry
    const positions = geo.attributes.position;
    
    for (let i = 0; i < particleCount; i++) {
        // Sample a random vertex from the geometry
        const vertexIndex = Math.floor(Math.random() * positions.count);
        const radius = 1;
        
        // Position at surface of sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        particlePositions[i * 3] = x;
        particlePositions[i * 3 + 1] = y;
        particlePositions[i * 3 + 2] = z;
        
        // Create random velocities pointing outward
        const velocity = new THREE.Vector3(x, y, z).normalize();
        velocity.multiplyScalar(0.05 + Math.random() * 0.05);
        
        particleVelocities.push(velocity);
    }
    
    // Set the vertex positions
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Create a material for the particles
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.05,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        vertexColors: false
    });
    
    // Create the particle system
    particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    
    // Position it to match the ball
    particleSystem.position.copy(ballGroup.position);
    particleSystem.userData = {
        velocities: particleVelocities,
        startTime: Date.now()
    };
    
    scene.add(particleSystem);
    
    // Hide the original ball
    ballGroup.visible = false;
    
    // Automatically reset after a delay
    setTimeout(() => {
        resetExplosion();
    }, 3000);
}

// Function to reset after explosion
function resetExplosion() {
    isExploded = false;
    
    // Remove particle system
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem = null;
    }
    
    // Show the ball again
    ballGroup.visible = true;
    
    // Reset colors
    updateGradientColors(colorStart, colorMid, colorEnd);
}

// Update explosion particles
function updateParticles() {
    if (!particleSystem) return;
    
    const positions = particleSystem.geometry.attributes.position;
    const velocities = particleSystem.userData.velocities;
    const elapsed = (Date.now() - particleSystem.userData.startTime) / 1000;
    
    // Apply gravity and move particles
    for (let i = 0; i < positions.count; i++) {
        positions.array[i * 3] += velocities[i].x;
        positions.array[i * 3 + 1] += velocities[i].y - 0.01; // Add gravity
        positions.array[i * 3 + 2] += velocities[i].z;
        
        // Slow down over time
        velocities[i].multiplyScalar(0.99);
    }
    
    // Fade out the particles over time
    const life = 3.0; // 3 seconds
    const normalizedTime = Math.min(elapsed / life, 1.0);
    particleSystem.material.opacity = 1.0 - normalizedTime;
    
    positions.needsUpdate = true;
}

// Toggle rainbow mode on double click
function toggleRainbowMode() {
    isRainbowMode = !isRainbowMode;
    
    if (isRainbowMode) {
        // Start with a rainbow gradient
        updateGradientColors('#FF0000', '#00FF00', '#0000FF');
        
        // Play rainbow sound
        soundManager.play('rainbow', true);
        
        // Create a special oscillator effect for rainbow mode
        if (oscillator) {
            oscillator.type = 'triangle';
            oscillator.frequency.value = 440; // A4 note
            gainNode.gain.value = 0.1;
            
            // Set up a fancy modulation effect
            if (!audioContext.rainbowLFO) {
                // Create a low frequency oscillator for frequency modulation
                const lfo = audioContext.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.5; // 0.5 Hz modulation
                
                const lfoGain = audioContext.createGain();
                lfoGain.gain.value = 100; // Modulation depth
                
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                
                lfo.start();
                
                // Store for later cleanup
                audioContext.rainbowLFO = lfo;
            }
        }
    } else {
        // Reset to original colors
        updateGradientColors(colorStart, colorMid, colorEnd);
        
        // Stop rainbow sound
        soundManager.stop('rainbow');
        
        // Clean up modulation
        if (audioContext && audioContext.rainbowLFO) {
            audioContext.rainbowLFO.stop();
            audioContext.rainbowLFO.disconnect();
            delete audioContext.rainbowLFO;
        }
        
        // Reset oscillator
        if (oscillator) {
            oscillator.type = 'sine';
            gainNode.gain.value = 0;
        }
    }
}

// Update rainbow colors with cycling hue
function updateRainbowColors() {
    const time = Date.now() * 0.001;
    
    // Cycle the hue for each color stop, offset by phase
    const hue1 = (time * 0.1) % 1;
    const hue2 = ((time * 0.1) + 0.33) % 1;
    const hue3 = ((time * 0.1) + 0.66) % 1;
    
    // Convert HSL to hex color
    const color1 = new THREE.Color().setHSL(hue1, 1, 0.5);
    const color2 = new THREE.Color().setHSL(hue2, 1, 0.5);
    const color3 = new THREE.Color().setHSL(hue3, 1, 0.5);
    
    // Convert THREE.Color to hex string
    const hex1 = '#' + color1.getHexString();
    const hex2 = '#' + color2.getHexString();
    const hex3 = '#' + color3.getHexString();
    
    // Update the gradient
    gradientTexture = createGradientTexture(hex1, hex2, hex3);
    mat.map = gradientTexture;
    mat.needsUpdate = true;
    
    // Also update wireframe color
    wireMat.color.copy(color1);
    
    // If we have a sound analyzer, use it to make audio reactive visuals
    if (analyzer && isRainbowMode) {
        // Get frequency data
        analyzer.getByteFrequencyData(dataArray);
        
        // Calculate average frequency 
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Use to modulate color saturation or brightness
        const normalizedValue = average / 255;
        // Add a bit of audio reactivity to the material
        mat.emissiveIntensity = normalizedValue * 2;
    }
}

// Main animation loop that runs continuously
function animate() {
    requestAnimationFrame(animate);
    updateMeshScale();
    
    // Only update rotation and position if not exploded
    if (!isExploded) {
        updateMeshRotation();
        updateMeshPosition();
    }
    
    // Update particles if they exist
    updateParticles();
    
    // Update rainbow colors if in rainbow mode
    if (isRainbowMode) {
        updateRainbowColors();
    }
    
    // Update magnetic particles
    updateMagneticParticles();
    
    // Update blackhole effect
    updateBlackholeEffect();
    
    // Update audio visualization
    updateAudioVisualization();
    
    renderer.render(scene, camera);
}

// Initialize audio and visuals on first user interaction
function initAllAudio() {
    // Initialize Web Audio API
    initSynthesizer();
    
    // Set up analyzer for visualizations
    setupAudioAnalyzer();
    
    // Initialize sound manager
    soundManager.init();
    
    // Attach positional sounds to ball
    soundManager.attachToObject('deform', ballGroup);
    
    // Create audio visualization
    setupVisualizer();
}

// Start the animation loop
animate();

// Delayed initialization to ensure proper initialization after the document is loaded
setTimeout(() => {
    document.addEventListener('click', function initOnFirstClick() {
        // First user interaction - initialize audio
        initAllAudio();
        // Remove the event listener
        document.removeEventListener('click', initOnFirstClick);
    });
}, 500);