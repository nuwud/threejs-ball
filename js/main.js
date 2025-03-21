import * as THREE from "three";
import { setupRenderer } from "./renderer.js";
import { listener, soundManager, initSynthesizer, setupAudioAnalyzer, createAudioVisualization } from "./audio.js";
import { geo, originalPositions, createGradientTexture, mat, wireMat, wireGeo, wireMesh, mesh, ballGroup } from "./geometry.js";

console.log("Initializing application...");

// Global app state
window.app = {
    scene: null,
    camera: null,
    renderer: null,
    isRainbowMode: false,
    isMagneticMode: false,
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    isDragging: false,
    isHovered: false,
    targetScale: 1.0,
    currentScale: 1.0,
    spikiness: 0,
    ballGroup: ballGroup  // Add a direct reference to ballGroup
};

// Global app controls - exposed for UI buttons
window.appControls = {
    toggleRainbowMode: function() {
        window.app.isRainbowMode = !window.app.isRainbowMode;
        console.log("Rainbow mode:", window.app.isRainbowMode);
    },
    toggleMagneticMode: function() {
        window.app.isMagneticMode = !window.app.isMagneticMode;
        console.log("Magnetic mode:", window.app.isMagneticMode);
    },
    createBlackholeEffect: function() {
        console.log("Blackhole effect activated");
    },
    createExplosion: function() {
        console.log("Explosion effect activated");
    },
    resetBall: function() {
        console.log("Ball reset");
    }
};

// Initialize the application
function init() {
    // Set up renderer
    const w = window.innerWidth;
    const h = window.innerHeight;
    window.app.renderer = setupRenderer(w, h);
    document.body.appendChild(window.app.renderer.domElement);
    console.log("Renderer added to DOM");
    
    // Create scene
    window.app.scene = new THREE.Scene();
    console.log("Scene created");
    
    // Create camera
    window.app.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    window.app.camera.position.set(0, 0, 2);
    window.app.camera.add(listener);
    console.log("Camera created");
    
    // Create lights
    const hemilight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
    hemilight.position.set(0, 1, 0).normalize();
    window.app.scene.add(hemilight);
    
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    window.app.scene.add(light);
    
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-1, -1, -1).normalize();
    window.app.scene.add(light2);
    
    const pointLight = new THREE.PointLight(0xFFFFFF, 1, 5);
    pointLight.position.set(0, 0, 2);
    window.app.scene.add(pointLight);
    window.app.scene.userData.pointLight = pointLight;
    
    console.log("Lights set up");
    
    // Add event listener for window resize
    window.addEventListener('resize', onWindowResize);
    console.log("Resize handler set up");
    
    // IMPORTANT: Add ball group to scene and make it visible
    window.app.scene.add(ballGroup);
    
    // Store a reference to the mesh for debugging
    window.app.ballGroup = ballGroup;
    window.app.ballGroup.userData = {
        mesh: mesh,
        wireMesh: wireMesh,
        wireMat: wireMat
    };
    
    // Make sure the ball is visible in the scene
    ballGroup.position.set(0, 0, 0);
    console.log("Ball created", ballGroup);
    
    // Start animation loop
    animate();
    
    // Initialize all needed components
    document.addEventListener('click', initOnFirstClick, { once: true });
    console.log("Animation loop started");
    
    console.log("Application initialized successfully");
}

// Function to handle window resize
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    window.app.camera.aspect = width / height;
    window.app.camera.updateProjectionMatrix();
    
    window.app.renderer.setSize(width, height);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Handle any animations here
    // Simple rotation for now
    if (ballGroup) {
        ballGroup.rotation.x += 0.003;
        ballGroup.rotation.y += 0.004;
    }
    
    // Render the scene
    window.app.renderer.render(window.app.scene, window.app.camera);
}

// Initialize audio on first user interaction
function initOnFirstClick() {
    try {
        initSynthesizer();
        setupAudioAnalyzer();
        soundManager.init();
        
        // Create audio visualizations
        createAudioVisualization(window.app.scene);
        
        console.log("Audio effects initialized");
    } catch (error) {
        console.error("Error initializing audio:", error);
    }
}

// Initialize the application
init();