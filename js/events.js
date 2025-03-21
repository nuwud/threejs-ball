// events.js - Handles user interactions
import * as THREE from 'three';
import { initAudioEffects, playToneForPosition, stopTone } from './audio.js';
import { applyDeformation, resetDeformation, updateGradientColors } from './ball.js';
import { 
  createParticleExplosion, 
  applySpikyEffect, 
  createMagneticTrail, 
  removeMagneticTrail, 
  createBlackholeEffect, 
  removeBlackholeEffect
} from './effects.js';

// Set up event listeners
function setupEventListeners(app) {
  console.log("Setting up event listeners...");
  
  // Create a raycaster for mouse picking
  app.raycaster = new THREE.Raycaster();
  
  // Add event listeners for mouse/touch
  window.addEventListener('mousemove', e => onPointerMove(e, app));
  window.addEventListener('mousedown', e => onPointerDown(e, app));
  window.addEventListener('mouseup', () => onPointerUp(app));
  window.addEventListener('wheel', e => onMouseWheel(e, app));
  window.addEventListener('touchmove', e => onPointerMove(e.touches[0], app));
  window.addEventListener('touchstart', e => onPointerDown(e.touches[0], app));
  window.addEventListener('touchend', () => onPointerUp(app));
  window.addEventListener('contextmenu', e => e.preventDefault()); // Prevent context menu on right click
  
  // Double click to toggle rainbow mode
  window.addEventListener('dblclick', () => toggleRainbowMode(app));
  
  // Forward/back mouse buttons
  window.addEventListener('mousedown', e => {
    if (e.button === 3) { // Forward button (may vary by mouse)
      toggleMagneticMode(app);
    } else if (e.button === 4) { // Back button (may vary by mouse)
      createBlackholeEffect(app);
    }
  });
  
  console.log("Event listeners set up successfully");
}

// Function to handle mouse/touch movement for interaction
function onPointerMove(event, app) {
  // Calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  app.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  app.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update the raycaster with the new mouse position
  app.raycaster.setFromCamera(app.mouse, app.camera);
  
  // Move the point light to follow the mouse
  const pointLight = app.scene.userData.pointLight;
  pointLight.position.copy(app.raycaster.ray.direction).multiplyScalar(2).add(app.camera.position);
  
  // Get reference to the main mesh in the ball group
  const mesh = app.ballGroup.userData.mesh;
  const touchSphere = app.scene.userData.touchSphere;
  
  // Calculate objects intersecting the ray
  const intersects = app.raycaster.intersectObject(mesh);
  
  // Change appearance when hovered or touched
  if (intersects.length > 0) {
    if (!app.isHovered) {
      document.body.style.cursor = 'pointer';
      
      // Change wireframe color smoothly
      const wireMat = app.ballGroup.userData.wireMat;
      gsapFade(wireMat.color, { r: 1, g: 0, b: 1 }, 0.3);
      
      // Smoothly change gradient colors
      updateGradientColors(app, '#FF77FF', '#AA55FF', '#55FFFF');
      
      app.isHovered = true;
    }
    
    // Store the intersection point for deformation
    app.touchPoint = intersects[0].point.clone();
    touchSphere.position.copy(app.touchPoint);
    touchSphere.visible = true;
    
    // Apply deformation when hovering
    applyDeformation(app, app.touchPoint, 0.2, 0.3);
  } else {
    if (app.isHovered) {
      document.body.style.cursor = 'default';
      
      // Reset wireframe color smoothly
      const wireMat = app.ballGroup.userData.wireMat;
      gsapFade(wireMat.color, { r: 0, g: 1, b: 1 }, 0.3);
      
      // Reset gradient colors
      updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
      
      app.isHovered = false;
    }
    
    app.touchPoint = null;
    touchSphere.visible = false;
    
    // Gradually restore the original shape
    resetDeformation(app, 0.1);
  }
  
  // Handle dragging
  if (app.isDragging) {
    const deltaMove = {
      x: event.clientX - app.previousMousePosition.x,
      y: event.clientY - app.previousMousePosition.y
    };
    
    // Rotate the ball based on mouse movement
    app.ballGroup.rotation.y += deltaMove.x * 0.01;
    app.ballGroup.rotation.x += deltaMove.y * 0.01;
    
    app.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  }
  
  // Play tone based on mouse position if hovered
  if (app.isHovered) {
    playToneForPosition(app, app.mouse.x, app.mouse.y);
  }
}

function onPointerDown(event, app) {
  // Make sure audio is initialized on first user interaction
  if (!app.audioContext) {
    initAudioEffects(app);
    app.soundManager.init();
    
    // Attach positional sounds to ball
    app.soundManager.attachToObject('deform', app.ballGroup);
  }
  
  app.isDragging = true;
  app.previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
  
  // Check if we're clicking on the ball
  app.raycaster.setFromCamera(app.mouse, app.camera);
  const mesh = app.ballGroup.userData.mesh;
  const intersects = app.raycaster.intersectObject(mesh);
  
  if (intersects.length > 0) {
    // Handle right click differently
    if (event.button === 2 || (event.touches && event.touches.length > 1)) {
      // Explode effect on right click
      createParticleExplosion(app);
      
      // Change to hot colors
      updateGradientColors(app, '#FF5500', '#FF0000', '#FFFF00');
      
      app.targetScale = 1.3;
      
      // Play explosion sound
      if (app.soundManager) {
        app.soundManager.play('explosion');
      }
    } else {
      // Regular left click
      // Set target scale for smooth animation
      app.targetScale = 1.1;
      
      // Change color more dramatically on click
      updateGradientColors(app, '#FFAAFF', '#CC66FF', '#66FFFF');
      
      // Play click sound
      if (app.soundManager) {
        app.soundManager.play('click');
      }
    }
  }
}

function onPointerUp(app) {
  app.isDragging = false;
  
  // Reset target scale for smooth animation
  app.targetScale = 1.0;
  
  // Reset colors if not hovering
  if (!app.isHovered) {
    updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
  }
  
  // Stop the tone
  stopTone(app);
}

// Handle mouse wheel scroll
function onMouseWheel(event, app) {
  // Only affect the ball if we're hovering over it
  if (app.isHovered) {
    // Prevent default scroll behavior
    event.preventDefault();
    
    // Determine scroll direction
    const delta = Math.sign(event.deltaY);
    
    // Adjust spikiness
    app.spikiness += delta * 0.05;
    
    // Clamp to a reasonable range
    app.spikiness = Math.max(0, Math.min(2, app.spikiness));
    
    // Apply spiky deformation
    if (app.spikiness > 0) {
      applySpikyEffect(app, app.spikiness);
      
      // Play spike sound
      if (app.soundManager) {
        app.soundManager.play('spike');
      }
    } else {
      // If spikiness is 0, reset to original shape
      resetDeformation(app, 0.5);
    }
  }
}

// Toggle rainbow mode (for double click)
function toggleRainbowMode(app) {
  app.isRainbowMode = !app.isRainbowMode;
  
  if (app.isRainbowMode) {
    // Play rainbow sound in loop
    if (app.soundManager) {
      app.soundManager.play('rainbow', true);
    }
  } else {
    // Stop rainbow sound
    if (app.soundManager) {
      app.soundManager.stop('rainbow');
    }
  }
}

// Toggle magnetic mode (for forward mouse button)
function toggleMagneticMode(app) {
  app.isMagneticMode = !app.isMagneticMode;
  
  if (app.isMagneticMode) {
    // Turn on magnetic effect
    updateGradientColors(app, '#0066FF', '#3399FF', '#99CCFF'); // Blue colors
    
    const wireMat = app.ballGroup.userData.wireMat;
    wireMat.color.set(0x0066FF); // Blue wireframe
    
    // Create a trail of small spheres that follow the ball
    createMagneticTrail(app);
    
    // Play magnetic sound in loop
    if (app.soundManager) {
      app.soundManager.play('magnetic', true);
    }
  } else {
    // Turn off magnetic effect
    updateGradientColors(app, '#FF00FF', '#8800FF', '#00FFFF');
    
    const wireMat = app.ballGroup.userData.wireMat;
    wireMat.color.set(0x00FFFF);
    
    // Remove trail
    removeMagneticTrail(app);
    
    // Stop magnetic sound
    if (app.soundManager) {
      app.soundManager.stop('magnetic');
    }
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

export { setupEventListeners, toggleRainbowMode, toggleMagneticMode, gsapFade };