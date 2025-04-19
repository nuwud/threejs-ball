// Import Three.js properly - using the import map from index.html
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Initialize the application
window.app = window.app || {};

// Debug flag to help troubleshoot
window.app.debug = true;

// Function to initialize the application
function init() {
    console.log('Initializing application...');
    
    // Create renderer
    initRenderer();
    
    // Create scene
    initScene();
    
    // Create camera
    initCamera();
    
    // Create lighting
    initLighting();
    
    // Create fancy ball
    createFancyBall();
    
    // Add OrbitControls for camera manipulation
    initControls();
    
    // Start animation loop
    animate();
    
    // Initialize audio system
    initializeAudio();
    
    console.log('Initialization complete');
}

// Initialize renderer
function initRenderer() {
    try {
        console.log('Initializing renderer...');
        window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
        window.app.renderer.setSize(window.innerWidth, window.innerHeight);
        window.app.renderer.setPixelRatio(window.devicePixelRatio);
        window.app.renderer.setClearColor(0x000000);
        
        // Append to container
        const container = document.getElementById('container');
        if (container) {
            container.appendChild(window.app.renderer.domElement);
            console.log('Renderer attached to container');
        } else {
            console.error('Container element not found, attaching to body');
            document.body.appendChild(window.app.renderer.domElement);
        }
    } catch (error) {
        console.error('Error initializing renderer:', error);
        showError('Failed to initialize renderer');
    }
}

// Initialize scene
function initScene() {
    try {
        console.log('Initializing scene...');
        window.app.scene = new THREE.Scene();
        
        // Add a debug grid to help with orientation
        if (window.app.debug) {
            const gridHelper = new THREE.GridHelper(10, 10);
            window.app.scene.add(gridHelper);
            console.log('Debug grid added to scene');
        }
    } catch (error) {
        console.error('Error initializing scene:', error);
    }
}

// Initialize camera
function initCamera() {
    try {
        console.log('Initializing camera...');
        window.app.camera = new THREE.PerspectiveCamera(
            75,                                         // Field of view
            window.innerWidth / window.innerHeight,     // Aspect ratio
            0.1,                                        // Near plane
            1000                                        // Far plane
        );
        window.app.camera.position.z = 2; // Position camera 2 units away from origin
    } catch (error) {
        console.error('Error initializing camera:', error);
    }
}

// Initialize lighting
function initLighting() {
    try {
        console.log('Initializing lighting...');
        
        // Create lighting as per your fancy ball implementation
        const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        hemilight.position.set(0, 1, 0).normalize();
        window.app.scene.add(hemilight);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1).normalize();
        window.app.scene.add(light);

        const light2 = new THREE.DirectionalLight(0xffffff, 1);
        light2.position.set(-1, -1, -1).normalize();
        window.app.scene.add(light2);

        const light3 = new THREE.DirectionalLight(0xffffff, 0.5);
        light3.position.set(0, 1, 0).normalize();
        window.app.scene.add(light3);

        // Add a point light that follows the mouse for interactive lighting
        const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
        pointLight.position.set(0, 0, 2);
        window.app.scene.add(pointLight);
        window.app.pointLight = pointLight;
    } catch (error) {
        console.error('Error initializing lighting:', error);
    }
}

// Create the fancy interactive ball
function createFancyBall() {
    try {
        console.log('Creating fancy interactive ball...');
        
        // Create an icosahedron geometry with subdivision level 4 for smoother deformation
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
        window.app.scene.add(ballGroup);
        
        // Store references for later use
        window.app.ballGroup = ballGroup;
        window.app.ballMesh = mesh;
        window.app.wireMesh = wireMesh;
        window.app.ballGeometry = geo;
        window.app.originalPositions = originalPositions;
        window.app.updateGradientTexture = function(newColorStart, newColorMid, newColorEnd) {
            // Create a new texture with updated colors
            gradientTexture = createGradientTexture(newColorStart, newColorMid, newColorEnd);
            
            // Apply it to the material
            mat.map = gradientTexture;
            mat.needsUpdate = true;
        };
        
        // Create a sphere to visualize the touch point
        const touchSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5 })
        );
        touchSphere.visible = false;
        window.app.scene.add(touchSphere);
        window.app.touchSphere = touchSphere;
        
        // Set up interaction variables
        window.app.mouse = new THREE.Vector2();
        window.app.mouseWorld = new THREE.Vector3();
        window.app.raycaster = new THREE.Raycaster();
        window.app.isDragging = false;
        window.app.previousMousePosition = { x: 0, y: 0 };
        window.app.isHovered = false;
        window.app.touchPoint = null;
        window.app.targetScale = 1.0;
        window.app.currentScale = 1.0;
        
        // Mark ball as created
        window.app.ballCreated = true;
        
        // Initialize audio connection with the ball
        initializeAudioForBall();
        
        // Set up interaction listeners
        setupInteraction();
        
        console.log('Ball created successfully');
    } catch (error) {
        console.error('Error creating ball:', error);
        showError('Failed to create ball');
    }
}

// Initialize audio connection with the ball
function initializeAudioForBall() {
    // Wait a moment to ensure ball is fully created
    setTimeout(() => {
        try {
            if (window.audioSystem && typeof window.audioSystem.setupEnhancedAudio === 'function') {
                console.log('Setting up enhanced audio for ball...');
                window.audioSystem.setupEnhancedAudio(window.app);
            }
            
            // Connect to ball using the ball-audio-connector
            if (typeof window.autoConnectBallAudio === 'function') {
                console.log('Auto-connecting ball audio...');
                window.autoConnectBallAudio();
            } else if (window.app.ballGroup && typeof window.connectAudioToExistingBall === 'function') {
                console.log('Manually connecting ball audio...');
                window.connectAudioToExistingBall(window.app.ballGroup);
            }
            
            // Initialize positional audio listener
            if (window.app.camera && !window.app.camera.children.find(child => child instanceof THREE.AudioListener)) {
                console.log('Adding audio listener to camera...');
                const listener = new THREE.AudioListener();
                window.app.camera.add(listener);
                window.app.audioListener = listener;
            }
            
            console.log('Audio initialization for ball complete');
        } catch (error) {
            console.error('Error initializing audio for ball:', error);
        }
    }, 500);
}

// Enhanced setupInteraction function with improved audio integration
function setupInteraction() {
    // Function to handle mouse/touch movement for interaction
    function onPointerMove(event) {
        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        window.app.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        window.app.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Update the raycaster with the new mouse position
        window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);
        
        // Move the point light to follow the mouse
        window.app.pointLight.position.copy(window.app.raycaster.ray.direction).multiplyScalar(2).add(window.app.camera.position);
        
        // Calculate objects intersecting the ray
        const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);
        
        // Change appearance when hovered or touched
        if (intersects.length > 0) {
            if (!window.app.isHovered) {
                document.body.style.cursor = 'pointer';
                
                // Change wireframe color smoothly
                gsapFade(window.app.wireMesh.material.color, { r: 1, g: 0, b: 1 }, 0.3);
                
                // Smoothly change gradient colors
                window.app.updateGradientTexture('#FF77FF', '#AA55FF', '#55FFFF');
                
                window.app.isHovered = true;
                
                // Play hover sound if available
                if (window.app.audioContext && typeof window.app.soundSynth?.playTone === 'function') {
                    window.app.soundSynth.playTone(330, 0.05, 0.1);
                }
            }
            
            // Store the intersection point for deformation
            window.app.touchPoint = intersects[0].point.clone();
            window.app.touchSphere.position.copy(window.app.touchPoint);
            window.app.touchSphere.visible = true;
            
            // Apply deformation when hovering
            applyDeformation(window.app.touchPoint, 0.2, 0.3);
            
            // Get facet information for audio
            const facetIndex = intersects[0].faceIndex;
            const position = intersects[0].uv || { u: 0.5, v: 0.5 };
            
            // Emit facet event for audio system to pick up
            if (window.app.ballGroup && typeof window.app.ballGroup.emit === 'function') {
                window.app.ballGroup.emit('facetHover', { 
                    facet: facetIndex, 
                    position: position 
                });
            }
        } else {
            if (window.app.isHovered) {
                document.body.style.cursor = 'default';
                
                // Reset wireframe color smoothly
                gsapFade(window.app.wireMesh.material.color, { r: 0, g: 1, b: 1 }, 0.3);
                
                // Reset gradient colors
                window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');
                
                window.app.isHovered = false;
            }
            
            window.app.touchPoint = null;
            window.app.touchSphere.visible = false;
            
            // Gradually restore the original shape
            resetDeformation(0.1);
        }
        
        // Handle dragging
        if (window.app.isDragging) {
            const deltaMove = {
                x: event.clientX - window.app.previousMousePosition.x,
                y: event.clientY - window.app.previousMousePosition.y
            };
            
            // Rotate the ball based on mouse movement
            window.app.ballGroup.rotation.y += deltaMove.x * 0.01;
            window.app.ballGroup.rotation.x += deltaMove.y * 0.01;
            
            window.app.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
        
        // Add audio feedback for hovering/moving over facets
        if (intersects.length > 0 && window.app.audioContext && window.app.isHovered) {
            // Get the facet index
            const facetIndex = intersects[0].faceIndex || 0;
            
            // Try different methods to play facet sound
            if (typeof window.app.playFacetSound === 'function') {
                window.app.playFacetSound(window.app, facetIndex, ballData.touchPoint);
            } else if (window.audioSystem && typeof window.audioSystem.playFacetSound === 'function') {
                window.audioSystem.playFacetSound(window.app, facetIndex, ballData.touchPoint);
            }
        }
    }

    function onPointerDown(event) {
        window.app.isDragging = true;
        
        window.app.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
        
        // Check if we're clicking on the ball
        window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);
        const intersects = window.app.raycaster.intersectObject(window.app.ballMesh);
        
        if (intersects.length > 0) {
            // Set target scale for smooth animation
            window.app.targetScale = 1.1;
            
            // Change color more dramatically on click
            window.app.updateGradientTexture('#FFAAFF', '#CC66FF', '#66FFFF');
            
            // Emit click event for audio system
            if (window.app.ballGroup && typeof window.app.ballGroup.emit === 'function') {
                window.app.ballGroup.emit('click', {});
            }
            
            // Play click sound directly if available
            if (window.app.audioContext) {
                // Try global function first
                if (typeof window.playClickSound === 'function') {
                    window.playClickSound(window.app);
                } 
                // Then try app method
                else if (typeof window.app.playClickSound === 'function') {
                    window.app.playClickSound(window.app);
                }
                // Then try synthesizer
                else if (window.app.soundSynth && typeof window.app.soundSynth.playClickSound === 'function') {
                    window.app.soundSynth.playClickSound();
                }
            }
        }
    }

    function onPointerUp() {
        window.app.isDragging = false;
        
        // Reset target scale for smooth animation
        window.app.targetScale = 1.0;
        
        // Reset colors if not hovering
        if (!window.app.isHovered) {
            window.app.updateGradientTexture('#FF00FF', '#8800FF', '#00FFFF');
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

    // Function to apply deformation to the mesh at a specific point
    function applyDeformation(point, intensity, radius) {
        // Get position attribute for direct manipulation
        const positions = window.app.ballGeometry.attributes.position;
        
        // Apply deformation to each vertex based on distance from touch point
        for (let i = 0; i < positions.count; i++) {
            const vertexPosition = new THREE.Vector3(
                positions.array[i * 3],
                positions.array[i * 3 + 1],
                positions.array[i * 3 + 2]
            );
            
            // Calculate world position of the vertex
            const worldPosition = vertexPosition.clone()
                .applyMatrix4(window.app.ballMesh.matrixWorld);
            
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
                    .applyMatrix4(window.app.ballMesh.matrixWorld.clone().invert());
                
                // Get original position (pre-deformation)
                const originalX = window.app.originalPositions[i * 3];
                const originalY = window.app.originalPositions[i * 3 + 1];
                const originalZ = window.app.originalPositions[i * 3 + 2];
                
                // Apply deformation and blend with original position
                positions.array[i * 3] = originalX + localDeformation.x;
                positions.array[i * 3 + 1] = originalY + localDeformation.y;
                positions.array[i * 3 + 2] = originalZ + localDeformation.z;
            }
        }
        
        // Update wireframe to match the deformed shape
        const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
        window.app.wireMesh.geometry = wireGeo;
        
        // Mark attributes as needing update
        positions.needsUpdate = true;
        window.app.ballGeometry.computeVertexNormals();
    }

    // Function to gradually reset deformation
    function resetDeformation(speed) {
        const positions = window.app.ballGeometry.attributes.position;
        let needsUpdate = false;
        
        for (let i = 0; i < positions.count; i++) {
            const currentX = positions.array[i * 3];
            const currentY = positions.array[i * 3 + 1];
            const currentZ = positions.array[i * 3 + 2];
            
            const originalX = window.app.originalPositions[i * 3];
            const originalY = window.app.originalPositions[i * 3 + 1];
            const originalZ = window.app.originalPositions[i * 3 + 2];
            
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
            const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
            window.app.wireMesh.geometry = wireGeo;
            
            positions.needsUpdate = true;
            window.app.ballGeometry.computeVertexNormals();
        }
    }

    // Add event listeners for mouse/touch
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', (e) => onPointerMove(e.touches[0]));
    window.addEventListener('touchstart', (e) => onPointerDown(e.touches[0]));
    window.addEventListener('touchend', onPointerUp);
    
    // Make these functions available
    window.app.onPointerMove = onPointerMove;
    window.app.onPointerDown = onPointerDown;
    window.app.onPointerUp = onPointerUp;
    window.app.applyDeformation = applyDeformation;
    window.app.resetDeformation = resetDeformation;
}

// Initialize orbit controls
function initControls() {
    try {
        console.log('Initializing controls...');
        window.app.controls = new OrbitControls(window.app.camera, window.app.renderer.domElement);
        window.app.controls.enableDamping = true;
        window.app.controls.dampingFactor = 0.05;
        
        // Disable controls when interacting with ball
        window.app.controls.enabled = false;
    } catch (error) {
        console.error('Error initializing controls:', error);
    }
}

// Animation function to make the mesh scale pulse based on time
function updateMeshScale() {
    if (!window.app.ballGroup) return;
    
    // Smoothly transition to target scale
    window.app.currentScale += (window.app.targetScale - window.app.currentScale) * 0.1;
    
    // Only apply automated scale changes if not being interacted with
    if (!window.app.isDragging && !window.app.isHovered) {
        // Add subtle breathing animation
        const breathingScale = Math.sin(Date.now() * 0.001) * 0.05 + 1;
        window.app.ballGroup.scale.set(
            breathingScale * window.app.currentScale, 
            breathingScale * window.app.currentScale, 
            breathingScale * window.app.currentScale
        );
    } else {
        // Just apply the target scale
        window.app.ballGroup.scale.set(
            window.app.currentScale, 
            window.app.currentScale, 
            window.app.currentScale
        );
    }
}

// Animation function to make the mesh continuously rotate when not interacted with
function updateMeshRotation() {
    if (!window.app.ballGroup) return;
    
    // Only auto-rotate if not being dragged
    if (!window.app.isDragging) {
        window.app.ballGroup.rotation.x += 0.003;
        window.app.ballGroup.rotation.y += 0.004;
    }
}

// Animation function to make the mesh move in a circular path
function updateMeshPosition() {
    if (!window.app.ballGroup) return;
    
    // Only apply automatic position changes if not being interacted with
    if (!window.app.isDragging && !window.app.isHovered) {
        // Calculate new position with smooth sine wave movement
        const time = Date.now() * 0.0005;
        const newX = Math.sin(time) * 0.3;
        const newY = Math.cos(time * 1.3) * 0.2;
        
        // Apply position with smoothing
        window.app.ballGroup.position.x += (newX - window.app.ballGroup.position.x) * 0.05;
        window.app.ballGroup.position.y += (newY - window.app.ballGroup.position.y) * 0.05;
    }
}

// Main animation loop that runs continuously
function animate() {
    requestAnimationFrame(animate);
    
    updateMeshScale();
    updateMeshRotation();
    updateMeshPosition();
    
    // Add audio visualization update if available
    if (window.app.analyser && window.app.analyserData) {
        window.app.analyser.getByteFrequencyData(window.app.analyserData);
        
        // If we have a visualization update function, call it
        if (typeof window.updateAudioVisualization === 'function') {
            window.updateAudioVisualization(window.app);
        }
    }
    
    // Update the ball's position-based sound
    if (window.app.audioContext && window.app.isHovered && typeof window.playToneForPosition === 'function') {
        // Get normalized ball position in viewport
        const position = new THREE.Vector3();
        window.app.ballGroup.getWorldPosition(position);
        
        // Project position to screen coordinates
        position.project(window.app.camera);
        
        // Play position-based sound (limited rate)
        if (Math.random() < 0.05) { // Only 5% chance each frame to avoid too many sounds
            window.playToneForPosition(window.app, position.x, position.y);
        }
    }
    
    if (window.app.controls) {
        window.app.controls.update();
    }
    
    if (window.app.renderer && window.app.scene && window.app.camera) {
        window.app.renderer.render(window.app.scene, window.app.camera);
    }
}

// Handle window resize
function onWindowResize() {
    if (!window.app.camera || !window.app.renderer) return;
    
    window.app.camera.aspect = window.innerWidth / window.innerHeight;
    window.app.camera.updateProjectionMatrix();
    
    window.app.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        console.error(message);
    }
}

// Initialize audio when document is ready
function initializeAudio() {
    console.log('Initializing audio for ball...');
    
    // Try multiple methods to ensure audio initialization happens
    if (typeof window.initializeAudio === 'function') {
        window.initializeAudio().then(audioContext => {
            if (audioContext) {
                window.app.audioContext = audioContext;
                console.log('Audio system initialized via global initializeAudio');
                
                // Ensure facet audio is initialized
                if (typeof window.initFacetAudio === 'function') {
                    window.initFacetAudio();
                }
            }
        }).catch(error => {
            console.error('Failed to initialize audio:', error);
            
            // Try facet audio as fallback
            if (typeof window.initFacetAudio === 'function') {
                window.initFacetAudio();
            }
        });
    } else {
        // Fall back to creating audio context directly
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.app.audioContext = new AudioContext();
            
            // Create master gain node
            window.app.masterGain = window.app.audioContext.createGain();
            window.app.masterGain.gain.value = 0.5;
            window.app.masterGain.connect(window.app.audioContext.destination);
            
            console.log('Audio context created directly');
            
            // Ensure facet audio is initialized
            if (typeof window.initFacetAudio === 'function') {
                window.initFacetAudio();
            }
        } catch (e) {
            console.error('Could not create audio context:', e);
        }
    }
}

// Add event listeners
window.addEventListener('resize', onWindowResize);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    init();
    
    // Let other components know the scene is ready
    window.dispatchEvent(new Event('sceneReady'));
});

// Make functions available to other scripts
window.app.createFancyBall = createFancyBall;
window.app.init = init;
window.app.animate = animate;
