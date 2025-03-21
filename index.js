import * as THREE from "three";
import { listener, soundManager, initSynthesizer, setupAudioAnalyzer, createAudioVisualization, updateAudioVisualization } from "./js/audio";
import { geo, originalPositions, createGradientTexture, mat, wireMat, wireGeo, wireMesh, mesh, ballGroup } from "./geometry";
import { onPointerMove, onPointerDown, onPointerUp, gsapFade, updateGradientColors, applyDeformation, resetDeformation, touchSphere, onMouseWheel, toggleRainbowMode, toggleMagneticMode, createBlackholeEffect } from "./js/events";
import { updateMeshScale, updateMeshRotation, updateMeshPosition, updateParticles, animate } from "./animation";

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

// Add the audio listener to the camera
camera.add(listener);

// Create a new scene
const scene = new THREE.Scene();
scene.add(ballGroup);
scene.add(touchSphere);

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
const raycaster = new THREE.Raycaster();

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
    createAudioVisualization(scene);
}

// Start the animation loop
animate(renderer, scene, camera);

// Delayed initialization to ensure proper initialization after the document is loaded
setTimeout(() => {
    document.addEventListener('click', function initOnFirstClick() {
        // First user interaction - initialize audio
        initAllAudio();
        // Remove the event listener
        document.removeEventListener('click', initOnFirstClick);
    });
}, 500);