import * as THREE from '../../../lib/three.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
    initializeAudio, 
    getSynthesizer,
    createBallSoundEffects,
    getAudioStatus
} from '../audio/index.js';
import { createBall } from './ball.js';
import { createLights } from './lights.js';

// Debug helper function to display errors visibly
function showError(message, error) {
    console.error(message, error);
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = `Error: ${message} - ${error.message || 'Unknown error'}`;
        errorEl.style.display = 'block';
    }
}

// Application state
window.app = window.app || {};

// Initialize Three.js scene
function initScene() {
    try {
        console.log("Initializing scene...");
        
        // Create scene
        window.app.scene = new THREE.Scene();
        
        // Create camera
        window.app.camera = new THREE.PerspectiveCamera(
            75, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        window.app.camera.position.z = 5;
        
        // Create lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        window.app.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        window.app.scene.add(directionalLight);
        
        // Create raycaster for interaction
        window.app.raycaster = new THREE.Raycaster();
        window.app.mouse = new THREE.Vector2();
        
        console.log("Scene initialized successfully");
        return true;
    } catch (error) {
        showError("Failed to initialize scene", error);
        return false;
    }
}

// Initialize renderer
function initRenderer() {
    try {
        console.log("Initializing renderer...");
        
        const container = document.getElementById('container');
        if (!container) {
            throw new Error("Container element not found");
        }
        
        // Create renderer
        window.app.renderer = new THREE.WebGLRenderer({ antialias: true });
        window.app.renderer.setSize(window.innerWidth, window.innerHeight);
        window.app.renderer.setClearColor(0x121212);
        container.appendChild(window.app.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            window.app.camera.aspect = window.innerWidth / window.innerHeight;
            window.app.camera.updateProjectionMatrix();
            window.app.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        console.log("Renderer initialized successfully");
        return true;
    } catch (error) {
        showError("Failed to initialize renderer", error);
        return false;
    }
}

// Create the 3D ball
function createBall() {
    try {
        console.log("Creating ball...");
        
        // Create ball geometry
        const geometry = new THREE.IcosahedronGeometry(2, 1);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3498db,
            shininess: 100,
            flatShading: true,
            vertexColors: false
        });
        
        const ball = new THREE.Mesh(geometry, material);
        
        // Create ball group to contain the mesh
        window.app.ballGroup = new THREE.Group();
        window.app.ballGroup.add(ball);
        window.app.ballGroup.userData.mesh = ball;
        
        // Add to scene
        window.app.scene.add(window.app.ballGroup);
        
        // Add some rotation to make it visible and animated
        window.app.ballGroup.rotation.x = 0.5;
        window.app.ballGroup.rotation.y = 0.5;
        
        // Store original vertex positions for deformation
        ball.userData.originalPositions = geometry.attributes.position.array.slice();
        
        console.log("Ball created successfully");
        return true;
    } catch (error) {
        showError("Failed to create ball", error);
        return false;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    try {
        // Rotate the ball slightly for animation
        if (window.app.ballGroup) {
            window.app.ballGroup.rotation.x += 0.002;
            window.app.ballGroup.rotation.y += 0.003;
        }
        
        // Render the scene
        if (window.app.renderer && window.app.scene && window.app.camera) {
            window.app.renderer.render(window.app.scene, window.app.camera);
        }
    } catch (error) {
        console.error("Animation error:", error);
    }
}

// Set up audio initialization after user interaction
function setupAudioAutoplayHandler() {
    try {
        console.log("Setting up audio autoplay handler...");
        
        const overlay = document.getElementById('audioStartOverlay');
        const startButton = document.getElementById('startExperienceBtn');
        
        if (!overlay || !startButton) {
            throw new Error("Audio overlay or start button not found");
        }
        
        startButton.addEventListener('click', async () => {
            console.log("Start button clicked!");
            
            try {
                // Hide overlay immediately to show user action was registered
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
                
                // Initialize audio (mock for now)
                console.log("Audio would initialize here");
                
                // If you have actual audio initialization, uncomment this:
                /*
                const audioInitialized = await initializeAudio().catch(e => {
                    console.warn('Audio initialization failed:', e);
                    return false;
                });
                
                if (audioInitialized) {
                    console.log('Audio initialized successfully');
                    // Setup ball sound effects
                    const soundEffects = createBallSoundEffects(window.app.ballGroup);
                    soundEffects.setupBallEvents();
                    // Store for later access
                    window.app.soundEffects = soundEffects;
                } else {
                    console.warn('Audio not initialized - running without audio');
                }
                */
                
            } catch (error) {
                showError("Error during audio initialization", error);
            }
        });
        
        console.log("Audio autoplay handler set up successfully");
        return true;
    } catch (error) {
        showError("Failed to set up audio handler", error);
        return false;
    }
}

// Add mouse move event for ball interaction
function setupMouseInteraction() {
    try {
        console.log("Setting up mouse interaction...");
        
        const container = document.getElementById('container');
        if (!container) {
            throw new Error("Container element not found");
        }
        
        container.addEventListener('mousemove', (event) => {
            // Update mouse position
            const rect = container.getBoundingClientRect();
            const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            
            if (window.app.mouse) {
                window.app.mouse.x = mouseX;
                window.app.mouse.y = mouseY;
            }
            
            // Update raycaster and detect intersections
            if (window.app.raycaster && window.app.ballGroup?.userData?.mesh) {
                window.app.raycaster.setFromCamera(window.app.mouse, window.app.camera);
                const intersects = window.app.raycaster.intersectObject(window.app.ballGroup.userData.mesh);
                
                if (intersects.length > 0) {
                    console.log("Ball hover detected");
                    // Process intersection (add visual feedback here)
                }
            }
        });
        
        console.log("Mouse interaction set up successfully");
        return true;
    } catch (error) {
        showError("Failed to set up mouse interaction", error);
        return false;
    }
}

// Main initialization function
async function initApp() {
    try {
        console.log("Initializing application...");
        
        // Hide loading indicator after initialization
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Initialize Three.js components
        const sceneInitialized = initScene();
        const rendererInitialized = initRenderer();
        
        if (!sceneInitialized || !rendererInitialized) {
            throw new Error("Failed to initialize Three.js");
        }
        
        // Create the ball - IMPORTANT: Do this BEFORE waiting for audio
        const ballCreated = createBall();
        if (!ballCreated) {
            throw new Error("Failed to create ball");
        }
        
        // Setup interactions
        setupMouseInteraction();
        setupAudioAutoplayHandler();
        
        // Start animation loop - ball should be visible immediately
        animate();
        
        console.log("Application initialized successfully");
    } catch (error) {
        showError("Failed to initialize application", error);
    }
}

// Start the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
