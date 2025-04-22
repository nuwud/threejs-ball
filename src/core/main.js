// Import Three.js properly - using the import map from index.html
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { updateRainbowMode, toggleRainbowMode } from '../effects/visual/rainbow.js';

// Define window.app and uiBridge as early as possible
window.app = window.app || {};

// Attach uiBridge with all control bridges before DOMContentLoaded
window.app.uiBridge = {
    // Getters for current state
    get wireMesh() { 
        // Look in both possible locations for the wireMesh
        return window.app?.ballGroup?.userData?.wireMesh || window.app?.wireMesh;
    },
    get isRainbowMode() { return window.app?.isRainbowMode || false; },
    get isSoundEnabled() { return window.app?.audioContext ? !window.app?.soundMuted : false; },
    get isMagneticActive() { return window.app?.isMagneticActive || false; },
    get isBlackholeActive() { return window.app?.isBlackholeActive || false; },

    // Audio controls
    setVolume: (level) => {
        if (window.app?.audioContext && window.app?.masterGain) {
            window.app.masterGain.gain.value = level;
            console.log(`Volume set to ${(level * 100).toFixed(0)}%`);
            // Store volume in localStorage for persistence
            try { localStorage.setItem('ballVolume', level); } catch(e) {}
            return true;
        }
        console.warn('Audio system not initialized, cannot set volume');
        return false;
    },

    toggleAudio: (enabled) => {
        if (!window.app.audioContext) {
            try {
                // Create audio context if it doesn't exist
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                window.app.audioContext = new AudioContext();
                window.app.masterGain = window.app.audioContext.createGain();
                window.app.masterGain.gain.value = 0.5;
                window.app.masterGain.connect(window.app.audioContext.destination);
                window.app.soundMuted = !enabled;
                console.log('Created audio context');
                return true;
            } catch (e) {
                console.error('Failed to create audio context:', e);
                return false;
            }
        }
        
        try {
            if (enabled) {
                if (window.app.audioContext.state === 'suspended') {
                    window.app.audioContext.resume().then(() => {
                        console.log('AudioContext resumed successfully');
                    }).catch(err => {
                        console.error('Failed to resume AudioContext:', err);
                    });
                }
                window.app.soundMuted = false;
            } else {
                if (window.app.audioContext.state === 'running') {
                    window.app.audioContext.suspend().then(() => {
                        console.log('AudioContext suspended successfully');
                    }).catch(err => {
                        console.error('Failed to suspend AudioContext:', err);
                    });
                }
                window.app.soundMuted = true;
            }
            
            // Store audio state in localStorage for persistence
            try { localStorage.setItem('ballAudioEnabled', enabled); } catch(e) {}
            console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
            return true;
        } catch (e) {
            console.error('Error toggling audio:', e);
            return false;
        }
    },

    playTestSound: () => {
        if (!window.app.audioContext) {
            try {
                // Create audio context if it doesn't exist
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                window.app.audioContext = new AudioContext();
                window.app.masterGain = window.app.audioContext.createGain();
                window.app.masterGain.gain.value = 0.5;
                window.app.masterGain.connect(window.app.audioContext.destination);
            } catch (e) {
                console.error('Failed to create audio context:', e);
                return false;
            }
        }
        
        try {
            const ctx = window.app.audioContext;
            
            // If suspended, resume first
            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    playTestTone(ctx);
                }).catch(err => {
                    console.error('Failed to resume AudioContext:', err);
                });
            } else {
                playTestTone(ctx);
            }
            
            function playTestTone(ctx) {
                // Create oscillator for a pleasant test tone
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = 440; // A4 note
                
                gain.gain.value = 0.2;
                
                osc.connect(gain);
                gain.connect(window.app.masterGain || ctx.destination);
                
                // Simple envelope
                const now = ctx.currentTime;
                gain.gain.setValueAtValue ? gain.gain.setValueAtTime(0, now) : gain.gain.value = 0;
                gain.gain.linearRampToValueAtTime ? gain.gain.linearRampToValueAtTime(0.2, now + 0.05) : gain.gain.value = 0.2;
                gain.gain.exponentialRampToValueAtTime ? gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5) : null;
                
                osc.start();
                osc.stop(now + 0.6);
                
                console.log('Test sound played');
            }
            
            return true;
        } catch (e) {
            console.error('Error playing test sound:', e);
            return false;
        }
    },

    // Ball controls
    resetBall: () => {
        if (!window.app.ballGroup) {
            console.warn('Ball not initialized, cannot reset position');
            return false;
        }
        
        try {
            // Reset position and rotation with animation using GSAP if available
            if (window.gsap) {
                gsap.to(window.app.ballGroup.position, {
                    x: 0, y: 0, z: 0,
                    duration: 0.5,
                    ease: "back.out"
                });
                gsap.to(window.app.ballGroup.rotation, {
                    x: 0, y: 0, z: 0,
                    duration: 0.5,
                    ease: "power2.out"
                });
            } else {
                // Fallback to direct setting
                window.app.ballGroup.position.set(0, 0, 0);
                window.app.ballGroup.rotation.set(0, 0, 0);
            }
            
            // Reset any deformation
            if (typeof window.app.resetDeformation === 'function') {
                window.app.resetDeformation(1.0); // Fast reset
            }
            
            console.log('Ball position and rotation reset');
            return true;
        } catch (e) {
            console.error('Error resetting ball:', e);
            return false;
        }
    },

    toggleWireframe: (enabled) => {
        // Check both possible locations for the wireMesh
        const wireMesh = window.app.uiBridge.wireMesh;
        if (wireMesh) {
            wireMesh.visible = enabled;
            // Store wireframe state in localStorage for persistence
            try { localStorage.setItem('ballWireframeEnabled', enabled); } catch(e) {}
            console.log(`Wireframe mode ${enabled ? 'enabled' : 'disabled'}`);
            return true;
        } else {
            console.warn('Wireframe mesh not found');
            return false;
        }
    },

    toggleRainbowMode: (enabled) => {
        window.app.isRainbowMode = enabled;
        // Store rainbow state in localStorage for persistence
        try { localStorage.setItem('ballRainbowEnabled', enabled); } catch(e) {}
        console.log(`Rainbow mode ${enabled ? 'enabled' : 'disabled'}`);
        return true;
    },

    // Effects methods with improved implementation
    createExplosion: () => {
        try {
            if (typeof window.createParticleExplosion === 'function') {
                window.createParticleExplosion(window.app);
                return true;
            } else if (typeof window.app.createExplosion === 'function' && 
                     window.app.createExplosion !== window.app.uiBridge.createExplosion) {
                return window.app.createExplosion();
            }
            return false;
        } catch (e) {
            console.error('Error creating explosion:', e);
            return false;
        }
    },
    
    createBlackholeEffect: () => {
        try {
            window.app.isBlackholeActive = !window.app.isBlackholeActive;
            
            if (window.app.isBlackholeActive) {
                // Try to use imported function if available
                if (typeof window.createBlackholeEffect === 'function') {
                    window.createBlackholeEffect(window.app);
                } else if (typeof window.app.createBlackholeEffect === 'function' && 
                          window.app.createBlackholeEffect !== window.app.uiBridge.createBlackholeEffect) {
                    window.app.createBlackholeEffect();
                } else {
                    // Fallback
                    window.app.createBasicBlackholeEffect();
                }
                console.log('Blackhole effect activated');
            } else {
                // Try to use imported function if available
                if (typeof window.removeBlackholeEffect === 'function') {
                    window.removeBlackholeEffect(window.app);
                } else if (typeof window.app.removeBlackholeEffect === 'function' && 
                          window.app.removeBlackholeEffect !== window.app.uiBridge.removeBlackholeEffect) {
                    window.app.removeBlackholeEffect();
                } else {
                    // Fallback
                    window.app.removeBasicBlackholeEffect();
                }
                console.log('Blackhole effect deactivated');
            }
            
            // Store state in localStorage for persistence
            try { localStorage.setItem('ballBlackHoleActive', window.app.isBlackholeActive); } catch(e) {}
            
            return true;
        } catch (e) {
            console.error('Error toggling blackhole effect:', e);
            return false;
        }
    },
    
    createBasicBlackholeEffect: () => {
        // Create a basic blackhole effect if the main implementation is missing
        if (!window.app.scene) return;
        
        // Remove any existing effect
        window.app.uiBridge.removeBasicBlackholeEffect();
        
        // Create a simple black sphere in the center
        const blackholeGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const blackholeMat = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true,
            opacity: 0.8
        });
        
        window.app.blackholeEffect = new THREE.Mesh(blackholeGeo, blackholeMat);
        window.app.scene.add(window.app.blackholeEffect);
        
        // Add a distortion effect to the render pipeline
        if (window.app.renderer && window.app.renderer.domElement) {
            window.app.renderer.domElement.style.filter = "blur(2px) brightness(0.8)";
        }
    },
    
    removeBasicBlackholeEffect: () => {
        // Remove our basic blackhole effect
        if (window.app.blackholeEffect && window.app.scene) {
            window.app.scene.remove(window.app.blackholeEffect);
            window.app.blackholeEffect = null;
        }
        
        // Remove render effects
        if (window.app.renderer && window.app.renderer.domElement) {
            window.app.renderer.domElement.style.filter = "";
        }
    },
    
    createMagneticEffect: () => {
        try {
            window.app.isMagneticActive = !window.app.isMagneticActive;
            
            if (window.app.isMagneticActive) {
                // Try to use imported function if available
                if (typeof window.createTrailEffect === 'function') {
                    window.createTrailEffect(window.app);
                } else if (typeof window.app.createMagneticEffect === 'function' && 
                          window.app.createMagneticEffect !== window.app.uiBridge.createMagneticEffect) {
                    window.app.createMagneticEffect();
                } else {
                    // Fallback
                    window.app.createBasicMagneticEffect();
                }
                console.log('Magnetic effect activated');
            } else {
                // Try to use imported function if available
                if (typeof window.removeTrailEffect === 'function') {
                    window.removeTrailEffect(window.app);
                } else if (typeof window.app.removeMagneticEffect === 'function' && 
                          window.app.removeMagneticEffect !== window.app.uiBridge.removeMagneticEffect) {
                    window.app.removeMagneticEffect();
                } else {
                    // Fallback
                    window.app.removeBasicMagneticEffect();
                }
                console.log('Magnetic effect deactivated');
            }
            
            // Store state in localStorage for persistence
            try { localStorage.setItem('ballMagneticActive', window.app.isMagneticActive); } catch(e) {}
            
            return true;
        } catch (e) {
            console.error('Error toggling magnetic effect:', e);
            return false;
        }
    },
    
    createBasicMagneticEffect: () => {
        // Create a basic magnetic trail effect if the main implementation is missing
        if (!window.app.scene || !window.app.ballGroup) return;
        
        // Create a trail object
        const trailGeo = new THREE.BufferGeometry();
        const maxPoints = 100;
        const positions = new Float32Array(maxPoints * 3);
        trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const trailMat = new THREE.LineBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.7
        });
        
        const trail = new THREE.Line(trailGeo, trailMat);
        window.app.scene.add(trail);
        window.app.magneticTrail = trail;
        window.app.magneticTrailPoints = [];
        
        // Update function for animation loop
        window.app.updateMagneticTrail = () => {
            if (!window.app.isMagneticActive || !window.app.magneticTrail) return;
            
            // Get current ball position
            const ballPos = new THREE.Vector3();
            window.app.ballGroup.getWorldPosition(ballPos);
            
            // Add point to trail
            window.app.magneticTrailPoints.push(ballPos.clone());
            
            // Limit number of points
            if (window.app.magneticTrailPoints.length > maxPoints) {
                window.app.magneticTrailPoints.shift();
            }
            
            // Update trail geometry
            const positions = window.app.magneticTrail.geometry.attributes.position.array;
            for (let i = 0; i < window.app.magneticTrailPoints.length; i++) {
                const point = window.app.magneticTrailPoints[i];
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            
            window.app.magneticTrail.geometry.attributes.position.needsUpdate = true;
            window.app.magneticTrail.geometry.setDrawRange(0, window.app.magneticTrailPoints.length);
        };
        
        // Hook into animation loop
        const originalAnimate = window.app.animate;
        window.app.animate = function() {
            originalAnimate();
            if (window.app.updateMagneticTrail) {
                window.app.updateMagneticTrail();
            }
        };
    },
    
    removeBasicMagneticEffect: () => {
        // Remove our basic magnetic effect
        if (window.app.magneticTrail && window.app.scene) {
            window.app.scene.remove(window.app.magneticTrail);
            window.app.magneticTrail = null;
            window.app.magneticTrailPoints = [];
        }
    },

    // Visualization and appearance controls
    toggleAudioVisualization: (enabled) => {
        try {
            if (window.app.audioVisualization) {
                window.app.audioVisualization.enabled = enabled;
                
                if (window.app.scene?.userData?.audioVisualization) {
                    window.app.scene.userData.audioVisualization.visible = enabled;
                }
                
                // Store visualization state in localStorage for persistence
                try { localStorage.setItem('ballVisualizationEnabled', enabled); } catch(e) {}
                console.log(`Audio visualization ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            }
            
            // If no visualization exists but we want to enable it, try to create one
            if (enabled && !window.app.audioVisualization) {
                if (typeof window.createEnhancedVisualization === 'function') {
                    window.app.audioVisualization = window.createEnhancedVisualization(window.app);
                    return true;
                } else if (window.app.createBasicAudioVisualization) {
                    return window.app.createBasicAudioVisualization();
                }
            }
            
            console.warn('Audio visualization not available');
            return false;
        } catch (e) {
            console.error('Error toggling audio visualization:', e);
            return false;
        }
    },
    
    createBasicAudioVisualization: () => {
        // Create a simple audio visualization if one doesn't exist
        if (!window.app.audioContext || !window.app.scene) return false;
        
        // Create analyzer if it doesn't exist
        if (!window.app.analyser) {
            window.app.analyser = window.app.audioContext.createAnalyser();
            window.app.analyser.fftSize = 32;
            
            if (window.app.masterGain) {
                window.app.masterGain.connect(window.app.analyser);
            } else {
                // Try to insert analyzer in audio chain
                const destination = window.app.audioContext.destination;
                window.app.analyser.connect(destination);
            }
            
            window.app.analyserData = new Uint8Array(window.app.analyser.frequencyBinCount);
        }
        
        // Create visualization bars
        const visGroup = new THREE.Group();
        window.app.scene.add(visGroup);
        window.app.scene.userData.audioVisualization = visGroup;
        
        const barCount = 16;
        const barGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        
        for (let i = 0; i < barCount; i++) {
            const angle = (i / barCount) * Math.PI * 2;
            const x = Math.cos(angle) * 2;
            const z = Math.sin(angle) * 2;
            
            const bar = new THREE.Mesh(
                barGeo,
                new THREE.MeshPhongMaterial({ color: 0x00FFFF })
            );
            
            bar.position.set(x, 0, z);
            visGroup.add(bar);
        }
        
        // Update function
        window.app.updateAudioVisualization = function() {
            if (!window.app.analyser || !window.app.scene?.userData?.audioVisualization) return;
            
            window.app.analyser.getByteFrequencyData(window.app.analyserData);
            
            const bars = window.app.scene.userData.audioVisualization.children;
            const binCount = window.app.analyserData.length;
            
            for (let i = 0; i < bars.length; i++) {
                const binIndex = Math.floor((i / bars.length) * binCount);
                const value = window.app.analyserData[binIndex] / 256;
                
                bars[i].scale.y = value * 5 + 0.1;
                bars[i].position.y = value * 1.5;
            }
        };
        
        window.app.audioVisualization = {
            enabled: true,
            update: window.app.updateAudioVisualization
        };
        
        console.log('Basic audio visualization created');
        return true;
    },

    setSpikiness: (value) => {
        try {
            window.app.spikiness = value;
            
            if (window.app.ballGeometry && window.app.originalPositions) {
                // Apply spiky effect if spikiness > 0
                if (value > 0) {
                    if (typeof window.applySpikyEffect === 'function') {
                        window.applySpikyEffect(window.app, value);
                    } else if (typeof window.app.applySpikyEffect === 'function') {
                        window.app.applySpikyEffect(value);
                    } else {
                        window.app.applyBasicSpikyEffect(value);
                    }
                } else if (typeof window.app.resetDeformation === 'function') {
                    // Reset deformation if spikiness is 0
                    window.app.resetDeformation(0.5);
                }
                
                // Store spikiness in localStorage for persistence
                try { localStorage.setItem('ballSpikiness', value); } catch(e) {}
                console.log(`Spikiness set to ${value.toFixed(2)}`);
                return true;
            }
            
            console.warn('Spikiness control not available');
            return false;
        } catch (e) {
            console.error('Error setting spikiness:', e);
            return false;
        }
    },
    
    applyBasicSpikyEffect: (intensity) => {
        if (!window.app.ballGeometry || !window.app.originalPositions) return;
        
        const positions = window.app.ballGeometry.attributes.position;
        
        // Apply spikiness to all vertices
        for (let i = 0; i < positions.count; i++) {
            const originalX = window.app.originalPositions[i * 3];
            const originalY = window.app.originalPositions[i * 3 + 1];
            const originalZ = window.app.originalPositions[i * 3 + 2];
            
            // Normalize the original position to get direction vector
            const length = Math.sqrt(
                originalX * originalX + 
                originalY * originalY + 
                originalZ * originalZ
            );
            
            // Calculate spiky position
            positions.array[i * 3] = originalX + (originalX / length) * intensity;
            positions.array[i * 3 + 1] = originalY + (originalY / length) * intensity;
            positions.array[i * 3 + 2] = originalZ + (originalZ / length) * intensity;
        }
        
        positions.needsUpdate = true;
        window.app.ballGeometry.computeVertexNormals();
        
        // Update wireframe if it exists
        if (window.app.wireMesh) {
            const wireGeo = new THREE.EdgesGeometry(window.app.ballGeometry);
            window.app.wireMesh.geometry = wireGeo;
        }
    },
    
    // Gradient customization
    setGradientColors: (innerColor, middleColor, outerColor) => {
        try {
            if (typeof window.app.updateGradientTexture === 'function') {
                window.app.updateGradientTexture(innerColor, middleColor, outerColor);
                
                // Store colors in localStorage for persistence
                try {
                    localStorage.setItem('ballInnerColor', innerColor);
                    localStorage.setItem('ballMiddleColor', middleColor);
                    localStorage.setItem('ballOuterColor', outerColor);
                } catch(e) {}
                
                console.log('Gradient colors updated');
                return true;
            }
            
            console.warn('Gradient texture update function not available');
            return false;
        } catch (e) {
            console.error('Error updating gradient colors:', e);
            return false;
        }
    },
    
    // Improved function to reset colors to default
    resetColors: () => {
        try {
            const defaultInner = '#FF00FF';  // Magenta
            const defaultMiddle = '#8800FF'; // Purple
            const defaultOuter = '#00FFFF'; // Cyan
            
            return window.app.uiBridge.setGradientColors(defaultInner, defaultMiddle, defaultOuter);
        } catch (e) {
            console.error('Error resetting colors:', e);
            return false;
        }
    },
    
    // Menu state synchronization
    syncToggleStates: () => {
        if (!window.menuSystem) return false;
        
        try {
            // Call the existing sync method if available
            if (typeof window.menuSystem.syncToggleStates === 'function') {
                window.menuSystem.syncToggleStates();
                return true;
            }
        } catch (e) {
            console.error('Error syncing toggle states:', e);
        }
        return false;
    },
    
    // Load persisted settings from localStorage
    loadPersistedSettings: () => {
        try {
            // Load volume
            const volume = localStorage.getItem('ballVolume');
            if (volume !== null && window.app.masterGain) {
                window.app.masterGain.gain.value = parseFloat(volume);
            }
            
            // Load audio state
            const audioEnabled = localStorage.getItem('ballAudioEnabled');
            if (audioEnabled !== null) {
                window.app.uiBridge.toggleAudio(audioEnabled === 'true');
            }
            
            // Load wireframe state
            const wireframeEnabled = localStorage.getItem('ballWireframeEnabled');
            if (wireframeEnabled !== null) {
                window.app.uiBridge.toggleWireframe(wireframeEnabled === 'true');
            }
            
            // Load rainbow state
            const rainbowEnabled = localStorage.getItem('ballRainbowEnabled');
            if (rainbowEnabled !== null) {
                window.app.uiBridge.toggleRainbowMode(rainbowEnabled === 'true');
            }
            
            // Load visualization state
            const visualizationEnabled = localStorage.getItem('ballVisualizationEnabled');
            if (visualizationEnabled !== null) {
                window.app.uiBridge.toggleAudioVisualization(visualizationEnabled === 'true');
            }
            
            // Load spikiness
            const spikiness = localStorage.getItem('ballSpikiness');
            if (spikiness !== null) {
                window.app.uiBridge.setSpikiness(parseFloat(spikiness));
            }
            
            // Load gradient colors
            const innerColor = localStorage.getItem('ballInnerColor');
            const middleColor = localStorage.getItem('ballMiddleColor');
            const outerColor = localStorage.getItem('ballOuterColor');
            if (innerColor && middleColor && outerColor) {
                window.app.uiBridge.setGradientColors(innerColor, middleColor, outerColor);
            }
            
            console.log('Persisted settings loaded successfully');
            return true;
        } catch (e) {
            console.error('Error loading persisted settings:', e);
            return false;
        }
    }
};

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

        // Store wireMesh in userData for consistent access via uiBridge
        window.app.ballGroup.userData.wireMesh = wireMesh;
        // Store materials in userData for rainbow effect
        window.app.ballGroup.userData.mat = mat;
        window.app.ballGroup.userData.wireMat = wireMat;
        
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
    
    // Update rainbow mode if enabled
    if (window.app.isRainbowMode) {
        updateRainbowMode(window.app);
    }
    
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

// Add missing implementations for menu triggers
window.app.setRainbowMode = function (enabled) {
    // Set the flag directly first
    window.app.isRainbowMode = enabled;
    
    // If enabled is true, ensure rainbow mode is on, otherwise ensure it's off
    if (enabled) {
        if (!window.app.isRainbowMode) {
            toggleRainbowMode(window.app);
        }
    } else {
        if (window.app.isRainbowMode) {
            toggleRainbowMode(window.app);
        }
    }
    
    console.log(`Rainbow mode ${enabled ? 'enabled' : 'disabled'}`);
    return window.app.isRainbowMode;
};

// Optional: Add these if you want the menu buttons to do something
window.app.createExplosion = function () {
    console.log('Explosion triggered');
    // TODO: Implement explosion effect
};
window.app.createBlackholeEffect = function () {
    console.log('Blackhole effect triggered');
    // TODO: Implement blackhole effect
};
window.app.createMagneticEffect = function () {
    console.log('Magnetic effect triggered');
    // TODO: Implement magnetic effect
};

// Add event listeners
window.addEventListener('resize', onWindowResize);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing application...');
    init();
    
    // Let other components know the scene is ready
    window.dispatchEvent(new Event('sceneReady'));

    // Fallback: ensure menu system is connected to app/uiBridge
    if (window.menuSystem && typeof window.menuSystem.setApp === 'function') {
        window.menuSystem.setApp(window.app);
    } else if (window.MenuSystem) {
        window.menuSystem = new window.MenuSystem(window.app);
    }

    // After app initialization is complete, load persisted settings
    setTimeout(() => {
        if (window.app && window.app.uiBridge) {
            window.app.uiBridge.loadPersistedSettings();
            window.app.uiBridge.syncToggleStates();
        }
    }, 1000);
});

// Make functions available to other scripts
window.app.createFancyBall = createFancyBall;
window.app.init = init;
window.app.animate = animate;

// Add these implementations to main.js

window.app.createExplosion = function() {
  console.log('Explosion effect triggered');
  
  // Get the ball mesh
  const ball = window.app.ballGroup;
  if (!ball) return;
  
  // Temporarily hide the ball
  const originalVisibility = ball.visible;
  ball.visible = false;
  
  // Create particles
  const particleCount = 100;
  const particles = new THREE.Group();
  const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const particleMaterial = new THREE.MeshBasicMaterial({
    color: 0xFF00FF,
    transparent: true
  });
  
  for (let i = 0; i < particleCount; i++) {
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.2 + 0.2;
    
    particle.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      Math.random() * 2 - 1
    );
    
    particle.userData.velocity = new THREE.Vector3(
      particle.position.x * Math.random() * 0.1,
      particle.position.y * Math.random() * 0.1,
      particle.position.z * Math.random() * 0.1
    );
    
    particles.add(particle);
  }
  
  window.app.scene.add(particles);
  
  // Handle particle animation
  let elapsed = 0;
  function animateParticles() {
    elapsed += 0.016; // Approx 60fps
    
    particles.children.forEach(particle => {
      particle.position.add(particle.userData.velocity);
      particle.material.opacity = 1 - (elapsed / 2);
    });
    
    if (elapsed < 2) {
      requestAnimationFrame(animateParticles);
    } else {
      // Remove particles and restore ball
      window.app.scene.remove(particles);
      ball.visible = originalVisibility;
    }
  }
  
  animateParticles();
};
