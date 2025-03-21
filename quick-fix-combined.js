// quick-fix-combined.js - All-in-one file for Three.js Interactive Ball
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

// Set up scene, camera, renderer
let scene, camera, renderer, controls;

// Create a simple ball
let ballGroup;

// Set up audio
let audioContext;
let soundSynth;
let listener;

// Raycaster for interactions
let raycaster;
let mouse = new THREE.Vector2();

// Tracking variables
let isDragging = false;
let isHovered = false;
let previousMousePosition = { x: 0, y: 0 };
let targetScale = 1.0;
let currentScale = 1.0;
let lastFacetIndex = -1;
let clock;

// Initialize the scene
function init() {
    console.log("Initializing application...");
    
    // Create clock for animations
    clock = new THREE.Clock();
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);
    console.log("Renderer created");
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);
    console.log("Scene created");
    
    // Create camera
    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 2);
    
    // Create orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enabled = false; // Disable controls initially
    
    // Create audio listener
    listener = new THREE.AudioListener();
    camera.add(listener);
    
    // Create raycaster for precise facet detection
    raycaster = new THREE.Raycaster();
    
    console.log("Camera created");
    
    // Create lighting
    const hemilight = new THREE.HemisphereLight(0x99BBFF, 0x000000, 1);
    hemilight.position.set(0, 1, 0).normalize();
    scene.add(hemilight);
    
    const light = new THREE.DirectionalLight(0xFFFFFF, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);
    
    const light2 = new THREE.DirectionalLight(0xFF99CC, 0.5);
    light2.position.set(-1, -1, -1).normalize();
    scene.add(light2);
    
    // Add point light that follows mouse for highlights
    const pointLight = new THREE.PointLight(0x00FFFF, 2, 4);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);
    
    // Store the point light in scene userData for easy access
    scene.userData = { pointLight };
    
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
    
    // Create a basic reverb effect
    createReverb() {
        const convolver = this.audioContext.createConvolver();
        
        // Create impulse response for reverb
        const rate = this.audioContext.sampleRate;
        const length = rate * 2; // 2 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        
        for (let channel = 0; channel < 2; channel++) {
            const impulseData = impulse.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                // Decay curve for reverb
                impulseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        // Create gain node for reverb amount
        const reverbGain = this.audioContext.createGain();
        reverbGain.gain.value = 0.2; // Subtle reverb
        
        convolver.connect(reverbGain);
        
        return reverbGain;
    }
    
    // Create a delay effect
    createDelay() {
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = 0.3; // 300ms delay
        
        // Feedback for delay
        const feedback = this.audioContext.createGain();
        feedback.gain.value = 0.2; // 20% feedback
        
        delay.connect(feedback);
        feedback.connect(delay);
        
        // Create gain node for delay amount
        const delayGain = this.audioContext.createGain();
        delayGain.gain.value = 0.15; // Subtle delay
        
        delay.connect(delayGain);
        
        return delayGain;
    }
    
    // Create a distortion effect
    createDistortion() {
        const distortion = this.audioContext.createWaveShaper();
        
        // Create a distortion curve
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            
            return curve;
        }
        
        distortion.curve = makeDistortionCurve(50);
        distortion.oversample = '4x';
        
        // Create gain node for distortion amount
        const distortionGain = this.audioContext.createGain();
        distortionGain.gain.value = 0.1; // Subtle distortion by default
        
        distortion.connect(distortionGain);
        
        return distortionGain;
    }
    
    // Play a note with warm pad sound
    playWarmPad(note, duration = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create oscillators for rich sound
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc3 = this.audioContext.createOscillator();
        
        // Set waveforms for warmer sound
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc3.type = 'sine';
        
        // Set frequencies with slight detuning for warmth
        osc1.frequency.value = note;
        osc2.frequency.value = note * 1.005; // Slight detuning
        osc3.frequency.value = note * 0.5;   // Octave below
        
        // Create gain nodes for envelope
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const gain3 = this.audioContext.createGain();
        
        // Set initial gain to 0
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        gain3.gain.value = 0;
        
        // Connect everything
        osc1.connect(gain1);
        osc2.connect(gain2);
        osc3.connect(gain3);
        
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        gain3.connect(this.masterGain);
        
        // Apply envelope for smooth attack and release
        const attackTime = 0.1;
        const releaseTime = 0.6;
        
        // Attack
        gain1.gain.linearRampToValueAtTime(0.2, now + attackTime);
        gain2.gain.linearRampToValueAtTime(0.15, now + attackTime);
        gain3.gain.linearRampToValueAtTime(0.1, now + attackTime);
        
        // Release
        gain1.gain.linearRampToValueAtTime(0, now + duration + releaseTime);
        gain2.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.1);
        gain3.gain.linearRampToValueAtTime(0, now + duration + releaseTime + 0.2);
        
        // Start and stop oscillators
        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        
        osc1.stop(now + duration + releaseTime + 0.3);
        osc2.stop(now + duration + releaseTime + 0.3);
        osc3.stop(now + duration + releaseTime + 0.3);
        
        // Track active notes
        const noteModule = { oscillators: [osc1, osc2, osc3], gains: [gain1, gain2, gain3] };
        this.activeNotes.push(noteModule);
        
        // Clean up after note finishes
        setTimeout(() => {
            const index = this.activeNotes.indexOf(noteModule);
            if (index > -1) {
                this.activeNotes.splice(index, 1);
            }
        }, (duration + releaseTime + 0.3) * 1000);
        
        return noteModule;
    }
    
    // Play a chord based on a root note
    playChord(rootNote, duration = 0.8) {
        this.playWarmPad(rootNote, duration);
        this.playWarmPad(rootNote * 5/4, duration); // Major third
        this.playWarmPad(rootNote * 3/2, duration); // Perfect fifth
    }
    
    // Play sound based on position (for hover)
    playPositionSound(x, y) {
        // Map x and y to meaningful musical values
        // Using pentatonic scale for pleasing sounds
        const pentatonicScale = [220, 247.5, 277.2, 329.6, 370.0];
        
        // Map x to note in scale (-1 to 1 maps to 0 to 4)
        const noteIndex = Math.floor(((x + 1) / 2) * pentatonicScale.length);
        const note = pentatonicScale[Math.min(noteIndex, pentatonicScale.length - 1)];
        
        // Map y to volume (-1 to 1 maps to 0 to 0.4)
        const volume = ((y + 1) / 2) * 0.4;
        this.masterGain.gain.value = volume;
        
        // Play the note
        this.playWarmPad(note, 0.2);
    }
    
    // Play click sound
    playClickSound() {
        // Play a pleasant chord
        this.playChord(329.6, 0.5); // E4 chord
    }
    
    // Play release sound
    playReleaseSound() {
        // Play a different chord
        this.playChord(261.6, 0.3); // C4 chord
    }
    
    // Play a crunchy facet sound
    playFacetSound(facetIndex, intensity = 0.5) {
        const now = this.audioContext.currentTime;
        
        // Create a more percussive synth for the facet sounds
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const noise = this.createNoiseGenerator();
        
        // Use facetIndex to determine frequency - create a unique sound for each facet
        // Map facet index to frequencies in a pleasing scale
        const baseNote = 60 + (facetIndex % 12); // C4 (midi note 60) + offset based on facet
        const frequency = 440 * Math.pow(2, (baseNote - 69) / 12); // Convert MIDI note to frequency
        
        // Set waveforms for crunchy sound
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        
        // Set frequencies with different relationships for each facet
        osc1.frequency.value = frequency;
        osc2.frequency.value = frequency * (1 + (facetIndex % 5) * 0.02); // Creates harmonic beating
        
        // Create gain nodes
        const gain1 = this.audioContext.createGain();
        const gain2 = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();
        
        // Set initial gain values
        gain1.gain.value = 0;
        gain2.gain.value = 0;
        noiseGain.gain.value = 0;
        
        // Connect the oscillators through distortion for crunchiness
        osc1.connect(gain1);
        osc2.connect(gain2);
        noise.connect(noiseGain);
        
        // Create individual distortion for each sound source
        const distortion1 = this.audioContext.createWaveShaper();
        const distortion2 = this.audioContext.createWaveShaper();
        
        // Create distortion curves with different characteristics
        function makeDistortionCurve(amount) {
            const k = typeof amount === 'number' ? amount : 50;
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            
            for (let i = 0; i < n_samples; ++i) {
                const x = i * 2 / n_samples - 1;
                curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
            }
            
            return curve;
        }
        
        // Different distortion amounts based on facet index
        const distAmt1 = 50 + (facetIndex % 5) * 20;
        const distAmt2 = 30 + (facetIndex % 7) * 15;
        
        distortion1.curve = makeDistortionCurve(distAmt1);
        distortion2.curve = makeDistortionCurve(distAmt2);
        distortion1.oversample = '4x';
        distortion2.oversample = '4x';
        
        // Connect through distortion chains
        gain1.connect(distortion1);
        gain2.connect(distortion2);
        
        // Create a bandpass filter to shape the sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency * (1 + (facetIndex % 3) * 0.5);
        filter.Q.value = 1 + (facetIndex % 10); // Different resonance per facet
        
        // Connect everything to the filter
        distortion1.connect(filter);
        distortion2.connect(filter);
        noiseGain.connect(filter);
        
        // Connect to master output with a specific gain for this sound
        const outputGain = this.audioContext.createGain();
        outputGain.gain.value = 0.2 * intensity; // Scale by intensity
        
        filter.connect(outputGain);
        outputGain.connect(this.masterGain);
        
        // Very short, percussive envelope
        const attackTime = 0.005;
        const releaseTime = 0.1 + (facetIndex % 5) * 0.05; // Varied release per facet
        
        // Envelope for oscillator 1
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.3 * intensity, now + attackTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime);
        
        // Envelope for oscillator 2
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.2 * intensity, now + attackTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.8);
        
        // Envelope for noise
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.1 * intensity, now + attackTime * 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + releaseTime * 0.3);
        
        // Start and stop sources
        osc1.start(now);
        osc2.start(now);
        
        const stopTime = now + attackTime + releaseTime + 0.1;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        
        // Add filter sweep for extra texture
        filter.frequency.setValueAtTime(filter.frequency.value, now);
        filter.frequency.exponentialRampToValueAtTime(
            filter.frequency.value * (0.5 + Math.random()),
            now + attackTime + releaseTime * 0.8
        );
        
        // Clean up noise generator
        setTimeout(() => {
            noise.disconnect();
        }, (attackTime + releaseTime + 0.1) * 1000);
    }
    
    // Create a noise generator
    createNoiseGenerator() {
        // Create audio buffer for noise
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        // Fill the buffer with noise
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        // Create buffer source
        const noise = this.audioContext.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        noise.start();
        
        return noise;
    }
    
    // Stop all currently playing sounds
    stopAllSounds() {
        // Gradually fade out master gain
        const now = this.audioContext.currentTime;
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Reset after fade out
        setTimeout(() => {
            // Stop all active oscillators
            this.activeNotes.forEach(noteModule => {
                noteModule.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Ignore errors if oscillator is already stopped
                    }
                });
            });
            
            // Clear active notes
            this.activeNotes = [];
            
            // Reset master gain
            this.masterGain.gain.value = 0.4;
        }, 100);
    }
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
    
    return ballGroup;
}

// Update window size
function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// Check which facet (triangle) is clicked
function getFacetIndex(mesh, intersectPoint) {
    // Get the face at the intersection point
    const facesIndex = intersectPoint.faceIndex;
    
    // The facet index is just the face index for simple geometry
    return facesIndex;
}

// Update mouse position
function onPointerMove(event) {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Get the main mesh from the ball group
    const mesh = ballGroup.userData.mesh;
    
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Check for intersections
    const intersects = raycaster.intersectObject(mesh);
    
    // If we're not dragging and have an intersection, show hover effect
    if (!isDragging && intersects.length > 0) {
        isHovered = true;
        
        // Set scale target to increase size slightly
        targetScale = 1.05;
        
        // Move point light to follow mouse for highlights
        if (scene.userData.pointLight) {
            const pointLight = scene.userData.pointLight;
            pointLight.position.set(mouse.x * 3, mouse.y * 3, 2);
        }
        
        // Check which facet was hit
        const facetIndex = getFacetIndex(mesh, intersects[0]);
        
        // Only trigger sound when crossing facet boundaries
        if (facetIndex !== lastFacetIndex) {
            // Initialize audio on first interaction
            if (!audioContext) {
                initAudio();
            }
            
            if (soundSynth) {
                // Play a facet-specific sound
                soundSynth.playFacetSound(facetIndex, 0.6);
                
                // Also play a positional sound based on mouse coords
                soundSynth.playPositionSound(mouse.x, mouse.y);
            }
            
            // Update last facet index
            lastFacetIndex = facetIndex;
        }
    } else if (!isDragging) {
        isHovered = false;
        // Reset scale when not hovering
        targetScale = 1.0;
    }
    
    // If we're dragging, rotate the ball
    if (isDragging) {
        // Calculate the rotation delta
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;
        
        // Apply rotation to the ball
        ballGroup.rotation.y += deltaX * 0.005;
        ballGroup.rotation.x += deltaY * 0.005;
        
        // Update previous position
        previousMousePosition.x = event.clientX;
        previousMousePosition.y = event.clientY;
    }
}

// Handle mouse down
function onPointerDown(event) {
    // Capture mouse position and enable dragging
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
    isDragging = true;
    
    // Disable orbit controls while directly dragging
    if (controls) controls.enabled = false;
    
    // Initialize audio on first interaction if needed
    if (!audioContext) {
        initAudio();
    }
    
    // Play click sound if we have audio
    if (soundSynth) {
        soundSynth.playClickSound();
    }
}

// Handle mouse up
function onPointerUp() {
    isDragging = false;
    
    // Re-enable orbit controls
    if (controls) controls.enabled = true;
    
    // Play release sound if we have audio
    if (soundSynth) {
        soundSynth.playReleaseSound();
    }
}

// Update mesh scale based on hover state
function updateMeshScale() {
    // Smoothly interpolate current scale towards target scale
    currentScale += (targetScale - currentScale) * 0.1;
    
    // Apply scale to the ball group
    if (ballGroup) {
        ballGroup.scale.set(currentScale, currentScale, currentScale);
    }
}

// Update mesh rotation for idle animation
function updateMeshRotation() {
    // Only apply automatic rotation if not being dragged
    if (!isDragging && ballGroup) {
        // Very slow automatic rotation for subtle movement
        ballGroup.rotation.y += 0.001;
        ballGroup.rotation.x += 0.0005;
    }
    
    // Apply damping to orbit controls if enabled
    if (controls && controls.enabled) {
        controls.update();
    }
}

// Update mesh position for "breathing" effect
function updateMeshPosition() {
    if (ballGroup) {
        // Get elapsed time for animation
        const time = clock.getElapsedTime();
        
        // Calculate subtle floating motion using sine waves
        const newX = Math.sin(time) * 0.03;
        const newY = Math.cos(time * 1.3) * 0.02;
        
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
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);