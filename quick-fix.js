// quick-fix.js - First part (initialization and scene setup)
import * as THREE from 'three';

// Set up scene, camera, renderer
let scene, camera, renderer;

// Create a simple ball
let ballGroup;

// Set up audio
let audioContext;
let soundSynth;
let listener;

// Raycaster for interactions
let raycaster;

// Tracking variables
let isDragging = false;
let isHovered = false;
let previousMousePosition = { x: 0, y: 0 };
let targetScale = 1.0;
let currentScale = 1.0;
let lastFacetIndex = -1;

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
    
    // Create audio listener
    listener = new THREE.AudioListener();
    camera.add(listener);
    
    // Create raycaster for precise facet detection
    raycaster = new THREE.Raycaster();
    
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

// Initialize Web Audio API
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create our synthesizer
        soundSynth = new SoundSynthesizer(audioContext);
        
        console.log("Audio initialized");
    } catch (e) {
        console.error("Web Audio API not supported:", e);
    }
}

// SoundSynthesizer class for more pleasant sounds
class SoundSynthesizer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.4; // Lower overall volume
        this.masterGain.connect(audioContext.destination);
        
        // For effects
        this.reverb = this.createReverb();
        this.delay = this.createDelay();
        
        // Connect effects
        this.masterGain.connect(this.reverb);
        this.masterGain.connect(this.delay);
        this.reverb.connect(audioContext.destination);
        this.delay.connect(audioContext.destination);
        
        // Create a compressor to prevent clipping
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        this.masterGain.connect(this.compressor);
        this.compressor.connect(audioContext.destination);
        
        // Create a distortion effect for crunchy sounds
        this.distortion = this.createDistortion();
        
        // Store active note modules for management
        this.activeNotes = [];
    }