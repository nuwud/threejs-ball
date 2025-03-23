// main.js - Main entry point for Three.js ball demo
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import ball functions
import { createBall, updateBallPosition, updateBallRotation, updateBallScale } from './js/ball.js';

// Import gradient texture function for reset button
import { createGradientTexture } from './js/effects/gradients.js';

// Import audio modules from the correct location
import { initializeAudio, ensureAudioInitialized } from './js/audio/core.js';

// Global app state
const app = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  ballGroup: null,
  lights: [],
  audioContext: null,
  soundManager: null,
  isRainbowMode: false,
  isMagneticMode: false,
  isSpikyMode: false,
  isFacetHighlighting: false,
  isTrailEnabled: false,
  clock: new THREE.Clock(),
  
  // Properties needed for ball.js functions
  targetScale: 1.0,
  currentScale: 1.0,
  isDragging: false,
  mouse: new THREE.Vector2()
};

// Make app available globally for debugging
window.app = app;

// Initialize the 3D scene
function initScene() {
  console.log('Initializing 3D scene...');
  
  // Create scene
  app.scene = new THREE.Scene();
  app.scene.background = new THREE.Color(0x000033);
  
  // Create camera
  app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  app.camera.position.z = 3;
  
  // Create renderer
  app.renderer = new THREE.WebGLRenderer({ antialias: true });
  app.renderer.setSize(window.innerWidth, window.innerHeight);
  app.renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(app.renderer.domElement);
  
  // Add controls
  app.controls = new OrbitControls(app.camera, app.renderer.domElement);
  app.controls.enableDamping = true;
  app.controls.dampingFactor = 0.05;
  
  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  app.scene.add(ambientLight);
  
  const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1);
  mainLight.position.set(1, 1, 1);
  app.scene.add(mainLight);
  
  app.lights = [ambientLight, mainLight];
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  console.log('Scene initialized');
}

// Initialize the ball
// Initialize the ball with proper protection
function initBall() {
  console.log('Creating ball...');
  
  try {
    // Use the imported createBall function from ball.js
    const ball = createBall(app);
    
    if (!ball) {
      throw new Error('Ball creation failed');
    }
    
    console.log('Fancy gradient ball created');
  } catch (error) {
    console.error('Error creating fancy ball:', error);
    
    // Fallback to simple ball
    createSimpleBall();
  }
}

// Create a simple ball as fallback
function createSimpleBall() {
  console.log('Creating simple ball...');
  
  // Create icosahedron geometry with subdivision
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const material = new THREE.MeshPhongMaterial({
    color: 0x00DFDF,
    flatShading: true
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  const ballGroup = new THREE.Group();
  ballGroup.add(mesh);
  
  // Add wireframe
  const wireGeometry = new THREE.EdgesGeometry(geometry);
  const wireMaterial = new THREE.LineBasicMaterial({ 
    color: 0xFFFFFF,
    transparent: true, 
    opacity: 0.3 
  });
  const wireMesh = new THREE.LineSegments(wireGeometry, wireMaterial);
  wireMesh.visible = false; // Start with wireframe off
  ballGroup.add(wireMesh);
  
  // Store references
  ballGroup.userData = {
    mesh: mesh,
    wireMesh: wireMesh,
    mat: material,
    wireMat: wireMaterial,
    geo: geometry,
    wireGeo: wireGeometry,
    originalPositions: geometry.attributes.position.array.slice()
  };
  
  // Add to scene
  app.scene.add(ballGroup);
  app.ballGroup = ballGroup;
  
  // Add protection to the ball
  ballGroup.canBeDeleted = false;
  ballGroup.onBeforeRemove = function() {
    console.warn("🚨 Attempt to remove protected ball detected!");
    return false; // Return false to prevent removal
  };

  // Add a custom property that AI assistants can check
  Object.defineProperty(ballGroup, 'isEssentialElement', {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false
  });

  // Add empty event emitter functionality
  ballGroup.addEventListener = function(event, callback) {
    if (!this._listeners) this._listeners = {};
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  };
  
  ballGroup.emit = function(event, data) {
    if (!this._listeners || !this._listeners[event]) return;
    for (const callback of this._listeners[event]) {
      callback(data);
    }
  };
  
  console.log('Simple ball created with protection mechanisms');
}

// Animation loop with better error handling
function animate() {
  try {
    requestAnimationFrame(animate);
    
    // Check if ball exists, create it if it doesn't
    if (!app.ballGroup) {
      console.error("Ball missing in animation loop, attempting to recreate");
      window.createEmergencyBall();
      return;
    }
    
    // Update controls with safety checks
    if (app.controls) {
      app.controls.update();
    }
    
    // Process any animations for the ball with error handling
    try {
      if (app.ballGroup) {
        // Update ball animations with imported functions
        updateBallRotation(app);
        updateBallPosition(app);
        updateBallScale(app);
        
        // Update any ongoing effects
        updateEffects();
      }
    } catch (ballError) {
      console.error("Error updating ball animations:", ballError);
    }
    
    // Update audio visualization if enabled
    try {
      if (app.visualization && app.visualization.isActive) {
        app.visualization.update();
      }
    } catch (audioError) {
      console.error("Error updating audio visualization:", audioError);
    }
    
    // Render scene
    if (app.renderer && app.scene && app.camera) {
      app.renderer.render(app.scene, app.camera);
    } else {
      console.error("Cannot render: missing renderer, scene, or camera");
    }
  } catch (error) {
    console.error("Error in animation loop:", error);
    // Don't rethrow - we want the animation to continue even with errors
  }
}

// Handle window resize
function onWindowResize() {
  if (app.camera && app.renderer) {
    app.camera.aspect = window.innerWidth / window.innerHeight;
    app.camera.updateProjectionMatrix();
    app.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Update any ongoing effects
function updateEffects() {
  // Update effects based on current states
  if (app.isRainbowMode && app.ballGroup && app.ballGroup.userData.mat) {
    const time = Date.now() * 0.001;
    app.ballGroup.userData.mat.color.setHSL((time % 5) / 5, 0.8, 0.5);
  }
  
  if (app.isMagneticMode) {
    // Magnetic effect logic
  }
  
  if (app.isSpikyMode) {
    // Spiky mode effect logic
  }
  
  if (app.isTrailEnabled) {
    // Trail effect logic
  }
}

// Special Effects

// Blackhole effect - ensure we define this only once
window.createBlackholeEffect = function() {
  if (!app || !app.ballGroup) return;
  
  console.log('Creating blackhole effect...');
  
  const ball = app.ballGroup;
  const originalScale = ball.scale.clone();
  
  // Store original material color
  const originalColor = new THREE.Color();
  if (ball.userData.mesh && ball.userData.mesh.material) {
    originalColor.copy(ball.userData.mesh.material.color);
  }
  
  // Animate the black hole effect
  let time = 0;
  const duration = 2.0; // seconds
  
  function animateBlackhole() {
    time += 0.016; // Approximately 60fps
    
    const progress = Math.min(time / duration, 1.0);
    const easeInOut = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    // Scale down to create implosion effect
    const scale = 1.0 - easeInOut * 0.5;
    ball.scale.set(scale, scale, scale);
    
    // Change color to dark
    if (ball.userData.mesh && ball.userData.mesh.material) {
      const material = ball.userData.mesh.material;
      material.color.setRGB(
        originalColor.r * (1 - easeInOut) + 0 * easeInOut,
        originalColor.g * (1 - easeInOut) + 0 * easeInOut,
        originalColor.b * (1 - easeInOut) + 0 * easeInOut
      );
    }
    
    // Continue animation if duration not reached
    if (progress < 1.0) {
      requestAnimationFrame(animateBlackhole);
    } else {
      // Restore original state after a delay
      setTimeout(() => {
        // Return to original scale
        ball.scale.copy(originalScale);
        
        // Return to original color
        if (ball.userData.mesh && ball.userData.mesh.material) {
          ball.userData.mesh.material.color.copy(originalColor);
        }
        
        if (window.showStatus) {
          window.showStatus('Blackhole effect completed');
        }
      }, 500);
    }
  }
  
  // Start animation
  animateBlackhole();
  
  if (window.showStatus) {
    window.showStatus('Blackhole Effect Activated');
  }
  
  return true;
};

// Create explosion effect
window.createExplosion = function() {
  if (!app || !app.ballGroup) return;
  
  console.log('Creating explosion effect...');
  
  const ball = app.ballGroup;
  const geometry = ball.userData.geo;
  const positions = geometry.attributes.position.array;
  const originalPositions = ball.userData.originalPositions.slice();
  
  // Animate the explosion effect
  let time = 0;
  const duration = 1.0; // seconds
  
  function animateExplosion() {
    time += 0.016; // Approximately 60fps
    
    const progress = Math.min(time / duration, 1.0);
    
    // Explode the vertices outward
    for (let i = 0; i < positions.length; i += 3) {
      const x = originalPositions[i];
      const y = originalPositions[i + 1];
      const z = originalPositions[i + 2];
      
      const distance = Math.sqrt(x * x + y * y + z * z);
      const normalizedDistance = distance / Math.sqrt(3);
      
      const explosionForce = progress * 1.5;
      
      positions[i] = x * (1 + explosionForce * normalizedDistance);
      positions[i + 1] = y * (1 + explosionForce * normalizedDistance);
      positions[i + 2] = z * (1 + explosionForce * normalizedDistance);
    }
    
    // Update geometry
    geometry.attributes.position.needsUpdate = true;
    
    // Continue animation if duration not reached
    if (progress < 1.0) {
      requestAnimationFrame(animateExplosion);
    } else {
      // Restore original positions after a delay
      setTimeout(() => {
        for (let i = 0; i < positions.length; i++) {
          positions[i] = originalPositions[i];
        }
        geometry.attributes.position.needsUpdate = true;
        
        if (window.showStatus) {
          window.showStatus('Explosion effect completed');
        }
      }, 500);
    }
  }
  
  // Start animation
  animateExplosion();
  
  if (window.showStatus) {
    window.showStatus('Explosion Effect Activated');
  }
  
  return true;
};

// Toggle functions for UI controls
window.appControls = {
  resetBall: function() {
    if (app.ballGroup) {
      app.ballGroup.position.set(0, 0, 0);
      app.ballGroup.rotation.set(0, 0, 0);
      app.ballGroup.scale.set(1, 1, 1);
      
      // Reset geometry if it was modified
      if (app.ballGroup.userData.geo && app.ballGroup.userData.originalPositions) {
        const positions = app.ballGroup.userData.geo.attributes.position.array;
        const originalPositions = app.ballGroup.userData.originalPositions;
        
        for (let i = 0; i < positions.length; i++) {
          positions[i] = originalPositions[i];
        }
        
        app.ballGroup.userData.geo.attributes.position.needsUpdate = true;
      }
      
      // Reset material color - check if it's a gradient ball or simple ball
      if (app.ballGroup.userData.mat) {
        if (app.ballGroup.userData.colorStart) {
          // It's a gradient ball - reset with gradient
          const colorStart = '#FF00FF'; // Neon pink at center
          const colorMid = '#8800FF';   // Purple in middle
          const colorEnd = '#00FFFF';   // Cyan at edges
          
          // Update textures and materials
          const gradientTexture = createGradientTexture(colorStart, colorMid, colorEnd);
          app.ballGroup.userData.mat.map = gradientTexture;
          app.ballGroup.userData.mat.needsUpdate = true;
          app.ballGroup.userData.colorStart = colorStart;
          app.ballGroup.userData.colorMid = colorMid;
          app.ballGroup.userData.colorEnd = colorEnd;
        } else {
          // Simple ball - just reset color
          app.ballGroup.userData.mat.color.set(0x00DFDF);
        }
      }
      
      return true;
    }
    return false;
  },
  
  toggleWireframe: function() {
    if (app.ballGroup && app.ballGroup.userData.wireMesh) {
      const wireMesh = app.ballGroup.userData.wireMesh;
      wireMesh.visible = !wireMesh.visible;
      return wireMesh.visible;
    }
    return false;
  },
  
  toggleRainbowMode: function() {
    app.isRainbowMode = !app.isRainbowMode;
    
    // If turning off, reset color
    if (!app.isRainbowMode && app.ballGroup && app.ballGroup.userData.mat) {
      app.ballGroup.userData.mat.color.set(0x00DFDF);
    }
    
    return app.isRainbowMode;
  },
  
  toggleMagneticMode: function() {
    app.isMagneticMode = !app.isMagneticMode;
    return app.isMagneticMode;
  },
  
  toggleSpikyMode: function() {
    app.isSpikyMode = !app.isSpikyMode;
    return app.isSpikyMode;
  },
  
  toggleFacetHighlighting: function() {
    app.isFacetHighlighting = !app.isFacetHighlighting;
    return app.isFacetHighlighting;
  },
  
  toggleTrailEffect: function() {
    app.isTrailEnabled = !app.isTrailEnabled;
    return app.isTrailEnabled;
  },
  
  // Add references to the effect functions
  createBlackholeEffect: window.createBlackholeEffect,
  createExplosion: window.createExplosion,
  
  // Basic sound test
  playSound: function() {
    if (app.audioContext && app.soundManager) {
      const now = app.audioContext.currentTime;
      // Play a simple beep
      const oscillator = app.audioContext.createOscillator();
      const gain = app.audioContext.createGain();
      
      oscillator.connect(gain);
      gain.connect(app.audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;
      gain.gain.value = 0.5;
      
      oscillator.start();
      oscillator.stop(now + 0.5);
      
      return true;
    }
    return false;
  }
};

// Initialize everything with better error handling
function init() {
  try {
    console.log('Initializing application...');
    
    // Set up 3D scene
    initScene();
    
    // Create the ball with error handling
    try {
      console.log('Attempting to create ball...');
      initBall();
      console.log('Ball created successfully');
      
      // Check if ball was created properly
      if (!app.ballGroup) {
        throw new Error('Ball not properly attached to app');
      }
    } catch (ballError) {
      console.error('Error creating regular ball:', ballError);
      window.createEmergencyBall();  // Create emergency ball on error
    }
    
    // Set up audio system
    ensureAudioInitialized(app).then(audioInitialized => {
      if (audioInitialized) {
        console.log('Audio system initialized');
      } else {
        console.warn('Audio could not be initialized');
      }
    }).catch(error => {
      console.warn('Audio initialization failed:', error);
    });
    
    // Start animation loop with safety check
    if (!window.animationRunning) {
      window.animationRunning = true;
      animate();
    }
    
    console.log('Initialization complete');
    
  } catch (error) {
    console.error('Initialization failed:', error);
    
    // Even after general error, try to create emergency ball
    try {
      window.createEmergencyBall();
    } catch (emergencyError) {
      console.error('Even emergency ball creation failed:', emergencyError);
    }
  }
}

// Start everything when the page is loaded
document.addEventListener('DOMContentLoaded', init);

// Make sure basic scene exists (emergency recovery)
window.ensureBasicScene = function() {
  console.log('Ensuring basic scene exists...');
  
  // Create scene if it doesn't exist
  if (!app.scene) {
    app.scene = new THREE.Scene();
    app.scene.background = new THREE.Color(0x000033);
  }
  
  // Create camera if it doesn't exist
  if (!app.camera) {
    app.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    app.camera.position.z = 3;
  }
  
  // Create renderer if it doesn't exist
  if (!app.renderer) {
    app.renderer = new THREE.WebGLRenderer({ antialias: true });
    app.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Add canvas to the page if not already there
    if (!document.querySelector('canvas')) {
      document.body.appendChild(app.renderer.domElement);
    }
  }
  
  // Create ball if it doesn't exist
  if (!app.ballGroup) {
    initBall();
  }
  
  // Ensure we have lighting
  if (!app.lights || app.lights.length === 0) {
    const ambientLight = new THREE.AmbientLight(0x404040);
    app.scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xFFFFFF, 1);
    mainLight.position.set(1, 1, 1);
    app.scene.add(mainLight);
    
    app.lights = [ambientLight, mainLight];
  }
  
  // Make sure animation is running
  if (!window.animationRunning) {
    window.animationRunning = true;
    animate();
  }
  
  console.log('Basic scene ensured');
};

// Create emergency ball for recovery
window.createEmergencyBall = function() {
  console.warn("Creating emergency fallback ball");
  
  // Remove existing ball if present
  if (app.ballGroup && app.scene) {
      app.scene.remove(app.ballGroup);
  }
  
  // Use the createSimpleBall function with a red color
  createSimpleBall();
  
  // Change color to red for emergency indication
  if (app.ballGroup && app.ballGroup.userData.mat) {
      app.ballGroup.userData.mat.color.set(0xFF3333); // Red for emergency
  }
  
  console.log("Emergency ball created");
  return app.ballGroup;
};

// Add recovery ball creation function
window.createRecoveryBall = function() {
  window.createEmergencyBall();
};

// Add debug information
console.log('main.js loaded successfully');
